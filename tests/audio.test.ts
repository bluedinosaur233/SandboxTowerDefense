import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LICENSED_FILES, LICENSED_SOUNDS, licensedFiles } from '../src/ui/licensed-sounds';
import { SOUND_FILES, SOUND_LIBRARY } from '../src/ui/sound-library';
import { Audio, TRACKS, MUSIC_PLAYLISTS } from '../src/ui/audio';

const root=join(process.cwd(),'public/audio/sfx');

test('every sampled cue resolves to a bundled audio file',async()=>{
  const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8')) as {file:string;sha256:string}[];
  const byFile=new Map(manifest.map(item=>[item.file,item]));
  assert.ok(SOUND_FILES.length>=60);
  for(const file of SOUND_FILES){
    const bytes=await readFile(join(root,file));
    assert.ok(bytes.length>256,file);
    assert.ok(byFile.has(file),'manifest missing '+file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),byFile.get(file)!.sha256,file);
    assert.ok(file.endsWith('.ogg') ? bytes.subarray(0,4).toString()==='OggS' : bytes.subarray(0,4).toString()==='RIFF',file);
  }
  for(const file of (await readdir(root)).filter(x=>/\.(ogg|wav)$/.test(x)))assert.ok(byFile.has(file),'uncredited bundled audio: '+file);
});

// These doubles test playback policy; real codec decoding is covered by the browser smoke test.
function audioEnvironment(t:TestContext,missing?:string,pack?:unknown){
  const starts:number[][]=[];const playedFiles:string[]=[];const options:unknown[]=[];
  class Node {connect(next:unknown){return next;}disconnect(){}}
  class Param {value=0;setValueAtTime(){}linearRampToValueAtTime(){}}
  class Music {listeners=new Map<string,()=>void>();paused=true;readyState=4;currentTime=0;volume=1;src='';preload='';loop=false;addEventListener(name:string,cb:()=>void){this.listeners.set(name,cb);}load(){this.currentTime=0;this.paused=true;}pause(){this.paused=true;}async play(){this.paused=false;}}
  class Source extends Node {buffer:unknown;playbackRate=new Param();onended:(()=>void)|null=null;start(...args:number[]){starts.push(args);playedFiles.push((this.buffer as any).file);}stop(at?:number){if(at===undefined)this.onended?.();}}
  class Context {
    currentTime=10;state='running';destination=new Node();
    async resume(){}
    createGain(){return Object.assign(new Node(),{gain:new Param()});}
    createStereoPanner(){return Object.assign(new Node(),{pan:new Param()});}
    createDynamicsCompressor(){return Object.assign(new Node(),{threshold:new Param(),ratio:new Param(),attack:new Param(),release:new Param()});}
    createBufferSource(){return new Source();}
    async decodeAudioData(bytes:ArrayBuffer){const data=new Float32Array(800);data.fill(.3,250,600);return {file:new TextDecoder().decode(bytes),duration:.8,length:data.length,sampleRate:1000,numberOfChannels:1,getChannelData:()=>data};}
  }
  const context=new Context();
  const replacements={window:{Audio:Music},AudioContext:class{constructor(config:unknown){options.push(config);return context;}},localStorage:{getItem:()=>null,setItem:()=>{}}};
  for(const [name,value] of Object.entries(replacements)){
    const previous=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});
    t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete (globalThis as any)[name];});
  }
  let requests=0;
  t.mock.method(globalThis,'fetch',async(url:string)=>{requests++;return {ok:!url.endsWith(missing??'missing-file')&&(!url.endsWith('pack.json')||pack!==undefined),status:404,json:async()=>pack,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};});
  return {context,starts,playedFiles,options,requests:()=>requests};
}

