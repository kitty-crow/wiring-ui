import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

const output = built.outputs.find(item => item.type === 'entry-point');
if (!output) throw new Error('JavaScript entry-point output missing');
const javascript = await output.text();
const css = await readFile('styles/shell.css', 'utf8');
const pdfWorker = await readFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'utf8');
const template = await readFile('index.template.html', 'utf8');
const tokens = [
  '__INLINE_STYLES__',
  '__INLINE_PDF_WORKER__',
  '__INLINE_JAVASCRIPT__'
] as const;
for (const token of tokens) {
  if (!template.includes(token)) throw new Error('Missing template marker: ' + token);
}
const html = template
  .replace('__INLINE_STYLES__', css.replaceAll('</style', '<\\/style'))
  .replace('__INLINE_PDF_WORKER__', pdfWorker.replaceAll('</script', '<\\/script'))
  .replace('__INLINE_JAVASCRIPT__', javascript.replaceAll('</script', '<\\/script'));
for (const token of tokens) {
  if (html.includes(token)) throw new Error('Unreplaced template marker: ' + token);
}
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('Built dist/index.html (' + Math.round(html.length / 1024) + ' KiB), fully inlined.');
