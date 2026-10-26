import { expect, test } from 'bun:test';
import { OrthogonalGeometry } from '../src/geometry/OrthogonalGeometry';
import { ProjectModel } from '../src/model/ProjectModel';
import { DemoProject } from '../src/model/DemoProject';
import { WireRouter } from '../src/geometry/WireRouter';

const points=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:200,y:100}];

test('moving the middle leg changes its lane, not the two anchor positions',()=>{
  const path=OrthogonalGeometry.slide(points,1,25);
  expect(path).toEqual([{x:0,y:0},{x:125,y:0},{x:125,y:100},{x:200,y:100}]);
  expect(OrthogonalGeometry.isOrthogonal(path)).toBe(true);
  expect(points[1]).toEqual({x:100,y:0}); // immutable input
});
test('moving first or last leg inserts only the necessary entry or exit jog',()=>{
  const first=OrthogonalGeometry.slide(points,0,20);
  const last=OrthogonalGeometry.slide(points,2,30);
  expect(first[0]).toEqual(points[0]);
  expect(first.at(-1)).toEqual(points.at(-1));
  expect(last[0]).toEqual(points[0]);
  expect(last.at(-1)).toEqual(points.at(-1));
  expect(OrthogonalGeometry.isOrthogonal(first)).toBe(true);
  expect(OrthogonalGeometry.isOrthogonal(last)).toBe(true);
});
test('exact crossing logic distinguishes intersections from nearby parallel conductors',()=>{
  const vertical={a:{x:50,y:0},b:{x:50,y:100}};
  const horizontal={a:{x:0,y:40},b:{x:100,y:40}};
  expect(OrthogonalGeometry.intersection(vertical,horizontal)).toEqual({x:50,y:40});
  expect(OrthogonalGeometry.intersection(horizontal,{a:{x:0,y:45},b:{x:100,y:45}})).toBeNull();
  expect(OrthogonalGeometry.intersection(vertical,{a:{x:60,y:40},b:{x:100,y:40}})).toBeNull();
});
test('cable leg dragging never changes source or destination IDs',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const wire=model.project.wires[0];
  if (!wire) throw new Error('sample wire missing');
  const original=router.path(wire);
  const endpoints=[wire.from,wire.to];
  router.slideLeg(wire,1,42,original);
  const updated=router.path(wire);
  expect(updated[0]).toEqual(original[0]);
  expect(updated.at(-1)).toEqual(original.at(-1));
  expect([wire.from,wire.to]).toEqual(endpoints);
  expect(OrthogonalGeometry.isOrthogonal(updated)).toBe(true);
  expect(updated).not.toEqual(original);
});
test('splitting a straight route keeps both branches on their original conductor',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const a=model.createAnchor({x:100,y:100});
  const b=model.createAnchor({x:300,y:100});
  const wire=model.addWire(a.id,b.id);
  wire.points=[{x:200,y:100}];
  const node=router.split(wire,{x:150,y:100});
  expect(node).not.toBeNull();
  const branches=model.project.wires.filter(w=>w.from===node||w.to===node);
  expect(branches).toHaveLength(2);
  for (const branch of branches) {
    const path=router.path(branch);
    expect(path.every(point=>point.y===100)).toBe(true);
    expect(OrthogonalGeometry.isOrthogonal(path)).toBe(true);
  }
  if (!node) throw new Error('junction not created');
  model.disconnectAnchor(node);
  const free=branches.flatMap(w=>[w.from,w.to]
    .filter(id=>id!==a.id&&id!==b.id&&model.project.anchors.some(v=>v.id===id&&v.kind==='free')));
  expect(new Set(free).size).toBe(2);
  expect(model.project.wires.every(w=>model.anchor(w.from)&&model.anchor(w.to))).toBe(true);
});