test('samples load once, combat pauses, UI remains responsive and mute stops all voices',async t=>{
  const env=audioEnvironment(t),audio=new Audio();
  audio.unlock();await audio.preloadSamples();
  assert.equal(audio.diagnostics().samplesLoaded,SOUND_FILES.length);
  assert.deepEqual(audio.diagnostics().sampleFailures,[]);
  audio.unlock();await audio.preloadSamples();assert.equal(env.requests(),SOUND_FILES.length+4);
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
  audioEnvironment(t,'energy-cast.wav');const audio=new Audio();audio.unlock();await audio.preloadSamples();
  assert.equal(audio.diagnostics().samplesLoaded,SOUND_FILES.length-1);
  assert.deepEqual(audio.diagnostics().sampleFailures,['energy-cast.wav']);
  assert.match(audio.sampleStatus,/部分音效加载失败/);
  audio.effect('cast');assert.equal(audio.played.cast,undefined);
  audio.effect('arrow');assert.equal(audio.played.arrow,1);
});

test('a later gesture resumes interrupted sound without reloading samples or changing mute choices',async t=>{
  const env=audioEnvironment(t),audio=new Audio();audio.unlock();await audio.preloadSamples();
  const requests=env.requests();let resumed=0;
  env.context.state='suspended';
  t.mock.method(env.context,'resume',async()=>{resumed++;env.context.state='running';});
  audio.retryFromGesture();await Promise.resolve();await Promise.resolve();
  assert.equal(resumed,1);assert.equal(audio.diagnostics().context,'running');
  assert.equal(env.requests(),requests);
  audio.toggle();audio.toggleMusic();audio.retryFromGesture();
  assert.equal(audio.enabled,false);assert.equal(audio.musicEnabled,false);
});

test('a blocked first gesture can be retried and network music errors are distinguished from autoplay',async t=>{
  const env=audioEnvironment(t),audio=new Audio();env.context.state='suspended';let attempts=0;
  t.mock.method(env.context,'resume',async()=>{if(++attempts===1)throw new Error('blocked');env.context.state='running';});
  t.mock.method(audio.music,'play',async()=>{throw Object.assign(new Error('blocked'),{name:'NotAllowedError'});});
  audio.retryFromGesture();await audio.preloadSamples();await Promise.resolve();
  assert.match(audio.musicStatus,/浏览器未允许/);
  assert.match(audio.sampleStatus,/浏览器/);
  t.mock.method(audio.music,'play',async()=>{throw Object.assign(new Error('unavailable'),{name:'NotSupportedError'});});
  audio.retryFromGesture();await Promise.resolve();await Promise.resolve();
  assert.equal(env.context.state,'running');assert.match(audio.musicStatus,/加载失败/);
  assert.equal(attempts,2);
});


