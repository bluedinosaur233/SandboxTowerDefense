import images from 'virtual:startup-images';
import { StartupAssets } from './ui/startup-assets';
import { audio } from './ui/runtime-audio';
import './ui/startup.css';

const root=document.getElementById('startup')!;
const heading=root.querySelector<HTMLElement>('[data-loading-title]')!;
const detail=root.querySelector<HTMLElement>('[data-loading-detail]')!;
const bar=root.querySelector<HTMLProgressElement>('progress')!;
const count=root.querySelector<HTMLElement>('[data-loading-count]')!;
const button=root.querySelector<HTMLButtonElement>('button')!;
const art=new StartupAssets();
let running=false,ready=false,loadedScene=false;
let imageDone=0,imageTotal=images.length,audioDone=0,audioTotal=1;
function progress(){
  const percent=Math.min(99,Math.floor((imageDone+audioDone)/(imageTotal+audioTotal)*95));
  bar.value=percent;count.textContent=percent+'%';
  detail.textContent=`画作 ${imageDone} / ${imageTotal}　·　声音 ${audioDone} / ${audioTotal}`;
}
async function load(){
  if(running)return;running=true;button.hidden=true;root.classList.remove('failed');
  heading.textContent='正在准备远征';
  try{
    const results=await Promise.allSettled([
      art.load(images,(done,total)=>{imageDone=done;imageTotal=total;progress();}),
      audio.preloadAll((done,total)=>{audioDone=done;audioTotal=total;progress();}),
    ]);
    const failure=results.find(r=>r.status==='rejected');
    if(failure?.status==='rejected')throw failure.reason;
    heading.textContent='正在展开大陆';detail.textContent='画作与乐声已备齐，即将启程';
    // Paint the loading screen before constructing the 3D scenes.
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    if(!loadedScene){await import('./main');loadedScene=true;}
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    ready=true;bar.value=100;count.textContent='100%';heading.textContent='远征已准备就绪';
    detail.textContent='所有画作、音乐与音效已加载';button.textContent='进入大陆';button.hidden=false;button.focus();
  }catch(error){
    root.classList.add('failed');heading.textContent='旅途暂时停驻';
    detail.textContent=error instanceof Error?error.message:'加载失败，请检查网络后重试。';
    button.textContent='重新加载';button.hidden=false;
  }finally{running=false;}
}
button.onclick=()=>{
  if(!ready){void load();return;}
  audio.unlock();document.getElementById('app')!.inert=false;
  document.body.classList.remove('startup-pending');root.classList.add('leaving');
  setTimeout(()=>root.remove(),550);
};
void load();
