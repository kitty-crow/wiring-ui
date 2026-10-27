/**
 * Auto-hiding property dock. The drawing canvas owns the available layout space
 * while the inspector is unpinned. A pointer at the right screen edge or a tap on
 * the narrow reveal tab opens it temporarily; pinning makes it part of the grid.
 */
export class InspectorDock {
  private readonly panel:HTMLElement;
  private readonly edge:HTMLButtonElement;
  private readonly pin:HTMLButtonElement;
  private opened=false;
  private pinned:boolean;
  public constructor(
    private readonly main:HTMLElement,
    initiallyPinned:boolean,
    private readonly onPinChange:(pinned:boolean)=>void
  ){
    this.panel=this.byId<HTMLElement>('inspector-panel');
    this.edge=this.byId<HTMLButtonElement>('inspector-edge');
    this.pin=this.byId<HTMLButtonElement>('inspector-pin');
    this.pinned=initiallyPinned;
    this.pin.addEventListener('click',()=>this.togglePin());
    this.edge.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')this.show();});
    this.edge.addEventListener('click',()=>this.show());
    this.main.addEventListener('pointermove',event=>this.pointerMove(event));
    this.main.addEventListener('pointerleave',()=>this.hide());
    document.addEventListener('pointerdown',event=>this.dismissOutside(event));
    document.addEventListener('keydown',event=>this.keydown(event));
    this.render();
  }
  private byId<T extends HTMLElement>(id:string):T {
    const node=document.getElementById(id);
    if(!node)throw new Error('Missing properties dock element: '+id);
    return node as T;
  }
  private show():void {
    if(this.pinned||this.opened)return;
    this.opened=true;
    this.render();
  }
  private hide():void {
    if(this.pinned||!this.opened)return;
    this.opened=false;
    this.render();
  }
  private pointerMove(event:PointerEvent):void {
    if(this.pinned||event.pointerType==='touch')return;
    if(event.clientX>=window.innerWidth-20){this.show();return;}
    // During the slide-in animation the visual panel has not reached its final
    // x-position. Keep the reveal corridor open so entering it cannot close the dock.
    const expectedLeft=this.main.getBoundingClientRect().right-this.panel.offsetWidth;
    if(this.opened&&event.clientX>=expectedLeft)return;
    if(this.panel.contains(event.target as Node))return;
    this.hide();
  }
  private dismissOutside(event:PointerEvent):void {
    if(!this.opened||this.pinned)return;
    if(this.panel.contains(event.target as Node))return;
    if(this.edge.contains(event.target as Node))return;
    this.hide();
  }
  private keydown(event:KeyboardEvent):void {
    if(event.key==='Escape')this.hide();
  }
  private togglePin():void {
    this.pinned=!this.pinned;
    this.opened=this.pinned;
    this.render();
    this.onPinChange(this.pinned);
  }
  private render():void {
    const visible=this.pinned||this.opened;
    this.main.classList.toggle('inspector-pinned',this.pinned);
    this.main.classList.toggle('inspector-open',visible);
    this.panel.inert=!visible;
    this.panel.setAttribute('aria-hidden',String(!visible));
    this.pin.setAttribute('aria-pressed',String(this.pinned));
    const description=this.pinned?'Unpin properties panel (auto-hide)':'Pin properties panel open';
    this.pin.setAttribute('title',description);
    this.pin.setAttribute('aria-label',description);
    this.edge.setAttribute('aria-expanded',String(visible));
  }
}
