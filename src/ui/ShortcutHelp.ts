/** Self-contained, accessible shortcut reference for users of mouse and keyboard. */
export class ShortcutHelp {
  private readonly dialog: HTMLDialogElement;
  public constructor() {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'shortcut-dialog';
    this.dialog.setAttribute('aria-label', 'Keyboard shortcuts');
    this.dialog.innerHTML = [
      '<h2>Keyboard shortcuts</h2>',
      '<p>Use Ctrl on Windows/Linux or Cmd on macOS. Shortcuts do not interfere with text fields.</p>',
      '<dl>',
      '<dt>Undo / Redo</dt><dd>Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (also Ctrl+Y)</dd>',
      '<dt>Copy / Cut / Paste</dt><dd>Ctrl/Cmd+C / X / V</dd>',
      '<dt>Duplicate / Select all</dt><dd>Ctrl/Cmd+D / A</dd>',
      '<dt>Delete / Deselect</dt><dd>Delete or Backspace / Esc</dd>',
      '<dt>Save project / Save HTML</dt><dd>Ctrl/Cmd+S / Ctrl/Cmd+Shift+S</dd>',
      '<dt>Open / New / Print</dt><dd>Ctrl/Cmd+O / N / P</dd>',
      '<dt>Nudge selected item</dt><dd>Arrow keys (10 units), Shift+Arrow (20), Alt+Arrow (1)</dd>',
      '<dt>Drawing tools</dt><dd>V Select, H Pan, W Cable, B Block, J Junction, T Text, S Symbol</dd>',
      '<dt>Shapes / Grid / Fit</dt><dd>R Rectangle, E Ellipse, L Line, G Grid, F Fit</dd>',
      '<dt>Context menu</dt><dd>Right-click a cable, bend, terminal or block; Shift+F10</dd>',
      '<dt>Shortcut macro</dt><dd>Ctrl/Cmd+Alt+R record/stop, Ctrl/Cmd+Alt+P replay</dd>',
      '<dt>Help</dt><dd>?</dd>',
      '</dl><button type="button" class="wide" data-dismiss>Close</button>'
    ].join('');
    document.body.append(this.dialog);
    this.dialog.querySelector<HTMLButtonElement>('[data-dismiss]')?.addEventListener('click', () => this.dialog.close());
  }
  public show(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }
}
