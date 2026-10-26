import { createId, pointDistance, type Point, type Wire } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
import { OrthogonalGeometry } from './OrthogonalGeometry';
export interface Segment { a: Point; b: Point }
export interface Crossing { x: number; y: number; wireId: string; verticalWireId: string; segment: number; direction: number }

/** Orthogonal routing with anchored endpoints and user-controlled waypoints. */
export class WireRouter {
  public constructor(private readonly model: ProjectModel) {}
  public path(wire: Wire): Point[] {
    const start = this.model.anchor(wire.from);
    const end = this.model.anchor(wire.to);
    if (!start || !end) return [];
    if (wire.points.length === 0) {
      // Allocate each cable a stable lane to avoid visually coincident trunks.
      const position=this.model.project.wires.findIndex(item=>item.id===wire.id);
      const lane=(start.x+end.x)/2 + ((Math.max(position,0)%9)-4)*19;
      return this.compact([start, { x: lane, y: start.y }, { x: lane, y: end.y }, end]);
    }
    const output = [start];
    let cursor = start;
    for (const waypoint of [...wire.points, end]) {
      if (Math.abs(cursor.x - waypoint.x) > 0.01 && Math.abs(cursor.y - waypoint.y) > 0.01) output.push({ x: waypoint.x, y: cursor.y });
      output.push(waypoint);
      cursor = waypoint;
    }
    return this.compact(output);
  }
  public compact(points: Point[]): Point[] {
    return points.filter((point, index) => index === 0 || pointDistance(point, points[index - 1] ?? point) > 0.01);
  }
  public segments(wire: Wire): Segment[] {
    const points = this.path(wire);
    return points.slice(1).map((b, index) => ({ a: points[index] ?? b, b }));
  }
  /** Crossing topology is determined by shared anchor IDs, not visual proximity. */
  public crossings(): Crossing[] {
    const found: Crossing[] = [];
    const wires = this.model.project.wires;
    for (let index = 0; index < wires.length; index++) {
      const current = wires[index];
      if (!current) continue;
      const segments = this.segments(current);
      for (let otherIndex = 0; otherIndex < wires.length; otherIndex++) {
        const other = wires[otherIndex];
        if (!other || current.id === other.id) continue;
        if ([current.from, current.to].some(id => id === other.from || id === other.to)) continue;
        const otherSegments = this.segments(other);
        for (let part = 0; part < segments.length; part++) {
          const horizontal = segments[part];
          if (!horizontal || Math.abs(horizontal.a.y - horizontal.b.y) > 0.01) continue;
          for (const vertical of otherSegments) {
            if (Math.abs(vertical.a.x - vertical.b.x) > 0.01) continue;
            const x = vertical.a.x; const y = horizontal.a.y;
            const insideH = x > Math.min(horizontal.a.x, horizontal.b.x) + 13 && x < Math.max(horizontal.a.x, horizontal.b.x) - 13;
            const insideV = y > Math.min(vertical.a.y, vertical.b.y) + 10 && y < Math.max(vertical.a.y, vertical.b.y) - 10;
            if (insideH && insideV) found.push({ x, y, wireId: current.id, verticalWireId: other.id, segment: part, direction: Math.sign(horizontal.b.x-horizontal.a.x) || 1 });
          }
        }
      }
    }
    return found;
  }
  public nearestSegment(wire: Wire, point: Point): { point: Point; distance: number; index: number } | null {
    let result: { point: Point; distance: number; index: number } | null = null;
    for (const [index, { a,b }] of this.segments(wire).entries()) {
      const dx = b.x-a.x;const dy = b.y-a.y;
      const lengthSquared = dx*dx+dy*dy;
      const factor = lengthSquared > 0 ? Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/lengthSquared)) : 0;
      const nearest = { x:a.x+factor*dx, y:a.y+factor*dy };
      const distance = pointDistance(nearest,point);
      if (!result || distance < result.distance) result = { point:nearest,distance,index };
    }
    return result;
  }
  public hit(wire: Wire, point: Point, margin=9): boolean { return (this.nearestSegment(wire,point)?.distance ?? Infinity) <= margin; }
  /** Freeze an auto route into explicit editable points before moving a leg. */
  public slideLeg(wire: Wire, index: number, delta: number, source = this.path(wire)): void {
    const updated = OrthogonalGeometry.slide(source,index,delta);
    wire.points = updated.slice(1,-1);
    this.model.changed();
  }

  public addBend(wire:Wire,position:Point):boolean {
    const nearest=this.nearestSegment(wire,position);
    if (!nearest || nearest.distance > 12) return false;
    const route=OrthogonalGeometry.insert(this.path(wire),nearest.index,nearest.point);
    wire.points=route.slice(1,-1);
    this.model.changed();
    return true;
  }

  /** Find only genuine geometric intersections; nearby parallel paths do not join. */
  public intersection(first:Wire,second:Wire,near:Point,tolerance=12):Point|null {
    if (first.id===second.id) return null;
    let result:Point|null=null;
    let distance=tolerance;
    for (const a of this.segments(first)) {
      for (const b of this.segments(second)) {
        const intersection=OrthogonalGeometry.intersection(a,b);
        if (!intersection) continue;
        const separation=pointDistance(intersection,near);
        if (separation>distance) continue;
        distance=separation;
        result=intersection;
      }
    }
    return result;
  }

  /** Split a cable at a real point on its route, preserving both drawn branches. */
  public split(wire:Wire,position:Point,junctionId?:string):string|null {
    const nearest=this.nearestSegment(wire,position);
    if (!nearest || nearest.distance>12) return null;
    const path=this.path(wire);
    const location=nearest.point;
    const first=path[0];
    const last=path.at(-1);
    if (!first || !last) return null;
    if (pointDistance(first,location)<1 || pointDistance(last,location)<1) return null;
    const originalTo=wire.to;
    const before=this.compact([...path.slice(0,nearest.index+1),location]);
    const after=this.compact([location,...path.slice(nearest.index+1)]);
    const existing=junctionId?this.model.project.anchors.find(item=>item.id===junctionId):undefined;
    if (junctionId && !existing) return null;
    const node=existing ?? this.model.createAnchor(location,'junction');
    node.kind='junction';
    wire.to=node.id;
    wire.points=this.manualPoints(before);
    this.model.project.wires.push({
      ...structuredClone(wire),id:createId(),from:node.id,to:originalTo,
      points:this.manualPoints(after)
    });
    this.model.changed();
    return node.id;
  }

  /** Both cables must physically intersect at the requested point. */
  public join(first:Wire,second:Wire,position:Point):string|null {
    const location=this.intersection(first,second,position);
    if (!location) return null;
    const aStart=this.model.anchor(first.from);
    const aEnd=this.model.anchor(first.to);
    const bStart=this.model.anchor(second.from);
    const bEnd=this.model.anchor(second.to);
    if ([aStart,aEnd,bStart,bEnd].some(point=>point && pointDistance(point,location)<1)) return null;
    const shared=this.split(first,location);
    if (!shared) return null;
    const branch=this.split(second,location,shared);
    return branch ? shared : null;
  }

  /** Force a straight child branch to stay manual instead of auto-routing it. */
  private manualPoints(path:readonly Point[]):Point[] {
    if (path.length>2) return path.slice(1,-1).map(point=>({...point}));
    const a=path[0];
    const b=path[1];
    if (!a || !b) return [];
    return [{x:(a.x+b.x)/2,y:(a.y+b.y)/2}];
  }
}
