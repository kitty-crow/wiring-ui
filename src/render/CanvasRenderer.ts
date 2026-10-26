import { ProjectModel } from '../model/ProjectModel';
import { WireRouter } from '../geometry/WireRouter';
import { componentHeight, type Component, type Point, type Shape, type Wire } from '../model/types';
import { GpuGrid } from './GpuGrid';
import { SymbolLibrary } from '../symbols/SymbolLibrary';
import { CrossoverPainter } from './CrossoverPainter';

export class CanvasRenderer {
  public zoom = 1;
  public offset: Point = { x: 25, y: 25 };
  public dark = false;
  public grid = true;
  private frameRequested = false;
  private background: HTMLImageElement | null = null;
  private backgroundData = '';
  private readonly gpu: GpuGrid;
  private readonly router: WireRouter;
  private readonly symbols = new SymbolLibrary();
  private readonly bridges = new CrossoverPainter();
  private readonly ctx: CanvasRenderingContext2D;
  public constructor(private readonly canvas: HTMLCanvasElement, gridCanvas: HTMLCanvasElement, private readonly model: ProjectModel) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2D canvas is unavailable');
    this.ctx = ctx; this.gpu = new GpuGrid(gridCanvas); this.router = new WireRouter(model);
    this.invalidate();
  }
  public get backend(): string { return this.gpu.name; }
  public invalidate():void {
    if(this.frameRequested)return;
    this.frameRequested=true;
    requestAnimationFrame(()=>{this.frameRequested=false;this.paint();});
  }
  public resize(): void {
    const host = this.canvas.parentElement;
    if (!host) return;
    const width = Math.max(1, Math.floor(host.clientWidth * devicePixelRatio));
    const height = Math.max(1, Math.floor(host.clientHeight * devicePixelRatio));
    const grid = this.canvas.previousElementSibling as HTMLCanvasElement | null;
    if (!grid) return;
    for (const item of [this.canvas,grid]) {
      if (item.width !== width) item.width = width;
      if (item.height !== height) item.height = height;
    }
    this.invalidate();
  }
  public toWorld(x: number, y: number): Point { return { x: (x - this.offset.x) / this.zoom, y: (y - this.offset.y) / this.zoom }; }
  public toScreen(point: Point): Point { return { x: point.x * this.zoom + this.offset.x, y: point.y * this.zoom + this.offset.y }; }
  public zoomAt(factor: number, position: Point): void {
    const world = this.toWorld(position.x, position.y);
    this.zoom = Math.min(3.5,Math.max(0.25,this.zoom * factor));
    this.offset = { x: position.x - world.x * this.zoom, y: position.y - world.y * this.zoom };
    this.invalidate();
  }
  private paint(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const dpr = devicePixelRatio;

    const grid = this.canvas.previousElementSibling as HTMLCanvasElement | null;
    if (grid) this.gpu.draw(width,height,this.zoom * dpr,this.offset.x * dpr,this.offset.y * dpr,this.dark,this.grid);
    const ctx = this.ctx;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,width,height);
    ctx.setTransform(dpr * this.zoom,0,0,dpr * this.zoom,dpr * this.offset.x,dpr * this.offset.y);
    const ink = this.dark ? '#e6edf8' : '#152438';
    const paper = this.dark ? '#182333' : '#ffffff';
    ctx.save(); ctx.fillStyle = paper; ctx.strokeStyle = this.dark ? '#435268' : '#cbd5e1'; ctx.lineWidth = 1;
    ctx.fillRect(0,0,this.model.project.width,this.model.project.height);
    ctx.strokeRect(0,0,this.model.project.width,this.model.project.height);
    this.paintTemplate(ctx);
    for (const shape of this.model.project.shapes) this.drawShape(ctx,shape,ink);
    const crossings = this.router.crossings();
    for (const wire of this.model.project.wires) this.drawWire(ctx,wire);
    this.bridges.draw(ctx,crossings,this.model.project.wires,paper);
    for (const component of this.model.project.components) this.drawComponent(ctx,component,ink,paper);
    for (const symbol of this.model.project.symbols) this.symbols.draw(ctx,symbol);
    for (const anchor of this.model.project.anchors) {
      const used=this.model.project.wires.some(wire=>wire.from===anchor.id||wire.to===anchor.id);
      if (!used && anchor.kind==='free') continue;
      ctx.save();ctx.lineWidth=1.8;ctx.strokeStyle=ink;ctx.fillStyle=anchor.kind==='junction'?ink:paper;
      ctx.beginPath();ctx.arc(anchor.x,anchor.y,anchor.kind==='junction'?5:6,0,Math.PI*2);ctx.fill();ctx.stroke();
      if (this.model.selection?.id===anchor.id) {ctx.strokeStyle='#2563eb';ctx.strokeRect(anchor.x-9,anchor.y-9,18,18);}
      ctx.restore();
    }
    for (const note of this.model.project.annotations) {
      ctx.fillStyle = note.color; ctx.font = (note.bold ? 'bold ' : '') + note.size + 'px ' + note.font;
      note.text.split('\n').forEach((line,index) => ctx.fillText(line,note.x,note.y + index * note.size * 1.35));
      if (this.model.selection?.id === note.id) { ctx.strokeStyle = '#2563eb';ctx.strokeRect(note.x-4,note.y-note.size,note.text.length*note.size*0.6+8,note.size+8); }
    }
    ctx.restore();
    ctx.setTransform(1,0,0,1,0,0);

  }
  private paintTemplate(ctx: CanvasRenderingContext2D): void {
    const bg = this.model.project.background;
    if (!bg) { this.background = null; this.backgroundData = ''; return; }
    if (this.backgroundData !== bg.data) {
      this.backgroundData = bg.data;
      this.background = new Image();
      this.background.onload = () => this.invalidate();
      this.background.src = bg.data;
    }
    if (!this.background?.complete) return;
    ctx.globalAlpha = bg.opacity; ctx.drawImage(this.background,bg.x,bg.y,bg.width,bg.height);ctx.globalAlpha = 1;
  }
  private drawShape(ctx: CanvasRenderingContext2D, shape: Shape, ink: string): void {
    ctx.save(); ctx.strokeStyle = shape.color || ink; ctx.fillStyle = shape.fill; ctx.lineWidth = shape.stroke; this.applyDash(ctx,shape.dash);
    ctx.beginPath();
    if (shape.kind === 'ellipse') ctx.ellipse(shape.x+shape.width/2,shape.y+shape.height/2,Math.abs(shape.width/2),Math.abs(shape.height/2),0,0,Math.PI*2);
    if (shape.kind === 'rectangle') ctx.rect(shape.x,shape.y,shape.width,shape.height);
    if (shape.kind === 'line') { ctx.moveTo(shape.x,shape.y);ctx.lineTo(shape.x+shape.width,shape.y+shape.height); }
    if (shape.fill !== 'transparent' && shape.kind !== 'line') ctx.fill();
    ctx.stroke();
    if (this.model.selection?.id === shape.id) { ctx.setLineDash([4,3]);ctx.strokeStyle = '#2563eb';ctx.strokeRect(shape.x-4,shape.y-4,shape.width+8,shape.height+8); }
    ctx.restore();
  }
  private applyDash(ctx: CanvasRenderingContext2D, dash: string): void {
    ctx.setLineDash(dash === 'dash' ? [9,6] : dash === 'dot' ? [2,6] : dash === 'dashdot' ? [12,4,2,4] : []);
  }
  private drawWire(ctx:CanvasRenderingContext2D,wire:Wire):void {
    const path=this.router.path(wire);
    if(path.length<2)return;
    ctx.save();ctx.strokeStyle=wire.color;ctx.lineWidth=wire.width;this.applyDash(ctx,wire.dash);
    if(this.model.selection?.id===wire.id){ctx.shadowColor='#2563eb';ctx.shadowBlur=5;}
    ctx.beginPath();ctx.moveTo(path[0]?.x??0,path[0]?.y??0);
    for(const point of path.slice(1))ctx.lineTo(point.x,point.y);
    ctx.stroke();ctx.shadowBlur=0;
    if(this.model.selection?.id===wire.id)for(const node of wire.points){
      ctx.fillStyle='#fff';ctx.strokeStyle=wire.color;
      ctx.fillRect(node.x-5,node.y-5,10,10);ctx.strokeRect(node.x-5,node.y-5,10,10);
    }
    if(wire.label)this.drawWireLabel(ctx,wire,path);
    ctx.restore();
  }
  private drawWireLabel(ctx:CanvasRenderingContext2D,wire:Wire,path:Point[]):void {
    const centre=path[Math.floor(path.length/2)];if(!centre)return;
    ctx.fillStyle=this.dark?'#182333':'#fff';ctx.fillRect(centre.x-4,centre.y-19,wire.label.length*8+12,19);
    ctx.fillStyle=wire.color;ctx.font='13px Arial';ctx.fillText(wire.label,centre.x,centre.y-5);
  }
  private drawComponent(ctx: CanvasRenderingContext2D, component: Component, ink: string, paper: string): void {
    const height = componentHeight(component);
    ctx.save();ctx.fillStyle=paper;ctx.strokeStyle = this.model.selection?.id === component.id ? '#2563eb' : ink;
    ctx.lineWidth = this.model.selection?.id === component.id ? 3 : 1.8;
    ctx.fillRect(component.x,component.y,component.width,height);ctx.strokeRect(component.x,component.y,component.width,height);
    ctx.fillStyle = this.dark ? '#25344a' : '#f0f4f8';ctx.fillRect(component.x+1,component.y+1,component.width-2,58);
    ctx.beginPath();ctx.moveTo(component.x,component.y+59);ctx.lineTo(component.x+component.width,component.y+59);ctx.stroke();
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.font='bold 17px Arial';ctx.fillText(component.name,component.x+component.width/2,component.y+25,component.width-15);
    ctx.font='12px Arial';ctx.fillText(component.detail,component.x+component.width/2,component.y+45,component.width-12);
    ctx.font='13px Arial';
    component.pins.forEach((pin,index)=>{
      const y=component.y+83+index*31;const x=pin.side==='right'?component.x+component.width:component.x;
      ctx.strokeStyle=this.dark?'#5e7086':'#c9d3e0';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(component.x+10,y+14);ctx.lineTo(component.x+component.width-10,y+14);ctx.stroke();
      ctx.fillStyle=ink;ctx.textAlign=pin.side==='right'?'left':'right';
      const textX=pin.side==='right'?component.x+16:component.x+component.width-16;
      ctx.fillText(pin.number+'   '+pin.label,textX,y+5,component.width-30);
      ctx.fillStyle=paper;ctx.strokeStyle=ink;ctx.lineWidth=1.7;
      ctx.beginPath();ctx.arc(x,y,6.5,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.stroke();
    });ctx.restore();
  }
}
