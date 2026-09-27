import type { SoundEvent } from '../simulation/game';
import { SOUND_FILES, SOUND_LIBRARY, UI_CUES, type AudioCue } from './sound-library';
export const TRACKS = [
  { title:'Skye Cuillin', subtitle:'凯尔特原野 · 竖琴与哨笛', file:'skye-cuillin.mp3', isrc:'USUAN1100346' },
  { title:'Ascending the Vale', subtitle:'风与牧歌 · 山谷的黎明', file:'ascending-the-vale.mp3', isrc:'USUAN1600064' },
];

export class Audio {
  enabled=true; musicEnabled=true; sfxVolume=.65; musicVolume=.32; track=0; unlocked=false;
  musicStatus='点击战场后启奏';
  sampleStatus='点击战场后加载音效';
  readonly played:Partial<Record<AudioCue,number>>={};
  readonly music=new window.Audio();
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private compressor:DynamicsCompressorNode|null=null;
  private buffers=new Map<string,AudioBuffer>();
  private failures=new Set<string>();
  private loading:Promise<void>|null=null;
  private lastLoad=-Infinity;
  private last=new Map<AudioCue,number>();
  private active=new Map<AudioBufferSourceNode,{kind:AudioCue;gain:GainNode;pan:StereoPannerNode}>();
  private suspended=false;

