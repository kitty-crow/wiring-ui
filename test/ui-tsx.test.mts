import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { render2Mkup } from '../src/ui/reactHelpers';
import { EditorShell } from '../src/ui/views/EditorShell';
import { ComponentView, DocumentView, SymbolView, WireView } from '../src/ui/views/InspectorViews';
import { CharacterPaletteView } from '../src/ui/views/CharacterPaletteView';
import { ContextMenuView } from '../src/ui/views/ContextMenuView';
import { ShortcutHelpView } from '../src/ui/views/ShortcutHelpView';
import { DemoProject } from '../src/model/DemoProject';

test('TSX shell exports every essential native DOM anchor and control',()=>{
  const html=render2Mkup(createElement(EditorShell));
  for(const id of ['app','workspace','editor-canvas','grid-canvas','inspector',
    'symbol-picker','character-palette','status','file-input','template-input',
    'hover-add-pin','document-name','theme','snap','grid']) {
    expect(html).toContain('id="'+id+'"');
  }
  for(const tool of ['select','wire','component','symbol','rectangle','ellipse',
    'polyline','polygon'])expect(html).toContain('data-tool="'+tool+'"');
  for(const command of ['undo','redo','open','new','html','json','shortcuts'])
    expect(html).toContain('data-command="'+command+'"');
});

test('TSX property controls escape untrusted component names and terminal labels',()=>{
  const project=new DemoProject().create();
  const component=project.components[0];
  if(!component)throw Error('Missing default component');
  component.name='<img src=x onerror=alert(1)>';
  const first=component.pins[0];
  if(!first)throw Error('Missing default pin');
  first.label='value "quote" & <script>alert(1)</script>';
  const html=render2Mkup(createElement(ComponentView,{component}));
  expect(html).not.toContain('<img src=x');
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).toContain('&lt;img');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('data-pin="'+first.id+'"');
  expect(html).toContain('data-part="label"');
});

test('TSX property inspector retains delegated editing keys and colour input',()=>{
  const project=new DemoProject().create();
  project.name='& <a href="https://bad.example">unsafe</a>';
  const document=render2Mkup(createElement(DocumentView,{project}));
  expect(document).toContain('&lt;a');
  expect(document).toContain('data-key="name"');
  const wire=project.wires[0];
  if(!wire)throw Error('Missing default cable');
  const wireHtml=render2Mkup(createElement(WireView,{wire}));
  expect(wireHtml).toContain('data-key="color"');
  expect(wireHtml).toContain('type="color"');
  expect(wireHtml).toContain('data-action="apply-colour"');
  const symbolHtml=render2Mkup(createElement(SymbolView,{symbol:{
    id:'R1',x:100,y:100,kind:'resistor',scale:1,rotation:0,
    color:'#222222',label:'<R1>',value:'3R3 Ω'
  }}));
  expect(symbolHtml).toContain('data-key="value"');
  expect(symbolHtml).toContain('3R3 Ω');
  expect(symbolHtml).toContain('&lt;R1&gt;');
});

test('TSX help, glyph palette and context menus expose class-owned DOM hooks',()=>{
  const help=render2Mkup(createElement(ShortcutHelpView));
  expect(help).toContain('data-dismiss');
  expect(help).toContain('Ctrl/Cmd+R');
  const palette=render2Mkup(createElement(CharacterPaletteView,{
    glyphs:[{name:'Ohm',symbol:'Ω'}]
  }));
  expect(palette).toContain('data-glyph="Ω"');
  expect(palette).toContain('aria-label="Insert Ohm"');
  const menu=render2Mkup(createElement(ContextMenuView,{
    entries:[{action:'remove-bend',label:'Delete bend'}]
  }));
  expect(menu).toContain('data-action="remove-bend"');
  expect(menu).toContain('role="menuitem"');
});

test('drawing toolbar exposes descriptive SVG icons and accessible hover tooltips',()=>{
  const html=render2Mkup(createElement(EditorShell));
  const iconOnlyTools=[
    'select','pan','wire','junction','component','text','rectangle','ellipse',
    'line','polyline','polygon','symbol'
  ];
  const iconOnlyCommands=['pdf','remove-template','fit','shortcuts'];
  for(const [attribute,names] of [
    ['data-tool',iconOnlyTools],['data-command',iconOnlyCommands]
  ] as const){
    for(const name of names){
      const opening=new RegExp('<button\\\\b[^>]*'+attribute+'="'+name+'"[^>]*>').exec(html)?.[0];
      expect(opening).toBeDefined();
      expect(opening).toContain('aria-label="');
      expect(opening).toContain('title="');
      const offset=html.indexOf(opening??'__absent__');
      expect(html.slice(offset+opening!.length,offset+opening!.length+220))
        .toContain('<svg');
    }
  }
  expect(html).toContain('id="symbol-picker"');
  expect(html).toContain('aria-label="Choose schematic symbol"');
});
