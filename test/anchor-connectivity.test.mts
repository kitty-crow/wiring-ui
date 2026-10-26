import {expect,test} from 'bun:test';
import {DemoProject} from '../src/model/DemoProject';
import {ProjectModel} from '../src/model/ProjectModel';
import {WireRouter} from '../src/geometry/WireRouter';

test('a detached cable can be joined to another terminal without losing its wire ID',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const cable=model.project.wires.find(item=>item.id==='wire0');
  if (!cable) throw new Error('missing test cable');
  const initialId=cable.id;
  const free=model.detachEnd(cable,'to');
  if (!free)throw new Error('cannot detach');
  expect(model.connectAnchor(free.id,'m3')).toBe(true);
  expect(cable.id).toBe(initialId);
  expect(cable.to).toBe('m3');
  expect(model.project.anchors.some(item=>item.id===free.id)).toBe(false);
});

test('dropping an anchor onto a split conductor connects it as an actual junction',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const a=model.createAnchor({x:0,y:0});
  const b=model.createAnchor({x:200,y:0});
  const c=model.createAnchor({x:100,y:100});
  const conductor=model.addWire(a.id,b.id);
  conductor.points=[{x:100,y:0}];
  const branch=model.addWire(c.id,model.createAnchor({x:100,y:30}).id);
  branch.points=[{x:100,y:60}];
  const loose=model.detachEnd(branch,'to');
  if (!loose)throw new Error('cannot detach branch');
  const junction=router.split(conductor,{x:100,y:0});
  if (!junction)throw new Error('no intersection junction');
  expect(model.connectAnchor(loose.id,junction)).toBe(true);
  expect(branch.to).toBe(junction);
  expect(model.project.wires.filter(item=>item.from===junction||item.to===junction)).toHaveLength(3);
  expect(model.project.anchors.find(item=>item.id===junction)?.kind).toBe('junction');
});

test('removing a junction creates one independent free end per incident cable',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const junction=model.createAnchor({x:500,y:200},'junction');
  const destinations=['m1','m2','m3'];
  const cables=destinations.map(destination=>model.addWire(junction.id,destination));
  model.disconnectAnchor(junction.id);
  const ends=cables.map(wire=>wire.from);
  expect(new Set(ends).size).toBe(3);
  expect(ends.every(id=>model.project.anchors.some(item=>item.id===id&&item.kind==='free'))).toBe(true);
  expect(model.project.anchors.some(item=>item.id===junction.id)).toBe(false);
});
