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
test('joining two cables produces a shared junction anchor',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const first=model.project.wires[0];const second=model.project.wires[1];
  if(!first||!second)throw new Error('fixture');
  const id=router.join(first,second,{x:625,y:230});
  expect(model.project.anchors.find(a=>a.id===id)?.kind).toBe('junction');
  expect(model.project.wires.filter(w=>w.from===id||w.to===id).length).toBe(4);
});
