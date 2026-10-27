import { createId, type Component, type FreeAnchor, type Pin, type Point, type Project, type Selection, type Wire } from './types';
import { ComponentGeometry } from '../geometry/ComponentGeometry';

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
    return ComponentGeometry.terminal(component,index,pin.side);
  }
  public createAnchor(point: Point, kind: FreeAnchor['kind'] = 'free'): FreeAnchor {
    const anchor: FreeAnchor = { id: createId(), x: point.x, y: point.y, kind };
    this.state.anchors.push(anchor); this.changed(); return anchor;
  }
  public addWire(from: string, to: string): Wire {
    const wire: Wire = { id: createId(), from, to, points: [], color: '#1479af', dash: 'solid', width: 2.5, label: '' };
    this.state.wires.push(wire); this.selection = { kind: 'wire', id: wire.id }; this.changed(); return wire;
  }
  /** Selection is a set of stable component IDs rather than a bounding rectangle. */
  public selectedComponents():Component[] {
    const selection=this.selection;
    if (selection?.kind==='all')return [...this.state.components];
    if (selection?.kind==='multi')return this.state.components.filter(c=>selection.ids?.includes(c.id));
    if (selection?.kind==='component')return this.state.components.filter(c=>c.id===selection.id);
    return [];
  }
  public selectComponents(ids:readonly string[]):void {
    const present=[...new Set(ids)].filter(id=>this.component(id)!==undefined);
    this.selection=present.length===0?null:
      present.length===1?{kind:'component',id:present[0]??''}:
      {kind:'multi',id:'group',ids:present};
    this.changed();
  }
  public transformComponents(action:'rotate-cw'|'rotate-ccw'|'mirror-horizontal'|'mirror-vertical',ids?:readonly string[]):boolean {
    const components=ids?this.state.components.filter(c=>ids.includes(c.id)):this.selectedComponents();
    if(components.length===0)return false;
    const boxes=components.map(c=>ComponentGeometry.bounds(c));
    const mid={x:(Math.min(...boxes.map(b=>b.left))+Math.max(...boxes.map(b=>b.right)))/2,
      y:(Math.min(...boxes.map(b=>b.top))+Math.max(...boxes.map(b=>b.bottom)))/2};
    for(const c of components) {
      if(action==='rotate-cw')ComponentGeometry.rotate(c,true,mid);
      if(action==='rotate-ccw')ComponentGeometry.rotate(c,false,mid);
      if(action==='mirror-horizontal')ComponentGeometry.mirror(c,'horizontal',mid);
      if(action==='mirror-vertical')ComponentGeometry.mirror(c,'vertical',mid);
    }
    this.changed();return true;
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
    if (selected.kind === 'multi') {
      const removed=new Set(selected.ids??[]);
      const components=this.state.components.filter(item=>removed.has(item.id));
      this.detachPins(components.flatMap(item=>item.pins.map(pin=>pin.id)));
      this.state.components=this.state.components.filter(item=>!removed.has(item.id));
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
    if (selected.kind === 'anchor') this.disconnectAnchor(id);
    this.selection = null; this.changed();
  }
  /** Preserve each incident cable as a separate free end after junction deletion. */
  public disconnectAnchor(id: string): void {
    const anchor = this.state.anchors.find(item => item.id === id);
    if (!anchor) return;
    for (const wire of this.state.wires) {
      for (const end of ['from', 'to'] as const) {
        if (wire[end] !== id) continue;
        const loose = this.createAnchor(anchor, 'free');
        wire[end] = loose.id;
      }
    }
    this.state.anchors = this.state.anchors.filter(item => item.id !== id);
    this.changed();
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
  /** Merge a loose end with a terminal or junction, preserving all cable identities. */
  public connectAnchor(sourceId:string,targetId:string):boolean {
    if (sourceId===targetId || !this.anchor(targetId)) return false;
    const source=this.state.anchors.find(item=>item.id===sourceId);
    if (!source) return false;
    const connected=this.state.wires.some(item=>item.from===sourceId||item.to===sourceId);
    if (!connected) return false;
    for (const wire of this.state.wires) {
      if (wire.from===sourceId) wire.from=targetId;
      if (wire.to===sourceId) wire.to=targetId;
    }
    this.state.anchors=this.state.anchors.filter(item=>item.id!==sourceId);
    const node=this.state.anchors.find(item=>item.id===targetId);
    if (node) node.kind='junction';
    this.changed();
    return true;
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