test('campaign music waits for interaction, plays while combat is suspended, and keeps mute across scenes',async t=>{
  audioEnvironment(t);const audio=new Audio();audio.setScene('campaign');audio.setSuspended(true);
  assert.equal(audio.music.paused,true);assert.equal(audio.unlocked,false);
  audio.unlock();await audio.preloadSamples();assert.equal(audio.music.paused,false);
  audio.effect('cannon');assert.equal(audio.played.cannon,undefined);
  audio.music.currentTime=25;audio.setScene('campaign');audio.setSuspended(true);assert.equal(audio.music.currentTime,25);
  audio.toggleMusic();audio.setScene('battle');audio.setSuspended(false);assert.equal(audio.music.paused,true);
  audio.setScene('campaign');assert.equal(audio.music.paused,true);audio.toggleMusic();assert.equal(audio.music.paused,false);
  audio.setScene('battle');audio.setSuspended(true);assert.equal(audio.music.paused,true);
  audio.setScene('campaign');assert.equal(audio.music.paused,false);
  audio.setScene('battle');audio.setSuspended(true);assert.equal(audio.music.paused,true);
});
test('all six tracks are selectable and ended advances the current scene playlist with a fade',t=>{
  audioEnvironment(t);const audio=new Audio();audio.setScene('campaign');audio.unlock();
  for(let i=0;i<TRACKS.length;i++){audio.selectTrack(i);assert.equal(audio.track,i);assert.ok(audio.music.src.endsWith(TRACKS[i].file));}
  audio.selectTrack(4);(audio.music as any).listeners.get('ended')();assert.equal(audio.track,2);assert.equal(audio.music.volume,0);
  audio.update(.6);assert.ok(audio.music.volume>0&&audio.music.volume<audio.musicVolume);audio.update(1);assert.equal(audio.music.volume,audio.musicVolume);
  audio.setScene('battle');audio.nextTrack();assert.ok(MUSIC_PLAYLISTS.battle.includes(audio.track));
  const valid=audio.track;audio.selectTrack(-1);audio.selectTrack(NaN);assert.equal(audio.track,valid);
});
test('music recordings are credited, compact and indexed before audio data for progressive playback',async()=>{
  const dir=join(process.cwd(),'public/audio/music');const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
  for(const track of TRACKS){const item=manifest.find((m:any)=>m.file===track.file);assert.ok(item);assert.equal(item.license,'CC-BY-4.0');
    const bytes=await readFile(join(dir,track.file));assert.ok(bytes.length>100000);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
    assert.ok(bytes.length<3_500_000,'each full-length track should fit the public-streaming budget');
    assert.equal(item.originalSha256.length,64);assert.ok(item.originalFile.endsWith('.mp3'));
    const boxes:{name:string;offset:number}[]=[];
    for(let offset=0;offset+8<=bytes.length;){const size=bytes.readUInt32BE(offset);assert.ok(size>=8);boxes.push({name:bytes.toString('ascii',offset+4,offset+8),offset});offset+=size;}
    const index=boxes.find(b=>b.name==='moov')!,media=boxes.find(b=>b.name==='mdat')!;
    assert.ok(index&&media&&index.offset<media.offset);assert.ok(media.offset<100_000,'playback index must be near the beginning');
  }
});

test('current music preloads before interaction and selecting the same track does not discard its buffer',t=>{
  audioEnvironment(t);const audio=new Audio();let reloads=0;
  t.mock.method(audio.music,'load',()=>{reloads++;});
  assert.equal(audio.music.preload,'auto');assert.equal(audio.unlocked,false);assert.equal(audio.music.paused,true);
  assert.equal(audio.loadingNotice().visible,true);assert.equal(audio.loadingNotice().title,'点击启用游戏声音');
  audio.setScene('campaign');audio.selectTrack(audio.track);assert.equal(reloads,0);
  audio.selectTrack(1);assert.equal(reloads,1);
});

test('sound loading notice distinguishes buffering, progress, failure and readiness',async t=>{
  audioEnvironment(t);const audio=new Audio();
  Object.defineProperty(audio.music,'readyState',{value:0,writable:true});
  assert.equal(audio.loadingNotice().visible,true);assert.match(audio.loadingNotice().music,/缓冲/);
  audio.unlock();await audio.preloadSamples();
  assert.equal(audio.loadingNotice().progress,1);assert.equal(audio.loadingNotice().visible,true,'music is still buffering');
  Object.defineProperty(audio.music,'readyState',{value:4,writable:true});assert.equal(audio.loadingNotice().visible,false);
  t.mock.method(audio.music,'play',async()=>{throw new Error('network');});
  audio.selectTrack(1);await Promise.resolve();await Promise.resolve();
  assert.equal(audio.loadingNotice().visible,true);assert.equal(audio.loadingNotice().failed,true);
});

