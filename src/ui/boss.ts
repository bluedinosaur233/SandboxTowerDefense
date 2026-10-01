import { ENEMIES, type EnemyKind } from '../simulation/enemies';
import { BOSS_FALL } from '../simulation/result';
import type { Game } from '../simulation/game';

export function bossInPlan(plan:{kind:EnemyKind;entrance:number}[]){return plan.find(e=>ENEMIES[e.kind].rank==='boss');}

const BOSS_THEMES: Partial<Record<EnemyKind, {className:string; titleArt:string}>> = {
  grom: {className:'grom-hud', titleArt:'/art/ui/boss/grom-title-readable.webp'},
};

export class BossHud {
  readonly root=document.createElement('aside');
  private current=-1;
  private readonly name:HTMLHeadingElement;
  private readonly art:HTMLImageElement;
  private readonly health:HTMLElement;
  private readonly fill:HTMLElement;
  private readonly status:HTMLElement;

  constructor(parent:HTMLElement){
    this.root.className='boss-hud';this.root.hidden=true;this.root.setAttribute('aria-label','首领状态');
    this.root.innerHTML='<div class="boss-name"><h2></h2><img class="boss-title-art" alt="" hidden></div><div class="boss-health" role="progressbar" aria-label="首领生命" aria-valuemin="0" aria-valuemax="100"><i></i></div><b class="boss-status" hidden></b><span class="boss-reveal-glint" aria-hidden="true"></span>';
    this.name=this.root.querySelector('h2')!;
    this.art=this.root.querySelector('img')!;
    this.health=this.root.querySelector('.boss-health')!;
    this.fill=this.root.querySelector('i')!;
    this.status=this.root.querySelector('.boss-status')!;
    const showArt=()=>{this.art.hidden=false;this.name.classList.add('art-loaded');};
    this.art.onload=showArt;
    this.art.onerror=()=>{this.art.hidden=true;this.name.classList.remove('art-loaded');};
    // Begin loading before the cinematic, and keep a readable fallback if it fails.
    this.art.src=BOSS_THEMES.grom!.titleArt;
    parent.append(this.root);
  }

  update(game:Game,visible:boolean,presentationTime=game.time){
    const boss=game.enemies.find(e=>ENEMIES[e.kind].rank==='boss'&&e.hp>0);
    const death=game.bossDefeats.find(d=>d.enemy.id===this.current),age=death?presentationTime-death.time:Infinity;
    if(!boss&&death&&visible&&age<BOSS_FALL.duration+.7){
      this.root.hidden=false;this.fill.style.width='0%';this.health.setAttribute('aria-valuenow','0');this.status.hidden=true;
      this.root.classList.remove('enraged','charging');this.root.classList.toggle('departing',age>=BOSS_FALL.duration);return;
    }
    const show=visible&&!!boss;this.root.hidden=!show;
    if(!show){if(!boss)this.current=-1;return;}
    if(this.current!==boss.id){
      this.current=boss.id;
      this.name.textContent=ENEMIES[boss.kind].name;
      const theme=BOSS_THEMES[boss.kind];
      this.root.className='boss-hud'+(theme?' '+theme.className:'');
      this.art.hidden=true;this.name.classList.remove('art-loaded');
      if(theme){
        if(this.art.getAttribute('src')!==theme.titleArt)this.art.src=theme.titleArt;
        if(this.art.complete&&this.art.naturalWidth){this.art.hidden=false;this.name.classList.add('art-loaded');}
      }else this.art.removeAttribute('src');
    }
    const percent=Math.max(0,Math.min(100,boss.hp/boss.maxHp*100));
    this.fill.style.width=percent+'%';
    this.health.setAttribute('aria-valuenow',String(Math.round(percent)));
    this.root.classList.toggle('enraged',!!boss.boss?.enraged);
    this.root.classList.toggle('charging',!!boss.boss?.center);
    // Only actionable states belong on the banner; normal combat needs no caption.
    const status=boss.boss?.center?'重锤蓄力':boss.boss?.enraged?'狂暴':'';
    this.status.hidden=!status;
    this.status.textContent=status;
  }
}
