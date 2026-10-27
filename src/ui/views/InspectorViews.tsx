import type { ReactNode } from 'react';
import type {
  Annotation, Component, FreeAnchor, Project, Shape, SymbolInstance, Wire
} from '../../model/types';

/** Pure TSX views. No state, browser listeners or React hydration. */
function Heading({children}:{children:ReactNode}) {
  return <div className="panel-title">{children}</div>;
}
function Field({label,name,value,type='text'}:{
  label:string;name:string;value:string|number;type?:string
}) {
  return <label className="field">
    <span>{label}</span>
    <input data-key={name} type={type} defaultValue={value} />
  </label>;
}
function LongField({label,name,value}:{label:string;name:string;value:string}) {
  return <label className="field">
    <span>{label}</span>
    <textarea data-key={name} rows={4} defaultValue={value} />
  </label>;
}
function Choice({label,name,value,options}:{
  label:string;name:string;value:string;options:readonly string[]
}) {
  return <label className="field">
    <span>{label}</span>
    <select data-key={name} defaultValue={value}>
      {options.map(option=><option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}
function Actions() {
  return <div className="property-actions">
    <button data-action="duplicate">Duplicate</button>
    <button data-action="delete" className="danger">Delete</button>
  </div>;
}
export function MultiSelectionView({count}:{count:number}) {
  return <>
    <Heading>Multiple components</Heading>
    <p className="help">{count} components selected. Ctrl/Cmd+R rotates clockwise,
      Ctrl/Cmd+Shift+R counter-clockwise; Ctrl/Cmd+E mirrors horizontally,
      Ctrl/Cmd+Shift+E vertically. Clipboard and delete shortcuts apply to the group.</p>
    <Actions />
  </>;
}
export function DocumentView({project}:{project:Project}) {
  return <>
    <Heading>Document</Heading>
    <p className="help">Select a component, wire, bend, junction, shape or text to edit it.</p>
    <Field label="Drawing name" name="name" value={project.name} />
    <Field label="Page width" name="width" type="number" value={project.width} />
    <Field label="Page height" name="height" type="number" value={project.height} />
    <p className="help">Choose Cable then click two anchors; empty space creates a free end.
      Double-click a wire for an editable bend. Junction joins crossed cables electrically.</p>
  </>;
}
export function ComponentView({component}:{component:Component}) {
  return <>
    <Heading>Component</Heading>
    <Field label="Name" name="name" value={component.name} />
    <Field label="Subtitle" name="detail" value={component.detail} />
    <Field label="Width" name="width" value={component.width} type="number" />
    <div className="section-heading">Terminals <span>{component.pins.length}</span></div>
    <div className="pin-editor-head"><span>No.</span><span>Name</span><span>Side</span></div>
    {component.pins.map(pin=><div className="pin-editor" key={pin.id}>
      <input aria-label="Pin number" data-pin={pin.id} data-part="number" defaultValue={pin.number} />
      <input aria-label="Pin label" data-pin={pin.id} data-part="label" defaultValue={pin.label} />
      <select aria-label="Pin side" data-pin={pin.id} data-part="side" defaultValue={pin.side}>
        <option value="right">Right</option><option value="left">Left</option>
      </select>
      <button className="icon-small" title="Remove pin" data-remove-pin={pin.id}>×</button>
    </div>)}
    <button className="wide" data-action="add-pin">+ Add terminal</button>
    <Actions />
  </>;
}
export function WireView({wire}:{wire:Wire}) {
  return <>
    <Heading>Cable</Heading>
    <Field label="Cable label" name="label" value={wire.label} />
    <Field label="Colour" name="color" value={wire.color} type="color" />
    <button className="wide" data-action="apply-colour">Apply colour</button>
    <Field label="Thickness" name="width" value={wire.width} type="number" />
    <Choice label="Line pattern" name="dash" value={wire.dash}
      options={['solid','dash','dot','dashdot']} />
    <button className="wide" data-action="detach-from">Disconnect start</button>
    <button className="wide" data-action="detach-to">Disconnect end</button>
    <button className="wide" data-action="add-bend">+ Add routing node</button>
    <button className="wide" data-action="remove-bend">Remove last routing node</button>
    <button className="wide" data-action="reset-route">Reset automatic route</button>
    <p className="help">Drag cable segments or square bend handles while maintaining the anchors.
      Reattach free ends by dropping them onto terminals.</p>
    <Actions />
  </>;
}
export function AnnotationView({note}:{note:Annotation}) {
  return <>
    <Heading>Text annotation</Heading>
    <LongField label="Text" name="text" value={note.text} />
    <Field label="Font" name="font" value={note.font} />
    <Field label="Font size" name="size" value={note.size} type="number" />
    <Field label="Colour" name="color" value={note.color} type="color" />
    <Choice label="Weight" name="bold" value={String(note.bold)} options={['false','true']} />
    <Actions />
  </>;
}
export function SymbolView({symbol}:{symbol:SymbolInstance}) {
  return <>
    <Heading>Circuit symbol</Heading>
    <Field label="Label" name="label" value={symbol.label} />
    <Field label="Value" name="value" value={symbol.value??''} />
    <Field label="Scale" name="scale" value={symbol.scale} type="number" />
    <Field label="Rotation (degrees)" name="rotation" value={symbol.rotation} type="number" />
    <Field label="Colour" name="color" value={symbol.color} type="color" />
    <Actions />
  </>;
}
export function AnchorView({anchor}:{anchor:FreeAnchor}) {
  return <>
    <Heading>Free end / junction</Heading>
    <Choice label="Node type" name="kind" value={anchor.kind} options={['free','junction']} />
    <Field label="X" name="x" type="number" value={anchor.x} />
    <Field label="Y" name="y" type="number" value={anchor.y} />
    <p className="help">Drag onto another terminal to reconnect.
      Junctions create real electrical continuity.</p>
  </>;
}
export function ShapeView({shape}:{shape:Shape}) {
  return <>
    <Heading>Shape</Heading>
    <Choice label="Type" name="kind" value={shape.kind}
      options={['rectangle','ellipse','line','polyline','polygon']} />
    <Field label="Stroke colour" name="color" value={shape.color} type="color" />
    <Field label="Fill colour" name="fill" value={shape.fill} />
    <Field label="Stroke width" name="stroke" type="number" value={shape.stroke} />
    <Choice label="Line type" name="dash" value={shape.dash}
      options={['solid','dash','dot','dashdot']} />
    <Actions />
  </>;
}
