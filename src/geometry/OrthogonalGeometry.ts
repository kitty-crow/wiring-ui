import { pointDistance, type Point } from '../model/types';

export interface OrthogonalLeg { readonly a: Point; readonly b: Point }

/**
 * Pure geometry for user constraints. Terminals are never modified by routing
 * operations; all resulting paths remain Manhattan paths.
 */
export class OrthogonalGeometry {
  private static readonly EPSILON = 0.01;

  public static isOrthogonal(path: readonly Point[]): boolean {
    return path.slice(1).every((point, index) => {
      const prior = path[index];
      return prior !== undefined && (
        Math.abs(point.x - prior.x) <= this.EPSILON ||
        Math.abs(point.y - prior.y) <= this.EPSILON
      );
    });
  }

  public static normalise(points: readonly Point[]): Point[] {
    const result: Point[] = [];
    for (const point of points) {
      const prior = result.at(-1);
      if (prior && pointDistance(point, prior) < this.EPSILON) continue;
      result.push({x:point.x, y:point.y});
      while (result.length >= 3) {
        const [a,b,c] = result.slice(-3);
        if (!a || !b || !c || !this.collinear(a,b,c)) break;
        result.splice(-2,1);
      }
    }
    return result;
  }

  /** Move a complete cable leg perpendicular to itself while anchoring both ends. */
  public static slide(path: readonly Point[], index: number, delta: number): Point[] {
    const a = path[index];
    const b = path[index+1];
    if (!a || !b || Math.abs(delta) < this.EPSILON) return path.map(p=>({...p}));
    const horizontal = Math.abs(a.y-b.y) < this.EPSILON;
    const vertical = Math.abs(a.x-b.x) < this.EPSILON;
    if (!horizontal && !vertical) throw new Error('Cannot slide a diagonal cable segment');
    const shift=(p:Point):Point=>({x:p.x+(vertical?delta:0),y:p.y+(horizontal?delta:0)});
    const output = path.map(p=>({...p}));
    const start = shift(a);
    const end = shift(b);
    output.splice(index,2,start,end);
    if (index===0) output.unshift({...a});
    if (index===path.length-2) output.push({...b});
    const clean = this.normalise(output);
    if (!this.isOrthogonal(clean)) throw new Error('Leg editing produced a diagonal route');
    return clean;
  }

  /** Intersections must be real wire geometry, never mere hit-radius proximity. */
  public static intersection(first: OrthogonalLeg, second: OrthogonalLeg): Point | null {
    const ah=Math.abs(first.a.y-first.b.y)<this.EPSILON;
    const bh=Math.abs(second.a.y-second.b.y)<this.EPSILON;
    const av=Math.abs(first.a.x-first.b.x)<this.EPSILON;
    const bv=Math.abs(second.a.x-second.b.x)<this.EPSILON;
    if ((!ah&&!av)||(!bh&&!bv)||ah===bh) return null;
    const horizontal=ah?first:second;
    const vertical=ah?second:first;
    const point={x:vertical.a.x,y:horizontal.a.y};
    return this.contains(horizontal,point) && this.contains(vertical,point) ? point : null;
  }

  /** Freeze a generated route into explicit waypoints before inserting a bend. */
  public static insert(path: readonly Point[], segment: number, point: Point): Point[] {
    const a=path[segment];
    const b=path[segment+1];
    if (!a || !b) return path.map(p=>({...p}));
    const projected=this.project({a,b},point);
    const copy=path.map(p=>({...p}));
    copy.splice(segment+1,0,projected);
    return copy;
  }

  public static project(leg:OrthogonalLeg,point:Point):Point {
    const horizontal=Math.abs(leg.a.y-leg.b.y)<this.EPSILON;
    const limit=(value:number,a:number,b:number):number=>Math.max(Math.min(a,b),Math.min(Math.max(a,b),value));
    return horizontal
      ? {x:limit(point.x,leg.a.x,leg.b.x),y:leg.a.y}
      : {x:leg.a.x,y:limit(point.y,leg.a.y,leg.b.y)};
  }

  private static contains(leg:OrthogonalLeg,point:Point):boolean {
    const epsilon=this.EPSILON;
    return point.x>=Math.min(leg.a.x,leg.b.x)-epsilon &&
      point.x<=Math.max(leg.a.x,leg.b.x)+epsilon &&
      point.y>=Math.min(leg.a.y,leg.b.y)-epsilon &&
      point.y<=Math.max(leg.a.y,leg.b.y)+epsilon;
  }

  private static collinear(a:Point,b:Point,c:Point):boolean {
    const epsilon=this.EPSILON;
    return (Math.abs(a.x-b.x)<epsilon&&Math.abs(b.x-c.x)<epsilon) ||
      (Math.abs(a.y-b.y)<epsilon&&Math.abs(b.y-c.y)<epsilon);
  }
}