test('tower projectiles retain distinct branch impact sounds even if upgraded in flight',async()=>{
  const {Game}=await import('../src/simulation/game');const {BRANCHES,TOWER_KINDS}=await import('../src/simulation/towers');
  const {towerSound}=await import('../src/simulation/sound');
  const profiles=[...TOWER_KINDS.map(kind=>({kind,branch:undefined})),...Object.values(BRANCHES).map(b=>({kind:b.kind,branch:b.id}))];
  for(const profile of profiles){
    const g=new Game(false);for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,chasm:false});
    const tower=g.addStructure(profile.kind,10,10);Object.assign(tower,{branch:profile.branch,level:profile.branch?3:1});
    const e=g.spawnEnemy('brute',{x:12,z:10});Object.assign(e,{y:.9,speed:0,hp:5000,maxHp:5000,damage:0});
    g.phase='battle';g.step(.01);assert.ok(g.drainSounds().some(s=>s.kind===towerSound(profile)),JSON.stringify(profile));
    assert.equal(g.shots[0].hitSound,towerSound(profile,true));tower.cooldown=100;tower.branch=undefined;
    for(let i=0;i<24;i++)g.step(1/30);
    assert.ok(g.drainSounds().some(s=>s.kind===towerSound(profile,true)));
  }
  assert.notDeepEqual(SOUND_LIBRARY.frost.files,SOUND_LIBRARY.thunder.files);
  assert.notDeepEqual(SOUND_LIBRARY.cannon.files,SOUND_LIBRARY['wall-hit'].files);
  assert.notDeepEqual(SOUND_LIBRARY['fire-cast'].files,SOUND_LIBRARY.cast.files);
});
test('every enemy death and hero flight produces its own semantic audio event',async()=>{
  const {Game}=await import('../src/simulation/game');const {ENEMIES}=await import('../src/simulation/enemies');const {enemySound}=await import('../src/simulation/sound');
  for(const kind of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]){
    const g=new Game(false);g.phase='battle';g.spawnEnemy(kind).hp=0;g.step(.01);
    assert.ok(g.drainSounds().some(s=>s.kind===enemySound(kind,true)),kind);
  }
  const g=new Game(false,'windford','aerilia');for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,chasm:false});
  Object.assign(g.hero!,{x:20,z:20,y:.9,enteredAt:-100,state:'idle'});
  assert.ok(g.drainSounds().some(s=>s.kind==='hero-arrival'));assert.ok(g.commandHero({x:30,z:20}));
  assert.ok(g.drainSounds().some(s=>s.kind==='hero-flight'));
  for(let i=0;i<180;i++)g.step(1/30);assert.ok(g.drainSounds().some(s=>s.kind==='hero-land'));
});

test('each tower impact sound, flash and damage occur together with no early or duplicate hit',async()=>{
  const {Game}=await import('../src/simulation/game');const {BRANCHES,TOWER_KINDS}=await import('../src/simulation/towers');
  const {towerSound}=await import('../src/simulation/sound');
  const profiles=[...TOWER_KINDS.map(kind=>({kind,branch:undefined})),...Object.values(BRANCHES).map(b=>({kind:b.kind,branch:b.id}))];
  for(const profile of profiles){
    const g=new Game(false);for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,chasm:false});
    const tower=g.addStructure(profile.kind,10,10);Object.assign(tower,{branch:profile.branch,level:profile.branch?3:1});
    const enemy=g.spawnEnemy('brute',{x:12,z:10});Object.assign(enemy,{y:.9,speed:0,hp:5000,maxHp:5000,damage:0});
    g.phase='battle';g.step(.01);tower.cooldown=100;g.drainSounds();
    assert.equal(enemy.hp,5000);
    const shot=g.shots[0];g.paused=true;g.step(.5);assert.equal(shot.time,.01);assert.equal(g.drainSounds().length,0);g.paused=false;
    while(shot.time+1/60<shot.duration){g.step(1/60);assert.equal(enemy.hp,5000);assert.equal(g.drainSounds().filter(e=>e.kind===towerSound(profile,true)).length,0);}
    g.step(1/60);
    assert.equal(g.shots.length,0);assert.ok(enemy.hp<5000);assert.ok(g.effects.some(e=>e.time===0));
    assert.equal(g.drainSounds().filter(e=>e.kind===towerSound(profile,true)).length,1,profile.branch??profile.kind);
    g.step(.03);assert.equal(g.drainSounds().filter(e=>e.kind===towerSound(profile,true)).length,0);
  }
});

