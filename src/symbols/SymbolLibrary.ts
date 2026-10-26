import type { SymbolInstance, SymbolKind } from '../model/types';

/** Reusable schematic glyph geometry expressed as SVG paths, drawn in the canvas. */
export class SymbolLibrary {
  private readonly paths: Readonly<Record<SymbolKind, string>> = {
    ground: 'M0 -18V0 M-18 0H18 M-12 6H12 M-6 12H6',
    vcc: 'M0 18V-12 M-10 -4L0 -16L10 -4',
    vdd: 'M0 18V-16 M-12 -16H12',
    vss: 'M0 -18V16 M-12 16H12',
    nc: 'M-12 -12L12 12 M12 -12L-12 12',
    resistor: 'M-36 0H-22 L-18 -10L-10 10L-2 -10L6 10L14 -10L22 0H36',
    capacitor: 'M-30 0H-6 M-6 -18V18 M6 -18V18 M6 0H30',
    inductor: 'M-42 0H-26 C-26 -20 -10 -20 -10 0 C-10 -20 6 -20 6 0 C6 -20 22 -20 22 0 H42',
    diode: 'M-32 0H-13 M-13 -14V14L11 0Z M11 -14V14 M11 0H32',
    led: 'M-32 0H-13 M-13 -14V14L11 0Z M11 -14V14 M11 0H32 M2 -18L17 -33 M10 -18L25 -33',
    fuse: 'M-30 0H-16 M-16 -11H16V11H-16V-11 M16 0H30',
    switch: 'M-32 0H-18 M-14 0L16 -13 M18 0H32',
    testpoint: 'M0 12V-4 M0 -4 A10 10 0 1 0 0 -24 A10 10 0 1 0 0 -4'
  };
  public kinds(): SymbolKind[] { return Object.keys(this.paths) as SymbolKind[]; }
  public svg(kind: SymbolKind): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 -48 96 96"><path d="'+this.paths[kind]+'" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  public draw(ctx: CanvasRenderingContext2D, symbol: SymbolInstance): void {
    ctx.save(); ctx.translate(symbol.x,symbol.y);ctx.rotate(symbol.rotation*Math.PI/180);ctx.scale(symbol.scale,symbol.scale);
    ctx.strokeStyle=symbol.color;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.stroke(new Path2D(this.paths[symbol.kind]));ctx.restore();
    if (symbol.label) {ctx.fillStyle=symbol.color;ctx.font='12px Arial';ctx.textAlign='center';ctx.fillText(symbol.label,symbol.x,symbol.y+40*symbol.scale);}
  }
}
