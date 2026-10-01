import type { Audio } from './audio';

/** Kept outside the audio settings so slow public connections are visible. */
export class AudioLoadingNotice {
  readonly root=document.createElement('button');
  private wasLoading=false;
  private readyTime=0;
  private quietBattle=false;
  enterBattle(){this.quietBattle=!this.audio.loadingNotice().visible;if(this.quietBattle){this.wasLoading=false;this.readyTime=3;this.root.hidden=true;}}
  enterCampaign(){this.quietBattle=false;}
  constructor(parent:HTMLElement,private audio:Audio){
    this.root.className='audio-loading';this.root.type='button';
    this.root.setAttribute('aria-label','声音加载状态，点击重试');
    this.root.innerHTML='<span class="audio-loading-mark" aria-hidden="true">♫</span><span class="audio-loading-copy"><b role="status"></b><small class="audio-loading-music"></small><small class="audio-loading-samples"></small><i><span></span></i><em>可以继续游玩 · 点击重试声音</em></span>';
    this.root.onclick=()=>audio.retryFromGesture();parent.append(this.root);
  }
  update(dt:number){
    const state=this.audio.loadingNotice();
    if(this.quietBattle&&state.samplesReady&&!state.needsGesture&&!state.failed){this.root.hidden=true;this.wasLoading=false;return;}
    if(state.visible){this.wasLoading=true;this.readyTime=0;}
    else this.readyTime+=dt;
    this.root.hidden=!state.visible&&(!this.wasLoading||this.readyTime>2.5);
    if(this.root.hidden)return;
    this.root.classList.toggle('failed',state.failed);
    this.root.classList.toggle('ready',!state.visible);
    const title=state.visible?state.title:'声音已就绪';
    const heading=this.root.querySelector('b')!;
    if(heading.textContent!==title)heading.textContent=title;
    this.root.querySelector('.audio-loading-music')!.textContent=state.music;
    this.root.querySelector('.audio-loading-samples')!.textContent=state.samples;
    this.root.querySelector('em')!.textContent=state.visible?'可以继续游玩 · 点击启用 / 重试声音':'音乐与音效准备完毕';
    (this.root.querySelector('i>span') as HTMLElement).style.width=`${state.progress*100}%`;
  }
}
