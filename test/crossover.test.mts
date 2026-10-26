import {expect,test} from 'bun:test';
import {DemoProject} from '../src/model/DemoProject';
import {ProjectModel} from '../src/model/ProjectModel';
import {WireRouter} from '../src/geometry/WireRouter';

test('a physical crossing is insulated until explicitly joined',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const a=model.createAnchor({x:0,y:100});
  const b=model.createAnchor({x:300,y:100});
  const c=model.createAnchor({x:150,y:0});
  const d=model.createAnchor({x:150,y:200});
  const horizontal=model.addWire(a.id,b.id);
  horizontal.points=[{x:150,y:100}];
  const vertical=model.addWire(c.id,d.id);
  vertical.points=[{x:150,y:100}];
  const prior=router.crossings().filter(value=>
    (value.wireId===horizontal.id&&value.verticalWireId===vertical.id) ||
    (value.wireId===vertical.id&&value.verticalWireId===horizontal.id)
  );
  expect(prior).toHaveLength(1);
  expect(prior[0]).toMatchObject({x:150,y:100});
  const node=router.join(horizontal,vertical,{x:150,y:100});
  expect(node).not.toBeNull();
  const remaining=router.crossings().filter(value=>Math.abs(value.x-150)<1&&Math.abs(value.y-100)<1);
  expect(remaining).toHaveLength(0);
});
