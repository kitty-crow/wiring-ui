import { createId, type Component, type FreeAnchor, type Pin, type Point, type Project, type Selection, type Wire } from './types';

/** Object model. Deleting a component or pin makes connected cable ends free. */
export class ProjectModel {
  public selection: Selection = null;
  private state: Project;
  public constructor(initial: Project, private readonly onChange: () => void) { this.state = initial; }
  public get project(): Project { return this.state; }
  public set(project: Project): void { this.state = project; this.selection = null; this.changed(); }
  public changed(): void { this.onChange(); }
  public component(id: string): Component | undefined { return this.state.components.find(item => item.id === id); }
  public pin(id: string): { component: Component; pin: Pin; index: number } | null {
    for (const component of this.state.components) {
      const index = component.pins.findIndex(item => item.id === id);
      const pin = component.pins[index];
      if (pin) return { component, pin, index };
    }
    return null;
  }
  public anchor(id: string): Point | null {
    const free = this.state.anchors.find(item => item.id === id);
    if (free) return free;
    const match = this.pin(id);
    if (!match) return null;
    const { component, pin, index } = match;
    return { x: component.x + (pin.side === 'right' ? component.width : 0), y: component.y + 83 + index * 31 };
  }
  public createAnchor(point: Point, kind: FreeAnchor['kind'] = 'free'): FreeAnchor {
    const anchor: FreeAnchor = { id: createId(), x: point.x, y: point.y, kind };
    this.state.anchors.push(anchor); this.changed(); return anchor;
  }
  public addWire(from: string, to: string): Wire {
    const wire: Wire = { id: createId(), from, to, points: [], color: '#1479af', dash: 'solid', width: 2.5, label: '' };
    this.state.wires.push(wire); this.selection = { kind: 'wire', id: wire.id }; this.changed(); return wire;
  }
  public addComponent(point: Point): Component {
    const item: Component = { id: createId(), name: 'New component', detail: 'Terminal header', x: point.x, y: point.y, width: 270,
      pins: Array.from({ length: 4 }, (_, index) => ({ id: createId(), number: String(index + 1), label: 'Pin ' + (index + 1), side: 'right' as const })) };
    this.state.components.push(item); this.selection = { kind: 'component', id: item.id }; this.changed(); return item;
  }
  /** Preserve wiring when a terminal disappears: promote the endpoint into a free anchor. */
  public detachPins(ids: readonly string[]): void {
    for (const id of ids) {
      const point = this.anchor(id);
      if (!point) continue;
      if (!this.state.wires.some(wire => wire.from === id || wire.to === id)) continue;
      this.state.anchors.push({ id, x: point.x, y: point.y, kind: 'free' });
    }
  }
  public removeSelected(): void {
    const selected = this.selection;
    if (!selected) return;
    const id = selected.id;
    if (selected.kind === 'component') {
      const component = this.component(id);
      this.detachPins(component?.pins.map(pin => pin.id) ?? []);
      this.state.components = this.state.components.filter(item => item.id !== id);
    }
    if (selected.kind === 'all') {
      this.state.components = []; this.state.anchors = []; this.state.wires = [];
      this.state.annotations = []; this.state.shapes = []; this.state.symbols = [];
    }
    if (selected.kind === 'wire') this.state.wires = this.state.wires.filter(item => item.id !== id);
    if (selected.kind === 'waypoint' && selected.index !== undefined) {
      this.state.wires.find(item => item.id === id)?.points.splice(selected.index, 1);
    }
    if (selected.kind === 'annotation') this.state.annotations = this.state.annotations.filter(item => item.id !== id);
    if (selected.kind === 'shape') this.state.shapes = this.state.shapes.filter(item => item.id !== id);
    if (selected.kind === 'symbol') this.state.symbols = this.state.symbols.filter(item => item.id !== id);
    const anchor = selected.kind === 'anchor' ? this.state.anchors.find(item => item.id === id) : undefined;
    if (anchor) {
      for (const wire of this.state.wires) {
        for (const end of ['from', 'to'] as const) {
          if (wire[end] !== id) continue;
          const loose = this.createAnchor(anchor, 'free');
          wire[end] = loose.id;
        }
      }
      this.state.anchors = this.state.anchors.filter(item => item.id !== id);
    }
    this.selection = null; this.changed();
  }
  public addPin(component: Component): Pin {
    const pin: Pin = { id: createId(), number: String(component.pins.length + 1), label: 'Signal', side: 'right' };
    component.pins.push(pin); this.changed(); return pin;
  }
  public removePin(component: Component, pinId: string): void {
    this.detachPins([pinId]);
    component.pins = component.pins.filter(pin => pin.id !== pinId);
    this.changed();
  }
  public reconnect(wire: Wire, endpoint: 'from' | 'to', anchorId: string): void {
    wire[endpoint] = anchorId;
    this.changed();
  }
  public detachEnd(wire: Wire, endpoint: 'from' | 'to'): FreeAnchor | null {
    const position = this.anchor(wire[endpoint]);
    if (!position) return null;
    const anchor = this.createAnchor(position);
    wire[endpoint] = anchor.id;
    this.changed(); return anchor;
  }
  public duplicateSelected(): void {
    const selected = this.selection;
    if (selected?.kind !== 'component') return;
    const original = this.component(selected.id);
    if (!original) return;
    const copy: Component = { ...structuredClone(original), id: createId(), x: original.x + 40, y: original.y + 40,
      pins: original.pins.map(pin => ({ ...pin, id: createId() })) };
    this.state.components.push(copy); this.selection = { kind: 'component', id: copy.id }; this.changed();
  }
}