  constructor(){
    try {
      const saved=JSON.parse(localStorage.getItem('riverwatch-audio-v2')||'{}');
      this.enabled=saved.enabled??true; this.musicEnabled=saved.musicEnabled??true;
      this.musicVolume=saved.musicVolume??.32; this.sfxVolume=saved.sfxVolume??.65; this.track=saved.track===1?1:0;
    } catch {}
    this.music.preload='none';this.music.loop=true;this.music.src='/audio/music/'+TRACKS[this.track].file;this.music.volume=this.musicVolume;
    this.music.addEventListener('playing',()=>this.musicStatus='正在演奏');
    this.music.addEventListener('error',()=>this.musicStatus='音乐加载失败 · 可切换曲目重试');
  }
  private save(){
    try{localStorage.setItem('riverwatch-audio-v2',JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,sfxVolume:this.sfxVolume,track:this.track}));}catch{}
  }
  unlock(){
    if(!this.context){
      this.context=new AudioContext();this.master=this.context.createGain();this.compressor=this.context.createDynamicsCompressor();
      this.compressor.threshold.value=-16;this.compressor.ratio.value=4;this.compressor.attack.value=.005;this.compressor.release.value=.12;
      this.master.connect(this.compressor).connect(this.context.destination);this.master.gain.value=this.enabled?this.sfxVolume:0;
    }
    void this.context.resume().catch(()=>{});this.unlocked=true;
    void this.preloadSamples();
    if(this.musicEnabled&&this.music.paused&&!this.suspended)this.playMusic();
  }
  async preloadSamples():Promise<void>{
    if(!this.context||this.buffers.size===SOUND_FILES.length)return;
    if(this.loading)return this.loading;
    if(performance.now()-this.lastLoad<5000)return;
    this.lastLoad=performance.now();this.sampleStatus='音效加载中…';const context=this.context;
    this.loading=Promise.all(SOUND_FILES.filter(file=>!this.buffers.has(file)).map(async file=>{
      const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
      try{
        const response=await fetch('/audio/sfx/'+file,{signal:abort.signal});
        if(!response.ok)throw new Error('Audio HTTP '+response.status);
        const buffer=await context.decodeAudioData(await response.arrayBuffer());
        // Equal peak levels, then per-action gains: impacts remain restrained.
        let peak=0;
        for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const value of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(value));
        if(peak>0){const scale=Math.min(3,.72/peak);for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=scale;}}
        this.buffers.set(file,buffer);this.failures.delete(file);
      }catch{this.failures.add(file);}finally{clearTimeout(timeout);}
    })).then(()=>{
      this.sampleStatus=this.failures.size?'部分音效加载失败 · 点击音效开关重试':'本地采样音效已就绪';
    }).finally(()=>{this.loading=null;});
    return this.loading;
  }
  private playMusic(){this.musicStatus='乐师调弦中…';void this.music.play().catch(()=>this.musicStatus='点击音乐开关以启奏');}
  toggle(){
    this.enabled=!this.enabled;this.unlock();
    if(this.master)this.master.gain.value=this.enabled?this.sfxVolume:0;
    if(!this.enabled)this.stopEffects();this.save();if(this.enabled)this.click();return this.enabled;
  }
  toggleMusic(){
    this.musicEnabled=!this.musicEnabled;this.unlock();
    if(!this.musicEnabled){this.music.pause();this.musicStatus='已静音';}
    else if(this.suspended){this.music.pause();this.musicStatus='游戏暂停中';}else this.playMusic();this.save();
  }
  setVolume(kind:'music'|'sfx',value:number){
    value=Math.max(0,Math.min(1,value));
    if(kind==='music'){this.musicVolume=value;this.music.volume=value;}
    else{this.sfxVolume=value;if(this.master)this.master.gain.value=this.enabled?value:0;if(value===0)this.stopEffects();}this.save();
  }
  selectTrack(index:number){
    this.track=index===1?1:0;this.music.src='/audio/music/'+TRACKS[this.track].file;this.music.load();this.unlock();
    if(this.musicEnabled&&!this.suspended)this.playMusic();else if(this.suspended)this.musicStatus='游戏暂停中';this.save();
  }
  private stopEffects(combatOnly=false){
    for(const [source,voice] of this.active)if(!combatOnly||!UI_CUES.has(voice.kind))source.stop();
  }
  setSuspended(value:boolean){
    if(this.suspended===value)return;this.suspended=value;
    if(value){this.music.pause();this.musicStatus='游戏暂停中';this.stopEffects(true);}
    else if(this.unlocked&&this.musicEnabled)this.playMusic();
  }
  click(){this.effect('click');}
  build(){this.effect('build');}
  wave(){this.effect('wave');}
  effect(kind:AudioCue,pan=0,gain=1){
    const ctx=this.context;
    if(!this.enabled||this.sfxVolume===0||!ctx||!this.master||(this.suspended&&!UI_CUES.has(kind)))return;
    const definition=SOUND_LIBRARY[kind],now=ctx.currentTime;
    if(now-(this.last.get(kind)??-100)<definition.interval)return;
    const candidates=definition.files.filter(file=>this.buffers.has(file));
    if(!candidates.length)return; // Do not replay stale actions when loading finishes.
    if(this.active.size>=24)return;
    if([...this.active.values()].filter(v=>v.kind===kind).length>=4)return;
    const file=candidates[(this.played[kind]??0)%candidates.length],buffer=this.buffers.get(file)!;
    const source=ctx.createBufferSource(),volume=ctx.createGain(),panner=ctx.createStereoPanner();
    source.buffer=buffer;
    const rate=(definition.rate??1)*(UI_CUES.has(kind)?1:.97+Math.random()*.06);source.playbackRate.value=rate;
    const duration=Math.min(buffer.duration,definition.duration??1.8),end=now+duration/rate;
    volume.gain.setValueAtTime(0,now);volume.gain.linearRampToValueAtTime(definition.gain*Math.max(0,Math.min(1,gain)),now+Math.min(.005,duration/4));
    volume.gain.setValueAtTime(definition.gain*Math.max(0,Math.min(1,gain)),Math.max(now+.005,end-.025));volume.gain.linearRampToValueAtTime(0,end);
    panner.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(volume).connect(panner).connect(this.master);
    this.active.set(source,{kind,gain:volume,pan:panner});
    source.onended=()=>{source.disconnect();volume.disconnect();panner.disconnect();this.active.delete(source);};
    source.start(now,0,duration);source.stop(end+.01);
    this.last.set(kind,now);this.played[kind]=(this.played[kind]??0)+1;
  }
  consume(events:SoundEvent[],listener:{x:number;z:number},right:{x:number;z:number}){
    for(const e of events){
      const dx=e.x-listener.x,dz=e.z-listener.z,ui=UI_CUES.has(e.kind);
      this.effect(e.kind,ui?0:Math.max(-.8,Math.min(.8,(dx*right.x+dz*right.z)/18)),ui?1:Math.max(.16,1-Math.hypot(dx,dz)/48));
    }
  }
  diagnostics(){return {mode:'samples',unlocked:this.unlocked,context:this.context?.state,voices:this.active.size,played:this.played,samplesLoaded:this.buffers.size,samplesTotal:SOUND_FILES.length,sampleFailures:[...this.failures],musicReady:this.music.readyState,musicPaused:this.music.paused,musicTime:this.music.currentTime,track:TRACKS[this.track].title};}
}
