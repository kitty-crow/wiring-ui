import { expect, test } from 'bun:test';
import { DemoProject } from '../src/model/DemoProject';
import { ProjectModel } from '../src/model/ProjectModel';
import { WireRouter } from '../src/geometry/WireRouter';

test('sample has ordered Sonar and MOXA terminals',()=>{
  const project=new DemoProject().create();
  expect(project.components[0]?.pins.map(pin=>pin.number)).toEqual(['1','2','3','4','5','6','7','8']);
  expect(project.components[1]?.pins.map(pin=>pin.label)).toEqual(['T+','T-','R+','R-','GND']);
});
test('moving a block recomputes the route without changing endpoints',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const wire=model.project.wires[0];const sonar=model.component('sonar');
  expect(wire).toBeDefined();expect(sonar).toBeDefined();
  if (!wire||!sonar)throw new Error('fixture');
  const from=wire.from;const before=router.path(wire);
  sonar.x+=55;
  const after=router.path(wire);
  expect(after[0]?.x).toBe((before[0]?.x??0)+55);
  expect(wire.from).toBe(from);
});
test('deleting a terminal retains its cable attached to a free anchor',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const sonar=model.component('sonar');if(!sonar)throw new Error('fixture');
  const pinId=sonar.pins[0]?.id;if(!pinId)throw new Error('fixture');
  model.removePin(sonar,pinId);
  expect(model.project.wires.some(w=>w.from===pinId)).toBe(true);
  expect(model.project.anchors.find(a=>a.id===pinId)?.kind).toBe('free');
});
test('joining two cables requires an actual crossing and creates four terminal branches',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const l=model.createAnchor({x:100,y:100});
  const r=model.createAnchor({x:300,y:100});
  const t=model.createAnchor({x:200,y:0});
  const b=model.createAnchor({x:200,y:200});
  const horizontal=model.addWire(l.id,r.id);
  const vertical=model.addWire(t.id,b.id);
  horizontal.points=[{x:200,y:100}];
  vertical.points=[{x:200,y:100}];
  const id=router.join(horizontal,vertical,{x:200,y:100});
  expect(id).not.toBeNull();
  expect(model.project.anchors.find(a=>a.id===id)?.kind).toBe('junction');
  expect(model.project.wires.filter(w=>w.from===id||w.to===id)).toHaveLength(4);
  expect(router.path(horizontal)[0]).toEqual({x:100,y:100});
  expect(router.path(horizontal).at(-1)).toEqual({x:200,y:100});
});
test('non-intersecting routes cannot be shorted by hit-test tolerance',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const a=model.createAnchor({x:0,y:20});
  const b=model.createAnchor({x:200,y:20});
  const c=model.createAnchor({x:0,y:30});
  const d=model.createAnchor({x:200,y:30});
  const first=model.addWire(a.id,b.id);
  const second=model.addWire(c.id,d.id);
  first.points=[{x:100,y:20}];
  second.points=[{x:100,y:30}];
  const before=model.project.wires.length;
  expect(router.join(first,second,{x:100,y:25})).toBeNull();
  expect(model.project.wires).toHaveLength(before);
});
