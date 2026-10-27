import { DemoProject } from '../model/DemoProject';
import { ProjectModel } from '../model/ProjectModel';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { Inspector } from '../ui/Inspector';
import { PointerController, type Tool } from '../input/PointerController';
import { ProjectStore } from '../storage/ProjectStore';
import { SettingsStore, type Settings } from '../storage/SettingsStore';
import { ProjectCodec } from '../io/ProjectCodec';
import { PdfTemplate } from '../io/PdfTemplate';
import { createId } from '../model/types';
import { ComponentGeometry } from '../geometry/ComponentGeometry';
import { SymbolLibrary } from '../symbols/SymbolLibrary';
import { EditorCommands } from './EditorCommands';
import { ShortcutController, type EditorCommand } from '../input/ShortcutController';
import { ContextMenuController } from '../ui/ContextMenuController';
import { ShortcutHelp } from '../ui/ShortcutHelp';

const byId = <T extends HTMLElement>(id:string):T => {
  const result=document.getElementById(id);
  if (!result)throw new Error('Missing interface element: '+id);
  return result as T;
};

/** App composition root. Everything else is independently importable and testable. */
export class EditorApp {
  private readonly codec=new ProjectCodec();
  private readonly store=new ProjectStore();
  private readonly settingsStore=new SettingsStore();
  private readonly settings: Settings;
  private readonly model: ProjectModel;
  private readonly renderer: CanvasRenderer;
  private readonly pointer: PointerController;
  private readonly inspector: Inspector;
  private readonly commands: EditorCommands;
  private readonly menu: ContextMenuController;
  private readonly help = new ShortcutHelp();
  private saveSerial=0;
  private inspectorSelection='';
  private hoveredComponentId:string|null=null;
  private readonly pageFile=byId<HTMLInputElement>('file-input');
  private readonly templateFile=byId<HTMLInputElement>('template-input');
  private readonly status=byId<HTMLElement>('status');
  private readonly sheet=byId<HTMLElement>('workspace');
  public constructor(){
    this.settings=this.settingsStore.read();
    const embedded=byId<HTMLScriptElement>('embedded-project').textContent?.trim();
    let seed=new DemoProject().create();
    if (embedded) {
      try {seed=this.codec.parse(embedded);}catch(error){console.warn('Invalid embedded project',error);}
    }
    this.model=new ProjectModel(seed,()=>this.updated());
    this.commands=new EditorCommands(this.model,()=>this.updated(),()=>this.scheduleSave(),command=>this.externalCommand(command),message=>this.alert(message),()=>this.hoveredComponentId);
    const canvas=byId<HTMLCanvasElement>('editor-canvas');
    this.renderer=new CanvasRenderer(canvas,byId<HTMLCanvasElement>('grid-canvas'),this.model);
    this.renderer.dark=this.settings.theme==='dark';this.renderer.grid=this.settings.grid;
    this.pointer=new PointerController(canvas,this.model,this.renderer,()=>this.commit());
    this.pointer.snap=this.settings.snap;
    this.inspector=new Inspector(byId('inspector'),this.model,()=>this.commit());
    new ShortcutController((name,event)=>this.commands.run(name,event));
    this.menu=new ContextMenuController(canvas,this.model,this.renderer,(action,point)=>this.commands.menu(action,point));
    this.setupToolbar();this.setupInputs();this.setupResize();this.applySettings();
    this.renderer.resize();this.fit();this.inspector.render();
    if (!embedded)this.restore();
    this.updated();
  }
  private updated(): void {
    this.renderer.invalidate();
    const key=this.model.selection?.kind+':'+this.model.selection?.id+':'+this.model.selection?.index+':'+this.model.selection?.ids?.join(',');
    if (key!==this.inspectorSelection){this.inspector.render();this.inspectorSelection=key;}
    const name=byId<HTMLElement>('document-name');
    name.textContent=this.model.project.name;
    this.status.textContent=this.model.project.components.length+' blocks · '+this.model.project.wires.length+' cables · '+this.model.project.symbols.length+' symbols · '+this.renderer.backend;
  }
  private commit():void { this.commands.record(); }
  private scheduleSave():void {
    const serial=++this.saveSerial;
    queueMicrotask(()=>{
      if (serial!==this.saveSerial)return;
      void this.store.save(this.model.project).catch(error=>this.alert('Auto-save unavailable: '+String(error)));
    });
  }
  private async restore():Promise<void>{
    try{const state=await this.store.load();if(state){this.model.set(this.codec.parse(this.codec.encode(state)));this.commands.reset();this.fit();}}catch(error){this.alert('Could not restore last project: '+String(error));}
  }
  private setupToolbar():void {
    const tools=['select','pan','wire','component','text','rectangle','ellipse','line','polyline','polygon','symbol','junction'] as Tool[];
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
      button.addEventListener('click',()=>{
        const tool=button.dataset.tool as Tool;
        if (!tools.includes(tool))return;
        this.pointer.setTool(tool);
        for (const item of document.querySelectorAll<HTMLButtonElement>('[data-tool]'))item.classList.toggle('active',item===button);
        this.status.textContent=tool==='wire'?'Click first anchor, then second anchor. Click empty space for a free end.':tool==='junction'?'Click a cable to split or join crossing cables.':'Tool: '+tool;
      });
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-command]'))button.addEventListener('click',()=>this.command(button.dataset.command??''));
    const picker=byId<HTMLSelectElement>('symbol-picker');
    picker.innerHTML=new SymbolLibrary().kinds().map(kind=>'<option value="'+kind+'">'+kind+'</option>').join('');
    this.pointer.symbol=picker.value as typeof this.pointer.symbol;
    picker.addEventListener('focus',()=>this.selectTool('symbol'));
    picker.addEventListener('pointerdown',()=>this.selectTool('symbol'));
    picker.addEventListener('change',()=>{this.pointer.symbol=picker.value as typeof this.pointer.symbol;this.selectTool('symbol');});
    byId<HTMLElement>('hover-add-pin').addEventListener('click',()=>{
      const component=this.hoveredComponentId?this.model.component(this.hoveredComponentId):undefined;
      if (!component)return;
      this.model.selection={kind:'component',id:component.id};this.model.addPin(component);this.commit();
    });
    this.sheet.addEventListener('pointermove',event=>this.showHover(event));
    this.sheet.addEventListener('pointerleave',()=>{byId<HTMLElement>('hover-add-pin').hidden=true;});
  }
  private selectTool(tool:Tool):void {const button=document.querySelector<HTMLButtonElement>('[data-tool="'+tool+'"]');button?.click();}
  private showHover(event:PointerEvent):void {
    const hover=byId<HTMLElement>('hover-add-pin');
    const bounds=this.sheet.getBoundingClientRect();
    const world=this.renderer.toWorld(event.clientX-bounds.left,event.clientY-bounds.top);
    const component=this.model.project.components.find(item=>ComponentGeometry.contains(item,world));
    this.hoveredComponentId=component?.id??null;
    if (!component){hover.hidden=true;return;}
    const position=this.renderer.toScreen({x:component.x+component.width,y:component.y});
    hover.style.left=Math.max(4,Math.min(this.sheet.clientWidth-120,position.x-120))+'px';
    hover.style.top=Math.max(4,position.y-36)+'px';
    hover.hidden=false;
  }
  private setupInputs():void {
    this.pageFile.addEventListener('change',()=>void this.loadFile());
    this.templateFile.addEventListener('change',()=>void this.loadTemplate());
    const theme=byId<HTMLSelectElement>('theme');theme.value=this.settings.theme;
    theme.addEventListener('change',()=>{this.settings.theme=theme.value==='dark'?'dark':'light';this.applySettings();});
    const snap=byId<HTMLInputElement>('snap');snap.checked=this.settings.snap;
    snap.addEventListener('change',()=>{this.settings.snap=snap.checked;this.pointer.snap=snap.checked;this.settingsStore.write(this.settings);});
    const grid=byId<HTMLInputElement>('grid');grid.checked=this.settings.grid;
    grid.addEventListener('change',()=>{this.settings.grid=grid.checked;this.renderer.grid=grid.checked;this.renderer.invalidate();this.settingsStore.write(this.settings);});
  }
  private applySettings():void {
    document.documentElement.dataset.theme=this.settings.theme;
    this.renderer.dark=this.settings.theme==='dark';this.renderer.invalidate();this.settingsStore.write(this.settings);
  }
  private setupResize():void {new ResizeObserver(()=>this.renderer.resize()).observe(this.sheet);}
  private fit():void {
    const rect=this.sheet.getBoundingClientRect();
    const scale=Math.min((rect.width-75)/this.model.project.width,(rect.height-75)/this.model.project.height);
    this.renderer.zoom=Math.max(.25,Math.min(2,scale));
    this.renderer.offset={x:Math.max(20,(rect.width-this.model.project.width*this.renderer.zoom)/2),y:Math.max(20,(rect.height-this.model.project.height*this.renderer.zoom)/2)};
    this.renderer.invalidate();
  }
  private externalCommand(name:EditorCommand):void {
    if(name==='shortcuts'){this.help.show();return;}
    if(name==='context-menu'){this.menu.showSelection();return;}
    if(name==='escape'){this.pointer.cancelPending();this.model.selection=null;this.model.changed();return;}
    if(name.startsWith('tool-')){this.selectTool(name.slice(5) as Tool);return;}
    if(name==='grid'){byId<HTMLInputElement>('grid').click();return;}
    this.command(name);
  }
  private command(name:string):void {
    if(['undo','redo','copy','cut','paste','duplicate','delete','select-all','shortcuts'].includes(name)){
      this.commands.run(name as EditorCommand);return;
    }
    if (name==='new') {this.model.set(new DemoProject().create());this.commands.reset();this.fit();this.scheduleSave();}
    if (name==='open')this.pageFile.click();
    if (name==='pdf')this.templateFile.click();
    if (name==='fit')this.fit();
    if (name==='html')this.codec.exportHtml(this.model.project);
    if (name==='json'||name==='save')this.codec.download(this.codec.encode(this.model.project),this.model.project.name.replace(/[^\w-]+/g,'_')+'.wiring.json','application/json');
    if (name==='save-as')this.codec.exportHtml(this.model.project);
    if (name==='png')this.exportPng();
    if (name==='add-component')this.model.addComponent({x:200,y:200});
    if (name==='remove-template'){this.model.project.background=null;this.commit();}
    if (name==='duplicate')this.model.duplicateSelected();
    if (name==='delete')this.model.removeSelected();
    if (name==='print')window.print();
  }
  private async loadFile():Promise<void>{
    const file=this.pageFile.files?.[0];if(!file)return;
    try{
      const raw=await file.text();
      const project=file.name.toLowerCase().endsWith('.html')?this.codec.parseHtml(raw):this.codec.parse(raw);
      this.model.set(project);this.commands.reset();this.fit();this.scheduleSave();this.alert('Project loaded: '+project.name);
    }catch(error){this.alert('Cannot open project: '+String(error));}
    this.pageFile.value='';
  }
  private async loadTemplate():Promise<void>{
    const file=this.templateFile.files?.[0];if(!file)return;
    try{
      const background=await new PdfTemplate().load(file,this.model.project.width,this.model.project.height);
      this.model.project.background=background;this.commit();this.alert('Template imported into canvas.');
    }catch(error){this.alert('Template import failed: '+String(error));}
    this.templateFile.value='';
  }
  private exportPng():void{
    // Export the rendered scene rather than the grid UI; the canvas alone is transparent off-page.
    const canvas=byId<HTMLCanvasElement>('editor-canvas');
    canvas.toBlob(blob=>{
      if (!blob)return;
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='wiring-diagram-'+createId().slice(0,6)+'.png';link.click();URL.revokeObjectURL(url);
    });
  }
  private alert(message:string):void {this.status.textContent=message;}
}
