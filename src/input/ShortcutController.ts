/** Single dispatcher for desktop shortcuts, shared by Windows, Linux and macOS. */
export type EditorCommand =
  | 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'delete' | 'select-all'
  | 'save' | 'save-as' | 'open' | 'new' | 'print' | 'fit' | 'escape'
  | 'tool-select' | 'tool-pan' | 'tool-wire' | 'tool-component' | 'tool-junction'
  | 'tool-text' | 'tool-symbol' | 'tool-rectangle' | 'tool-ellipse' | 'tool-line'
  | 'grid' | 'shortcuts' | 'nudge-up' | 'nudge-down' | 'nudge-left' | 'nudge-right'
  | 'macro-toggle' | 'macro-play';

export class ShortcutController {
  public constructor(private readonly dispatch: (command: EditorCommand, event: KeyboardEvent) => void) {
    window.addEventListener('keydown', event => this.handle(event));
  }
  public static resolve(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): EditorCommand | null {
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.altKey) {
      if (key === 'r') return 'macro-toggle';
      if (key === 'p') return 'macro-play';
      return null;
    }
    if (mod) {
      if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
      if (key === 'y' && !event.shiftKey) return 'redo';
      if (key === 'c' && !event.shiftKey) return 'copy';
      if (key === 'x' && !event.shiftKey) return 'cut';
      if (key === 'v' && !event.shiftKey) return 'paste';
      if (key === 'd' && !event.shiftKey) return 'duplicate';
      if (key === 'a' && !event.shiftKey) return 'select-all';
      if (key === 's') return event.shiftKey ? 'save-as' : 'save';
      if (key === 'o' && !event.shiftKey) return 'open';
      if (key === 'n' && !event.shiftKey) return 'new';
      if (key === 'p' && !event.shiftKey) return 'print';
      if (key === '0' && !event.shiftKey) return 'fit';
      return null;
    }
    if (event.altKey) return null;
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
      j: 'tool-junction', t: 'tool-text', s: 'tool-symbol', r: 'tool-rectangle',
      e: 'tool-ellipse', l: 'tool-line', g: 'grid', f: 'fit'
    };
    return tools[key] ?? null;
  }
  private handle(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
    if (target instanceof HTMLElement && target.isContentEditable) return;
    const command = ShortcutController.resolve(event);
    if (!command) return;
    event.preventDefault();
    this.dispatch(command, event);
  }
}