test('sample onset skips silence without delaying an immediate transient or trimming a silent buffer',async()=>{
  const {sampleOnset}=await import('../src/ui/sample-onset');
  const channels=[new Float32Array(1000),new Float32Array(1000)];channels[1].fill(.5,250,350);
  const b={sampleRate:1000,length:1000,numberOfChannels:2,getChannelData:(n:number)=>channels[n]};
  assert.ok(sampleOnset(b)>=.246&&sampleOnset(b)<=.25);
  channels[0][0]=1;assert.equal(sampleOnset(b),0);
  channels.forEach(c=>c.fill(0));assert.equal(sampleOnset(b),0);
});

test('replacement combat recordings decode as PCM with immediate impacts and credited processing',async()=>{
  const {sampleOnset}=await import('../src/ui/sample-onset');
  const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
  const replacements=manifest.filter((m:any)=>m.processing);assert.equal(replacements.length,19);
  for(const item of replacements){
    const bytes=await readFile(join(root,item.file));let data:Buffer|undefined,rate=0,channels=0,bits=0;
    for(let offset=12;offset+8<=bytes.length;){const length=bytes.readUInt32LE(offset+4),name=bytes.toString('ascii',offset,offset+4);
      if(name==='fmt '){assert.equal(bytes.readUInt16LE(offset+8),1);channels=bytes.readUInt16LE(offset+10);rate=bytes.readUInt32LE(offset+12);bits=bytes.readUInt16LE(offset+22);}
      if(name==='data')data=bytes.subarray(offset+8,offset+8+length);offset+=8+length+(length%2);
    }
    assert.ok(data);assert.equal(channels,1);assert.equal(bits,16);assert.ok(rate>=22050);
    const values=Float32Array.from({length:data.length/2},(_,i)=>data!.readInt16LE(i*2)/32768);
    assert.ok(sampleOnset({sampleRate:rate,length:values.length,numberOfChannels:1,getChannelData:()=>values})<=.012,item.file);
    assert.ok(item.source.startsWith('https://opengameart.org/'));assert.equal(item.sourceSha256.length,64);
    if(item.file==='mortar-impact.wav'||item.file==='siege-impact.wav'){
      // Strongest 5 ms window must be at the impact, not a delayed boom.
      const w=Math.round(rate*.005),rms=[];for(let i=0;i+w<values.length;i+=w){let sum=0;for(let j=i;j<i+w;j++)sum+=values[j]*values[j];rms.push(sum/w);}
      assert.ok(rms.indexOf(Math.max(...rms))*w/rate<.05,item.file);
    }
  }
  for(const cue of ['cast','magic-hit','arcane-hit','spellblade-cast','paladin-sanctuary','hero-arrival'] as const)
    assert.ok(SOUND_LIBRARY[cue].files.every(f=>!/^magic-|^magic\.|^healing\./.test(f)),cue);
});

test('hero arrow-rain damage and sound use the same six volley arrival times',async()=>{
  const {Game}=await import('../src/simulation/game');const {rainImpactTime}=await import('../src/simulation/effect-timing');
  const g=new Game(false);for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,chasm:false});
  const e=g.spawnEnemy('brute',{x:10,z:10});Object.assign(e,{speed:0,hp:5000,maxHp:5000,damage:0,y:.9,resistance:0});
  g.heroEffects.push({id:999,kind:'rain',from:{x:10,y:1,z:10},to:{x:10,y:.9,z:10},time:0,duration:2.6,radius:2.8,pulses:0});g.phase='battle';
  let hits=0;
  for(let i=0;i<145;i++){g.step(1/60);const sounds=g.drainSounds().filter(s=>s.kind==='hero-rain-hit');
    if(sounds.length){assert.equal(sounds.length,1);assert.ok(g.time>=rainImpactTime(hits)&&g.time-rainImpactTime(hits)<1/60+1e-7);hits++;assert.equal(e.hp,5000-hits*18);}
  }
  assert.equal(hits,6);
});


