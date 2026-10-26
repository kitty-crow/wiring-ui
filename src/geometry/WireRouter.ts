import { createId, pointDistance, type Point, type Wire } from '../model/types';
import { ProjectModel } from '../model/ProjectModel';
export interface Segment { a: Point; b: Point }
export interface Crossing { x: number; y: number; wireId: string; segment: number }

/** Orthogonal routing with anchored endpoints and user-controlled waypoints. */
export class WireRouter {
  public constructor(private readonly model: ProjectModel) {}
  public path(wire: Wire): Point[] {
    const start = this.model.anchor(wire.from);
    const end = this.model.anchor(wire.to);
    if (!start || !end) return [];
    if (wire.points.length === 0) {
      const lane = (start.x + end.x) / 2;
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
            if (insideH && insideV) found.push({ x, y, wireId: current.id, segment: part });
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
  /** Split a cable into two electrically connected segments at one persistent junction. */
  public split(wire: Wire, position: Point, junctionId?: string): string {
    const junction = junctionId ? this.model.project.anchors.find(item => item.id === junctionId) : undefined;
    const anchor = junction ?? this.model.createAnchor(position, 'junction');
    anchor.kind = 'junction';
    const path = this.path(wire);
    const nearest = this.nearestSegment(wire,position);
    const index = nearest?.index ?? 0;
    const left = path.slice(1,index+1);
    const right = path.slice(index+1,-1);
    const oldTo = wire.to;
    wire.to = anchor.id;
    wire.points = left;
    this.model.project.wires.push({ ...structuredClone(wire), id: createId(), from: anchor.id, to: oldTo, points: right });
    this.model.changed();
    return anchor.id;
  }
  /** Joining two cables merges their connectivity, with a persistent visible node. */
  public join(first: Wire, second: Wire, position: Point): string {
    const shared = this.split(first,position);
    this.split(second,position,shared);
    return shared;
  }
}
