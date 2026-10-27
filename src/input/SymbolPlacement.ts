import { createId, pointDistance, type Point, type SymbolInstance, type Wire } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { WireRouter } from '../geometry/WireRouter';
import { SymbolGeometry } from '../symbols/SymbolGeometry';
import { OrthogonalGeometry } from '../geometry/OrthogonalGeometry';

interface Insertion {
  wire:Wire;
  route:Point[];
  segment:number;
  centre:Point;
  rotation:number;
  separation:number;
  distance:number;
}

/** Replaces one conductor with two insulated leads attached to a two-terminal device.
 * The old cable ID and appearance survive on the incoming lead; its outgoing lead
 * retains the colour, thickness and dash pattern but not a duplicated text label.
 */
export class SymbolPlacement {
  private readonly router:WireRouter;
  public constructor(private readonly model:ProjectModel){
    this.router=new WireRouter(model);
  }
  public place(symbol:SymbolInstance,at:Point,tolerance:number):boolean {
    SymbolGeometry.ensure(this.model.project);
    const insertion=this.find(symbol,at,tolerance);
    if(!insertion)return false;
    symbol.x=insertion.centre.x;symbol.y=insertion.centre.y;
    symbol.rotation=insertion.rotation;
    const terminals=SymbolGeometry.terminals(symbol);
    const first=terminals[0],second=terminals[1];
    if(!first||!second)return false;
    const wire=insertion.wire;
    const originalTo=wire.to;
    const inbound=this.router.compact([...insertion.route.slice(0,insertion.segment+1),first]);
    const outbound=this.router.compact([second,...insertion.route.slice(insertion.segment+1)]);
    const outboundWire:Wire={
      ...structuredClone(wire),id:createId(),from:second.id,to:originalTo,
      points:this.routePoints(outbound),label:''
    };
    wire.to=first.id;
    wire.points=this.routePoints(inbound);
    this.model.project.wires.push(outboundWire);
    this.model.changed();
    return true;
  }
  /** Never auto-short an already connected component to a second conductor. */
  private find(symbol:SymbolInstance,at:Point,tolerance:number):Insertion|null {
    if(!SymbolGeometry.twoEnded(symbol.kind))return null;
    const connected=new Set(symbol.terminals??[]);
    if(this.model.project.wires.some(wire=>connected.has(wire.from)||connected.has(wire.to)))return null;
    const separation=SymbolGeometry.halfSpan(symbol.kind)*symbol.scale;
    let best:Insertion|null=null;
    for(const wire of this.model.project.wires) {
      // Collinear manual waypoints must not prevent inserting at a cable midpoint.
      const route=OrthogonalGeometry.normalise(this.router.path(wire));
      for(let index=0;index<route.length-1;index++){
        const a=route[index],b=route[index+1];
        if(!a||!b)continue;
        const horizontal=Math.abs(a.y-b.y)<.01;
        const vertical=Math.abs(a.x-b.x)<.01;
        if(!horizontal&&!vertical)continue;
        const length=pointDistance(a,b);
        if(length<2*separation+12)continue;
        const unitX=(b.x-a.x)/length,unitY=(b.y-a.y)/length;
        const along=(at.x-a.x)*unitX+(at.y-a.y)*unitY;
        const clipped=Math.min(length-separation-6,Math.max(separation+6,along));
        const centre={x:a.x+unitX*clipped,y:a.y+unitY*clipped};
        const distance=pointDistance(centre,at);
        if(distance>tolerance)continue;
        if(best&&distance>=best.distance)continue;
        const rotation=unitX>0.5?0:unitX<-.5?180:unitY>0?90:270;
        best={wire,route,segment:index,centre,rotation,separation,distance};
      }
    }
    return best;
  }
  /** An explicit midpoint keeps straight split sections from being auto-routed. */
  private routePoints(route:readonly Point[]):Point[] {
    const inside=route.slice(1,-1).map(point=>({...point}));
    if(inside.length>0)return inside;
    const start=route[0],end=route.at(-1);
    if(!start||!end)return [];
    return [{x:(start.x+end.x)/2,y:(start.y+end.y)/2}];
  }
}
