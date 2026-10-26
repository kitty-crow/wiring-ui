import { test, expect } from 'bun:test';
import { HistoryManager } from '../src/model/HistoryManager';
import { DemoProject } from '../src/model/DemoProject';

test('undo and redo preserve independent snapshots and free anchors', () => {
  const initial = new DemoProject().create();
  const history = new HistoryManager(initial);
  initial.components[0]!.x += 30;
  history.record(initial);
  initial.anchors.push({id:'loose',kind:'free',x:20,y:40});
  history.record(initial);
  expect(history.undo()?.anchors).toHaveLength(0);
  expect(history.undo()?.components[0]?.x).toBe(80);
  expect(history.redo()?.components[0]?.x).toBe(110);
  expect(history.redo()?.anchors[0]?.id).toBe('loose');
});

test('selection identity is restored along with the project after redo', () => {
  const initial = new DemoProject().create();
  const history = new HistoryManager(initial);
  initial.symbols.push({id:'s-extra',kind:'ground',x:100,y:100,scale:1,rotation:0,color:'#000000',label:''});
  history.record(initial,{kind:'symbol',id:'s-extra'});
  expect(history.undo()?.symbols).toHaveLength(0);
  expect(history.selection).toBeNull();
  expect(history.redo()?.symbols).toHaveLength(1);
  expect(history.selection).toEqual({kind:'symbol',id:'s-extra'});
});
