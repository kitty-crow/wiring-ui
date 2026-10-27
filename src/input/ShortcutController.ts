/** Single dispatcher for desktop shortcuts, shared by Windows, Linux and macOS. */
export type EditorCommand =
  | 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'delete' | 'select-all'
  | 'save' | 'save-as' | 'open' | 'new' | 'print' | 'fit' | 'escape'
  | 'tool-select' | 'tool-pan' | 'tool-wire' | 'tool-component' | 'tool-junction'
  | 'tool-text' | 'tool-symbol' | 'tool-rectangle' | 'tool-ellipse' | 'tool-line' | 'tool-polyline' | 'tool-polygon'
  | 'grid' | 'shortcuts' | 'nudge-up' | 'nudge-down' | 'nudge-left' | 'nudge-right'
  | 'macro-toggle' | 'macro-play' | 'context-menu'
  | 'rotate-cw' | 'rotate-ccw' | 'mirror-horizontal' | 'mirror-vertical';

export class ShortcutController {
  public constructor(private readonly dispatch: (command: EditorCommand, event: KeyboardEvent) => void) {
    window.addEventListener('keydown', event => this.handle(event));
  }
  public static resolve(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): EditorCommand | null {
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.altKey) return key === 'r' ? 'macro-toggle' : key === 'p' ? 'macro-play' : null;
    if (mod) {
      switch (key) {
        case 'z': return event.shiftKey ? 'redo' : 'undo';
        case 'y': return event.shiftKey ? null : 'redo';
        case 'c': return event.shiftKey ? null : 'copy';
        case 'x': return event.shiftKey ? null : 'cut';
        case 'v': return event.shiftKey ? null : 'paste';
        case 'd': return event.shiftKey ? null : 'duplicate';
        case 'a': return event.shiftKey ? null : 'select-all';
        case 's': return event.shiftKey ? 'save-as' : 'save';
        case 'o': return event.shiftKey ? null : 'open';
        case 'n': return event.shiftKey ? null : 'new';
        case 'p': return event.shiftKey ? null : 'print';
        case '0': return event.shiftKey ? null : 'fit';
        case 'r': return event.shiftKey ? 'rotate-ccw' : 'rotate-cw';
        case 'e': return event.shiftKey ? 'mirror-vertical' : 'mirror-horizontal';
        default: return null;
      }
    }
    if (key === 'f10' && event.shiftKey) return 'context-menu';
    if (event.altKey && !key.startsWith('arrow')) return null;
    if (key === 'escape') return 'escape';
    if (key === 'delete' || key === 'backspace') return 'delete';
    if (key === 'arrowup') return 'nudge-up';
    if (key === 'arrowdown') return 'nudge-down';
    if (key === 'arrowleft') return 'nudge-left';
    if (key === 'arrowright') return 'nudge-right';
    if (key === '?' || (key === '/' && event.shiftKey)) return 'shortcuts';
    if (event.shiftKey) return null;
    const tools: Readonly<Record<string, EditorCommand>> = {
      v: 'tool-select', h: 'tool-pan', w: 'tool-wire', b: 'tool-component',
      j: 'tool-junction', t: 'tool-text', s: 'tool-symbol', r: 'tool-rectangle', e: 'tool-ellipse', l: 'tool-line', p: 'tool-polygon', q: 'tool-polyline', g: 'grid', f: 'fit'
    };
    return tools[key] ?? null;
  }
  private handle(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLSelectElement && !event.ctrlKey && !event.metaKey) return;
    if (target instanceof HTMLElement && target.isContentEditable) return;
    const command = ShortcutController.resolve(event);
    if (!command) return;
    event.preventDefault();
    this.dispatch(command, event);
  }
}
