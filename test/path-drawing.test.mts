import {expect,test} from 'bun:test';
import {DemoProject} from '../src/model/DemoProject';
import {ProjectModel} from '../src/model/ProjectModel';
import {PathDrawing} from '../src/input/PathDrawing';
import {ClipboardService} from '../src/model/ClipboardService';
import {ProjectCodec} from '../src/io/ProjectCodec';

test('a polygon accepts arbitrarily many corners and persists to a portable project',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  let changes=0;
  const drawing=new PathDrawing(model,()=>{changes++;});
  const points=[{x:10,y:10},{x:150,y:15},{x:170,y:95},{x:60,y:130},{x:0,y:70}];
  for(const point of points)drawing.vertex('polygon',point);
  expect(drawing.isDrawing).toBe(true);
  expect(drawing.finish()).toBe(true);
  expect(changes).toBe(1);
  const shape=model.project.shapes[0];
  expect(shape?.kind).toBe('polygon');
  expect(shape?.points).toEqual(points);
  expect(shape?.width).toBe(170);
  expect(shape?.height).toBe(120);
  const codec=new ProjectCodec();
  expect(codec.parse(codec.encode(model.project)).shapes[0]?.points).toEqual(points);
});

test('cancel removes a draft; insufficient polygon corners do not commit',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  let committed=0;
  const drawing=new PathDrawing(model,()=>{committed++;});
  drawing.vertex('polygon',{x:50,y:50});
  drawing.vertex('polygon',{x:100,y:50});
  expect(drawing.finish()).toBe(false);
  expect(model.project.shapes).toHaveLength(0);
  drawing.vertex('polyline',{x:0,y:0});
  drawing.vertex('polyline',{x:100,y:20});
  drawing.cancel();
  expect(model.project.shapes).toHaveLength(0);
  expect(committed).toBe(0);
});

test('copy, paste and nudge preserve shape-relative vertex geometry',()=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const drawing=new PathDrawing(model,()=>{});
  drawing.vertex('polyline',{x:30,y:40});
  drawing.vertex('polyline',{x:50,y:60});
  drawing.finish();
  const original=model.project.shapes[0];
  if (!original)throw Error('missing polygon');
  model.selection={kind:'shape',id:original.id};
  const clipboard=new ClipboardService(model);
  expect(clipboard.copy()).toBe(true);
  expect(clipboard.paste()).toBe(true);
  const copy=model.project.shapes[1];
  expect(copy?.points).toEqual([{x:54,y:64},{x:74,y:84}]);
  expect(clipboard.nudge(5,-2)).toBe(true);
  expect(copy?.points).toEqual([{x:59,y:62},{x:79,y:82}]);
  expect(original.points).toEqual([{x:30,y:40},{x:50,y:60}]);
});
