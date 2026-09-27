import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SOUND_FILES } from '../src/ui/sound-library';
import { Audio } from '../src/ui/audio';

const root=join(process.cwd(),'public/audio/sfx');

test('every sampled cue resolves to a bundled audio file',async()=>{
  const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8')) as {file:string;sha256:string}[];
  const byFile=new Map(manifest.map(item=>[item.file,item]));
  assert.equal(SOUND_FILES.length,22);
  for(const file of SOUND_FILES){
    const bytes=await readFile(join(root,file));
    assert.ok(bytes.length>256,file);
    assert.ok(byFile.has(file),'manifest missing '+file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),byFile.get(file)!.sha256,file);
    assert.ok(file.endsWith('.ogg') ? bytes.subarray(0,4).toString()==='OggS' : bytes.subarray(0,4).toString()==='RIFF',file);
  }
  assert.equal((await readdir(root)).filter(x=>x.endsWith('.ogg')||x.endsWith('.wav')).length,SOUND_FILES.length);
});

// These doubles test playback policy; real codec decoding is covered by the browser smoke test.
function audioEnvironment(t:TestContext,missing?:string){
  class Node {connect(next:unknown){return next;}disconnect(){}}
  class Param {value=0;setValueAtTime(){}linearRampToValueAtTime(){}}
  class Music {paused=true;readyState=4;currentTime=0;volume=1;src='';preload='';loop=false;addEventListener(){}load(){}pause(){this.paused=true;}async play(){this.paused=false;}}
  class Source extends Node {buffer:unknown;playbackRate=new Param();onended:(()=>void)|null=null;start(){}stop(at?:number){if(at===undefined)this.onended?.();}}
  class Context {
    currentTime=10;state='running';destination=new Node();
    async resume(){}
    createGain(){return Object.assign(new Node(),{gain:new Param()});}
    createStereoPanner(){return Object.assign(new Node(),{pan:new Param()});}
    createDynamicsCompressor(){return Object.assign(new Node(),{threshold:new Param(),ratio:new Param(),attack:new Param(),release:new Param()});}
    createBufferSource(){return new Source();}
    async decodeAudioData(){const data=new Float32Array([0,.3,-.3,0]);return {duration:.8,numberOfChannels:1,getChannelData:()=>data};}
  }
  const context=new Context();
  const replacements={window:{Audio:Music},AudioContext:class{constructor(){return context;}},localStorage:{getItem:()=>null,setItem:()=>{}}};
  for(const [name,value] of Object.entries(replacements)){
    const previous=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
    t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete (globalThis as any)[name];});
  }
  let requests=0;
  t.mock.method(globalThis,'fetch',async(url:string)=>{requests++;return {ok:!url.endsWith(missing??'missing-file'),status:404,arrayBuffer:async()=>new ArrayBuffer(4)};});
  return {context,requests:()=>requests};
}

test('samples load once, combat pauses, UI remains responsive and mute stops all voices',async t=>{
  const env=audioEnvironment(t),audio=new Audio();
  audio.unlock();await audio.preloadSamples();
  assert.equal(audio.diagnostics().samplesLoaded,SOUND_FILES.length);
  assert.deepEqual(audio.diagnostics().sampleFailures,[]);
  audio.unlock();await audio.preloadSamples();assert.equal(env.requests(),SOUND_FILES.length);
  audio.effect('arrow');audio.effect('arrow');assert.equal(audio.played.arrow,1);
  audio.effect('cast');assert.equal(audio.diagnostics().voices,2);
  audio.setSuspended(true);assert.equal(audio.diagnostics().voices,0);assert.equal(audio.music.paused,true);
  env.context.currentTime++;audio.effect('arrow');assert.equal(audio.played.arrow,1);
  audio.click();assert.equal(audio.played.click,1);assert.equal(audio.diagnostics().voices,1);
  audio.toggle();assert.equal(audio.enabled,false);assert.equal(audio.diagnostics().voices,0);
  env.context.currentTime++;audio.click();assert.equal(audio.played.click,1);
  audio.toggle();audio.setSuspended(false);assert.equal(audio.music.paused,false);
  env.context.currentTime++;audio.effect('arrow');assert.equal(audio.played.arrow,2);
  audio.setVolume('sfx',0);assert.equal(audio.diagnostics().voices,0);
  env.context.currentTime++;audio.effect('arrow');assert.equal(audio.played.arrow,2);
});

test('a missing sample reports failure without preventing other sounds',async t=>{
  audioEnvironment(t,'magic.wav');const audio=new Audio();audio.unlock();await audio.preloadSamples();
  assert.equal(audio.diagnostics().samplesLoaded,SOUND_FILES.length-1);
  assert.deepEqual(audio.diagnostics().sampleFailures,['magic.wav']);
  assert.match(audio.sampleStatus,/部分音效加载失败/);
  audio.effect('cast');assert.equal(audio.played.cast,undefined);
  audio.effect('arrow');assert.equal(audio.played.arrow,1);
});