test('playback starts immediately at decoded onset with interactive latency, never queues a delayed impact',async t=>{
  const env=audioEnvironment(t),audio=new Audio();audio.unlock();await audio.preloadSamples();
  assert.deepEqual(env.options,[{latencyHint:'interactive'}]);audio.effect('mortar-hit');
  assert.equal(env.starts.length,1);const [when,offset,duration]=env.starts[0];
  assert.equal(when,env.context.currentTime);assert.ok(offset>=.246&&offset<=.25);assert.ok(duration<=.8-offset);
  audio.effect('mortar-hit');assert.equal(env.starts.length,1);
});


test('hero keeps its original release with the licensed pack; a missing preferred hit falls back immediately',async t=>{
  const pack={version:1,files:[{file:'hero-bow-wind.wav'},{file:'elf-bow.wav'},{file:'hero-contact-dry.wav'}]};
  const env=audioEnvironment(t,'licensed/hero-contact-dry.wav',pack),audio=new Audio();
  audio.unlock();await audio.preloadSamples();
  audio.effect('hero-arrow');audio.effect('hero-hit');
  assert.deepEqual(env.playedFiles,['/audio/sfx/swing-2.wav','/audio/sfx/metal-light.ogg']);
  assert.equal(audio.diagnostics().licensedSamples,1);
  assert.deepEqual(audio.diagnostics().sampleFailures,['licensed/hero-contact-dry.wav']);
  assert.ok(env.starts.every(args=>args[0]===env.context.currentTime));
});

test('complete optional pack replaces hero contacts, magic and mortar without changing playback timing',async t=>{
  const pack={version:1,files:LICENSED_FILES.map(file=>({file:file.replace('licensed/','')}))};
  const env=audioEnvironment(t,undefined,pack),audio=new Audio();audio.unlock();await audio.preloadSamples();
  audio.effect('hero-arrow');assert.equal(env.playedFiles.at(-1),'/audio/sfx/swing-2.wav');
  for(const cue of ['arrow','bow-volley','judgment','hero-hit','hero-rain-hit','cast','spellblade-slash','paladin-sanctuary','mortar-hit'] as const){
    audio.effect(cue);assert.equal(env.playedFiles.at(-1),'/audio/'+LICENSED_SOUNDS[cue]!.files[0]);
  }
  assert.equal(audio.diagnostics().licensedSamples,LICENSED_FILES.length);
  assert.ok(env.starts.every(args=>args[0]===env.context.currentTime));
  assert.deepEqual(audio.diagnostics().sampleFailures,[]);
  assert.equal(LICENSED_SOUNDS['hero-arrow'],undefined);
  assert.notDeepEqual(SOUND_LIBRARY['hero-arrow'].files,LICENSED_SOUNDS['hero-hit']!.files);
});

test('optional pack accepts only known local recordings and rejects malformed metadata',()=>{
  for(const value of [null,{},[],{version:2,files:[]},{version:1,files:null}])assert.deepEqual(licensedFiles(value),[]);
  assert.deepEqual(licensedFiles({version:1,files:[null,{}, {file:'https://example.com/a.wav'}, {file:'../../x.wav'}, {file:'elf-bow.wav'}, {file:'elf-bow.wav'}]}),['licensed/elf-bow.wav']);
});

test('perceived sample calibration ignores silence, balances levels, and limits peaks',async()=>{
  const {sampleLevel}=await import('../src/ui/sample-level');
  const make=(amplitude:number,lead=0,tail=0)=>{const data=new Float32Array(lead+300+tail);for(let i=0;i<300;i++)data[i+lead]=Math.sin(i*.25)*amplitude;return {sampleRate:1000,length:data.length,numberOfChannels:1,getChannelData:()=>data};};
  const d={files:[],gain:.26,interval:.1,duration:1.8};
  const low=sampleLevel(make(.06),0,d),high=sampleLevel(make(.6),0,d);
  assert.ok(Math.abs(low.rms*low.correction-high.rms*high.correction)<.0001);
  const tail=sampleLevel(make(.06,90,600),.09,d);assert.ok(Math.abs(tail.correction-low.correction)<.0001);
  assert.equal(sampleLevel(make(0),0,d).correction,1);
  const impulse=new Float32Array(1000);impulse[0]=1;const limited=sampleLevel({sampleRate:1000,length:1000,numberOfChannels:1,getChannelData:()=>impulse},0,{...d,gain:1});
  assert.ok(limited.peak*limited.correction<=.85);
});

