import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';

const markup=await readFile('dist/index.html','utf8');
const server=Bun.serve({
  hostname:'127.0.0.1',port:0,
  fetch:()=>new Response(markup,{headers:{'content-type':'text/html; charset=utf-8'}})
});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1450,height:960},acceptDownloads:true});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.port+'/',{waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#document-name')?.textContent==='SONAR / MOXA / PSU');

  const world=async(x:number,y:number):Promise<{x:number;y:number}>=>page.evaluate(([wx,wy])=>{
    const area=document.querySelector<HTMLElement>('#workspace');
    if(!area)throw Error('workspace absent');
    const width=area.clientWidth,height=area.clientHeight;
    const scale=Math.max(.25,Math.min(2,Math.min((width-75)/1370,(height-75)/850)));
    const offsetX=Math.max(20,(width-1370*scale)/2);
    const offsetY=Math.max(20,(height-850*scale)/2);
    const rect=area.getBoundingClientRect();
    return{x:rect.left+offsetX+wx*scale,y:rect.top+offsetY+wy*scale};
  },[x,y] as [number,number]);

  const save=async():Promise<{
    components:Array<{id:string;rotation?:number;mirrorX?:boolean;mirrorY?:boolean;pins:Array<{id:string}>}>;
    symbols:Array<{kind:string;label:string;value?:string}>;
  }>=>{
    await page.locator('#editor-canvas').focus();
    const download=page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    const item=await download;
    const path=await item.path();
    if(!path)throw Error('Project file not downloaded');
    return JSON.parse(await readFile(path,'utf8'));
  };

  // Hover rotation is resolved using world-space component geometry.
  const sonar=await world(215,310);
  await page.mouse.move(sonar.x,sonar.y);
  await page.keyboard.press('Control+r');
  let project=await save();
  if(project.components.find(c=>c.id==='sonar')?.rotation!==90)throw Error('Hovered R failed to rotate SONAR');
  if((project.components.find(c=>c.id==='moxa')?.rotation??0)!==0)throw Error('Hovered R rotated an unselected device');
  await page.keyboard.press('Control+Shift+r');
  await page.keyboard.press('Control+e');
  await page.keyboard.press('Control+Shift+e');
  project=await save();
  const transformed=project.components.find(c=>c.id==='sonar');
  if((transformed?.rotation??0)!==0||!transformed?.mirrorX||!transformed?.mirrorY)throw Error('Hover inverse rotation/mirror modifiers failed');
  if(transformed.pins[0]?.id!=='s1')throw Error('Rotating/mirroring changed terminal identity');

  // Click and drag from blank sheet margins, selecting three components as a set.
  await page.getByRole('button',{name:'Select',exact:true}).click();
  const first=await world(12,14),last=await world(1355,830);
  await page.mouse.move(first.x,first.y);
  await page.mouse.down();
  await page.mouse.move(last.x,last.y,{steps:12});
  await page.mouse.up();
  await page.getByText('3 components selected').waitFor();
  await page.keyboard.press('Control+r');
  project=await save();
  if(!project.components.every(c=>c.rotation===90))throw Error('Group rotation did not affect every selected component');
  await page.keyboard.press('Control+Shift+r');
  await page.keyboard.press('Control+e');
  project=await save();
  if(!project.components.every(c=>c.mirrorX||c.mirrorY))throw Error('Group mirror did not affect each component');

  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  project=await save();
  if(project.components.length!==6)throw Error('Group copy/paste did not duplicate all three components');
  await page.keyboard.press('Delete');
  project=await save();
  if(project.components.length!==3)throw Error('Group deletion did not remove pasted group');
  await page.keyboard.press('Control+z');
  project=await save();
  if(project.components.length!==6)throw Error('Undo did not restore group deletion');

  // Place IEC resistor and insert engineering units at the text caret.
  await page.locator('#symbol-picker').focus();
  await page.locator('#symbol-picker').selectOption('resistor');
  const placement=await world(690,620);
  await page.locator('#editor-canvas').click({position:{
    x:placement.x-(await page.locator('#editor-canvas').boundingBox())!.x,
    y:placement.y-(await page.locator('#editor-canvas').boundingBox())!.y
  }});
  await page.locator('#inspector-edge').focus();
  await page.keyboard.press('Enter');
  const value=page.locator('#inspector input[data-key="value"]');
  await value.waitFor({state:'visible'});
  await page.locator('#inspector input[data-key="label"]').fill('R1');
  await page.locator('#inspector input[data-key="label"]').press('Tab');
  await value.fill('3R3');
  await value.focus();
  await value.evaluate((element:HTMLInputElement)=>element.setSelectionRange(3,3));
  await page.getByRole('button',{name:'Insert Ohm'}).click();
  if(await value.inputValue()!=='3R3Ω')throw Error('Character palette failed to insert Ω at the caret');
  project=await save();
  if(!project.symbols.some(s=>s.label==='R1'&&s.value==='3R3Ω'))throw Error('Label and value did not survive save/load');
  if(errors.length)throw Error('Browser runtime errors:\n'+errors.join('\n'));
  console.log('Marquee, group transforms, clipboard, hover shortcut, symbol label/value and Ω palette passed.');
} finally {
  await browser.close();server.stop(true);
}
