import { WireRouter } from '../geometry/WireRouter';
import { HitTester, type Hit } from './HitTester';
import { createId, type Point, type Wire, type SymbolKind, type ShapeKind } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { PathDrawing } from './PathDrawing';
import { ComponentGeometry } from '../geometry/ComponentGeometry';
import { SymbolLibrary } from '../symbols/SymbolLibrary';
import { SymbolGeometry } from '../symbols/SymbolGeometry';
import { SymbolPlacement } from './SymbolPlacement';
export type Tool = 'select' | 'pan' | 'wire' | 'component' | 'text' | 'rectangle' | 'ellipse' | 'line' | 'polyline' | 'polygon' | 'symbol' | 'junction';
type Drag = { hit: Hit | null; start: Point; prior: Point; screen: Point; moved: boolean; originalRoute: Point[]; groupIds: string[]; marquee: boolean };

/** Pointer input: moving components never modifies endpoint IDs; wire routes follow them. */
export class PointerController {
  public tool: Tool = 'select';
  public symbol: SymbolKind = 'resistor';
  public snap = true;
  private readonly tester: HitTester;
  private readonly router: WireRouter;
  private readonly paths: PathDrawing;
  private readonly placement:SymbolPlacement;
  private drag: Drag | null = null;
  private pending: string | null = null;
  public constructor(private readonly canvas: HTMLCanvasElement, private readonly model: ProjectModel, private readonly renderer: CanvasRenderer, private readonly commit: () => void) {
    this.tester=new HitTester(model);this.router=new WireRouter(model);
    this.paths=new PathDrawing(model,commit);
    this.placement=new SymbolPlacement(model);
    canvas.addEventListener('pointerdown',event=>this.down(event));
    canvas.addEventListener('pointermove',event=>this.move(event));
    canvas.addEventListener('pointerup',event=>this.up(event));
    canvas.addEventListener('pointercancel',()=>this.cancel());
    canvas.addEventListener('dblclick',event=>this.doubleClick(event));
    canvas.addEventListener('wheel',event=>this.wheel(event),{passive:false});
  }
  public setTool(next: Tool): void {this.paths.finish();this.tool=next;this.pending=null;this.renderer.invalidate();}
  private pos(event: PointerEvent | MouseEvent | WheelEvent): { screen: Point; world: Point } {
    const rect=this.canvas.getBoundingClientRect();const screen={x:event.clientX-rect.left,y:event.clientY-rect.top};
    return {screen,world:this.renderer.toWorld(screen.x,screen.y)};
  }
  private grid(point: Point): Point {return this.snap?{x:Math.round(point.x/10)*10,y:Math.round(point.y/10)*10}:point;}
  private down(event: PointerEvent): void {
    if (event.button!==0 && event.button!==1) return;
    if (event.button===0) this.canvas.focus();
    const {screen,world}=this.pos(event);
    const hit=this.tester.at(world,11/this.renderer.zoom);
    this.drag={hit,start:world,prior:world,screen,moved:false,originalRoute:[],groupIds:[],marquee:false};
    this.canvas.setPointerCapture(event.pointerId);
    if (event.button===1||this.tool==='pan') return;
    if (this.tool==='wire') {this.wireClick(world,hit);this.drag=null;return;}
    if (this.tool==='junction') {this.joinAt(world,hit);this.drag=null;return;}
    if (this.tool==='component') {this.model.addComponent(this.grid(world));this.commit();this.drag=null;return;}
    if (this.tool==='text') {this.model.project.annotations.push({id:createId(),text:'Annotation',...this.grid(world),size:16,font:'Arial',color:'#182638',bold:false});this.commit();this.drag=null;return;}
    if (this.tool==='symbol') {
      const count=this.model.project.symbols.filter(item=>item.kind===this.symbol).length+1;
      const item={id:createId(),kind:this.symbol,...this.grid(world),scale:1,rotation:0,color:this.renderer.dark?'#e1e9f2':'#162638',
        label:new SymbolLibrary().labelFor(this.symbol,count),value:'',terminals:SymbolGeometry.createTerminals(this.symbol)};
      this.model.project.symbols.push(item);
      this.placement.place(item,world,12/this.renderer.zoom);
      this.model.selection={kind:'symbol',id:item.id};
      this.model.changed();this.commit();this.drag=null;return;
    }
    if (this.tool==='polyline'||this.tool==='polygon') {
      this.paths.vertex(this.tool,this.grid(world));this.drag=null;return;
    }
    if (this.tool==='rectangle'||this.tool==='ellipse'||this.tool==='line') {this.startShape(world,this.tool);return;}
    const wire=hit?.kind==='segment'?this.model.project.wires.find(item=>item.id===hit.id):undefined;
    if (wire&&this.drag)this.drag.originalRoute=this.router.path(wire);
    this.beginSelection(hit,event.shiftKey,world);
  }
  /** Empty-space drag begins a marquee; Shift-click extends the component set. */
  private beginSelection(hit:Hit|null,extend:boolean,point:Point):void {
    const drag=this.drag;
    if(!drag)return;
    const old=this.model.selectedComponents().map(c=>c.id);
    if(this.tool==='select'&&!hit) {
      drag.marquee=true;
      this.renderer.marquee={start:point,end:point};
      this.model.selection=null;this.model.changed();return;
    }
    const keep=hit?.kind==='component'&&old.includes(hit.id)&&old.length>1;
    if(keep)drag.groupIds=old;
    if(hit?.kind==='component'&&extend) {
      this.model.selectComponents(old.includes(hit.id)?old.filter(id=>id!==hit.id):[...old,hit.id]);return;
    }
    if(!keep) {
      const kind=hit?.kind==='segment'?'wire':hit?.kind==='pin'?'anchor':hit?.kind;
      this.model.selection=hit&&kind?(hit.index===undefined?{kind,id:hit.id}:{kind,id:hit.id,index:hit.index}):null;
    }
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
    const nearest=this.router.nearestSegment(wire,point);
    if (!nearest) return;
    const other=this.model.project.wires
      .filter(item=>item.id!==wire.id)
      .map(item=>({wire:item,location:this.router.intersection(wire,item,nearest.point)}))
      .find(item=>item.location!==null);
    const joined=other?.location
      ? this.router.join(wire,other.wire,other.location)
      : this.router.split(wire,nearest.point);
    if (joined) this.commit();
  }
  private move(event:PointerEvent):void {
    const drag=this.drag;
    if (!drag) return;
    const {screen,world}=this.pos(event);const dx=world.x-drag.prior.x;const dy=world.y-drag.prior.y;
    drag.moved=drag.moved||Math.hypot(screen.x-drag.screen.x,screen.y-drag.screen.y)>2;
    if (event.buttons===0) return;
    if (event.button===1||this.tool==='pan') {this.renderer.offset.x+=screen.x-drag.screen.x;this.renderer.offset.y+=screen.y-drag.screen.y;drag.screen=screen;drag.prior=world;this.renderer.invalidate();return;}
    if(drag.marquee) {this.renderer.marquee={start:drag.start,end:world};this.renderer.invalidate();return;}
    if(drag.groupIds.length>1) {
      this.moveGroup(drag.groupIds,dx,dy);
      drag.prior=world;drag.screen=screen;this.model.changed();return;
    }
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
      shape.points?.forEach(point=>{point.x+=drawing?0:dx;point.y+=drawing?0:dy;});
    }
    drag.prior=world;drag.screen=screen;this.model.changed();
  }
  private moveGroup(ids:readonly string[],dx:number,dy:number):void {
    const selected=this.model.project.components.filter(c=>ids.includes(c.id));
    const terminals=new Set(selected.flatMap(c=>c.pins.map(pin=>pin.id)));
    for(const component of selected){component.x+=dx;component.y+=dy;}
    for(const wire of this.model.project.wires) {
      if(!terminals.has(wire.from)||!terminals.has(wire.to))continue;
      for(const point of wire.points){point.x+=dx;point.y+=dy;}
    }
  }
  private slideSegment(wire:Wire,index:number,drag:Drag,world:Point):void {
    const a=drag.originalRoute[index];
    const b=drag.originalRoute[index+1];
    if (!a || !b) return;
    const horizontal=Math.abs(a.y-b.y)<.01;
    const delta=horizontal?world.y-drag.start.y:world.x-drag.start.x;
    this.router.slideLeg(wire,index,delta,drag.originalRoute);
  }
  private up(event:PointerEvent):void {
    const drag=this.drag;this.drag=null;
    if (this.canvas.hasPointerCapture(event.pointerId))this.canvas.releasePointerCapture(event.pointerId);
    if(drag?.marquee) {this.completeMarquee(drag,this.pos(event).world);return;}
    if (!drag||!drag.moved) return;
    const {world}=this.pos(event);const target=this.tester.at(world,12/this.renderer.zoom,drag.hit?.id);
    const hit=drag.hit;
    if(hit?.kind==='symbol')this.spliceMovedSymbol(hit.id,world);
    if (hit?.kind==='anchor' && target?.kind==='segment') this.connectOnCable(hit.id,target.id,world);
    if (hit?.kind==='anchor' && (target?.kind==='pin'||target?.kind==='anchor') && hit.id!==target.id)
      this.model.connectAnchor(hit.id,target.id);
    this.commit();
  }
  private spliceMovedSymbol(id:string,at:Point):void {
    const symbol=this.model.project.symbols.find(item=>item.id===id);
    if(!symbol)return;
    this.placement.place(symbol,at,12/this.renderer.zoom);
  }
  private completeMarquee(drag:Drag,end:Point):void {
    this.renderer.marquee=null;
    const x0=Math.min(drag.start.x,end.x),x1=Math.max(drag.start.x,end.x);
    const y0=Math.min(drag.start.y,end.y),y1=Math.max(drag.start.y,end.y);
    if(!drag.moved){this.model.selection=null;this.model.changed();return;}
    const ids=this.model.project.components.filter(component=>{
      const box=ComponentGeometry.bounds(component);
      return box.right>=x0&&box.left<=x1&&box.bottom>=y0&&box.top<=y1;
    }).map(component=>component.id);
    this.model.selectComponents(ids);
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
  /** A dropped loose end creates an explicit junction on a different cable. */
  private connectOnCable(sourceId:string,wireId:string,point:Point):void {
    const wire=this.model.project.wires.find(item=>item.id===wireId);
    if (!wire || wire.from===sourceId || wire.to===sourceId)return;
    const nearest=this.router.nearestSegment(wire,point);
    if (!nearest || nearest.distance>12/this.renderer.zoom)return;
    const junction=this.router.split(wire,nearest.point);
    if (!junction)return;
    this.model.connectAnchor(sourceId,junction);
  }
  private doubleClick(event:MouseEvent):void {
    if (this.paths.isDrawing){this.paths.finish();return;}
    const world=this.pos(event).world;const hit=this.tester.at(world,12/this.renderer.zoom);
    if (hit?.kind!=='segment') return;
    const wire=this.model.project.wires.find(item=>item.id===hit.id);
    if (!wire) return;
    const nearest=this.router.nearestSegment(wire,world);
    if (!nearest) return;
    if (!this.router.addBend(wire,nearest.point))return;
    this.model.selection={kind:'wire',id:wire.id};this.commit();
  }
  private wheel(event:WheelEvent):void {event.preventDefault();const screen=this.pos(event).screen;this.renderer.zoomAt(event.deltaY<0?1.12:1/1.12,screen);}
  public cancelPending():void {this.paths.cancel();this.pending=null;this.drag=null;this.renderer.marquee=null;this.renderer.invalidate();}
  private cancel():void {this.cancelPending();}
}
