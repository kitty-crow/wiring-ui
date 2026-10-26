import { WireRouter } from '../geometry/WireRouter';
import { HitTester, type Hit } from './HitTester';
import { createId, type Point, type Wire, type SymbolKind, type ShapeKind } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { CanvasRenderer } from '../render/CanvasRenderer';
export type Tool = 'select' | 'pan' | 'wire' | 'component' | 'text' | 'rectangle' | 'ellipse' | 'line' | 'symbol' | 'junction';
type Drag = { hit: Hit | null; start: Point; prior: Point; screen: Point; moved: boolean; originalRoute: Point[] };

/** Pointer input: moving components never modifies endpoint IDs; wire routes follow them. */
export class PointerController {
  public tool: Tool = 'select';
  public symbol: SymbolKind = 'resistor';
  public snap = true;
  private readonly tester: HitTester;
  private readonly router: WireRouter;
  private drag: Drag | null = null;
  private pending: string | null = null;
  public constructor(private readonly canvas: HTMLCanvasElement, private readonly model: ProjectModel, private readonly renderer: CanvasRenderer, private readonly commit: () => void) {
    this.tester=new HitTester(model);this.router=new WireRouter(model);
    canvas.addEventListener('pointerdown',event=>this.down(event));
    canvas.addEventListener('pointermove',event=>this.move(event));
    canvas.addEventListener('pointerup',event=>this.up(event));
    canvas.addEventListener('pointercancel',()=>this.cancel());
    canvas.addEventListener('dblclick',event=>this.doubleClick(event));
    canvas.addEventListener('wheel',event=>this.wheel(event),{passive:false});
    window.addEventListener('keydown',event=>this.key(event));
  }
  public setTool(next: Tool): void {this.tool=next;this.pending=null;this.renderer.invalidate();}
  private pos(event: PointerEvent | MouseEvent | WheelEvent): { screen: Point; world: Point } {
    const rect=this.canvas.getBoundingClientRect();const screen={x:event.clientX-rect.left,y:event.clientY-rect.top};
    return {screen,world:this.renderer.toWorld(screen.x,screen.y)};
  }
  private grid(point: Point): Point {return this.snap?{x:Math.round(point.x/10)*10,y:Math.round(point.y/10)*10}:point;}
  private down(event: PointerEvent): void {
    if (event.button!==0 && event.button!==1) return;
    const {screen,world}=this.pos(event);
    const hit=this.tester.at(world,11/this.renderer.zoom);
    this.drag={hit,start:world,prior:world,screen,moved:false,originalRoute:[]};
    this.canvas.setPointerCapture(event.pointerId);
    if (event.button===1||event.shiftKey||this.tool==='pan') return;
    if (this.tool==='wire') {this.wireClick(world,hit);this.drag=null;return;}
    if (this.tool==='junction') {this.joinAt(world,hit);this.drag=null;return;}
    if (this.tool==='component') {this.model.addComponent(this.grid(world));this.commit();this.drag=null;return;}
    if (this.tool==='text') {this.model.project.annotations.push({id:createId(),text:'Annotation',...this.grid(world),size:16,font:'Arial',color:'#182638',bold:false});this.commit();this.drag=null;return;}
    if (this.tool==='symbol') {this.model.project.symbols.push({id:createId(),kind:this.symbol,...this.grid(world),scale:1,rotation:0,color:'#162638',label:''});this.commit();this.drag=null;return;}
    if (this.tool==='rectangle'||this.tool==='ellipse'||this.tool==='line') {this.startShape(world,this.tool);return;}
    const wire=hit?.kind==='segment'?this.model.project.wires.find(item=>item.id===hit.id):undefined;
    if (wire&&this.drag)this.drag.originalRoute=this.router.path(wire);
    const kind=hit?.kind==='segment'?'wire':hit?.kind==='pin'?'anchor':hit?.kind;
    this.model.selection=hit&&kind?(hit.index===undefined?{kind,id:hit.id}:{kind,id:hit.id,index:hit.index}):null;
    this.model.changed();
  }
  private startShape(point:Point, kind:ShapeKind): void {
    const p=this.grid(point);
    const item={id:createId(),kind,x:p.x,y:p.y,width:1,height:1,color:'#263348',fill:'transparent',stroke:2,dash:'solid' as const};
    this.model.project.shapes.push(item);this.model.selection={kind:'shape',id:item.id};
    if (this.drag)this.drag.hit={kind:'shape',id:item.id};
    this.model.changed();
  }
  private wireClick(point:Point,hit:Hit|null):void {
    const end=hit?.kind==='pin'||hit?.kind==='anchor'?hit.id:this.model.createAnchor(this.grid(point)).id;
    if (!this.pending) {this.pending=end;this.model.changed();return;}
    this.model.addWire(this.pending,end);this.pending=null;this.commit();
  }
  private joinAt(point:Point,hit:Hit|null):void {
    if (hit?.kind!=='segment') return;
    const wire=this.model.project.wires.find(item=>item.id===hit.id);
    if (!wire) return;
    const target=this.router.nearestSegment(wire,point);
    if (!target) return;
    const others=this.model.project.wires.filter(item=>item.id!==wire.id);
    const connected=others.find(item=>this.router.hit(item,target.point,10));
    if (connected)this.router.join(wire,connected,this.grid(target.point));
    else this.router.split(wire,this.grid(target.point));
    this.commit();
  }
  private move(event:PointerEvent):void {
    const drag=this.drag;
    if (!drag) return;
    const {screen,world}=this.pos(event);const dx=world.x-drag.prior.x;const dy=world.y-drag.prior.y;
    drag.moved=drag.moved||Math.hypot(screen.x-drag.screen.x,screen.y-drag.screen.y)>2;
    if (event.buttons===0) return;
    if (event.button===1||event.shiftKey||this.tool==='pan') {this.renderer.offset.x+=screen.x-drag.screen.x;this.renderer.offset.y+=screen.y-drag.screen.y;drag.screen=screen;drag.prior=world;this.renderer.invalidate();return;}
    let hit=drag.hit;
    if (!hit) return;
    if (hit.kind==='pin' && drag.moved) hit=this.pullPin(hit,drag);
    const c=this.model.component(hit.id);
    if (hit.kind==='component' && c) {c.x+=dx;c.y+=dy;}
    const free=this.model.project.anchors.find(item=>item.id===hit.id);
    if ((hit.kind==='anchor'||hit.kind==='pin') && free) {free.x+=dx;free.y+=dy;}
    const wire=this.model.project.wires.find(item=>item.id===hit.id);
    if (hit.kind==='waypoint' && wire && hit.index!==undefined) this.shiftPoint(wire,hit.index,dx,dy);
    if (hit.kind==='segment' && wire) this.slideSegment(wire,hit.index??0,drag,world);
    const annotation=this.model.project.annotations.find(item=>item.id===hit.id);
    if (hit.kind==='annotation'&&annotation) {annotation.x+=dx;annotation.y+=dy;}
    const symbol=this.model.project.symbols.find(item=>item.id===hit.id);
    if (hit.kind==='symbol'&&symbol) {symbol.x+=dx;symbol.y+=dy;}
    const shape=this.model.project.shapes.find(item=>item.id===hit.id);
    if (hit.kind==='shape'&&shape) {
      const drawing=this.tool==='rectangle'||this.tool==='ellipse'||this.tool==='line';
      shape.width=drawing?world.x-shape.x:shape.width;
      shape.height=drawing?world.y-shape.y:shape.height;
      shape.x+=drawing?0:dx;shape.y+=drawing?0:dy;
    }
    drag.prior=world;drag.screen=screen;this.model.changed();
  }
  private slideSegment(wire:Wire,index:number,drag:Drag,world:Point):void {
    const path=drag.originalRoute;
    const a=path[index];const b=path[index+1];
    if (!a||!b) return;
    const horizontal=Math.abs(a.y-b.y)<1;
    const delta=horizontal?world.y-drag.start.y:world.x-drag.start.x;
    const shiftedA={x:a.x+(horizontal?0:delta),y:a.y+(horizontal?delta:0)};
    const shiftedB={x:b.x+(horizontal?0:delta),y:b.y+(horizontal?delta:0)};
    const updated=[...path.slice(0,index+1),shiftedA,shiftedB,...path.slice(index+1)];
    wire.points=this.router.compact(updated).slice(1,-1);
  }
  private up(event:PointerEvent):void {
    const drag=this.drag;this.drag=null;
    if (this.canvas.hasPointerCapture(event.pointerId))this.canvas.releasePointerCapture(event.pointerId);
    if (!drag||!drag.moved) return;
    const {world}=this.pos(event);const target=this.tester.at(world,12/this.renderer.zoom);
    const hit=drag.hit;
    if (hit?.kind==='anchor' && target?.kind==='pin' && hit.id!==target.id)this.reattach(hit.id,target.id);
    this.commit();
  }
  private pullPin(hit:Hit,drag:Drag):Hit {
    const current=this.model.anchor(hit.id);
    if (!current)return hit;
    const free=this.model.createAnchor(current);
    for (const wire of this.model.project.wires) {
      if (wire.from===hit.id)wire.from=free.id;
      if (wire.to===hit.id)wire.to=free.id;
    }
    const moved:Hit={kind:'anchor',id:free.id};drag.hit=moved;
    return moved;
  }
  private shiftPoint(wire:Wire,index:number,dx:number,dy:number):void {
    const point=wire.points[index];if(!point)return;
    point.x+=dx;point.y+=dy;
  }
  private reattach(from:string,to:string):void {
    for (const wire of this.model.project.wires) {
      if(wire.from===from)wire.from=to;
      if(wire.to===from)wire.to=to;
    }
    this.model.project.anchors=this.model.project.anchors.filter(anchor=>anchor.id!==from);
  }
  private doubleClick(event:MouseEvent):void {
    const world=this.pos(event).world;const hit=this.tester.at(world,12/this.renderer.zoom);
    if (hit?.kind!=='segment') return;
    const wire=this.model.project.wires.find(item=>item.id===hit.id);
    if (!wire) return;
    const nearest=this.router.nearestSegment(wire,world);
    if (!nearest) return;
    const manual=this.router.path(wire).slice(1,-1);
    manual.splice(nearest.index,0,this.grid(nearest.point));wire.points=manual;
    this.model.selection={kind:'waypoint',id:wire.id,index:nearest.index};this.commit();
  }
  private wheel(event:WheelEvent):void {event.preventDefault();const screen=this.pos(event).screen;this.renderer.zoomAt(event.deltaY<0?1.12:1/1.12,screen);}
  private key(event:KeyboardEvent):void {
    if (event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement) return;
    if (event.key==='Escape') {this.cancel();this.model.selection=null;this.model.changed();}
    if (event.key==='Delete'||event.key==='Backspace') {this.model.removeSelected();this.commit();}
  }
  private cancel():void {this.pending=null;this.drag=null;this.renderer.invalidate();}
}
