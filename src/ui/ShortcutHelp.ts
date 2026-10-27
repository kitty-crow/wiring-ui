import { createElement } from 'react';
import { replaceChildrenWithReact } from './reactHelpers';
import { ShortcutHelpView } from './views/ShortcutHelpView';

/** Accessible shortcut modal backed by the same static TSX renderer as tracker-viewer. */
export class ShortcutHelp {
  private readonly dialog: HTMLDialogElement;
  public constructor() {
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'shortcut-dialog';
    this.dialog.setAttribute('aria-label', 'Keyboard shortcuts');
    replaceChildrenWithReact(this.dialog, createElement(ShortcutHelpView));
    document.body.append(this.dialog);
    this.dialog.querySelector<HTMLButtonElement>('[data-dismiss]')
      ?.addEventListener('click', () => this.dialog.close());
  }
  public show(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }
}
