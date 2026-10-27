import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

interface Exported {
  symbols:Array<{id:string;kind:string;x:number;y:number;rotation:number;terminals?:string[]}>;
  wires:Array<{id:string;from:string;to:string;color:string;dash:string;width:number;points:Array<{x:number;y:number}>}>;
  anchors:Array<{id:string;kind:string}>;
}
const markup=await readFile('dist/index.html','utf8');
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>
  new Response(markup,{headers:{'content-type':'text/html; charset=utf-8'}})});
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1450,height:960},acceptDownloads:true});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.port+'/',{waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  const world=async(x:number,y:number):Promise<{x:number;y:number}>=>
    page.evaluate(([wx,wy])=>{
      const area=document.querySelector<HTMLElement>('#workspace');
      if(!area)throw Error('Workspace not initialised');
      const scale=Math.max(.25,Math.min(2,Math.min((area.clientWidth-75)/1370,(area.clientHeight-75)/850)));
      const offsetX=Math.max(20,(area.clientWidth-1370*scale)/2);
      const offsetY=Math.max(20,(area.clientHeight-850*scale)/2);
      const rect=area.getBoundingClientRect();
      return{x:offsetX+wx*scale+rect.left,y:offsetY+wy*scale+rect.top};
    },[x,y] as [number,number]);
  const clickAt=async(x:number,y:number):Promise<void>=>{
    const position=await world(x,y);
    await page.mouse.click(position.x,position.y);
  };
  const save=async():Promise<Exported>=>{
    await page.locator('#editor-canvas').focus();
    const download=page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    const result=await download;
    const path=await result.path();
    if(!path)throw Error('Save did not return a project');
    return JSON.parse(await readFile(path,'utf8')) as Exported;
  };

  await page.locator('#symbol-picker').focus();
  await page.locator('#symbol-picker').selectOption('resistor');
  // First SONAR cable has a long horizontal segment at y=233.
  await clickAt(470,233);
  let schematic=await save();
  const resistor=schematic.symbols.find(item=>item.kind==='resistor');
  if(!resistor?.terminals||resistor.terminals.length!==2)
    throw Error('Resistor was not created with two contacts');
  const [entry,exit]=resistor.terminals;
  const incoming=schematic.wires.find(item=>item.id==='wire0');
  const outgoing=schematic.wires.find(item=>item.from===exit);
  if(!entry||!exit||incoming?.to!==entry||outgoing?.to!=='m1')
    throw Error('Symbol placement failed to split the conductor into terminals');
  if(schematic.wires.length!==8)throw Error('Splice failed to create exactly one new cable');
  if(incoming.color!==outgoing.color||incoming.dash!==outgoing.dash||incoming.width!==outgoing.width)
    throw Error('Splice changed conductor style');
  console.log('Browser cable insertion produced two electrically attached resistor leads');

  // Cable drawing must hit symbol terminals rather than nearby cable segments.
  await page.getByRole('button',{name:'Cable',exact:true}).click();
  await clickAt(resistor.x+36,resistor.y);
  await clickAt(720,440);
  schematic=await save();
  if(schematic.wires.length!==9 || !schematic.wires.some(item=>item.from===exit&&item.to!=='m1'))
    throw Error('Cable tool did not recognise symbol contacts as anchors');
  console.log('Cable tool can begin a connection directly on a resistor contact');

  // Move an attached device; cable identities remain unchanged and contact locations follow.
  await page.getByRole('button',{name:'Select',exact:true}).click();
  const start=await world(resistor.x,resistor.y);
  const finish=await world(resistor.x+60,resistor.y+80);
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(finish.x,finish.y,{steps:7});
  await page.mouse.up();
  schematic=await save();
  const moved=schematic.symbols.find(item=>item.id===resistor.id);
  if(!moved||Math.abs(moved.x-(resistor.x+60))>2||Math.abs(moved.y-(resistor.y+80))>2)
    throw Error('Dragging a wired resistor did not move its anchor positions');
  if(schematic.wires.find(item=>item.id==='wire0')?.to!==entry)
    throw Error('Moving a resistor disconnected its input lead');

  // Deleting a device detaches its leads instead of destroying schematic wires.
  await page.keyboard.press('Delete');
  schematic=await save();
  if(schematic.symbols.some(item=>item.id===resistor.id))
    throw Error('Delete did not remove resistor');
  if(!schematic.anchors.some(item=>item.id===entry&&item.kind==='free') ||
     !schematic.anchors.some(item=>item.id===exit&&item.kind==='free'))
    throw Error('Deleting resistor did not preserve both cable ends');
  await page.keyboard.press('Control+z');
  schematic=await save();
  if(!schematic.symbols.some(item=>item.id===resistor.id))
    throw Error('Undo did not restore spliced resistor');
  if(errors.length>0)throw Error('Uncaught browser errors:\n'+errors.join('\n'));
  console.log('Symbol move, disconnect, delete and undo passed production Chromium smoke');
} finally {
  await browser.close();
  server.stop(true);
}
