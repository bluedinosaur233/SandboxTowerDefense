import type { SoundEvent, SoundKind } from '../simulation/game';
export const TRACKS = [
  { title:'Skye Cuillin', subtitle:'凯尔特原野 · 竖琴与哨笛', file:'skye-cuillin.mp3', isrc:'USUAN1100346' },
  { title:'Ascending the Vale', subtitle:'风与牧歌 · 山谷的黎明', file:'ascending-the-vale.mp3', isrc:'USUAN1600064' },
];
export class Audio {
  enabled=true; musicEnabled=true; sfxVolume=.65; musicVolume=.32; track=0; unlocked=false;
  musicStatus='点击战场后启奏';
  readonly played:Partial<Record<SoundKind,number>>={};
  private context:AudioContext|null=null;
  private master:GainNode|null=null;private compressor:DynamicsCompressorNode|null=null;
  private noiseBuffer:AudioBuffer|null=null;
  readonly music=new window.Audio();
  private last=new Map<string,number>();private voices=0;private suspended=false;
  constructor(){
    try{const saved=JSON.parse(localStorage.getItem('riverwatch-audio-v2')||'{}');this.enabled=saved.enabled??true;this.musicEnabled=saved.musicEnabled??true;this.musicVolume=saved.musicVolume??.32;this.sfxVolume=saved.sfxVolume??.65;this.track=saved.track===1?1:0;}catch{}
    this.music.preload='none';this.music.loop=true;this.music.src=`/audio/music/${TRACKS[this.track].file}`;this.music.volume=this.musicVolume;
    this.music.addEventListener('playing',()=>this.musicStatus='正在演奏');
    this.music.addEventListener('error',()=>this.musicStatus='音乐加载失败 · 可切换曲目重试');
  }
  private save(){try{localStorage.setItem('riverwatch-audio-v2',JSON.stringify({enabled:this.enabled,musicEnabled:this.musicEnabled,musicVolume:this.musicVolume,sfxVolume:this.sfxVolume,track:this.track}));}catch{}}
  unlock(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.compressor=this.context.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.ratio.value=5;this.master.connect(this.compressor).connect(this.context.destination);this.master.gain.value=this.enabled?this.sfxVolume:0;
      this.noiseBuffer=this.context.createBuffer(1,this.context.sampleRate,this.context.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    void this.context.resume().catch(()=>{});this.unlocked=true;if(this.musicEnabled&&this.music.paused&&!this.suspended)this.playMusic();
  }
  private playMusic(){this.musicStatus='乐师调弦中…';void this.music.play().catch(()=>this.musicStatus='点击音乐开关以启奏');}
  toggle(){this.enabled=!this.enabled;if(!this.context)this.unlock();if(this.master)this.master.gain.value=this.enabled?this.sfxVolume:0;this.save();if(this.enabled)this.tone(523,.1);return this.enabled;}
  toggleMusic(){this.musicEnabled=!this.musicEnabled;this.unlock();if(!this.musicEnabled){this.music.pause();this.musicStatus='已静音';}else if(this.suspended){this.music.pause();this.musicStatus='游戏暂停中';}else this.playMusic();this.save();}
  setVolume(kind:'music'|'sfx',value:number){value=Math.max(0,Math.min(1,value));if(kind==='music'){this.musicVolume=value;this.music.volume=value;}else{this.sfxVolume=value;if(this.master)this.master.gain.value=this.enabled?value:0;}this.save();}
  selectTrack(index:number){this.track=index===1?1:0;this.music.src=`/audio/music/${TRACKS[this.track].file}`;this.music.load();this.unlock();if(this.musicEnabled&&!this.suspended)this.playMusic();else if(this.suspended)this.musicStatus='游戏暂停中';this.save();}
  setSuspended(value:boolean){if(this.suspended===value)return;this.suspended=value;if(value){this.music.pause();this.musicStatus='游戏暂停中';}else if(this.unlocked&&this.musicEnabled)this.playMusic();}
  tone(frequency:number,duration=.09,volume=.06,type:OscillatorType='triangle',end=frequency,delay=0,pan=0){
    if(!this.enabled||!this.context||this.suspended||this.voices>40)return;const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner(),start=ctx.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+duration);g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(volume,start+.006);g.gain.exponentialRampToValueAtTime(.0001,start+duration);p.pan.value=pan;o.connect(g).connect(p).connect(this.master!);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();this.voices--;};o.start(start);o.stop(start+duration+.01);
  }
  private noise(duration:number,frequency:number,volume:number,pan:number){
    if(!this.enabled||!this.context||!this.noiseBuffer||this.suspended||this.voices>40)return;const ctx=this.context,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner();s.buffer=this.noiseBuffer;f.type='bandpass';f.frequency.setValueAtTime(frequency,ctx.currentTime);f.frequency.exponentialRampToValueAtTime(Math.max(70,frequency*.4),ctx.currentTime+duration);f.Q.value=.7;g.gain.setValueAtTime(volume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);p.pan.value=pan;s.connect(f).connect(g).connect(p).connect(this.master!);this.voices++;s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();p.disconnect();this.voices--;};s.start();s.stop(ctx.currentTime+duration);
  }
  build(){this.effect('build');} wave(){this.effect('wave');}
  effect(kind:SoundKind,pan=0,gain=1){
    if(!this.enabled||!this.context||this.suspended)return;
    const now=this.context.currentTime,interval=['melee','impact','arrow','wall-hit','death'].includes(kind)?.06:.12;
    if(now-(this.last.get(kind)??-100)<interval)return;this.last.set(kind,now);this.played[kind]=(this.played[kind]??0)+1;
    const tone=(hz:number,d=.1,v=.12,type:OscillatorType='triangle',end=hz,delay=0)=>this.tone(hz,d,v*gain,type,end,delay,pan);
    const noise=(d:number,hz:number,v:number)=>this.noise(d,hz,v*gain,pan);
    switch(kind){
      case 'arrow':noise(.09,2600,.2);tone(650,.065,.085,'triangle',180);break;
      case 'cast':tone(320,.34,.11,'sine',1100);tone(480,.4,.07,'sine',1650,.025);noise(.18,1600,.1);break;
      case 'impact':noise(.085,850,.3);tone(120,.085,.12,'triangle',55);break;
      case 'magic-hit':noise(.38,1100,.32);tone(170,.32,.14,'sine',48);tone(1300,.38,.07,'sine',650);break;
      case 'death':tone(190,.22,.12,'sawtooth',48);noise(.22,330,.21);break;
      case 'melee':noise(.09,3600,.2);tone(940,.12,.05,'square',710);tone(150,.08,.1,'triangle',65);break;
      case 'wall-hit':noise(.14,520,.3);tone(90,.16,.16,'triangle',40);break;
      case 'collapse':noise(.65,280,.42);tone(72,.48,.2,'triangle',28);break;
      case 'castle-hit':tone(98,.55,.2,'sawtooth',65);noise(.4,370,.3);break;
      case 'dig':case 'splash':noise(.32,1200,.24);tone(340,.12,.07,'sine',90);break;
      case 'raise':case 'build':noise(.13,650,.2);tone(180,.1,.14,'triangle',90);tone(440,.2,.08,'sine',440,.11);break;
      case 'upgrade':[392,523,659,784].forEach((hz,i)=>tone(hz,.35,.1,'triangle',hz,i*.1));break;
      case 'error':tone(150,.17,.1,'square',115);break;
      case 'recruit':tone(392,.14,.06);tone(523,.18,.06,'triangle',523,.1);break;
      case 'wave':[164,220,246].forEach((hz,i)=>{tone(hz,.55,.12,'sawtooth',hz,i*.26);tone(hz*2,.55,.045,'sine',hz*2,i*.26);});break;
      case 'wave-clear':[392,494,587].forEach((hz,i)=>tone(hz,.38,.1,'triangle',hz,i*.13));break;
      case 'victory':[262,330,392,523,659,784].forEach((hz,i)=>tone(hz,.7,.11,'triangle',hz,i*.14));break;
      case 'defeat':[294,262,220,147].forEach((hz,i)=>tone(hz,.75,.13,'triangle',hz,i*.3));break;
    }
  }
  consume(events:SoundEvent[],listener:{x:number;z:number},right:{x:number;z:number}){
    // Consume every frame, including while muted, so toggling audio never replays old combat.
    for(const e of events){const dx=e.x-listener.x,dz=e.z-listener.z;const ui=['wave','wave-clear','victory','defeat','error','upgrade','build','dig','raise'].includes(e.kind);this.effect(e.kind,ui?0:Math.max(-.8,Math.min(.8,(dx*right.x+dz*right.z)/18)),ui?1:Math.max(.18,1-Math.hypot(dx,dz)/48));}
  }
  diagnostics(){return {unlocked:this.unlocked,context:this.context?.state,voices:this.voices,played:this.played,musicReady:this.music.readyState,musicPaused:this.music.paused,musicTime:this.music.currentTime,track:TRACKS[this.track].title};}
}
