import { expect, test } from 'bun:test';
import { ClipboardService } from '../src/model/ClipboardService';
import { DemoProject } from '../src/model/DemoProject';
import { ProjectModel } from '../src/model/ProjectModel';

test('copy paste duplicates a component with fresh pin IDs and can nudge precisely', () => {
  const model = new ProjectModel(new DemoProject().create(), () => {});
  const clipboard = new ClipboardService(model);
  model.selection = { kind: 'component', id: 'sonar' };
  expect(clipboard.copy()).toBe(true);
  expect(clipboard.paste()).toBe(true);
  expect(model.project.components).toHaveLength(4);
  const added = model.project.components[3]!;
  expect(added.id).not.toBe('sonar');
  expect(added.pins[0]!.id).not.toBe('s1');
  expect(added.x).toBe(104);
  expect(clipboard.nudge(1, 0)).toBe(true);
  expect(added.x).toBe(105);
  model.removeSelected();
  expect(model.project.components).toHaveLength(3);
});

test('copy paste of a cable creates independently disconnected ends', () => {
  const model = new ProjectModel(new DemoProject().create(), () => {});
  const clipboard = new ClipboardService(model);
  model.selection = { kind: 'wire', id: 'wire0' };
  expect(clipboard.copy()).toBe(true);
  expect(clipboard.paste()).toBe(true);
  const copied = model.project.wires.at(-1)!;
  expect(copied.from).not.toBe('s1');
  expect(copied.to).not.toBe('m1');
  expect(model.project.anchors.some(item => item.id === copied.from)).toBe(true);
  expect(model.project.anchors.some(item => item.id === copied.to)).toBe(true);
});

test('Select All + copy paste rekeys the schematic but retains all electrical connections', () => {
  const model = new ProjectModel(new DemoProject().create(), () => {});
  const clipboard = new ClipboardService(model);
  expect(clipboard.selectAll()).toBe(true);
  expect(clipboard.copy()).toBe(true);
  expect(clipboard.paste()).toBe(true);
  expect(model.project.components).toHaveLength(6);
  expect(model.project.wires).toHaveLength(14);
  const ids = new Set([...model.project.anchors.map(item => item.id), ...model.project.components.flatMap(item => item.pins.map(pin => pin.id))]);
  expect(model.project.wires.every(item => ids.has(item.from) && ids.has(item.to))).toBe(true);
  expect(new Set(model.project.components.flatMap(item => item.pins.map(pin => pin.id))).size).toBe(30);
});
