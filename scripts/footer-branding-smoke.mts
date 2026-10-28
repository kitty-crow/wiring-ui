import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

/** Production HTML regression: build-stamped footer and pinned Pages Ko-fi widget. */
const html=await readFile('dist/index.html','utf8');
const pkg:unknown=JSON.parse(await readFile('package.json','utf8'));
if(!pkg||typeof pkg!=='object'||!('version' in pkg)||typeof pkg.version!=='string')
  throw new Error('No package version');
if(!html.includes('v'+pkg.version))throw new Error('Build version missing from HTML');
if(!html.includes('data-version'))throw new Error('Version hook missing');
if(!html.includes('floatingchat-container-wrap'))throw new Error('Shared Ko-fi CSS missing');
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch:()=>
  new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}})});
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true});
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://storage.ko-fi.com/cdn/scripts/overlay-widget.js',route=>
    route.fulfill({contentType:'application/javascript',body:
      "window.__testKofiDraw=[];window.kofiWidgetOverlay={draw:(name,config)=>{window.__testKofiDraw.push({name,config});const marker=document.createElement('div');marker.className='floatingchat-container-wrap';marker.dataset.fakeKofi='true';document.body.append(marker);}};"
    }));
  await page.route('https://storage.ko-fi.com/cdn/cup-border.png',route=>route.abort());
  await page.goto('http://127.0.0.1:'+server.port+'/',{waitUntil:'load'});
  await page.locator('#editor-canvas').waitFor({state:'visible'});
  await page.waitForFunction(()=>(document.querySelector('#status')?.textContent??'').includes('blocks'));
  const version=await page.locator('[data-version]').textContent();
  if(version!=='v'+pkg.version)throw new Error('Version did not render: '+version);
  const link=page.locator('.footer-links .pages-kofi-link');
  if(await link.getAttribute('href')!=='https://ko-fi.com/kittycrow')
    throw new Error('Ko-fi link points to wrong account');
  await page.waitForFunction(()=>
    (window as Window & {__testKofiDraw?:Array<{name:string;config:Record<string,string>}>})
      .__testKofiDraw?.length===1);
  const draws=await page.evaluate(()=>
    (window as Window & {__testKofiDraw?:Array<{name:string;config:Record<string,string>}>})
      .__testKofiDraw??[]);
  if(draws[0]?.name!=='kittycrow'||draws[0].config.type!=='floating-chat')
    throw new Error('Ko-fi shared overlay was not started');
  if(draws[0].config['floating-chat.donateButton.background-color']!=='#5bc0de')
    throw new Error('Ko-fi widget branding differs from App Index');
  const download=page.waitForEvent('download');
  await page.locator('[data-command="html"]').click();
  const item=await download;
  const path=await item.path();
  if(!path)throw new Error('No HTML export');
  const saved=await readFile(path,'utf8');
  if(saved.includes('data-fake-kofi')||saved.includes('script src="https://storage.ko-fi.com'))
    throw new Error('Export includes live third-party Ko-fi widget markup');
  if(!saved.includes('v'+pkg.version)||!saved.includes('https://ko-fi.com/kittycrow'))
    throw new Error('Export dropped version or Ko-fi footer link');
  if(errors.length)throw new Error('Browser errors:\n'+errors.join('\n'));
  console.log('Build version, Ko-fi widget, fallback link and offline HTML export passed.');
}finally{
  await browser.close();
  server.stop(true);
}
