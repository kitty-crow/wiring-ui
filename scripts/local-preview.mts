/** Offline preview harness for environments lacking Bun; PDF.js is excluded from this preview. */
import ts from 'typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
const base=resolve('.');
const seen=new Map<string,string>();
const filePath=(path:string):string=>relative(base,path).replaceAll('\\','/');
async function follow(path:string):Promise<void> {
  const absolute=resolve(path);const id=filePath(absolute);
  if(seen.has(id))return;
  const source=await readFile(absolute,'utf8');
  const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const found=[...source.matchAll(/from ['"](\.[^'"]+)['"]/g)].map(match=>match[1]??'');
  seen.set(id,transpiled);
  for (const name of found)await follow(resolve(dirname(absolute),name+'.ts'));
}
await follow('src/main.ts');
const source='(function(){"use strict";const modules={'+[...seen.entries()].map(([name,body])=>JSON.stringify(name)+':function(module,exports,require){\n'+body+'\n}').join(',')+'};'+
  'const cache={};function req(name,from){let id;if(name.startsWith(".")){const p=from.split("/");p.pop();for(const segment of name.split("/")){if(segment==="..")p.pop();else if(segment!==".")p.push(segment);}id=p.join("/")+".ts";}else{id=name;}if(id.startsWith("pdfjs-dist/"))return {GlobalWorkerOptions:{},getDocument:()=>{throw new Error("PDF preview requires Bun release build")}};if(cache[id])return cache[id].exports;if(!modules[id])throw new Error("Module missing: "+id);const m={exports:{}};cache[id]=m;modules[id](m,m.exports,(dep)=>req(dep,id));return m.exports;}req("src/main.ts","");})();';
const css=await readFile('styles/shell.css','utf8');
const template=await readFile('index.template.html','utf8');
const html=template.replace('__INLINE_STYLES__',css).replace('__INLINE_JAVASCRIPT__',source).replace('__INLINE_PDF_WORKER__','');
await mkdir('dist',{recursive:true});await writeFile('dist/index.html',html);
console.log('Local preview created (PDF importer needs Bun release build): dist/index.html');
