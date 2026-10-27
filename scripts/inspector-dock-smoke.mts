import { chromium, type Page } from 'playwright';
import { readFile } from 'node:fs/promises';

/** Production-only regression: interaction, reflow and localStorage persistence. */
const html=await readFile('dist/index.html','utf8');
const server=Bun.serve({
  hostname:'127.0.0.1',port:0,
  fetch:()=>new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}})
});
const browser=await chromium.launch({headless:true});
async function load(page:Page):Promise<void>{
  await page.goto('http://127.0.0.1:'+server.port+'/',{waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('blocks'));
}
try{
  const context=await browser.newContext({viewport:{width:1400,height:900}});
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await load(page);
  const main=page.locator('#editor-main');
  const panel=page.locator('#inspector-panel');
  const pin=page.locator('#inspector-pin');
  const workspace=page.locator('#workspace');
  if(await main.evaluate(node=>node.classList.contains('inspector-pinned')))
    throw Error('Inspector must auto-hide on first visit');
  if(await panel.getAttribute('aria-hidden')!=='true')throw Error('Inspector visible by default');
  const originalWidth=await workspace.evaluate(node=>node.getBoundingClientRect().width);
  await page.mouse.move(1396,470);
  await page.waitForFunction(()=>document.querySelector('#editor-main')?.classList.contains('inspector-open'));
  if(await panel.getAttribute('aria-hidden')!=='false')throw Error('Edge hover did not reveal inspector');
  await page.mouse.move(1270,500);
  if(!await main.evaluate(node=>node.classList.contains('inspector-open')))
    throw Error('Inspector closes while pointer moves into panel');
  await page.mouse.move(650,500);
  await page.waitForFunction(()=>!document.querySelector('#editor-main')?.classList.contains('inspector-open'));
  if(await panel.getAttribute('aria-hidden')!=='true')throw Error('Inspector did not hide on leave');
  await page.mouse.move(1396,470);
  await page.waitForFunction(()=>document.querySelector('#editor-main')?.classList.contains('inspector-open'));
  await pin.click();
  if(await pin.getAttribute('aria-pressed')!=='true')throw Error('Pin toggle did not pin inspector');
  if(!await main.evaluate(node=>node.classList.contains('inspector-pinned')))
    throw Error('Pinned inspector did not enter grid layout');
  const reducedWidth=await workspace.evaluate(node=>node.getBoundingClientRect().width);
  if(reducedWidth>originalWidth-240)throw Error('Pinned inspector did not reserve space');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wiring-ui-settings')??'{}') as {inspectorPinned?:boolean});
  if(saved.inspectorPinned!==true)throw Error('Pinned preference not persisted in localStorage');
  await page.reload({waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  if(await page.locator('#inspector-pin').getAttribute('aria-pressed')!=='true')
    throw Error('Pinned preference not restored after reload');
  await page.locator('#inspector-pin').click();
  const unpinned=await page.evaluate(()=>JSON.parse(localStorage.getItem('wiring-ui-settings')??'{}') as {inspectorPinned?:boolean});
  if(unpinned.inspectorPinned!==false)throw Error('Unpin was not saved in localStorage');
  await page.reload({waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  if(await page.locator('#inspector-panel').getAttribute('aria-hidden')!=='true')
    throw Error('Auto-hide preference not restored on second reload');
  await context.close();

  const mobile=await browser.newContext({viewport:{width:390,height:760},isMobile:true,hasTouch:true});
  const mobilePage=await mobile.newPage();
  mobilePage.on('pageerror',e=>errors.push(e.message));
  await load(mobilePage);
  await mobilePage.locator('#inspector-edge').tap();
  if(await mobilePage.locator('#inspector-panel').getAttribute('aria-hidden')!=='false')
    throw Error('Touch edge tab failed to reveal inspector');
  await mobilePage.waitForFunction(()=>{
    const panel=document.querySelector<HTMLElement>('#inspector-panel');
    const main=document.querySelector<HTMLElement>('#editor-main');
    if(!panel||!main)return false;
    const expectedLeft=main.getBoundingClientRect().right-panel.offsetWidth;
    return Math.abs(panel.getBoundingClientRect().left-expectedLeft)<1;
  });
  const hit=await mobilePage.locator('#inspector-pin').evaluate(button=>{
    const b=button.getBoundingClientRect();
    const cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;
    const under=document.elementFromPoint(cx,cy);
    return {button:{x:cx,y:cy,width:b.width,height:b.height},
      under:under?.id??under?.tagName,
      underParent:under?.parentElement?.id,
      panelVisible:getComputedStyle(document.querySelector('#inspector-panel')!).visibility,
      panelPointer:getComputedStyle(document.querySelector('#inspector-panel')!).pointerEvents};
  });
  await mobilePage.evaluate(()=>{
    const log:string[]=[];
    (window as Window & {dockTouchEvents?:string[]}).dockTouchEvents=log;
    const main=document.querySelector('#editor-main');
    for(const type of ['pointerdown','pointermove','pointerup','pointerleave','click','touchstart','touchend']) {
      document.addEventListener(type,event=>{
        const pointer=event as PointerEvent;
        const target=event.target as Element|null;
        log.push(type+' '+(target?.id||target?.tagName||'')+' '+(pointer.pointerType||'')+
          ' '+(main?.className||''));
      },true);
    }
  });
  console.log('Mobile pin hit-test',JSON.stringify(hit));
  await mobilePage.locator('#inspector-pin').tap();
  console.log('Mobile touch events',await mobilePage.evaluate(()=>(window as Window & {dockTouchEvents?:string[]}).dockTouchEvents));
  console.log('Mobile pin state',await mobilePage.locator('#inspector-pin').getAttribute('aria-pressed'),
    await mobilePage.locator('#editor-main').getAttribute('class'));
  if(!await mobilePage.locator('#editor-main').evaluate(node=>node.classList.contains('inspector-pinned')))
    throw Error('Mobile pin did not open lower property section');
  const overflow=await mobilePage.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(overflow>2)throw Error('Properties dock introduces mobile horizontal overflow: '+overflow);
  await mobile.close();
  if(errors.length)throw Error('Inspector browser runtime errors:\n'+errors.join('\n'));
  console.log('Properties auto-hide, right-edge reveal, pin persistence, reload, mobile touch passed.');
}finally{
  await browser.close();
  server.stop(true);
}
