import { expect, test } from 'bun:test';
import { DemoProject } from '../src/model/DemoProject';
import { ProjectModel } from '../src/model/ProjectModel';
import { ProjectCodec } from '../src/io/ProjectCodec';
import { WireRouter } from '../src/geometry/WireRouter';
import { SymbolGeometry } from '../src/symbols/SymbolGeometry';
import { SymbolPlacement } from '../src/input/SymbolPlacement';
import { ClipboardService } from '../src/model/ClipboardService';
import { HistoryManager } from '../src/model/HistoryManager';
import type { SymbolInstance, SymbolKind } from '../src/model/types';

const create = (kind:SymbolKind):SymbolInstance => ({
  id:'inserted-'+kind,kind,x:0,y:0,scale:1,rotation:0,color:'#222',
  label:'X1',value:'3R3',terminals:SymbolGeometry.createTerminals(kind)
});
const modelWithLine=(vertical=false):{model:ProjectModel;wireId:string}=>{
  const model=new ProjectModel(new DemoProject().create(),()=>{});
  const a=model.createAnchor(vertical?{x:550,y:50}:{x:100,y:550});
  const b=model.createAnchor(vertical?{x:550,y:350}:{x:600,y:550});
  const wire=model.addWire(a.id,b.id);
  wire.points=[vertical?{x:550,y:200}:{x:350,y:550}];
  wire.color='#ff3290';wire.width=3.5;wire.dash='dashdot';wire.label='POWER';
  return{model,wireId:wire.id};
};
test('resistor insertion splits one cable into two independent styled leads',()=>{
  const{model,wireId}=modelWithLine();
  const before=model.project.wires.length;
  const symbol=create('resistor');
  model.project.symbols.push(symbol);
  const placement=new SymbolPlacement(model);
  expect(placement.place(symbol,{x:350,y:550},10)).toBe(true);
  expect(model.project.wires).toHaveLength(before+1);
  expect(symbol.x).toBe(350);
  expect(symbol.rotation).toBe(0);
  const incoming=model.project.wires.find(w=>w.id===wireId);
  const outgoing=model.project.wires.at(-1);
  const first=symbol.terminals?.[0],second=symbol.terminals?.[1];
  expect(incoming?.to).toBe(first);
  expect(outgoing?.from).toBe(second);
  expect(incoming?.color).toBe('#ff3290');
  expect(outgoing?.color).toBe('#ff3290');
  expect(outgoing?.dash).toBe('dashdot');
  expect(outgoing?.width).toBe(3.5);
  expect(outgoing?.label).toBe('');
  const router=new WireRouter(model);
  expect(router.path(incoming!).map(p=>({x:p.x,y:p.y}))).toEqual([
    {x:100,y:550},{x:207,y:550},{x:314,y:550}
  ]);
  expect(router.path(outgoing!).map(p=>({x:p.x,y:p.y}))).toEqual([
    {x:386,y:550},{x:493,y:550},{x:600,y:550}
  ]);
  expect(model.anchor(first!)?.x).toBe(314);
  expect(model.anchor(second!)?.x).toBe(386);
  const data=new ProjectCodec().parse(new ProjectCodec().encode(model.project));
  expect(data.symbols[0]?.terminals).toEqual(symbol.terminals);
  expect(data.wires.at(-1)?.from).toBe(second);
});
test('vertical insertion correctly rotates a passive component to 90 degrees',()=>{
  const {model,wireId}=modelWithLine(true);
  const symbol=create('capacitor');
  model.project.symbols.push(symbol);
  expect(new SymbolPlacement(model).place(symbol,{x:550,y:200},8)).toBe(true);
  expect(symbol.rotation).toBe(90);
  expect(model.anchor(symbol.terminals?.[0]??'')?.y).toBeCloseTo(170);
  expect(model.anchor(symbol.terminals?.[1]??'')?.y).toBeCloseTo(230);
  expect(model.project.wires.find(w=>w.id===wireId)?.to).toBe(symbol.terminals?.[0]);
});
test('moving and rotating a connected component recalculates its electrical contact locations',()=>{
  const {model}=modelWithLine();
  const symbol=create('inductor');model.project.symbols.push(symbol);
  expect(new SymbolPlacement(model).place(symbol,{x:340,y:550},7)).toBe(true);
  const first=symbol.terminals?.[0]??'';
  const original=model.anchor(first);
  symbol.x+=120;symbol.y-=60;
  expect(model.anchor(first)?.x).toBeCloseTo((original?.x??0)+120);
  symbol.rotation=90;
  expect(model.anchor(first)?.x).toBeCloseTo(symbol.x);
  const affected=model.project.wires.filter(w=>w.from===first||w.to===first);
  expect(affected).toHaveLength(1);
  expect(new WireRouter(model).path(affected[0]!).at(-1)?.x).toBeCloseTo(symbol.x);
});
test('deleting a connected symbol preserves both cables as independent loose ends',()=>{
  const{model}=modelWithLine();
  const symbol=create('fuse');model.project.symbols.push(symbol);
  expect(new SymbolPlacement(model).place(symbol,{x:350,y:550},8)).toBe(true);
  const contactIds=[...symbol.terminals??[]];
  model.selection={kind:'symbol',id:symbol.id};
  model.removeSelected();
  expect(model.project.symbols).toHaveLength(0);
  expect(contactIds.every(id=>model.project.anchors.some(a=>a.id===id&&a.kind==='free'))).toBe(true);
  expect(model.project.wires.every(w=>model.anchor(w.from)&&model.anchor(w.to))).toBe(true);
});
test('short segments and one-terminal ground symbols never splice conductors',()=>{
  const {model}=modelWithLine();
  const before=model.project.wires.length;
  const ground=create('ground');model.project.symbols.push(ground);
  expect(new SymbolPlacement(model).place(ground,{x:350,y:550},10)).toBe(false);
  const a=model.createAnchor({x:750,y:650});
  const b=model.createAnchor({x:800,y:650});
  model.addWire(a.id,b.id).points=[{x:775,y:650}];
  const resistor=create('resistor');model.project.symbols.push(resistor);
  expect(new SymbolPlacement(model).place(resistor,{x:775,y:650},8)).toBe(false);
  expect(model.project.wires).toHaveLength(before+1);
});
test('copy and paste remap symbol terminal IDs and keep original wiring untouched',()=>{
  const {model}=modelWithLine();
  const symbol=create('resistor');model.project.symbols.push(symbol);
  expect(new SymbolPlacement(model).place(symbol,{x:350,y:550},9)).toBe(true);
  model.selection={kind:'symbol',id:symbol.id};
  const clip=new ClipboardService(model);
  expect(clip.copy()).toBe(true);
  expect(clip.paste()).toBe(true);
  const copy=model.project.symbols.at(-1);
  expect(copy?.terminals).toHaveLength(2);
  expect(copy?.terminals?.[0]).not.toBe(symbol.terminals?.[0]);
  expect(copy?.terminals?.[1]).not.toBe(symbol.terminals?.[1]);
  expect(model.project.wires.some(w=>w.from===copy?.terminals?.[0]||w.to===copy?.terminals?.[0])).toBe(false);
});
test('old project files with bare symbols receive persistent contacts during import',()=>{
  const project=new DemoProject().create();
  project.symbols=[{id:'legacy',kind:'resistor',x:10,y:10,scale:1,rotation:0,color:'#111',label:'R1'}];
  const codec=new ProjectCodec();
  const loaded=codec.parse(codec.encode(project));
  expect(loaded.symbols[0]?.terminals).toHaveLength(2);
  expect(codec.parse(codec.encode(loaded)).symbols[0]?.terminals).toEqual(loaded.symbols[0]?.terminals);
});
test('symbol insertion is undoable as a single circuit editing operation',()=>{
  const {model}=modelWithLine();
  const initial=structuredClone(model.project);
  const history=new HistoryManager(initial);
  const symbol=create('resistor');model.project.symbols.push(symbol);
  expect(new SymbolPlacement(model).place(symbol,{x:350,y:550},9)).toBe(true);
  history.record(model.project);
  const prior=history.undo();
  expect(prior?.symbols).toHaveLength(0);
  expect(prior?.wires).toHaveLength(initial.wires.length);
  const restored=history.redo();
  expect(restored?.symbols[0]?.terminals).toEqual(symbol.terminals);
  expect(restored?.wires).toHaveLength(initial.wires.length+1);
});
