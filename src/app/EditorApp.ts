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
import { SymbolLibrary } from '../symbols/SymbolLibrary';

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
  private saveSerial=0;
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
    const canvas=byId<HTMLCanvasElement>('editor-canvas');
    this.renderer=new CanvasRenderer(canvas,byId<HTMLCanvasElement>('grid-canvas'),this.model);
    this.renderer.dark=this.settings.theme==='dark';this.renderer.grid=this.settings.grid;
    this.pointer=new PointerController(canvas,this.model,this.renderer,()=>this.commit());
    this.pointer.snap=this.settings.snap;
    this.inspector=new Inspector(byId('inspector'),this.model,()=>this.commit());
    this.setupToolbar();this.setupInputs();this.setupResize();this.applySettings();
    this.renderer.resize();this.fit();this.inspector.render();
    if (!embedded)this.restore();
    this.updated();
  }
  private updated(): void {
    this.renderer.invalidate();
    this.inspector.render();
    const name=byId<HTMLElement>('document-name');
    name.textContent=this.model.project.name;
    this.status.textContent=this.model.project.components.length+' blocks · '+this.model.project.wires.length+' cables · '+this.renderer.backend;
  }
  private commit():void {
    this.updated();
    const serial=++this.saveSerial;
    queueMicrotask(()=>{if (serial!==this.saveSerial)return;void this.store.save(this.model.project).catch(error=>this.alert('Auto-save unavailable: '+String(error)));});
  }
  private async restore():Promise<void>{
    try{const state=await this.store.load();if(state){this.model.set(this.codec.parse(this.codec.encode(state)));this.fit();}}catch(error){this.alert('Could not restore last project: '+String(error));}
  }
  private setupToolbar():void {
    const tools=['select','pan','wire','component','text','rectangle','ellipse','line','symbol','junction'] as Tool[];
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
    picker.addEventListener('change',()=>{this.pointer.symbol=picker.value as typeof this.pointer.symbol;this.selectTool('symbol');});
    byId<HTMLElement>('hover-add-pin').addEventListener('click',()=>{
      const selected=this.model.selection;
      const component=selected?.kind==='component'?this.model.component(selected.id):undefined;
      if (!component)return;
      this.model.addPin(component);this.commit();
    });
    this.sheet.addEventListener('pointermove',event=>this.showHover(event));
    this.sheet.addEventListener('pointerleave',()=>{byId<HTMLElement>('hover-add-pin').hidden=true;});
  }
  private selectTool(tool:Tool):void {const button=document.querySelector<HTMLButtonElement>('[data-tool="'+tool+'"]');button?.click();}
  private showHover(event:PointerEvent):void {
    const hover=byId<HTMLElement>('hover-add-pin');
    const selected=this.model.selection;
    const component=selected?.kind==='component'?this.model.component(selected.id):undefined;
    if (!component){hover.hidden=true;return;}
    const position=this.renderer.toScreen({x:component.x+component.width,y:component.y});
    hover.style.left=Math.max(4,Math.min(this.sheet.clientWidth-120,position.x-120))+'px';
    hover.style.top=Math.max(4,position.y-36)+'px';
    hover.hidden=false;
    void event;
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
  private command(name:string):void {
    if (name==='new') {this.model.set(new DemoProject().create());this.fit();this.commit();}
    if (name==='open')this.pageFile.click();
    if (name==='pdf')this.templateFile.click();
    if (name==='fit')this.fit();
    if (name==='html')this.codec.exportHtml(this.model.project);
    if (name==='json')this.codec.download(this.codec.encode(this.model.project),this.model.project.name.replace(/[^\w-]+/g,'_')+'.wiring.json','application/json');
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
      this.model.set(project);this.fit();this.commit();this.alert('Project loaded: '+project.name);
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
