import { createElement } from 'react';
import { ProjectModel } from '../model/ProjectModel';
import type { Component, Selection, Wire } from '../model/types';
import { ClipboardService } from '../model/ClipboardService';
import { replaceChildrenWithReact } from './reactHelpers';
import {
  MultiSelectionView, DocumentView, ComponentView, WireView,
  AnnotationView, SymbolView, AnchorView, ShapeView
} from './views/InspectorViews';

/**
 * The inspector owns delegated input events, not HTML formatting.
 * All property controls are pure TSX views rendered through React static markup;
 * no React root, hooks or hydration are involved.
 */
export class Inspector {
  public constructor(private readonly root: HTMLElement, private readonly model: ProjectModel, private readonly record:()=>void) {
    this.root.addEventListener('change',event=>this.handleChange(event));
    this.root.addEventListener('input',event=>this.previewColour(event));
    this.root.addEventListener('click',event=>this.handleClick(event));
  }
  public render():void {
    const selected=this.model.selection;
    const project=this.model.project;
    if(selected?.kind==='multi'){
      replaceChildrenWithReact(this.root,createElement(MultiSelectionView,{count:selected.ids?.length??0}));
      return;
    }
    const component=selected?.kind==='component'?this.model.component(selected.id):undefined;
    if(component){replaceChildrenWithReact(this.root,createElement(ComponentView,{component}));return;}
    const wire=selected?.kind==='wire'||selected?.kind==='waypoint'
      ?project.wires.find(item=>item.id===selected.id):undefined;
    if(wire){replaceChildrenWithReact(this.root,createElement(WireView,{wire}));return;}
    const note=selected?.kind==='annotation'
      ?project.annotations.find(item=>item.id===selected.id):undefined;
    if(note){replaceChildrenWithReact(this.root,createElement(AnnotationView,{note}));return;}
    const symbol=selected?.kind==='symbol'
      ?project.symbols.find(item=>item.id===selected.id):undefined;
    if(symbol){replaceChildrenWithReact(this.root,createElement(SymbolView,{symbol}));return;}
    const anchor=selected?.kind==='anchor'
      ?project.anchors.find(item=>item.id===selected.id):undefined;
    if(anchor){replaceChildrenWithReact(this.root,createElement(AnchorView,{anchor}));return;}
    const shape=selected?.kind==='shape'
      ?project.shapes.find(item=>item.id===selected.id):undefined;
    if(shape){replaceChildrenWithReact(this.root,createElement(ShapeView,{shape}));return;}
    replaceChildrenWithReact(this.root,createElement(DocumentView,{project}));
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
    if (!entity || (!Object.prototype.hasOwnProperty.call(entity,key)&&!(key==='value'&&this.model.selection?.kind==='symbol')))return;
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
  private applyColour():void {
    const input=this.root.querySelector<HTMLInputElement>('input[type="color"][data-key="color"]');
    const entity=this.entity(this.model.selection);
    if(!input||!entity||!('color' in entity))return;
    Object.assign(entity,{color:input.value});
    this.model.changed();
  }
  private handleClick(event:MouseEvent):void {
    const target=event.target;
    if (!(target instanceof HTMLElement))return;
    const remove=target.dataset.removePin;
    if (remove){this.removePin(remove);return;}
    const action=target.dataset.action;
    if(action==='apply-colour')this.applyColour();
    if(action==='delete')this.model.removeSelected();
    if(action==='duplicate')this.duplicate();
    if(action==='add-pin')this.addSelectedPin();
    if(action==='add-bend')this.addBend();
    if(action==='remove-bend')this.removeBend();
    if(action==='reset-route')this.resetRoute();
    if(action==='detach-from'||action==='detach-to')this.detach(action==='detach-from'?'from':'to');
    this.record();
  }
  private duplicate():void {
    if(this.model.selection?.kind==='multi'){new ClipboardService(this.model).duplicate();return;}
    this.model.duplicateSelected();
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
