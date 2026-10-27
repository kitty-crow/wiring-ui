import type { Project, Point, PinSide, Dash, ShapeKind, SymbolKind } from '../model/types';
import { SymbolGeometry } from '../symbols/SymbolGeometry';

const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const str=(value:unknown,max=1000):value is string=>typeof value==='string'&&value.length<=max;
const num=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<1e7;
const point=(value:unknown):value is Point=>object(value)&&num(value.x)&&num(value.y);
const inList=<T extends string>(value:unknown,values:readonly T[]):value is T=>typeof value==='string'&&values.includes(value as T);
const dash=(value:unknown):value is Dash=>inList(value,['solid','dash','dot','dashdot']);
const side=(value:unknown):value is PinSide=>inList(value,['left','right']);
const shapeKind=(value:unknown):value is ShapeKind=>inList(value,['rectangle','ellipse','line','polyline','polygon']);
const symbolKind=(value:unknown):value is SymbolKind=>inList(value,['ground','vcc','vdd','vss','nc','resistor','capacitor','inductor','diode','led','fuse','switch','testpoint']);
const all=(value:unknown,check:(value:unknown)=>boolean):boolean=>Array.isArray(value)&&value.length<=10000&&value.every(check);
const pin=(value:unknown):boolean=>object(value)&&str(value.id,120)&&str(value.number,100)&&str(value.label,300)&&side(value.side);
const component=(value:unknown):boolean=>object(value)&&str(value.id,120)&&str(value.name,500)&&str(value.detail,500)&&num(value.x)&&num(value.y)&&num(value.width)&&all(value.pins,pin)&&(value.rotation===undefined||(num(value.rotation)&&[0,90,180,270].includes(value.rotation)))&&(value.mirrorX===undefined||typeof value.mirrorX==='boolean')&&(value.mirrorY===undefined||typeof value.mirrorY==='boolean');
const anchor=(value:unknown):boolean=>object(value)&&str(value.id,120)&&num(value.x)&&num(value.y)&&inList(value.kind,['free','junction']);
const wire=(value:unknown):boolean=>object(value)&&str(value.id,120)&&str(value.from,120)&&str(value.to,120)&&all(value.points,point)&&str(value.color,120)&&dash(value.dash)&&num(value.width)&&str(value.label,400);
const annotation=(value:unknown):boolean=>object(value)&&str(value.id,120)&&str(value.text,20000)&&num(value.x)&&num(value.y)&&num(value.size)&&str(value.font,100)&&str(value.color,120)&&typeof value.bold==='boolean';
const shape=(value:unknown):boolean=>object(value)&&str(value.id,120)&&shapeKind(value.kind)&&num(value.x)&&num(value.y)&&num(value.width)&&num(value.height)&&str(value.color,120)&&str(value.fill,120)&&num(value.stroke)&&dash(value.dash)&&(value.points===undefined||all(value.points,point));
const symbol=(value:unknown):boolean=>object(value)&&str(value.id,120)&&symbolKind(value.kind)&&num(value.x)&&num(value.y)&&num(value.scale)&&num(value.rotation)&&str(value.color,120)&&str(value.label,400)&&(value.value===undefined||str(value.value,400))&&(value.terminals===undefined||(all(value.terminals,v=>str(v,120))&&value.terminals.length===SymbolGeometry.count(value.kind as SymbolKind)));
const background=(value:unknown):boolean=>value===null||(object(value)&&str(value.data,30_000_000)&&value.data.startsWith('data:image/')&&num(value.opacity)&&num(value.x)&&num(value.y)&&num(value.width)&&num(value.height));

/** Schema gate for both projects and downloaded HTML. Reject malformed and remote assets. */
export class ProjectCodec {
  public parse(raw:string):Project {
    if(raw.length>38_000_000)throw new Error('Project exceeds supported size');
    const parsed:unknown=JSON.parse(raw);
    if(!object(parsed)||parsed.version!==1)throw new Error('Unsupported project schema');
    if(!str(parsed.name,500)||!num(parsed.width)||!num(parsed.height)||parsed.width<100||parsed.height<100)throw new Error('Invalid document size or name');
    if(!all(parsed.components,component)||!all(parsed.wires,wire)||!all(parsed.annotations,annotation)||!all(parsed.shapes,shape))throw new Error('Invalid document objects');
    // Compatible with version-1 documents created before free-end and symbol support.
    if(parsed.anchors===undefined)parsed.anchors=[];
    if(parsed.symbols===undefined)parsed.symbols=[];
    if(!all(parsed.anchors,anchor)||!all(parsed.symbols,symbol)||!background(parsed.background))throw new Error('Invalid anchors, symbols or template');
    const project=parsed as unknown as Project;
    SymbolGeometry.ensure(project);
    const allIds=project.components.flatMap(item=>item.pins.map(pin=>pin.id))
      .concat(project.anchors.map(item=>item.id))
      .concat(project.symbols.flatMap(item=>item.terminals??[]));
    const ids=new Set(allIds);
    if(project.wires.some(item=>!ids.has(item.from)||!ids.has(item.to)))throw new Error('Cable references a missing anchor');
    if(ids.size!==allIds.length)throw new Error('Duplicate terminal/anchor IDs');
    return project;
  }
  public encode(project:Project):string{return JSON.stringify(project,null,2);}
  public download(content:string,name:string,type:string):void {
    const url=URL.createObjectURL(new Blob([content],{type}));
    const element=document.createElement('a');element.href=url;element.download=name;element.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  public exportHtml(project:Project):void {
    const copy=document.documentElement.cloneNode(true) as HTMLElement;
    const embedded=copy.querySelector('#embedded-project');
    if(!embedded)throw new Error('Project template not found');
    embedded.textContent=JSON.stringify(project).replace(/</g,'\\u003c');
    this.download('<!doctype html>\n'+copy.outerHTML,project.name.replace(/[^a-z0-9_-]+/gi,'_')+'.html','text/html');
  }
  public parseHtml(raw:string):Project {
    const doc=new DOMParser().parseFromString(raw,'text/html');
    const embedded=doc.querySelector('#embedded-project')?.textContent;
    if(!embedded)throw new Error('Not a Wiring UI document');
    return this.parse(embedded);
  }
}
