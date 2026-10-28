import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createElement } from 'react';
import { render2Mkup } from '../src/ui/reactHelpers';
import { EditorShell } from '../src/ui/views/EditorShell';

/** Produce the one-file Pages release, including all JS, CSS and the PDF.js worker. */
const root = process.cwd();
const built = await Bun.build({
  entrypoints: [join(root, 'src/main.ts')],
  target: 'browser',
  format: 'iife',
  minify: false,
  sourcemap: 'none'
});
if (!built.success) throw new Error(built.logs.map(item => String(item)).join('\n'));

const output = built.outputs[0];
if (!output) throw new Error('JavaScript entry-point output missing');
const javascript = await output.text();
const projectPackage:unknown=JSON.parse(await readFile('package.json','utf8'));
if(!projectPackage||typeof projectPackage!=='object'||!('version' in projectPackage)||
   typeof projectPackage.version!=='string'||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(projectPackage.version))
  throw new Error('Missing or invalid package version');
const version=projectPackage.version;
const css = [
  await readFile('styles/shell.css', 'utf8'),
  await readFile('vendor/pages/web/styles/kofi.css','utf8'),
  await readFile('styles/kofi-overrides.css','utf8')
].join('\n');
const pdfWorker = await readFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'utf8');
const template = await readFile('index.template.html', 'utf8');
const tokens = [
  '__APP_SHELL__',
  '__INLINE_STYLES__',
  '__INLINE_PDF_WORKER__',
  '__INLINE_JAVASCRIPT__'
] as const;
for (const token of tokens) {
  if (!template.includes(token)) throw new Error('Missing template marker: ' + token);
}
// Callback replacements avoid `$&` and `$'` substitution in bundled JavaScript.
const html = template
  .replace('__APP_SHELL__', () => render2Mkup(createElement(EditorShell,{version})))
  .replace('__INLINE_STYLES__', () => css.replaceAll('</style', '<\\/style'))
  .replace('__INLINE_PDF_WORKER__', () => pdfWorker.replaceAll('</script', '<\\/script'))
  .replace('__INLINE_JAVASCRIPT__', () => javascript.replaceAll('</script', '<\\/script'));
for (const token of tokens) {
  if (html.includes(token)) throw new Error('Unreplaced template marker: ' + token);
}
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('Built dist/index.html (' + Math.round(html.length / 1024) + ' KiB), fully inlined.');
