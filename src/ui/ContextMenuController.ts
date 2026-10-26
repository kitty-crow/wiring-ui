import { HitTester, type Hit } from '../input/HitTester';
import { ProjectModel } from '../model/ProjectModel';
import { CanvasRenderer } from '../render/CanvasRenderer';
import type { Point } from '../model/types';

export type ContextAction = 'remove-bend' | 'add-bend' | 'split-wire' | 'reset-route' |
  'disconnect-start' | 'disconnect-end' | 'add-terminal' | 'copy' |
  'cut' | 'paste' | 'duplicate' | 'delete' | 'disconnect-terminal';
type Option = Readonly<{ action: ContextAction; label: string }>;
const option = (action: ContextAction, label: string): Option => ({ action, label });

/** Context menus are browser UI, never stored inside the schematic canvas. */
export class ContextMenuController {
  private readonly root: HTMLDivElement;
  private readonly tester: HitTester;
  private point: Point = { x: 0, y: 0 };
  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly model: ProjectModel,
    private readonly renderer: CanvasRenderer,
    private readonly perform: (action: ContextAction, point: Point) => void
  ) {
    this.tester = new HitTester(model);
    this.root = document.createElement('div');
    this.root.className = 'canvas-context-menu';
    this.root.id = 'canvas-context-menu';
    this.root.setAttribute('role', 'menu');
    this.root.hidden = true;
    document.body.append(this.root);
    canvas.addEventListener('contextmenu', event => this.show(event));
    document.addEventListener('pointerdown', event => {
      if (!this.root.contains(event.target as Node)) this.hide();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.hide();
    });
    document.addEventListener('scroll', () => this.hide(), true);
    this.root.addEventListener('click', event => this.choose(event));
  }
  public hide(): void { this.root.hidden = true; }
  public showSelection(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.showAt(rect.left + Math.min(rect.width - 10, rect.width / 2), rect.top + Math.min(rect.height - 10, rect.height / 2));
  }
  private show(event: MouseEvent): void {
    event.preventDefault();
    this.showAt(event.clientX, event.clientY);
  }
  private showAt(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.point = this.renderer.toWorld(clientX - rect.left, clientY - rect.top);
    const hit = this.tester.at(this.point, 12 / this.renderer.zoom);
    this.model.selection = this.asSelection(hit);
    this.model.changed();
    const entries = this.options(hit);
    this.root.replaceChildren();
    for (const entry of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = entry.action;
      button.setAttribute('role', 'menuitem');
      button.textContent = entry.label;
      this.root.append(button);
    }
    this.root.hidden = false;
    const width = this.root.offsetWidth;
    const height = this.root.offsetHeight;
    this.root.style.left = Math.max(5, Math.min(clientX, window.innerWidth - width - 5)) + 'px';
    this.root.style.top = Math.max(5, Math.min(clientY, window.innerHeight - height - 5)) + 'px';
    this.root.querySelector('button')?.focus();
  }
  private asSelection(hit: Hit | null): NonNullable<ProjectModel['selection']> | null {
    if (!hit) return null;
    const kind = hit.kind === 'segment' ? 'wire' : hit.kind === 'pin' ? 'anchor' : hit.kind;
    return hit.index === undefined ? { kind, id: hit.id } : { kind, id: hit.id, index: hit.index };
  }
  private options(hit: Hit | null): Option[] {
    if (!hit) return [
      option('paste', 'Paste'),
      option('add-terminal', 'Add component')
    ];
    if (hit.kind === 'segment') return [
      option('add-bend', 'Add bend here'), option('split-wire', 'Create junction here'),
      option('reset-route', 'Auto-route cable'), option('disconnect-start', 'Disconnect start'),
      option('disconnect-end', 'Disconnect end'), option('copy', 'Copy cable'),
      option('cut', 'Cut cable'), option('delete', 'Delete cable')
    ];
    if (hit.kind === 'waypoint') return [
      option('remove-bend', 'Delete bend'), option('reset-route', 'Auto-route cable'),
      option('copy', 'Copy cable'), option('delete', 'Delete cable')
    ];
    if (hit.kind === 'anchor') return [
      option('delete', 'Delete node (disconnect wires)')
    ];
    if (hit.kind === 'pin') return [
      option('disconnect-terminal', 'Disconnect terminal')
    ];
    if (hit.kind === 'component') return [
      option('add-terminal', 'Add terminal'), option('duplicate', 'Duplicate'),
      option('copy', 'Copy'), option('cut', 'Cut'), option('delete', 'Delete component')
    ];
    return [
      option('duplicate', 'Duplicate'), option('copy', 'Copy'),
      option('cut', 'Cut'), option('delete', 'Delete')
    ];
  }
  private choose(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const name = target.dataset.action;
    const valid: readonly ContextAction[] = [
      'remove-bend', 'add-bend', 'split-wire', 'reset-route', 'disconnect-start',
      'disconnect-end', 'add-terminal', 'copy', 'cut', 'paste', 'duplicate', 'delete',
      'disconnect-terminal'
    ];
    if (!name || !valid.includes(name as ContextAction)) return;
    this.perform(name as ContextAction, this.point);
    this.hide();
    this.canvas.focus();
  }
}
