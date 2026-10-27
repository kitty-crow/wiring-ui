export interface PaletteGlyph { readonly symbol:string; readonly name:string }

/** Compact engineering symbol picker; listeners are bound by CharacterPalette. */
export function CharacterPaletteView({glyphs}:{glyphs:readonly PaletteGlyph[]}) {
  return <>
    <div className="character-palette-title">Characters</div>
    {glyphs.map(glyph=>
      <button key={glyph.symbol} type="button" data-glyph={glyph.symbol}
        title={glyph.name} aria-label={'Insert '+glyph.name}>
        {glyph.symbol}
      </button>)}
  </>;
}
