import { ClipboardService } from '../model/ClipboardService';
import { HistoryManager } from '../model/HistoryManager';
import { ProjectModel } from '../model/ProjectModel';
import { WireRouter } from '../geometry/WireRouter';
import type { Point, Wire } from '../model/types';
import type { EditorCommand } from '../input/ShortcutController';
import type { ContextAction } from '../ui/ContextMenuController';

/** Business commands: independent from keyboard, pointer and menu presentation. */
export class EditorCommands {
  private readonly history: HistoryManager;
  private readonly clipboard: ClipboardService;
  private readonly router: WireRouter;
  private recording = false;
  private replaying = false;
  private macro: EditorCommand[] = [];
  public constructor(
    private readonly model: ProjectModel,
    private readonly changed: () => void,
    private readonly persisted: () => void,
    private readonly external: (command: EditorCommand) => void,
    private readonly status: (message: string) => void,
    private readonly hoveredComponent:()=>string|null
  ) {
    this.history = new HistoryManager(model.project);
    this.clipboard = new ClipboardService(model);
    this.router = new WireRouter(model);
  }
  /** A commit is one complete user action, including inspector and pointer edits. */
  public record(): void { this.history.record(this.model.project,this.model.selection); this.changed(); this.persisted(); }
  public reset(): void { this.history.reset(this.model.project,this.model.selection); this.changed(); }
  public run(command: EditorCommand, event?: KeyboardEvent): void {
    if (command === 'macro-toggle') { this.toggleMacro(); return; }
    if (command === 'macro-play') { this.playMacro(); return; }
    if (this.recording && !this.replaying && this.isRecordable(command)) this.macro.push(command);
    if (command === 'undo' || command === 'redo') { this.restore(command); return; }
    if (command === 'copy') { this.clipboard.copy(); return; }
    if (command === 'select-all') { this.clipboard.selectAll(); return; }
    if (command === 'cut') { this.recordWhen(this.clipboard.cut()); return; }
    if (command === 'paste') { this.recordWhen(this.clipboard.paste()); return; }
    if (command === 'duplicate') { this.recordWhen(this.clipboard.duplicate()); return; }
    if (command === 'delete') { this.removeSelection(); return; }
    if (command.startsWith('nudge-')) { this.nudge(command, event); return; }
    if (this.isTransform(command)) {this.transform(command);return;}
    this.external(command);
  }
  public menu(action: ContextAction, point: Point): void {
    if (action === 'copy' || action === 'cut' || action === 'paste' ||
        action === 'duplicate' || action === 'delete') {
      this.run(action);
      return;
    }
    if (action === 'add-terminal') { this.addTerminal(point); return; }
    if (action === 'disconnect-terminal') { this.disconnectTerminal(); return; }
    const selected = this.model.selection;
    if (!selected || (selected.kind !== 'wire' && selected.kind !== 'waypoint')) return;
    const wire = this.model.project.wires.find(item => item.id === selected.id);
    if (!wire) return;
    this.modifyCable(action, wire, point);
  }
  private modifyCable(action: ContextAction, wire: Wire, point: Point): void {
    if (action === 'remove-bend') {
      wire.points.splice(this.model.selection?.index ?? -1, 1);
      this.model.selection = { kind: 'wire', id: wire.id };
    }
    if (action === 'add-bend') this.addBend(wire, point);
    if (action === 'split-wire') this.router.split(wire, point);
    if (action === 'reset-route') wire.points = [];
    if (action === 'disconnect-start') this.model.detachEnd(wire, 'from');
    if (action === 'disconnect-end') this.model.detachEnd(wire, 'to');
    this.record();
  }
  private recordWhen(changed: boolean): void {
    if (changed) this.record();
  }
  private removeSelection(): void {
    if (!this.model.selection) return;
    this.model.removeSelected();this.record();
  }
  private addTerminal(point: Point): void {
    const component = this.model.selection?.kind === 'component'
      ? this.model.component(this.model.selection.id) : undefined;
    if (component) this.model.addPin(component);
    else this.model.addComponent(point);
    this.record();
  }
  private disconnectTerminal(): void {
    const selection = this.model.selection;
    if (!selection) return;
    const id = selection.id;
    const related = this.model.project.wires.filter(item => item.from === id || item.to === id);
    for (const wire of related) {
      if (wire.from === id) this.model.detachEnd(wire, 'from');
      if (wire.to === id) this.model.detachEnd(wire, 'to');
    }
    this.record();
  }
  private addBend(wire: Wire, point: Point): void {
    if (!this.router.addBend(wire,point))return;
    this.model.selection = { kind: 'wire', id: wire.id };
  }
  private isTransform(command:EditorCommand):command is 'rotate-cw'|'rotate-ccw'|'mirror-horizontal'|'mirror-vertical' {
    return command==='rotate-cw'||command==='rotate-ccw'||
      command==='mirror-horizontal'||command==='mirror-vertical';
  }
  /** A hovered component wins, unless it belongs to an existing group selection. */
  private transform(command:'rotate-cw'|'rotate-ccw'|'mirror-horizontal'|'mirror-vertical'):void {
    const hover=this.hoveredComponent();
    const selected=this.model.selectedComponents().map(c=>c.id);
    const group=this.model.selection?.kind==='multi'?selected:[];
    const ids=group.length>1&&hover&&group.includes(hover)?group:
      hover?[hover]:selected;
    if(ids.length===0){this.fallbackTransform(command);return;}
    this.model.selectComponents(ids);
    if(this.model.transformComponents(command,ids))this.record();
  }
  private fallbackTransform(command:'rotate-cw'|'rotate-ccw'|'mirror-horizontal'|'mirror-vertical'):void {
    if(command==='rotate-cw')this.external('tool-rectangle');
    if(command==='mirror-horizontal')this.external('tool-ellipse');
  }
  private nudge(command: EditorCommand, event?: KeyboardEvent): void {
    const distance = event?.altKey ? 1 : event?.shiftKey ? 20 : 10;
    const x = command === 'nudge-left' ? -distance : command === 'nudge-right' ? distance : 0;
    const y = command === 'nudge-up' ? -distance : command === 'nudge-down' ? distance : 0;
    this.recordWhen(this.clipboard.nudge(x,y));
  }
  private restore(direction: 'undo' | 'redo'): void {
    const snapshot = direction === 'undo' ? this.history.undo() : this.history.redo();
    if (!snapshot) return;
    this.model.set(snapshot);
    this.model.selection=this.history.selection;
    this.model.changed();
    this.persisted();
    this.status((direction === 'undo' ? 'Undone' : 'Redone') + ' · ' + this.model.project.components.length + ' blocks · ' + this.model.project.wires.length + ' cables · ' + this.model.project.symbols.length + ' symbols');
  }
  private isRecordable(command: EditorCommand): boolean {
    return command === 'duplicate' || command === 'delete' ||
      command === 'paste' || command.startsWith('nudge-') || command === 'grid' || this.isTransform(command);
  }
  private toggleMacro(): void {
    this.recording = !this.recording;
    if (this.recording) this.macro = [];
    this.status(this.recording ? 'Recording shortcut macro' : 'Macro saved: ' + this.macro.length + ' commands');
  }
  private playMacro(): void {
    if (this.recording || this.replaying || this.macro.length === 0) return;
    this.replaying = true;
    try {
      for (const command of this.macro) this.run(command);
      this.status('Played ' + this.macro.length + ' macro commands');
    } finally { this.replaying = false; }
  }
}
