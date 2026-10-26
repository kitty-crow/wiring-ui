import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
/** AST-enforced project conventions, matching tracker-viewer's guard policy. */
const ignored = new Set(['.git','node_modules','dist','vendor','coverage']);
async function files(folder:string):Promise<string[]> {
  const entries=await readdir(folder,{withFileTypes:true});
  const groups=await Promise.all(entries.map(async entry=>{
    const path=join(folder,entry.name);
    if (!entry.isDirectory())return [path];
    return ignored.has(entry.name)?[]:files(path);
  }));
  return groups.flat();
}
const problems:string[]=[];
for (const path of await files('.')) {
  if (/\.(mjs|cjs|js|jsx)$/i.test(path)) {problems.push(path+': maintained JS forbidden');continue;}
  if (!/\.(ts|mts|cts|tsx)$/i.test(path)||path.endsWith('.d.ts'))continue;
  const text=await readFile(path,'utf8');
  const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
  function visit(node:ts.Node,insideIf:boolean):void {
    const line=source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
    const prefix=path+':'+line+': ';
    if(node.kind===ts.SyntaxKind.AnyKeyword)problems.push(prefix+'explicit any');
    if(ts.isIfStatement(node)&&insideIf)problems.push(prefix+'nested if');
    const next=ts.isFunctionLike(node)?false:insideIf||ts.isIfStatement(node);
    ts.forEachChild(node,child=>visit(child,next));
  }
  visit(source,false);
}
if(problems.length)throw new Error(problems.join('\n'));
console.log('Source architecture guard passed');
