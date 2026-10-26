import { createId, type FreeAnchor, type Point, type Project, type Selection } from './types';
import { ProjectModel } from './ProjectModel';

type Items = Pick<Project, 'components' | 'anchors' | 'wires' | 'annotations' | 'shapes' | 'symbols'>;
const empty = (): Items => ({ components: [], anchors: [], wires: [], annotations: [], shapes: [], symbols: [] });
const shifted = (point: Point, distance: number): void => { point.x += distance; point.y += distance; };

/** In-memory drawing clipboard: portable copies have no references to original component IDs. */
export class ClipboardService {
  private clipboard: Items | null = null;
  private copies = 0;
  public constructor(private readonly model: ProjectModel) {}
  public copy(): boolean {
    const selected = this.model.selection;
    if (!selected) return false;
    const project = this.model.project;
    const items = empty();
    if (selected.kind === 'all') {
      Object.assign(items, structuredClone({
        components: project.components, anchors: project.anchors, wires: project.wires,
        annotations: project.annotations, shapes: project.shapes, symbols: project.symbols
      }));
    }
    if (selected.kind === 'component') items.components = structuredClone(project.components.filter(item => item.id === selected.id));
    if (selected.kind === 'annotation') items.annotations = structuredClone(project.annotations.filter(item => item.id === selected.id));
    if (selected.kind === 'shape') items.shapes = structuredClone(project.shapes.filter(item => item.id === selected.id));
    if (selected.kind === 'symbol') items.symbols = structuredClone(project.symbols.filter(item => item.id === selected.id));
    if (selected.kind === 'anchor') items.anchors = structuredClone(project.anchors.filter(item => item.id === selected.id));
    if (selected.kind === 'wire' || selected.kind === 'waypoint')
      items.wires = structuredClone(project.wires.filter(item => item.id === selected.id));
    for (const wire of selected.kind === 'all' ? [] : items.wires) {
        for (const endpoint of ['from', 'to'] as const) {
          const point = this.model.anchor(wire[endpoint]);
          if (!point) continue;
          const detached: FreeAnchor = { id: createId(), x: point.x, y: point.y, kind: 'free' };
          items.anchors.push(detached);
          wire[endpoint] = detached.id;
        }
      }
    const count = Object.values(items).reduce((sum, group) => sum + group.length, 0);
    if (count === 0) return false;
    this.clipboard = items;
    this.copies = 0;
    return true;
  }
  public cut(): boolean {
    if (!this.copy()) return false;
    this.model.removeSelected();
    return true;
  }
  public duplicate(): boolean {
    const existing = this.clipboard;
    const count = this.copies;
    if (!this.copy()) return false;
    const made = this.paste();
    this.clipboard = existing;
    this.copies = count;
    return made;
  }
  public paste(): boolean {
    const source = this.clipboard;
    if (!source) return false;
    const data = structuredClone(source);
    const ids = new Map<string, string>();
    const newId = (id: string): string => {
      const old = ids.get(id);
      if (old) return old;
      const generated = createId();
      ids.set(id, generated);
      return generated;
    };
    const distance = 24 * ++this.copies;
    for (const component of data.components) {
      component.id = createId();
      shifted(component, distance);
      component.pins = component.pins.map(pin => ({ ...pin, id: newId(pin.id) }));
    }
    for (const anchor of data.anchors) { anchor.id = newId(anchor.id); shifted(anchor, distance); }
    for (const wire of data.wires) {
      wire.id = createId();
      wire.from = newId(wire.from);
      wire.to = newId(wire.to);
      for (const waypoint of wire.points) shifted(waypoint, distance);
    }
    for (const note of data.annotations) { note.id = createId(); shifted(note, distance); }
    for (const symbol of data.symbols) { symbol.id = createId(); shifted(symbol, distance); }
    for (const shape of data.shapes) { shape.id = createId(); shifted(shape, distance); }
    const project = this.model.project;
    project.components.push(...data.components);
    project.anchors.push(...data.anchors);
    project.wires.push(...data.wires);
    project.annotations.push(...data.annotations);
    project.shapes.push(...data.shapes);
    project.symbols.push(...data.symbols);
    const candidates: Array<{ kind: Exclude<NonNullable<Selection>['kind'], 'waypoint' | 'all'>; id: string }> = [
      ...data.components.map(item => ({kind: 'component' as const, id: item.id})),
      ...data.wires.map(item => ({kind: 'wire' as const, id: item.id})),
      ...data.annotations.map(item => ({kind: 'annotation' as const, id: item.id})),
      ...data.shapes.map(item => ({kind: 'shape' as const, id: item.id})),
      ...data.symbols.map(item => ({kind: 'symbol' as const, id: item.id})),
      ...data.anchors.map(item => ({kind: 'anchor' as const, id: item.id}))
    ];
    const first = candidates[0];
    this.model.selection = candidates.length > 1 ? { kind: 'all', id: '*' } : first ?? null;
    this.model.changed();
    return true;
  }
  public selectAll(): boolean {
    const project = this.model.project;
    const total = project.components.length + project.wires.length + project.anchors.length +
      project.annotations.length + project.shapes.length + project.symbols.length;
    if (total === 0) return false;
    this.model.selection = { kind: 'all', id: '*' };
    this.model.changed();
    return true;
  }
  public nudge(dx: number, dy: number): boolean {
    const selection = this.model.selection;
    if (!selection) return false;
    const project = this.model.project;
    const matches = <T extends Point & {id:string}>(items: T[]): T[] =>
      selection.kind === 'all' ? items : items.filter(item => item.id === selection.id);
    const move = (point: Point): void => { point.x += dx; point.y += dy; };
    const components = matches(project.components);
    const anchors = matches(project.anchors);
    const notes = matches(project.annotations);
    const symbols = matches(project.symbols);
    const shapes = matches(project.shapes);
    const selectedWire = project.wires.find(item => item.id === selection.id);
    const waypoint = selection.kind === 'waypoint' ? selectedWire?.points[selection.index ?? -1] : undefined;
    const count = components.length + anchors.length + notes.length + symbols.length + shapes.length + Number(Boolean(waypoint));
    if (count === 0) return false;
    [...components, ...anchors, ...notes, ...symbols, ...shapes].forEach(move);
    if (waypoint) move(waypoint);
    if (selection.kind === 'all') for (const wire of project.wires) wire.points.forEach(move);
    this.model.changed();
    return true;
  }
}
