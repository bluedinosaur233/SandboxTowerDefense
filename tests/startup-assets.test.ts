import test from 'node:test';
import assert from 'node:assert/strict';
import { StartupAssets } from '../src/ui/startup-assets';

test('image startup awaits decoding, keeps successes and retries missing art',async t=>{
  let fail=true;const requests:string[]=[];let decoded=0;
  class Picture {
    onload=()=>{};onerror=()=>{};
    set src(url:string){requests.push(url);queueMicrotask(()=>url==='/missing.webp'&&fail?this.onerror():this.onload());}
    async decode(){await Promise.resolve();decoded++;}
  }
  const previous=Object.getOwnPropertyDescriptor(globalThis,'Image');
  Object.defineProperty(globalThis,'Image',{value:Picture,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'Image',previous);else delete (globalThis as any).Image;});
  const assets=new StartupAssets(),progress:number[]=[];
  await assert.rejects(assets.load(['/ready.webp','/missing.webp'],done=>progress.push(done)),/1 张图片/);
  assert.equal(decoded,1);assert.equal(assets.images.size,1);
  fail=false;await assets.load(['/ready.webp','/missing.webp'],done=>progress.push(done));
  assert.equal(decoded,2);assert.equal(progress.at(-1),2);
  assert.deepEqual(requests,['/ready.webp','/missing.webp','/missing.webp']);
});
