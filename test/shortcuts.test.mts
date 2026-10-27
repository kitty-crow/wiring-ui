import { expect, test } from 'bun:test';
import { ShortcutController, type EditorCommand } from '../src/input/ShortcutController';

const press = (key: string, ctrl = false, shift = false, alt = false, meta = false): EditorCommand | null =>
  ShortcutController.resolve({ key, ctrlKey: ctrl, shiftKey: shift, altKey: alt, metaKey: meta });

test('platform undo and redo use Ctrl or Cmd, including Shift+Z and Ctrl+Y', () => {
  expect(press('z', true)).toBe('undo');
  expect(press('z', false, false, false, true)).toBe('undo');
  expect(press('Z', true, true)).toBe('redo');
  expect(press('z', false, true, false, true)).toBe('redo');
  expect(press('y', true)).toBe('redo');
});
test('standard file and clipboard commands do not overlap drawing shortcuts', () => {
  expect(press('c',true)).toBe('copy');
  expect(press('x',false,false,false,true)).toBe('cut');
  expect(press('v',true)).toBe('paste');
  expect(press('d',true)).toBe('duplicate');
  expect(press('a',true)).toBe('select-all');
  expect(press('s',true)).toBe('save');
  expect(press('S',true,true)).toBe('save-as');
  expect(press('o',true)).toBe('open');
  expect(press('v')).toBe('tool-select');
  expect(press('w')).toBe('tool-wire');
  expect(press('s')).toBe('tool-symbol');
  expect(press('r')).toBe('tool-rectangle');
  expect(press('e')).toBe('tool-ellipse');
  expect(press('r',true)).toBe('rotate-cw');
  expect(press('R',true,true)).toBe('rotate-ccw');
  expect(press('e',true)).toBe('mirror-horizontal');
  expect(press('E',true,true)).toBe('mirror-vertical');
  expect(press('r',false,false,false,true)).toBe('rotate-cw');
  expect(press('R',false,true,false,true)).toBe('rotate-ccw');
  expect(press('e',false,false,false,true)).toBe('mirror-horizontal');
  expect(press('E',false,true,false,true)).toBe('mirror-vertical');
  expect(press('F10',false,true)).toBe('context-menu');
  expect(press('ArrowUp',false,false,true)).toBe('nudge-up');
  expect(press('r',true,false,true)).toBe('macro-toggle');
  expect(press('p',true,false,true)).toBe('macro-play');
  expect(press('c',true,true)).toBeNull();
});