test('crowds cannot spam attack roars, while weapon and death sounds remain immediate',async()=>{
  const {CombatVoices}=await import('../src/ui/combat-voices');const voice=new CombatVoices();
  assert.equal(voice.allow('goblin-attack',0,()=>.9),false,'not every attack vocalizes');
  assert.equal(voice.allow('goblin-attack',.1,()=>0),false,'crowds share the failed attempt cooldown');
  assert.equal(voice.allow('goblin-attack',1.2,()=>0),true);
  assert.equal(voice.allow('brute-attack',2,()=>0),false,'cross-species vocal spacing');
  assert.equal(voice.allow('brute-attack',3.1,()=>0),true);
  assert.equal(voice.allow('goblin-attack',5.8,()=>0),false,'same species rests for five seconds');
  assert.equal(voice.allow('goblin-attack',6.3,()=>0),true);
  for(const kind of ['ironclad-attack','hexer-attack','goblin-death','paladin-block'] as const)assert.equal(voice.allow(kind,6.3,()=>1),true);
});

test('the audio adapter applies the roar policy without delaying physical hits',async t=>{
  const env=audioEnvironment(t),audio=new Audio();audio.unlock();await audio.preloadSamples();t.mock.method(Math,'random',()=>0);
  audio.effect('goblin-attack');assert.equal(audio.played['goblin-attack'],1);
  env.context.currentTime+=.5;audio.effect('goblin-attack');audio.effect('brute-attack');audio.effect('ironclad-attack');
  assert.equal(audio.played['goblin-attack'],1);assert.equal(audio.played['brute-attack'],undefined);assert.equal(audio.played['ironclad-attack'],1);
  env.context.currentTime+=5;audio.effect('goblin-attack');assert.equal(audio.played['goblin-attack'],2);
});


test('tower release uses the new recording and falls back audibly when the optional file fails',async t=>{
  const pack={version:1,files:[{file:'tower-arrow-release.wav'}]};
  const env=audioEnvironment(t,'licensed/tower-arrow-release.wav',pack),audio=new Audio();audio.unlock();await audio.preloadSamples();
  audio.effect('arrow');audio.effect('bow-volley');
  assert.equal(audio.played.arrow,1);assert.equal(audio.played['bow-volley'],1);
  assert.ok(env.playedFiles.every(file=>file.startsWith('/audio/sfx/')));
  assert.ok(env.starts.every(args=>args[0]===env.context.currentTime));
  const recipe=JSON.parse(await readFile('docs/audio/licensed-pack.json','utf8'));
  for(const cue of ['arrow','bow-volley'] as const){
    const definition=LICENSED_SOUNDS[cue]!;assert.equal(definition.files[0],'licensed/tower-arrow-release.wav');
    assert.ok(definition.gain>=.4&&SOUND_LIBRARY[cue].gain>=.4);
    assert.ok(recipe.clips.some((clip:{id:string})=>clip.id==='tower-arrow-release'));
  }
});


test('judgment remains audible when normal combat voices are full while UI keeps reserved capacity',async t=>{
  const env=audioEnvironment(t),audio=new Audio();audio.unlock();await audio.preloadSamples();
  const ordinary=['arrow','impact','cast','magic-hit','melee'] as const;
  for(let i=0;i<18;i++){env.context.currentTime+=.5;audio.effect(ordinary[i%ordinary.length]);}
  assert.equal(audio.diagnostics().voices,18);
  env.context.currentTime+=1;const ordinaryCount=audio.played.melee;audio.effect('melee');assert.equal(audio.played.melee,ordinaryCount);
  audio.effect('judgment');assert.equal(audio.played.judgment,1);assert.equal(env.playedFiles.at(-1),'/audio/sfx/thunder-burst.wav');
  env.context.currentTime+=1;audio.effect('judgment');assert.equal(audio.played.judgment,2);
  env.context.currentTime+=1;audio.effect('judgment');assert.equal(audio.played.judgment,2,'keep total voices bounded');
  audio.click();assert.equal(audio.played.click,1);assert.equal(audio.diagnostics().voices,21);
});

