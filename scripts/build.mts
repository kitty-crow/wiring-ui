import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** Bun build emits one inline HTML, including JS, CSS and the PDF.js worker. */
const root = process.cwd();
const built = await Bun.build({ entrypoints: [join(root,'src/main.ts')], target: 'browser', format: 'iife', minify: false, sourcemap: 'none' });
if (!built.success) throw new Error(built.logs.map(item=>String(item)).join('\n'));
const output=built.outputs[0];
if (!output) throw new Error('JavaScript output missing');
const js=await output.text();
const css=await readFile('styles/shell.css','utf8');
const pdfWorker=await readFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs','utf8');
const html=(await readFile('index.template.html','utf8'))
  .replace('__INLINE_STYLES__',css.replaceAll('</style','<\\/style'))
  .replace('__INLINE_PDF_WORKER__',pdfWorker.replaceAll('</script','<\\/script'))
  .replace('__INLINE_JAVASCRIPT__',js.replaceAll('</script','<\\/script'));
if (/__INLINE_/.test(html)) throw new Error('Unreplaced build placeholder');
await mkdir('dist',{recursive:true});
await writeFile('dist/index.html',html);
console.log('Built dist/index.html ('+Math.round(html.length/1024)+' KiB), fully inlined.');
