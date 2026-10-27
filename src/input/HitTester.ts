import { pointDistance, type Point } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { WireRouter } from '../geometry/WireRouter';
import { SymbolGeometry } from '../symbols/SymbolGeometry';
import { ComponentGeometry } from '../geometry/ComponentGeometry';

export type Hit = { kind: 'pin' | 'component' | 'wire' | 'waypoint' | 'anchor' | 'annotation' | 'shape' | 'symbol' | 'segment'; id: string; index?: number };
/** Deterministic hit testing, independent of UI and input devices. */
export class HitTester {
  private readonly router: WireRouter;
  public constructor(private readonly model: ProjectModel) {this.router=new WireRouter(model);}
  public at(point: Point, radius=11, excludedAnchor?: string): Hit | null {
    for (const component of [...this.model.project.components].reverse()) {
      for (const pin of component.pins) {
        const position=this.model.anchor(pin.id);
        if (position && pin.id!==excludedAnchor && pointDistance(position,point)<radius) return {kind:'pin',id:pin.id};
      }
    }
    for (const symbol of this.model.project.symbols) {
      for (const terminal of SymbolGeometry.terminals(symbol)) {
        if(terminal.id!==excludedAnchor&&pointDistance(terminal,point)<radius)return{kind:'pin',id:terminal.id};
      }
    }
    for (const anchor of this.model.project.anchors) {
      if (anchor.id!==excludedAnchor && pointDistance(anchor,point)<radius) return {kind:'anchor',id:anchor.id};
    }
    for (const wire of [...this.model.project.wires].reverse()) {
      for (const [index,p] of wire.points.entries()) {
        if (pointDistance(p,point)<radius) return {kind:'waypoint',id:wire.id,index};
      }
      const near=this.router.nearestSegment(wire,point);
      if (near && near.distance<radius) return {kind:'segment',id:wire.id,index:near.index};
    }
    for (const component of [...this.model.project.components].reverse()) {
      if (ComponentGeometry.contains(component,point)) return {kind:'component',id:component.id};
    }
    for (const symbol of [...this.model.project.symbols].reverse()) {
      if (pointDistance(symbol,point)<38*symbol.scale) return {kind:'symbol',id:symbol.id};
    }
    for (const note of [...this.model.project.annotations].reverse()) {
      const lines=note.text.split('\n');const max=Math.max(...lines.map(line=>line.length));
      if (point.x>=note.x-5 && point.x<=note.x+max*note.size*.75 && point.y>=note.y-note.size && point.y<=note.y+lines.length*note.size*1.4) return {kind:'annotation',id:note.id};
    }
    for (const shape of [...this.model.project.shapes].reverse()) {
      const minX=Math.min(shape.x,shape.x+shape.width);const maxX=Math.max(shape.x,shape.x+shape.width);
      const minY=Math.min(shape.y,shape.y+shape.height);const maxY=Math.max(shape.y,shape.y+shape.height);
      if (point.x>=minX-6&&point.x<=maxX+6&&point.y>=minY-6&&point.y<=maxY+6) return {kind:'shape',id:shape.id};
    }
    return null;
  }
}
