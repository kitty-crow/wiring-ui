/**
 * Small reusable character picker. Focus is deliberately retained on the field
 * rather than stolen by the palette button, and insertion respects text selection.
 */
export class CharacterPalette {
  private target:HTMLInputElement|HTMLTextAreaElement|null=null;
  private readonly glyphs:readonly {symbol:string;name:string}[]=[
    {symbol:'Ω',name:'Ohm'},{symbol:'µ',name:'Micro'},{symbol:'°',name:'Degrees'},
    {symbol:'±',name:'Plus or minus'},{symbol:'Δ',name:'Delta'},
    {symbol:'λ',name:'Lambda'},{symbol:'Φ',name:'Phi'},{symbol:'π',name:'Pi'},
    {symbol:'Σ',name:'Sigma'},{symbol:'∞',name:'Infinity'},
    {symbol:'×',name:'Multiply'},{symbol:'÷',name:'Divide'},
    {symbol:'≥',name:'Greater or equal'},{symbol:'≤',name:'Less or equal'},
    {symbol:'≈',name:'Approximately'},{symbol:'²',name:'Square'},
    {symbol:'³',name:'Cube'},{symbol:'α',name:'Alpha'},
    {symbol:'β',name:'Beta'},{symbol:'θ',name:'Theta'},
    {symbol:'⏚',name:'Earth ground'}
  ];
  public constructor(private readonly root:HTMLElement) {
    this.build();
    document.addEventListener('focusin',event=>this.capture(event));
    root.addEventListener('pointerdown',event=>event.preventDefault());
    root.addEventListener('click',event=>this.click(event));
  }
  public static insert(field:HTMLInputElement|HTMLTextAreaElement,symbol:string):void {
    const start=field.selectionStart??field.value.length;
    const end=field.selectionEnd??start;
    field.setRangeText(symbol,start,end,'end');
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.dispatchEvent(new Event('change',{bubbles:true}));
    field.focus();
  }
  private build():void {
    this.root.replaceChildren();
    const heading=document.createElement('div');
    heading.className='character-palette-title';heading.textContent='Characters';
    this.root.append(heading);
    for(const glyph of this.glyphs) {
      const button=document.createElement('button');
      button.type='button';button.textContent=glyph.symbol;button.title=glyph.name;
      button.dataset.glyph=glyph.symbol;button.setAttribute('aria-label','Insert '+glyph.name);
      this.root.append(button);
    }
  }
  private capture(event:FocusEvent):void {
    const target=event.target;
    if(target instanceof HTMLTextAreaElement){this.target=target;return;}
    if(!(target instanceof HTMLInputElement))return;
    if(!['text','search','email','url','tel'].includes(target.type))return;
    this.target=target;
  }
  private click(event:MouseEvent):void {
    const target=event.target;
    if(!(target instanceof HTMLButtonElement))return;
    const glyph=target.dataset.glyph;
    if(!glyph||!this.target?.isConnected)return;
    CharacterPalette.insert(this.target,glyph);
  }
}
