import { ENEMIES, type EnemyKind } from '../simulation/enemies';
import type { Game } from '../simulation/game';

export function bossInPlan(plan:{kind:EnemyKind;entrance:number}[]){return plan.find(e=>ENEMIES[e.kind].rank==='boss');}
export class BossHud {
  readonly root=document.createElement('aside');
  private current=-1;
  constructor(parent:HTMLElement){
    this.root.className='boss-hud';this.root.hidden=true;this.root.setAttribute('aria-label','首领状态');
    this.root.innerHTML='<div class="boss-heading"><span class="boss-sigil" aria-hidden="true">♛</span><div><small></small><h2></h2></div><b class="boss-status"></b></div><div class="boss-health" role="progressbar" aria-label="首领生命" aria-valuemin="0" aria-valuemax="100"><i></i></div>';
    parent.append(this.root);
  }
  update(game:Game,visible:boolean){
    const boss=game.enemies.find(e=>ENEMIES[e.kind].rank==='boss'&&e.hp>0),show=visible&&!!boss&&game.phase==='battle';this.root.hidden=!show;
    if(!show){if(!boss)this.current=-1;return;}
    if(this.current!==boss.id){this.current=boss.id;this.root.querySelector('h2')!.textContent=ENEMIES[boss.kind].name;this.root.querySelector('small')!.textContent=ENEMIES[boss.kind].title;this.root.querySelector('i')!.style.width='100%';}
    const percent=Math.max(0,Math.min(100,boss.hp/boss.maxHp*100));this.root.querySelector<HTMLElement>('i')!.style.width=percent+'%';this.root.querySelector('[role=progressbar]')!.setAttribute('aria-valuenow',String(Math.round(percent)));
    this.root.classList.toggle('enraged',!!boss.boss?.enraged);this.root.classList.toggle('charging',!!boss.boss?.center);
    this.root.querySelector('.boss-status')!.textContent=boss.boss?.center?'裂地重锤 · 撤离预警圈':boss.boss?.enraged?'狂怒':'攻城领主';
  }
}
