import { createId, type Point, type Project, type SymbolInstance, type SymbolKind } from '../model/types';

type TerminalPoint = Point & { id: string };
/** SVG path contact locations, in the same local coordinates as SymbolLibrary. */
export class SymbolGeometry {
  private static readonly contacts: Readonly<Record<SymbolKind,readonly Point[]>> = {
    resistor:[{x:-36,y:0},{x:36,y:0}],
    capacitor:[{x:-30,y:0},{x:30,y:0}],
    inductor:[{x:-42,y:0},{x:42,y:0}],
    diode:[{x:-32,y:0},{x:32,y:0}],
    led:[{x:-32,y:0},{x:32,y:0}],
    fuse:[{x:-30,y:0},{x:30,y:0}],
    switch:[{x:-32,y:0},{x:32,y:0}],
    ground:[{x:0,y:-18}],
    vcc:[{x:0,y:18}],
    vdd:[{x:0,y:18}],
    vss:[{x:0,y:-18}],
    nc:[{x:0,y:0}],
    testpoint:[{x:0,y:12}]
  };
  public static count(kind:SymbolKind):number {return this.contacts[kind].length;}
  public static twoEnded(kind:SymbolKind):boolean {return this.count(kind)===2;}
  public static halfSpan(kind:SymbolKind):number {
    const terminal=this.contacts[kind][0];
    return Math.abs(terminal?.x??0);
  }
  /** Existing files did not have terminals. Migrate them without changing the document version. */
  public static ensure(project:Project):void {
    for(const symbol of project.symbols) {
      const expected=this.count(symbol.kind);
      if(symbol.terminals?.length===expected)continue;
      symbol.terminals=Array.from({length:expected},()=>createId());
    }
  }
  public static createTerminals(kind:SymbolKind):string[] {
    return Array.from({length:this.count(kind)},()=>createId());
  }
  public static terminals(symbol:SymbolInstance):TerminalPoint[] {
    const angle=symbol.rotation*Math.PI/180;
    const cos=Math.cos(angle),sin=Math.sin(angle);
    return this.contacts[symbol.kind].flatMap((local,index)=>{
      const id=symbol.terminals?.[index];
      if(!id)return [];
      const x=local.x*symbol.scale,y=local.y*symbol.scale;
      return [{id,x:symbol.x+x*cos-y*sin,y:symbol.y+x*sin+y*cos}];
    });
  }
  public static position(symbol:SymbolInstance,id:string):Point|null {
    return this.terminals(symbol).find(item=>item.id===id)??null;
  }
}
