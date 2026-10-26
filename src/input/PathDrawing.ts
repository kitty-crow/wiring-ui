import { createId, pointDistance, type Point, type Shape, type ShapeKind } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';

/** Adds arbitrary user-defined vertices without coupling path construction to the canvas. */
export class PathDrawing {
  private current:Shape|null=null;
  public constructor(private readonly model:ProjectModel,private readonly commit:()=>void) {}

  public get isDrawing():boolean {return this.current!==null;}

  public vertex(kind:'polyline'|'polygon',point:Point):void {
    const active=this.current;
    if (active?.kind===kind) {
      const previous=active.points?.at(-1);
      if (previous && pointDistance(previous,point)<3)return;
      active.points?.push({...point});
      this.bounds(active);
      this.model.changed();
      return;
    }
    this.finish();
    const shape:Shape={
      id:createId(),kind,x:point.x,y:point.y,width:0,height:0,
      color:'#263348',fill:'transparent',stroke:2,dash:'solid',
      points:[{...point}]
    };
    this.model.project.shapes.push(shape);
    this.model.selection={kind:'shape',id:shape.id};
    this.current=shape;
    this.model.changed();
  }

  /** Double-click or switching tools finishes a valid line; Escape discards a draft. */
  public finish():boolean {
    const shape=this.current;
    if (!shape)return false;
    this.current=null;
    const minimum=shape.kind==='polygon'?3:2;
    const valid=(shape.points?.length??0)>=minimum;
    if (!valid) {
      this.remove(shape.id);
      this.model.changed();
      return false;
    }
    this.bounds(shape);
    this.model.selection={kind:'shape',id:shape.id};
    this.commit();
    return true;
  }

  public cancel():void {
    const shape=this.current;
    if (!shape)return;
    this.current=null;
    this.remove(shape.id);
    this.model.selection=null;
    this.model.changed();
  }

  private bounds(shape:Shape):void {
    const vertices=shape.points??[];
    if (vertices.length===0)return;
    const xs=vertices.map(point=>point.x);
    const ys=vertices.map(point=>point.y);
    const minX=Math.min(...xs),minY=Math.min(...ys);
    shape.x=minX;shape.y=minY;
    shape.width=Math.max(...xs)-minX;
    shape.height=Math.max(...ys)-minY;
  }

  private remove(id:string):void {
    this.model.project.shapes=this.model.project.shapes.filter(item=>item.id!==id);
  }
}
