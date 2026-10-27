import { componentHeight, type Component, type Point } from '../model/types';
export interface Bounds { left:number; right:number; top:number; bottom:number }
/** Shared drawing, terminal, hit-test and transform geometry for schematic blocks. */
export class ComponentGeometry {
  public static centre(c:Component):Point {return{x:c.x+c.width/2,y:c.y+componentHeight(c)/2};}
  public static rotation(c:Component):number {return ((c.rotation??0)%360+360)%360;}
  /** The logical component top-left remains stable; rotation/mirroring occur about its centre. */
  public static transform(c:Component,point:Point):Point {
    const mid=this.centre(c);
    let x=point.x-mid.x, y=point.y-mid.y;
    if(c.mirrorX)x=-x;
    if(c.mirrorY)y=-y;
    const turns=this.rotation(c)/90;
    for(let step=0;step<turns;step++){const old=x;x=-y;y=old;}
    return{x:mid.x+x,y:mid.y+y};
  }
  public static inverse(c:Component,point:Point):Point {
    const mid=this.centre(c);
    let x=point.x-mid.x,y=point.y-mid.y;
    const turns=this.rotation(c)/90;
    for(let step=0;step<turns;step++){const old=x;x=y;y=-old;}
    if(c.mirrorX)x=-x;
    if(c.mirrorY)y=-y;
    return{x:mid.x+x,y:mid.y+y};
  }
  public static terminal(c:Component,index:number,side:'left'|'right'):Point {
    return this.transform(c,{x:c.x+(side==='right'?c.width:0),y:c.y+83+index*31});
  }
  public static bounds(c:Component):Bounds {
    const corners=[
      {x:c.x,y:c.y},{x:c.x+c.width,y:c.y},
      {x:c.x+c.width,y:c.y+componentHeight(c)},{x:c.x,y:c.y+componentHeight(c)}
    ].map(p=>this.transform(c,p));
    const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
    return{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
  }
  public static contains(c:Component,point:Point):boolean {
    const local=this.inverse(c,point);
    return local.x>=c.x&&local.x<=c.x+c.width&&local.y>=c.y&&local.y<=c.y+componentHeight(c);
  }
  /** Component position changes with its group centre; rotation updates only geometry. */
  public static rotate(c:Component,clockwise:boolean,about:Point):void {
    const old=this.centre(c);
    const dx=old.x-about.x,dy=old.y-about.y;
    const updated={x:about.x+(clockwise?-dy:dy),y:about.y+(clockwise?dx:-dx)};
    c.rotation=((this.rotation(c)+(clockwise?90:270))%360) as 0|90|180|270;
    c.x+=updated.x-old.x;c.y+=updated.y-old.y;
  }
  public static mirror(c:Component,axis:'horizontal'|'vertical',about:Point):void {
    const old=this.centre(c);
    const updated=axis==='horizontal'?{x:about.x*2-old.x,y:old.y}:{x:old.x,y:about.y*2-old.y};
    // Mirror the visible world geometry: local mirror axis flips according to rotation.
    const sideways=this.rotation(c)%180===90;
    const localHorizontal=axis==='horizontal'?!sideways:sideways;
    if(localHorizontal)c.mirrorX=!c.mirrorX;
    else c.mirrorY=!c.mirrorY;
    c.x+=updated.x-old.x;c.y+=updated.y-old.y;
  }
}
