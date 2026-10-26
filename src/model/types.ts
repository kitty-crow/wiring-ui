/** Portable document schema. Coordinates are world-space CSS pixels. */
export type Point = { x: number; y: number };
export type PinSide = 'left' | 'right';
export type Dash = 'solid' | 'dash' | 'dot' | 'dashdot';
export type ShapeKind = 'rectangle' | 'ellipse' | 'line';
export type SymbolKind = 'ground' | 'vcc' | 'vdd' | 'vss' | 'nc' | 'resistor' | 'capacitor' | 'inductor' | 'diode' | 'led' | 'fuse' | 'switch' | 'testpoint';
export interface Pin { id: string; number: string; label: string; side: PinSide }
export interface Component { id: string; name: string; detail: string; x: number; y: number; width: number; pins: Pin[] }
export interface FreeAnchor extends Point { id: string; kind: 'free' | 'junction' }
/** A wire's endpoints are permanent anchor IDs, even when disconnected from components. */
export interface Wire { id: string; from: string; to: string; points: Point[]; color: string; dash: Dash; width: number; label: string }
export interface Annotation { id: string; text: string; x: number; y: number; size: number; font: string; color: string; bold: boolean }
export interface Shape { id: string; kind: ShapeKind; x: number; y: number; width: number; height: number; color: string; fill: string; stroke: number; dash: Dash }
export interface SymbolInstance extends Point { id: string; kind: SymbolKind; scale: number; rotation: number; color: string; label: string }
/** Embedded rasterised PDF or supplied image. No external resource URLs required. */
export interface Background { data: string; opacity: number; x: number; y: number; width: number; height: number }
export interface Project { version: 1; name: string; width: number; height: number; components: Component[]; anchors: FreeAnchor[]; wires: Wire[]; annotations: Annotation[]; shapes: Shape[]; symbols: SymbolInstance[]; background: Background | null }
export type Selection = { kind: 'component' | 'wire' | 'annotation' | 'shape' | 'waypoint' | 'anchor' | 'symbol'; id: string; index?: number } | null;
export const createId = (): string => 'w' + crypto.randomUUID().replace(/-/g, '');
export const componentHeight = (item: Component): number => 75 + item.pins.length * 31;
export const pointDistance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
