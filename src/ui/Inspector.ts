import { ProjectModel } from '../model/ProjectModel';
import { type Component, type Project, type Selection, type Wire } from '../model/types';

const escape=(value:string):string=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const field=(label:string,key:string,value:string,type='text'):string=>'<label class="field"><span>'+label+'</span><input data-key="'+key+'" type="'+type+'" value="'+escape(value)+'"></label>';
const multiline=(label:string,key:string,value:string):string=>'<label class="field"><span>'+label+'</span><textarea data-key="'+key+'" rows="4">'+escape(value)+'</textarea></label>';
const select=(label:string,key:string,value:string,options:readonly string[]):string=>'<label class="field"><span>'+label+'</span><select data-key="'+key+'">'+options.map(option=>'<option value="'+escape(option)+'" '+(option===value?'selected':'')+'>'+escape(option)+'</option>').join('')+'</select></label>';

/** Typed property panel. No rendering or geometry dependencies. */
export class Inspector {
  public constructor(private readonly root: HTMLElement, private readonly model: ProjectModel, private readonly record:()=>void) {
    this.root.addEventListener('change',event=>this.handleChange(event));
    this.root.addEventListener('input',event=>this.previewColour(event));
    this.root.addEventListener('click',event=>this.handleClick(event));
  }
  public render():void {
    const selected=this.model.selection;
    if (!selected) {this.renderProject(this.model.project);return;}
    const component=selected.kind==='component'?this.model.component(selected.id):undefined;
    if (component){this.renderComponent(component);return;}
    const wire=selected.kind==='wire'||selected.kind==='waypoint'?this.model.project.wires.find(item=>item.id===selected.id):undefined;
    if (wire){this.renderWire(wire);return;}
    const note=selected.kind==='annotation'?this.model.project.annotations.find(item=>item.id===selected.id):undefined;
    if (note){this.root.innerHTML='<div class="panel-title">Text annotation</div>'+multiline('Text','text',note.text)+field('Font','font',note.font)+field('Font size','size',String(note.size),'number')+field('Colour','color',note.color,'color')+select('Weight','bold',note.bold?'true':'false',['false','true'])+this.actions();return;}
    const symbol=selected.kind==='symbol'?this.model.project.symbols.find(item=>item.id===selected.id):undefined;
    if (symbol){this.root.innerHTML='<div class="panel-title">Circuit symbol</div>'+field('Label','label',symbol.label)+field('Scale','scale',String(symbol.scale),'number')+field('Rotation (degrees)','rotation',String(symbol.rotation),'number')+field('Colour','color',symbol.color,'color')+this.actions();return;}
    const anchor=selected.kind==='anchor'?this.model.project.anchors.find(item=>item.id===selected.id):undefined;
    if (anchor){this.root.innerHTML='<div class="panel-title">Free end / junction</div>'+select('Node type','kind',anchor.kind,['free','junction'])+field('X','x',String(anchor.x),'number')+field('Y','y',String(anchor.y),'number')+'<p class="help">Drag onto another terminal to reconnect. Junctions create real electrical continuity.</p>';return;}
    const shape=selected.kind==='shape'?this.model.project.shapes.find(item=>item.id===selected.id):undefined;
    if (shape){this.root.innerHTML='<div class="panel-title">Shape</div>'+select('Type','kind',shape.kind,['rectangle','ellipse','line'])+field('Stroke colour','color',shape.color,'color')+field('Fill colour','fill',shape.fill)+field('Stroke width','stroke',String(shape.stroke),'number')+select('Line type','dash',shape.dash,['solid','dash','dot','dashdot'])+this.actions();return;}
    this.renderProject(this.model.project);
  }
  private actions():string {return '<div class="property-actions"><button data-action="duplicate">Duplicate</button><button data-action="delete" class="danger">Delete</button></div>';}
  private renderProject(project:Project):void {
    this.root.innerHTML='<div class="panel-title">Document</div><p class="help">Select a component, wire, bend, junction, shape or text to edit it.</p>'+field('Drawing name','name',project.name)+field('Page width','width',String(project.width),'number')+field('Page height','height',String(project.height),'number')+'<p class="help">Choose Cable then click two anchors; empty space creates a free end. Double-click a wire for an editable bend. Junction joins crossed cables electrically.</p>';
  }
  private renderComponent(component:Component):void {
    const pins=component.pins.map(pin=>'<div class="pin-editor"><input aria-label="Pin number" data-pin="'+pin.id+'" data-part="number" value="'+escape(pin.number)+'">'+
      '<input aria-label="Pin label" data-pin="'+pin.id+'" data-part="label" value="'+escape(pin.label)+'">'+
      '<select aria-label="Pin side" data-pin="'+pin.id+'" data-part="side"><option value="right" '+(pin.side==='right'?'selected':'')+'>Right</option><option value="left" '+(pin.side==='left'?'selected':'')+'>Left</option></select>'+
      '<button class="icon-small" title="Remove pin" data-remove-pin="'+pin.id+'">×</button></div>').join('');
    this.root.innerHTML='<div class="panel-title">Component</div>'+field('Name','name',component.name)+field('Subtitle','detail',component.detail)+field('Width','width',String(component.width),'number')+
      '<div class="section-heading">Terminals <span>'+component.pins.length+'</span></div><div class="pin-editor-head"><span>No.</span><span>Name</span><span>Side</span></div>'+pins+
      '<button class="wide" data-action="add-pin">+ Add terminal</button>'+this.actions();
  }
  private renderWire(wire:Wire):void {
    this.root.innerHTML='<div class="panel-title">Cable</div>'+field('Cable label','label',wire.label)+field('Colour','color',wire.color,'color')+
      '<button class="wide" data-action="apply-colour">Apply colour</button>'+
      field('Thickness','width',String(wire.width),'number')+select('Line pattern','dash',wire.dash,['solid','dash','dot','dashdot'])+
      '<button class="wide" data-action="detach-from">Disconnect start</button><button class="wide" data-action="detach-to">Disconnect end</button>'+
      '<button class="wide" data-action="add-bend">+ Add routing node</button><button class="wide" data-action="remove-bend">Remove last routing node</button><button class="wide" data-action="reset-route">Reset automatic route</button><p class="help">Drag cable segments or square bend handles while maintaining the anchors. Reattach free ends by dropping them onto terminals.</p>'+this.actions();
  }
  /** Preview the picker in real time without rebuilding the inspector mid-drag. */
  private previewColour(event:Event):void {
    const target=event.target;
    if (!(target instanceof HTMLInputElement) || target.type!=='color' || target.dataset.key!=='color')return;
    const entity=this.entity(this.model.selection);
    if (!entity || !('color' in entity))return;
    Object.assign(entity,{color:target.value});
    this.model.changed();
  }
  private handleChange(event:Event):void {
    const target=event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement))return;
    const pinId=target.dataset.pin;
    if (pinId) {this.updatePin(pinId,target);return;}
    const key=target.dataset.key;
    if (!key)return;
    const entity=this.entity(this.model.selection);
    if (!entity || !Object.prototype.hasOwnProperty.call(entity,key))return;
    let value:string|number|boolean=target.value;
    if (['width','height','size','stroke','x','y','scale','rotation','opacity'].includes(key))value=Number(target.value);
    if (key==='bold')value=value==='true';
    Object.assign(entity,{[key]:value});this.record();
  }
  private updatePin(pinId:string,target:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement):void {
    const match=this.model.pin(pinId);
    if (!match)return;
    const part=target.dataset.part;
    if(part==='number')match.pin.number=target.value;
    if(part==='label')match.pin.label=target.value;
    if(part==='side')match.pin.side=target.value==='left'?'left':'right';
    this.record();
  }
  private entity(selected:Selection):object|null {
    if (!selected)return this.model.project;
    if (selected.kind==='component')return this.model.component(selected.id)??null;
    if (selected.kind==='wire'||selected.kind==='waypoint')return this.model.project.wires.find(item=>item.id===selected.id)??null;
    if (selected.kind==='annotation')return this.model.project.annotations.find(item=>item.id===selected.id)??null;
    if (selected.kind==='anchor')return this.model.project.anchors.find(item=>item.id===selected.id)??null;
    if (selected.kind==='symbol')return this.model.project.symbols.find(item=>item.id===selected.id)??null;
    return this.model.project.shapes.find(item=>item.id===selected.id)??null;
  }
  private handleClick(event:MouseEvent):void {
    const target=event.target;
    if (!(target instanceof HTMLElement))return;
    const remove=target.dataset.removePin;
    if (remove){this.removePin(remove);return;}
    const action=target.dataset.action;
    if(action==='apply-colour'){
      const input=this.root.querySelector<HTMLInputElement>('input[type="color"][data-key="color"]');
      const entity=this.entity(this.model.selection);
      if(input&&entity&&'color' in entity)Object.assign(entity,{color:input.value});
    }
    if(action==='delete')this.model.removeSelected();
    if(action==='duplicate')this.model.duplicateSelected();
    if(action==='add-pin')this.addSelectedPin();
    if(action==='add-bend')this.addBend();
    if(action==='remove-bend')this.removeBend();
    if(action==='reset-route')this.resetRoute();
    if(action==='detach-from'||action==='detach-to')this.detach(action==='detach-from'?'from':'to');
    this.record();
  }
  private selectedComponent():Component|undefined {
    const selected=this.model.selection;
    return selected?.kind==='component'?this.model.component(selected.id):undefined;
  }
  private selectedWire():Wire|undefined {
    const selected=this.model.selection;
    return selected?.kind==='wire'||selected?.kind==='waypoint'?this.model.project.wires.find(item=>item.id===selected.id):undefined;
  }
  private removePin(pinId:string):void {
    const component=this.selectedComponent();if(!component)return;
    this.model.removePin(component,pinId);this.record();
  }
  private addSelectedPin():void {const component=this.selectedComponent();if(component)this.model.addPin(component);}
  private addBend():void {
    const wire=this.selectedWire();if(!wire)return;
    const a=this.model.anchor(wire.from);const b=this.model.anchor(wire.to);
    if(!a||!b)return;
    wire.points.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2});this.model.changed();
  }
  private removeBend():void {const wire=this.selectedWire();if(!wire)return;const selected=this.model.selection;const index=selected?.kind==='waypoint'?selected.index:undefined;if(index===undefined)wire.points.pop();else wire.points.splice(index,1);this.model.selection={kind:'wire',id:wire.id};this.model.changed();}
  private resetRoute():void {const wire=this.selectedWire();if(!wire)return;wire.points=[];this.model.changed();}
  private detach(end:'from'|'to'):void {const wire=this.selectedWire();if(!wire)return;this.model.detachEnd(wire,end);}
}
