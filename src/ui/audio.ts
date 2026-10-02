import bundledAudio from './audio-bundles.json';
import { licensedBundle, type AudioBundle } from './audio-bundle';
import { sampleLevel } from './sample-level';
import { CombatVoices } from './combat-voices';
import { LICENSED_SOUNDS, licensedFiles } from './licensed-sounds';
import { sampleOnset } from './sample-onset';
import type { SoundEvent } from '../simulation/game';
import { SOUND_FILES, SOUND_LIBRARY, UI_CUES, type AudioCue } from './sound-library';
export const TRACKS = [
  { title:'Skye Cuillin', subtitle:'凯尔特原野 · 竖琴与哨笛', file:'skye-cuillin.m4a', isrc:'USUAN1100346' },
  { title:'Ascending the Vale', subtitle:'风与牧歌 · 山谷的黎明', file:'ascending-the-vale.m4a', isrc:'USUAN1600064' },
  { title:'Celtic Impulse', subtitle:'凯尔特行旅 · 扬琴与锡哨', file:'celtic-impulse.m4a', isrc:'USUAN1100297' },
  { title:'Lord of the Land', subtitle:'边境行军 · 鲁特琴与长笛', file:'lord-of-the-land.m4a', isrc:'USUAN1400022' },
  { title:'Folk Round', subtitle:'营地夜曲 · 民谣轮唱', file:'folk-round.m4a', isrc:'USUAN1100357' },
  { title:'The Pyre', subtitle:'山隘守望 · 曼陀林与弦乐', file:'the-pyre.m4a', isrc:'USUAN1100846' },
];
export type MusicScene='campaign'|'battle';
export const MUSIC_PLAYLISTS:Record<MusicScene,readonly number[]>={campaign:[0,1,4,2],battle:[3,2,5,0,1]};

export class Audio {
  enabled=true; musicEnabled=true; sfxVolume=.65; musicVolume=.32; track=0; unlocked=false;
  musicStatus='点击任意位置启奏';
  sampleStatus='点击后加载音效';
  readonly played:Partial<Record<AudioCue,number>>={};
  readonly music=new window.Audio();
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private compressor:DynamicsCompressorNode|null=null;
  private buffers=new Map<string,AudioBuffer>();
  private failures=new Set<string>();
  private offsets=new Map<string,number>();
  private levels=new Map<string,number>();
  private combatVoices=new CombatVoices();
  private loading:Promise<void>|null=null;
  private lastLoad=-Infinity;
  private packChecked=false;
  private packFiles:string[]=[];
  private packBundle:AudioBundle|null=null;
  private packedDownloads=new Map<string,Promise<ArrayBuffer>>();
  private ready=false;
  private last=new Map<AudioCue,number>();
  private active=new Map<AudioBufferSourceNode,{kind:AudioCue;gain:GainNode;pan:StereoPannerNode;presentation:boolean}>();
  private suspended=false;
  private scene:MusicScene='battle';
  private fade=1;
  private sceneTracks:Partial<Record<MusicScene,number>>={};
  private resumePending=false;
  private musicRequest=0;
  private musicPending=false;
  private musicFailed=false;
  private musicFiles=new Map<number,string>();
  private get musicAllowed(){return this.scene==='campaign'||!this.suspended;}
  update(dt:number){this.fade=Math.min(1,this.fade+Math.max(0,dt)/1.2);this.music.volume=this.musicVolume*this.fade;}

