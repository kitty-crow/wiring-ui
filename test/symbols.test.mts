import { expect, test } from 'bun:test';
import { SymbolLibrary } from '../src/symbols/SymbolLibrary';

test('every symbol is self-contained SVG and includes expected circuit glyphs',()=>{
  const symbols=new SymbolLibrary();
  expect(symbols.kinds()).toEqual(expect.arrayContaining(['ground','nc','vcc','vdd','vss','capacitor','resistor','inductor']));
  for(const kind of symbols.kinds()){
    const svg=symbols.svg(kind);
    expect(svg).toContain('<svg');expect(svg).toContain('viewBox');expect(svg).toContain('<path');
  }
});
