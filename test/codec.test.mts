import {test,expect} from 'bun:test';
import { ProjectCodec } from '../src/io/ProjectCodec';
import { DemoProject } from '../src/model/DemoProject';

test('versioned project roundtrips without losing anchors',()=>{
  const codec=new ProjectCodec();const document=new DemoProject().create();
  document.anchors.push({id:'loose',kind:'free',x:10,y:20});
  expect(codec.parse(codec.encode(document))).toEqual(document);
});
test('rejects missing terminal references and arbitrary network background',()=>{
  const codec=new ProjectCodec();const document=new DemoProject().create();
  document.wires[0]!.from='no-such-id';
  expect(()=>codec.parse(codec.encode(document))).toThrow();
  document.wires[0]!.from='s1';
  document.background={data:'https://server.test/image.png',opacity:1,x:0,y:0,width:100,height:100};
  expect(()=>codec.parse(codec.encode(document))).toThrow();
});
