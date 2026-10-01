import type { Game } from '../simulation/game';
import { battleRating, BOSS_FALL, resultTimeline } from '../simulation/result';
import type { AudioCue } from './sound-library';

/** All variants share the same canvas, alpha mask and facet coordinates. */
function star(){
 return '<img class="star-empty" src="/art/ui/results/empty-star-v2.webp" alt="" aria-hidden="true"><img class="star-gold" src="/art/ui/results/gold-star-v2.webp" alt="" aria-hidden="true"><img class="star-coat" src="/art/ui/results/plated-star-v2.webp" alt="" aria-hidden="true"><i class="star-spark"></i>';
}
export class BattleResult {
 private game:Game|null=null;private time=0;private timeline=resultTimeline();private stars=0;private plated=false;
 private hiddenHud=false;private flourished=false;private panel=false;private shownStars=0;private coated=false;
 private inert: {element:HTMLElement;value:boolean}[]=[];
 get active(){return !!this.game;}
 get presenting(){return this.active&&!this.panel;}
 constructor(private root:HTMLElement,private app:HTMLElement,private sound:(cue:AudioCue)=>void,private complete:(game:Game,plated:boolean)=>void,private retry:()=>void,private atlas:()=>void){}
 begin(game:Game,presentationOffset=0){
  if(this.active)return;this.game=game;this.time=0;
  const rating=battleRating(game);this.stars=rating.stars;this.plated=rating.plated;
  const death=game.bossDefeats.at(-1),remaining=death&&game.phase==='victory'?Math.max(0,BOSS_FALL.duration-(game.time+presentationOffset-death.time)):0;
  this.timeline=resultTimeline(remaining,matchMedia('(prefers-reduced-motion: reduce)').matches);
  this.inert=[...this.app.children].filter(e=>e!==this.root&&e.id!=='world').map(e=>({element:e as HTMLElement,value:(e as HTMLElement).inert}));for(const item of this.inert)item.element.inert=true;
  const win=game.phase==='victory';const art=new Image();art.src=win?'/art/ui/results/victory-frame.webp':'/art/ui/results/defeat-frame.webp';document.body.classList.add('result-active');
  this.root.innerHTML=`<div class="battle-result ${win?'won':'lost'}" data-stage="farewell"><div class="result-veil"></div><div class="result-rays" aria-hidden="true"></div><div class="result-motes" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--i:${i};--x:${(i*43)%100}%;--delay:${i*.08}s"></i>`).join('')}</div><div class="result-flourish" aria-hidden="true"><span>${win?'✦':'⚔'}</span><h2>${win?'远征胜利':'防线失守'}</h2><p>${win?'旗帜仍在，黎明将至':'暂别战场，再筑防线'}</p></div><section class="settlement" role="dialog" aria-modal="true" aria-labelledby="settlement-title" hidden><h2 id="settlement-title" class="sr-result">${win?'远征胜利':'防线失守'}</h2><div class="settlement-content"><p class="settlement-map">${game.map.name}</p><div class="settlement-stars" role="img" aria-label="${win?rating.stars+' 颗星':'本次未获星'}">${[0,1,2].map(i=>`<div class="result-star" data-star="${i}">${star()}</div>`).join('')}</div><p class="result-honor">${win?(rating.plated?'英雄未阵亡 · 星辉镀层':game.hero?(game.heroDeaths?`英雄阵亡 ${game.heroDeaths} 次`:'未达三星 · 无星辉镀层'):'未携带英雄'):'旗帜虽落，远征未止'}</p><dl class="settlement-stats"><div><dt>剩余城防</dt><dd>${Math.max(0,game.castleHp)}<small> / 100</small></dd></div><div><dt>迎战波次</dt><dd>${game.wave}<small> / ${game.totalWaves}</small></dd></div><div><dt>击退敌军</dt><dd>${game.kills}</dd></div></dl><p class="rating-rule">${win?'100 城防三星 · 50–99 二星 · 1–49 一星':'重整防线，再迎来敌'}</p><div class="settlement-buttons"><button class="settlement-retry">再次挑战</button><button class="settlement-atlas">返回地图</button></div></div></section></div>`;
  this.root.querySelector<HTMLButtonElement>('.settlement-retry')!.onclick=()=>{this.sound('click');this.retry();};
  this.root.querySelector<HTMLButtonElement>('.settlement-atlas')!.onclick=()=>{this.sound('click');this.atlas();};
 }
 update(dt:number){
  const game=this.game;if(!game)return;this.time+=Math.max(0,dt);const page=this.root.firstElementChild as HTMLElement;
  if(!this.hiddenHud&&this.time>=this.timeline.hudAt){this.hiddenHud=true;document.body.classList.add('result-hud-hidden');page.dataset.stage='hud-exit';}
  if(!this.flourished&&this.time>=this.timeline.flourishAt){this.flourished=true;page.dataset.stage='flourish';this.sound(game.phase==='victory'?'victory':'defeat');}
  if(!this.panel&&this.time>=this.timeline.panelAt){this.panel=true;page.dataset.stage='panel';this.root.querySelector<HTMLElement>('.settlement')!.hidden=false;this.complete(game,this.plated);this.root.querySelector<HTMLButtonElement>('.settlement-retry')!.focus({preventScroll:true});}
  while(this.shownStars<this.stars&&this.time>=this.timeline.starAt(this.shownStars)){
   this.root.querySelector(`[data-star="${this.shownStars}"]`)!.classList.add('earned');this.shownStars++;this.sound('upgrade');
  }
  if(this.plated&&!this.coated&&this.time>=this.timeline.plateAt(this.stars)){
   this.coated=true;page.classList.add('plated');this.sound('wave-clear');
  }
 }
 cancel(){
  if(this.game)this.root.innerHTML='';this.game=null;this.hiddenHud=this.flourished=this.panel=this.coated=false;this.shownStars=0;
  for(const item of this.inert)item.element.inert=item.value;this.inert=[];document.body.classList.remove('result-active','result-hud-hidden');
 }
}