test('compact transports cover every cue exactly once with independent AAC files',async()=>{
 const {default:index}=await import('../src/ui/audio-bundles.json');const seen:string[]=[];let total=0;
 for(const bundle of index.bundles){
  const bytes=await readFile(join(process.cwd(),'public',bundle.url));assert.equal(bytes.length,bundle.bytes);total+=bytes.length;
  assert.ok(bundle.url.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  let offset=0;for(const entry of bundle.entries){assert.equal(entry.offset,offset);assert.ok(entry.length>100);const clip=bytes.subarray(entry.offset,entry.offset+entry.length);assert.equal(clip.toString('ascii',4,8),'ftyp');seen.push(entry.file);offset+=entry.length;}
  assert.equal(offset,bytes.length);
 }
 assert.deepEqual(seen.sort(),[...SOUND_FILES].sort());assert.ok(total<700_000);assert.ok(index.bundles[0].bytes<80_000);
});
test('successful bundled preload downloads three payloads without requesting individual originals',async t=>{
 audioEnvironment(t);const {default:index}=await import('../src/ui/audio-bundles.json');const urls:string[]=[];
 t.mock.method(globalThis,'fetch',async(url:string)=>{urls.push(url);const bundle=index.bundles.find(b=>b.url===url);return {ok:!!bundle,status:bundle?200:404,arrayBuffer:async()=>{const bytes=await readFile(join(process.cwd(),'public',url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}};});
 const audio=new Audio();audio.unlock();await audio.preloadSamples();
 assert.equal(audio.diagnostics().samplesLoaded,SOUND_FILES.length);assert.deepEqual(audio.diagnostics().sampleFailures,[]);
 assert.deepEqual(urls.filter(url=>url.endsWith('.bin')).sort(),index.bundles.map(b=>b.url).sort());assert.equal(urls.length,4);
 audio.unlock();await audio.preloadSamples();assert.equal(urls.length,4);
});
test('optional licensed transport rejects foreign URLs, invalid ranges and duplicate entries',async()=>{
 const {licensedBundle}=await import('../src/ui/audio-bundle');
 const valid={url:'/audio/licensed/stream-123456abcdef.bin',bytes:40,entries:[{file:'licensed/a.wav',offset:0,length:40}]};
 assert.deepEqual(licensedBundle(valid,['licensed/a.wav']),valid);
 for(const bad of [{...valid,url:'https://example.com/a.bin'},{...valid,bytes:9_000_000},{...valid,entries:[{file:'licensed/a.wav',offset:1,length:40}]},{...valid,entries:[...valid.entries,...valid.entries]},{...valid,entries:[{file:'unknown',offset:0,length:40}]}])assert.equal(licensedBundle(bad,['licensed/a.wav']),null);
});

test('boss farewell sounds can finish through the result pause but still obey mute',async t=>{
 const env=audioEnvironment(t),audio=new Audio();audio.unlock();await audio.preloadSamples();audio.effect('boss-death');audio.effect('arrow');
 assert.equal(audio.diagnostics().voices,2);audio.setSuspended(true);assert.equal(audio.diagnostics().voices,1);
 env.context.currentTime++;audio.effect('boss-body-land',0,1,true);assert.equal(audio.played['boss-body-land'],1);audio.toggle();assert.equal(audio.diagnostics().voices,0);
 env.context.currentTime++;audio.effect('boss-body-land',0,1,true);assert.equal(audio.played['boss-body-land'],1);
});
