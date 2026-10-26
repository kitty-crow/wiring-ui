import { expect, test } from 'bun:test';
import { DemoProject } from '../src/model/DemoProject';
import { ProjectModel } from '../src/model/ProjectModel';
import { WireRouter } from '../src/geometry/WireRouter';
import { OrthogonalGeometry } from '../src/geometry/OrthogonalGeometry';
import { componentHeight, type Point } from '../src/model/types';

const inside = (value:number,min:number,max:number):boolean => value>min+.01&&value<max-.01;
const crosses = (a:Point,b:Point,box:{x:number;y:number;width:number;height:number}):boolean => {
  const minX=box.x,maxX=box.x+box.width,minY=box.y,maxY=box.y+box.height;
  if (Math.abs(a.y-b.y)<.01)
    return inside(a.y,minY,maxY) && Math.max(a.x,b.x)>minX && Math.min(a.x,b.x)<maxX;
  return inside(a.x,minX,maxX) && Math.max(a.y,b.y)>minY && Math.min(a.y,b.y)<maxY;
};
test('auto routing avoids the body of an intervening device and reroutes as it moves',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const wire=model.project.wires[0];
  if (!wire)throw Error('No demo cable');
  const router=new WireRouter(model);
  const initial=router.path(wire);
  const obstacle={id:'obstacle',name:'Obstruction',detail:'',x:500,y:190,width:195,pins:[]};
  model.project.components.push(obstacle);
  const routed=router.path(wire);
  const body={x:obstacle.x,y:obstacle.y,width:obstacle.width,height:componentHeight(obstacle)};
  expect(OrthogonalGeometry.isOrthogonal(routed)).toBe(true);
  expect(routed[0]).toMatchObject({x:initial[0]?.x,y:initial[0]?.y});
  expect(routed.at(-1)).toMatchObject({x:initial.at(-1)?.x,y:initial.at(-1)?.y});
  expect(routed.slice(1).some((p,i)=>crosses(routed[i]??p,p,body))).toBe(false);
  expect(routed).not.toEqual(initial);
  obstacle.y=700;
  expect(router.path(wire)).toEqual(initial);
});
test('manual waypoints remain authoritative even if a component lies in their route',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const router=new WireRouter(model);
  const wire=model.project.wires[0];
  if (!wire)throw Error('No demo cable');
  wire.points=[{x:500,y:250},{x:850,y:250}];
  const before=router.path(wire);
  model.project.components.push({id:'new',name:'Block',detail:'',x:550,y:180,width:160,pins:[]});
  expect(router.path(wire)).toEqual(before);
});