  constructor(options:{deferMusic?:boolean}={}){
    try {
      const saved=JSON.parse(localStorage.getItem('riverwatch-audio-v2')||'{}');
      this.enabled=saved.enabled??true; this.musicEnabled=saved.musicEnabled??true;
      this.musicVolume=saved.musicVolume??.32; this.sfxVolume=saved.sfxVolume??.65; this.track=Number.isInteger(saved.track)&&saved.track>=0&&saved.track<TRACKS.length?saved.track:0;
    } catch {}
    this.music.preload=options.deferMusic?'none':this.musicEnabled?'auto':'none';this.music.loop=false;if(!options.deferMusic)this.music.src='/audio/music/'+TRACKS[this.track].file;this.music.volume=this.musicVolume;
    void this.downloadBundle(bundledAudio.bundles[0]).catch(()=>{});
    this.music.addEventListener('ended',()=>this.nextTrack());
    this.music.addEventListener('playing',()=>{this.musicFailed=false;this.musicStatus='正在演奏';});
    this.music.addEventListener('waiting',()=>this.musicStatus='音乐缓冲中…');
    this.music.addEventListener('canplay',()=>{if(this.music.paused&&!this.unlocked)this.musicStatus='音乐已缓冲 · 点击页面启奏';});
    this.music.addEventListener('error',()=>{this.musicFailed=true;this.musicStatus='音乐加载失败 · 可切换曲目重试';});
  }
  private save(){
    try{localStorage.setItem('riverwatch-audio-v2',JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,sfxVolume:this.sfxVolume,track:this.track}));}catch{}
  }
  private prepareContext(){
    if(!this.context){
      this.context=new AudioContext({latencyHint:'interactive'});this.master=this.context.createGain();this.compressor=this.context.createDynamicsCompressor();
      this.compressor.threshold.value=-16;this.compressor.ratio.value=4;this.compressor.attack.value=.005;this.compressor.release.value=.12;
      this.master.connect(this.compressor).connect(this.context.destination);this.master.gain.value=this.enabled?this.sfxVolume:0;
    }
  }
  unlock(){
    this.prepareContext();
    if(this.context!.state!=='running'&&!this.resumePending){
      this.resumePending=true;
      void this.context!.resume().then(()=>{
        if(this.context?.state!=='running')this.sampleStatus='浏览器暂停了声音 · 请点击页面重试';
        else if(this.ready)this.sampleStatus=this.packFiles.some(file=>this.buffers.has(file))?'Pixabay / Mixkit 音效已就绪':'本地采样音效已就绪';
      }).catch(()=>{this.sampleStatus='浏览器未允许播放声音 · 请点击页面重试';})
        .finally(()=>{this.resumePending=false;});
    }
    this.unlocked=true;
    if(this.musicEnabled&&this.music.paused&&this.musicAllowed)this.playMusic();
    void this.preloadSamples();
  }
  /** Decode while suspended: downloading does not require an autoplay gesture. */
  async preloadAll(progress:(done:number,total:number)=>void=()=>{}){
    this.prepareContext();this.lastLoad=-Infinity;
    const report=()=>progress(this.buffers.size+this.musicFiles.size,SOUND_FILES.length+this.packFiles.length+TRACKS.length);
    const timer=setInterval(report,100);report();
    try{
      const pending=TRACKS.map((_,i)=>i).filter(i=>!this.musicFiles.has(i));
      const music=Promise.all(Array.from({length:2},async()=>{
        const failures:string[]=[];
        while(pending.length){
          const index=pending.shift()!,abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),120000);
          try{
            const response=await fetch('/audio/music/'+TRACKS[index].file,{signal:abort.signal});
            if(!response.ok)throw new Error('Music HTTP '+response.status);
            const blob=await response.blob();if(!blob.size)throw new Error('Empty music');
            this.musicFiles.set(index,URL.createObjectURL(blob));report();
          }catch{failures.push(TRACKS[index].title);}finally{clearTimeout(timeout);}
        }
        return failures;
      }));
      const [,failed]=await Promise.all([this.preloadSamples(),music]);
      if(!this.ready||failed.flat().length)throw new Error('部分声音未能加载，请检查网络后重试。');
      // Blob URLs hold the complete tracks: changing scene or song never streams again.
      this.music.preload='auto';this.music.src=this.musicFiles.get(this.track)!;this.music.load();report();
    }finally{clearInterval(timer);}
  }
  private async discoverPack(){
    if(this.packChecked)return;
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),4000);
    try{
      const response=await fetch('/audio/licensed/pack.json',{signal:abort.signal});
      // SPA hosts may return index.html for an absent optional pack.
      const absent=(!response.ok&&response.status===404)||response.headers?.get('content-type')?.includes('text/html');
      if(response.ok&&!absent){const pack=await response.json();this.packFiles=licensedFiles(pack);this.packBundle=licensedBundle(pack.streamBundle,this.packFiles);}
      else if(!absent)throw new Error('Audio pack HTTP '+response.status);
      this.packChecked=true;
    }catch{/* Offline/source-only installs keep the bundled sounds; retry on the next unlock. */}
    finally{clearTimeout(timeout);}
  }
  private downloadBundle(bundle:AudioBundle){
    const existing=this.packedDownloads.get(bundle.url);if(existing)return existing;
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),20000);
    const pending=fetch(bundle.url,{signal:abort.signal,cache:'force-cache'}).then(async response=>{
      if(!response.ok)throw new Error('Audio bundle HTTP '+response.status);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==bundle.bytes)throw new Error('Incomplete audio bundle');
      return bytes;
    }).catch(error=>{this.packedDownloads.delete(bundle.url);throw error;}).finally(()=>clearTimeout(timeout));
    this.packedDownloads.set(bundle.url,pending);return pending;
  }
  private async loadBundle(bundle:AudioBundle){
    if(bundle.entries.every(e=>this.buffers.has(e.file)))return;
    try{
      const bytes=await this.downloadBundle(bundle);
      for(const entry of bundle.entries){
        if(this.buffers.has(entry.file))continue;
        try{const buffer=await this.context!.decodeAudioData(bytes.slice(entry.offset,entry.offset+entry.length));
          this.offsets.set(entry.file,sampleOnset(buffer));this.buffers.set(entry.file,buffer);this.failures.delete(entry.file);
        }catch{/* The original individual recording is the codec/network fallback. */}
      }
      this.packedDownloads.delete(bundle.url);
    }catch{/* A partial or missing bundle never blocks original-file recovery. */}
  }
  async preloadSamples():Promise<void>{
    if(!this.context||this.ready)return;
    if(this.loading)return this.loading;
    if(performance.now()-this.lastLoad<5000)return;
    this.lastLoad=performance.now();this.sampleStatus='音效加载中…';const context=this.context;
    const uiFiles=new Set([...UI_CUES].flatMap(cue=>SOUND_LIBRARY[cue].files));
    const load=async(files:string[])=>{
      const pending=files.filter(file=>!this.buffers.has(file)).sort((a,b)=>Number(uiFiles.has(b))-Number(uiFiles.has(a)));
      await Promise.all(Array.from({length:Math.min(2,pending.length)},async()=>{
        while(pending.length){const file=pending.shift()!;
          const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
          try{
            const url=file.startsWith('licensed/')?'/audio/'+file:'/audio/sfx/'+file;
            const response=await fetch(url,{signal:abort.signal});
            if(!response.ok)throw new Error('Audio HTTP '+response.status);
            const buffer=await context.decodeAudioData(await response.arrayBuffer());
            this.offsets.set(file,sampleOnset(buffer));this.buffers.set(file,buffer);this.failures.delete(file);
          }catch{this.failures.add(file);}finally{clearTimeout(timeout);}
        }
      }));
    };
    // A few small transport requests replace a hundred WAV transfers. Decode each
    // independent clip so onset alignment and per-cue volume remain unchanged.
    const pack=this.discoverPack();
    this.loading=(async()=>{
      await this.loadBundle(bundledAudio.bundles[0]);await load([...uiFiles]);
      await Promise.all([
        (async()=>{await this.loadBundle(bundledAudio.bundles[1]);await this.loadBundle(bundledAudio.bundles[2]);await load(SOUND_FILES);})(),
        pack.then(async()=>{if(this.packBundle)await this.loadBundle(this.packBundle);await load(this.packFiles);}),
      ]);
    })().then(()=>{
      this.ready=this.packChecked&&this.failures.size===0;
      const hasPack=this.packFiles.some(file=>this.buffers.has(file));
      this.sampleStatus=this.context?.state!=='running'?'浏览器暂停了声音 · 请点击页面重试':this.failures.size?(this.buffers.size?'部分音效加载失败 · 已使用可用采样，点击页面重试':'音效未加载成功 · 请检查网络后点击页面重试'):hasPack?'Pixabay / Mixkit 音效已就绪':'本地采样音效已就绪';
    }).finally(()=>{this.loading=null;});
    return this.loading;
  }
  private playMusic(){
    if(this.musicPending)return;
    const request=++this.musicRequest;this.musicPending=true;this.musicFailed=false;
    this.musicStatus='音乐缓冲中…';
    void this.music.play().catch((error:unknown)=>{
      if(request!==this.musicRequest)return;
      const name=error instanceof Error?error.name:'';
      if(name==='AbortError')return;
      this.musicFailed=true;
      this.musicStatus=name==='NotAllowedError'?'浏览器未允许播放音乐 · 请点击页面重试':'音乐加载失败 · 请检查网络或切换曲目';
    }).finally(()=>{if(request===this.musicRequest)this.musicPending=false;});
  }
  loadingNotice(){
    const samplesLoaded=this.buffers.size,samplesTotal=SOUND_FILES.length+this.packFiles.length;
    const musicLoading=this.musicEnabled&&this.musicAllowed&&this.music.readyState<3;
    const musicBlocked=this.musicEnabled&&this.musicAllowed&&this.musicFailed;
    const samplesLoading=this.enabled&&this.unlocked&&(!this.ready||this.context?.state!=='running');
    const needsGesture=!this.unlocked&&(this.enabled||(this.musicEnabled&&this.musicAllowed));
    const failed=musicBlocked||(this.enabled&&this.failures.size>0);
    return {visible:musicLoading||musicBlocked||samplesLoading||needsGesture,
      samplesReady:!this.enabled||(this.ready&&this.context?.state==='running'),needsGesture,
      failed,
      title:failed?'声音加载遇到问题':needsGesture&&!musicLoading?'点击启用游戏声音':'声音资源加载中',
      music:this.musicEnabled?(this.musicFailed?this.musicStatus:this.music.readyState<3?'音乐：正在缓冲…':this.unlocked?'音乐：已缓冲':'音乐：已缓冲，点击页面播放'):'音乐：已关闭',
      samples:this.enabled?(this.unlocked?`音效：${samplesLoaded} / ${samplesTotal}${this.context?.state!=='running'?' · 点击恢复声音':''}`:'音效：点击页面后加载'):'音效：已关闭',
      progress:samplesTotal?samplesLoaded/samplesTotal:0};
  }
  /** Retry blocked playback and failed downloads on a fresh browser gesture. */
  retryFromGesture(){
    if(!this.unlocked||this.context?.state!=='running'||!this.ready||
      (this.musicEnabled&&this.musicAllowed&&this.music.paused))this.unlock();
  }
  toggle(){
    this.enabled=!this.enabled;this.unlock();
    if(this.master)this.master.gain.value=this.enabled?this.sfxVolume:0;
    if(!this.enabled)this.stopEffects();this.save();if(this.enabled)this.click();return this.enabled;
  }
  toggleMusic(){
    this.musicEnabled=!this.musicEnabled;this.unlock();
    if(!this.musicEnabled){this.music.pause();this.musicStatus='已静音';}
    else if(!this.musicAllowed){this.music.pause();this.musicStatus='游戏暂停中';}else this.playMusic();this.save();
  }
  setVolume(kind:'music'|'sfx',value:number){
    value=Math.max(0,Math.min(1,value));
    if(kind==='music'){this.musicVolume=value;this.music.volume=value;}
    else{this.sfxVolume=value;if(this.master)this.master.gain.value=this.enabled?value:0;if(value===0)this.stopEffects();}this.save();
  }
  selectTrack(index:number){
    if(!Number.isInteger(index)||index<0||index>=TRACKS.length)return;
    this.sceneTracks[this.scene]=index;
    if(this.track===index)return;
    this.track=index;this.musicRequest++;this.musicPending=false;this.musicFailed=false;
    this.music.preload=this.musicEnabled?'auto':'none';this.music.src=this.musicFiles.get(this.track)??'/audio/music/'+TRACKS[this.track].file;this.music.load();this.fade=0;this.music.volume=0;
    if(this.unlocked&&this.musicEnabled&&this.musicAllowed)this.playMusic();
    else if(!this.musicAllowed){this.music.pause();this.musicStatus='游戏暂停中';}
    this.save();
  }
  nextTrack(){const list=MUSIC_PLAYLISTS[this.scene];this.selectTrack(list[(list.indexOf(this.track)+1)%list.length]);}
  setScene(scene:MusicScene){
    if(this.scene===scene)return;
    if(this.unlocked)this.sceneTracks[this.scene]=this.track;this.scene=scene;
    this.selectTrack(this.sceneTracks[scene]??MUSIC_PLAYLISTS[scene][0]);
  }
  private stopEffects(combatOnly=false){
    for(const [source,voice] of this.active)if(!combatOnly||(!UI_CUES.has(voice.kind)&&!voice.presentation))source.stop();
  }
  setSuspended(value:boolean){
    if(this.suspended===value)return;this.suspended=value;
    if(value)this.stopEffects(true);
    if(!this.musicAllowed){this.music.pause();this.musicStatus='游戏暂停中';}
    else if(this.unlocked&&this.musicEnabled&&this.music.paused)this.playMusic();
  }
  click(){this.effect('click');}
  build(){this.effect('build');}
  wave(){this.effect('wave');}
  effect(kind:AudioCue,pan=0,gain=1,presentation=false){
    const ctx=this.context;
    if(!this.enabled||this.sfxVolume===0||!ctx||!this.master||(this.suspended&&!presentation&&!UI_CUES.has(kind)))return;
    const preferred=LICENSED_SOUNDS[kind];
    const definition=preferred?.files.some(file=>this.buffers.has(file))?preferred:SOUND_LIBRARY[kind],now=ctx.currentTime;
    if(now-(this.last.get(kind)??-100)<definition.interval)return;
    const candidates=definition.files.filter(file=>this.buffers.has(file));
    if(!candidates.length)return; // Do not replay stale actions when loading finishes.
    // Keep space for hero skills and UI when a crowd attacks at once.
    const important=UI_CUES.has(kind)||kind.startsWith('hero-')||kind.startsWith('boss-');
    // Infrequent single-target thunder can use two extra voices during crowded fights.
    // Four further slots remain available to hero / boss / UI cues.
    if(this.active.size>=(important?24:kind==='judgment'?20:18))return;
    if([...this.active.values()].filter(v=>v.kind===kind).length>=4)return;
    if(!this.combatVoices.allow(kind,now))return;
    const file=candidates[(this.played[kind]??0)%candidates.length],buffer=this.buffers.get(file)!;
    const levelKey=kind+':'+file;
    if(!this.levels.has(levelKey))this.levels.set(levelKey,sampleLevel(buffer,this.offsets.get(file)??0,definition).correction);
    const level=definition.gain*this.levels.get(levelKey)!*Math.max(0,Math.min(1,gain));
    const source=ctx.createBufferSource(),volume=ctx.createGain(),panner=ctx.createStereoPanner();
    source.buffer=buffer;
    const rate=(definition.rate??1)*(UI_CUES.has(kind)?1:.97+Math.random()*.06);source.playbackRate.value=rate;
    const offset=this.offsets.get(file)??0;
    const duration=Math.min(buffer.duration-offset,definition.duration??1.8),end=now+duration/rate;
    volume.gain.setValueAtTime(0,now);volume.gain.linearRampToValueAtTime(level,now+Math.min(.005,duration/4));
    volume.gain.setValueAtTime(level,Math.max(now+.005,end-.025));volume.gain.linearRampToValueAtTime(0,end);
    panner.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(volume).connect(panner).connect(this.master);
    this.active.set(source,{kind,gain:volume,pan:panner,presentation:presentation||kind==='boss-death'});
    source.onended=()=>{source.disconnect();volume.disconnect();panner.disconnect();this.active.delete(source);};
    source.start(now,offset,duration);source.stop(end+.01);
    this.last.set(kind,now);this.played[kind]=(this.played[kind]??0)+1;
  }
  consume(events:SoundEvent[],listener:{x:number;z:number},right:{x:number;z:number}){
    for(const e of events){
      const dx=e.x-listener.x,dz=e.z-listener.z,ui=UI_CUES.has(e.kind);
      this.effect(e.kind,ui?0:Math.max(-.8,Math.min(.8,(dx*right.x+dz*right.z)/18)),ui?1:Math.max(.16,1-Math.hypot(dx,dz)/48));
    }
  }
  diagnostics(){return {mode:'samples',unlocked:this.unlocked,context:this.context?.state,voices:this.active.size,played:this.played,samplesLoaded:this.buffers.size,samplesTotal:SOUND_FILES.length+this.packFiles.length,licensedSamples:this.packFiles.filter(file=>this.buffers.has(file)).length,sampleFailures:[...this.failures],musicReady:this.music.readyState,musicPaused:this.music.paused,musicTime:this.music.currentTime,musicFilesLoaded:this.musicFiles.size,scene:this.scene,track:TRACKS[this.track].title};}
}
