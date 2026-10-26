import { componentHeight, type Component, type Point, type Wire } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { OrthogonalGeometry } from './OrthogonalGeometry';

interface Rect { left:number; right:number; top:number; bottom:number }
type Axis = 0 | 1 | 2;
interface SearchNode { i:number; j:number; heading:Axis; cost:number; key:string }
const epsilon=.0001;

/** Small binary heap: the router never sorts its full frontier on every step. */
class Frontier {
  private readonly heap:SearchNode[]=[];
  public get length():number {return this.heap.length;}
  public push(value:SearchNode):void {
    this.heap.push(value);
    let child=this.heap.length-1;
    while (child>0) {
      const parent=Math.floor((child-1)/2);
      const parentValue=this.heap[parent];
      if (!parentValue || parentValue.cost<=value.cost) break;
      this.heap[child]=parentValue;child=parent;
    }
    this.heap[child]=value;
  }
  public pop():SearchNode|undefined {
    const first=this.heap[0];
    const last=this.heap.pop();
    if (!first || !last)return first;
    if (this.heap.length===0)return first;
    let index=0;
    while (index*2+1<this.heap.length) {
      const left=index*2+1;
      const right=left+1;
      const leftValue=this.heap[left];
      const rightValue=this.heap[right];
      if (!leftValue)break;
      const next=rightValue && rightValue.cost<leftValue.cost?right:left;
      const child=this.heap[next];
      if (!child || child.cost>=last.cost)break;
      this.heap[index]=child;index=next;
    }
    this.heap[index]=last;
    return first;
  }
}

/**
 * Dynamically routes automatic wires around the interiors of device blocks.
 * Manual waypoints remain authoritative and are never overwritten.
 * Graph nodes are at terminal escape points and padded obstacle corners.
 */
export class ObstacleRouter {
  public constructor(private readonly model:ProjectModel) {}

  public route(wire:Wire,preferred:readonly Point[]):Point[] {
    if (preferred.length<2)return [...preferred];
    const start=preferred[0];
    const end=preferred.at(-1);
    if (!start || !end)return [...preferred];
    const near=this.nearby(start,end,this.model.project.components);
    const physical=near.map(c=>this.bounds(c,0));
    if (this.clear(preferred,physical))return [...preferred];
    const obstacles=near.map(c=>this.bounds(c,17));
    const exit=this.escape(wire.from,start);
    const entry=this.escape(wire.to,end);
    const lane=preferred[Math.floor(preferred.length/2)]?.x??(start.x+end.x)/2;
    const detour=this.search(exit,entry,lane,obstacles);
    if (!detour)return [...preferred];
    return OrthogonalGeometry.normalise([start,...detour,end]);
  }

  private escape(anchorId:string,point:Point):Point {
    const side=this.model.pin(anchorId)?.pin.side;
    if (!side)return {x:point.x,y:point.y};
    return {x:point.x+(side==='right'?29:-29),y:point.y};
  }

  private bounds(component:Component,padding:number):Rect {
    return {
      left:component.x-padding,
      right:component.x+component.width+padding,
      top:component.y-padding,
      bottom:component.y+componentHeight(component)+padding
    };
  }

  private nearby(start:Point,end:Point,components:readonly Component[]):Component[] {
    const left=Math.min(start.x,end.x)-280;
    const right=Math.max(start.x,end.x)+280;
    const top=Math.min(start.y,end.y)-280;
    const bottom=Math.max(start.y,end.y)+280;
    return components.filter(component=>{
      const box=this.bounds(component,0);
      return box.right>=left && box.left<=right && box.bottom>=top && box.top<=bottom;
    });
  }

  private clear(path:readonly Point[],blocks:readonly Rect[]):boolean {
    return path.slice(1).every((point,index)=>{
      const prior=path[index];
      return prior!==undefined && !blocks.some(box=>this.intersects(prior,point,box));
    });
  }

  private intersects(a:Point,b:Point,box:Rect):boolean {
    const horizontal=Math.abs(a.y-b.y)<epsilon;
    const vertical=Math.abs(a.x-b.x)<epsilon;
    if (!horizontal && !vertical)return true;
    if (horizontal) return a.y>box.top+epsilon && a.y<box.bottom-epsilon &&
      Math.max(a.x,b.x)>box.left+epsilon && Math.min(a.x,b.x)<box.right-epsilon;
    return a.x>box.left+epsilon && a.x<box.right-epsilon &&
      Math.max(a.y,b.y)>box.top+epsilon && Math.min(a.y,b.y)<box.bottom-epsilon;
  }

  private search(start:Point,end:Point,lane:number,obstacles:readonly Rect[]):Point[]|null {
    const unique=(values:number[]):number[]=>[...new Set(values.map(n=>Math.round(n*1000)/1000))].sort((a,b)=>a-b);
    const xs=unique([start.x,end.x,lane,...obstacles.flatMap(box=>[box.left,box.right])]);
    const ys=unique([start.y,end.y,...obstacles.flatMap(box=>[box.top,box.bottom])]);
    const x0=xs.findIndex(n=>Math.abs(n-start.x)<epsilon);
    const y0=ys.findIndex(n=>Math.abs(n-start.y)<epsilon);
    const xEnd=xs.findIndex(n=>Math.abs(n-end.x)<epsilon);
    const yEnd=ys.findIndex(n=>Math.abs(n-end.y)<epsilon);
    if ([x0,y0,xEnd,yEnd].some(n=>n<0))return null;
    const key=(i:number,j:number,d:Axis):string=>i+','+j+','+d;
    const distance=new Map<string,number>();
    const previous=new Map<string,string>();
    const found=new Map<string,SearchNode>();
    const frontier=new Frontier();
    const initial:SearchNode={i:x0,j:y0,heading:0,cost:0,key:key(x0,y0,0)};
    frontier.push(initial);distance.set(initial.key,0);found.set(initial.key,initial);
    let finish:string|null=null;
    // Heading is part of the state, allowing a turn penalty without losing optimality.
    while (frontier.length>0) {
      const current=frontier.pop();
      if (!current)break;
      if (current.cost>(distance.get(current.key)??Infinity)+epsilon)continue;
      if (current.i===xEnd && current.j===yEnd){finish=current.key;break;}
      const directions:readonly [number,number,Axis][]=[
        [current.i-1,current.j,1],[current.i+1,current.j,1],
        [current.i,current.j-1,2],[current.i,current.j+1,2]
      ];
      for (const [i,j,heading] of directions) {
        if (i<0 || j<0 || i>=xs.length || j>=ys.length)continue;
        const from={x:xs[current.i]??0,y:ys[current.j]??0};
        const to={x:xs[i]??0,y:ys[j]??0};
        if (obstacles.some(box=>this.intersects(from,to,box)))continue;
        const travel=Math.abs(from.x-to.x)+Math.abs(from.y-to.y);
        const turn=current.heading!==0 && current.heading!==heading?28:0;
        const cost=current.cost+travel+turn;
        const id=key(i,j,heading);
        if (cost>=(distance.get(id)??Infinity)-epsilon)continue;
        const next:SearchNode={i,j,heading,cost,key:id};
        distance.set(id,cost);previous.set(id,current.key);found.set(id,next);
        frontier.push(next);
      }
    }
    if (!finish)return null;
    const points:Point[]=[];
    let cursor:string|undefined=finish;
    while (cursor) {
      const state=found.get(cursor);
      if (!state)break;
      points.push({x:xs[state.i]??0,y:ys[state.j]??0});
      cursor=previous.get(cursor);
    }
    points.reverse();
    return OrthogonalGeometry.normalise(points);
  }
}
