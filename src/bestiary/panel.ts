import { ENEMIES, ENEMY_KINDS, TARGET_LABELS, type EnemyKind } from '../simulation/enemies';
import { DAMAGE_LABELS } from '../simulation/combat';
import { BESTIARY_KEY, EncounterTracker, readJournal, discover, readEntry, type EnemyJournal } from './progress';
import { enemyPortrait } from './portrait';
import { icon } from '../ui/icons';
import './style.css';
export class BestiaryPanel {
  readonly dialog=document.createElement('dialog');
  readonly notice=document.createElement('aside');
  private journal:EnemyJournal={known:[],unread:[]};
  private encounters=new EncounterTracker();
  private selected:EnemyKind='goblin';
  private snoozed=new Set<EnemyKind>();
  private returnFocus:HTMLElement|null=null;
  private noticeAllowed=true;
  private noticeKind:EnemyKind|undefined;
  private noticeElapsed=0;
  constructor(private onOpen:()=>void,private onClose:()=>void,private sound:()=>void){
    try{this.journal=readJournal(localStorage.getItem(BESTIARY_KEY));}catch{/* Keep an in-memory journal. */}
    this.dialog.className='bestiary';this.dialog.setAttribute('aria-labelledby','bestiary-title');
    this.dialog.innerHTML=`<header class="bestiary-header"><div><small>THE BORDERLAND BESTIARY</small><h2 id="bestiary-title">边境敌人图鉴</h2></div><div><span class="bestiary-count"></span><button class="bestiary-close" aria-label="关闭敌人图鉴">${icon('close')}</button></div></header><div class="bestiary-body"><nav class="bestiary-roster" aria-label="敌人种类"></nav><article class="bestiary-entry"></article></div><footer class="bestiary-footer">物防仅减免物理伤害 · 法抗仅减免魔法伤害<span>点击情报阅读时，战场会暂停</span></footer>`;
    this.notice.className='enemy-intel';this.notice.hidden=true;this.notice.setAttribute('aria-label','新敌人情报');
    document.querySelector('#app')!.append(this.dialog,this.notice);
    this.dialog.querySelector<HTMLButtonElement>('.bestiary-close')!.onclick=()=>this.close();
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.dialog.addEventListener('keydown',e=>e.stopPropagation());
    this.renderNotice();
  }
  get open(){return this.dialog.open;}
  private save(){try{localStorage.setItem(BESTIARY_KEY,JSON.stringify(this.journal));}catch{/* Session discoveries are still usable. */}}
  known(kind:EnemyKind){return this.journal.known.includes(kind);}
  beginBattle(){this.noticeKind=undefined;this.noticeElapsed=0;this.encounters.reset();this.snoozed.clear();this.renderNotice();}
  record(kinds:EnemyKind[]){
    let changed=false;for(const kind of kinds){discover(this.journal,kind);changed=this.encounters.record(kind)||changed;}
    if(changed){this.save();this.renderNotice();}
  }
  setNoticeVisible(visible:boolean){this.noticeAllowed=visible;this.notice.hidden=!visible||!this.pending();}
  update(dt:number){
    if(this.notice.hidden||this.open||this.notice.matches(':hover')||this.notice.contains(document.activeElement))return;
    this.noticeElapsed+=dt;
    this.notice.classList.toggle('retiring',this.noticeElapsed>=7.65);
    if(this.noticeElapsed>=8){const kind=this.pending();if(kind)this.snoozed.add(kind);this.renderNotice();}
  }
  private pending(){return this.encounters.unread.find(kind=>!this.snoozed.has(kind));}
  private renderNotice(){
    const kind=this.pending();
    if(kind!==this.noticeKind){this.noticeKind=kind;this.noticeElapsed=0;this.notice.classList.remove('retiring');}
    this.notice.hidden=!this.noticeAllowed||!kind;
    for(const button of document.querySelectorAll<HTMLElement>('[data-bestiary-open]')){
      button.dataset.unread=String(this.encounters.unread.length);button.classList.toggle('has-intel',this.encounters.unread.length>0);
      button.setAttribute('aria-label',`敌人图鉴${this.encounters.unread.length?' · '+this.encounters.unread.length+' 条未读情报':''}`);
    }
    if(!kind)return;
    const d=ENEMIES[kind];this.notice.classList.toggle('boss-intel',d.rank==='boss');
    this.notice.innerHTML=`<button class="intel-open" aria-label="查看新敌人情报：${d.name}">${enemyPortrait(kind)}<span><small>本关首次登场${this.encounters.unread.length>1?' / '+this.encounters.unread.length+' 条待阅':''}</small><b>${d.name}</b><em>${d.trait}</em><strong>点击查看应对情报 →</strong></span></button><button class="intel-dismiss" aria-label="稍后阅读${d.name}情报" title="稍后阅读，情报保留在图鉴">×</button><span class="sr-only" role="status">本关首次遭遇：${d.name}。可点击查看情报。</span>`;
    this.notice.querySelector<HTMLButtonElement>('.intel-open')!.onclick=()=>this.show(kind);
    this.notice.querySelector<HTMLButtonElement>('.intel-dismiss')!.onclick=()=>{this.snoozed.add(kind);this.renderNotice();this.sound();};
  }
  show(kind:EnemyKind=this.encounters.unread[0]??this.selected){
    if(!this.open){this.returnFocus=document.activeElement as HTMLElement;this.onOpen();this.dialog.showModal();}
    this.select(kind);this.sound();
  }
  close(){if(!this.open)return;this.dialog.close();this.onClose();if(this.returnFocus?.isConnected)this.returnFocus.focus();else document.querySelector<HTMLElement>('body.campaign-active .atlas-bestiary,body:not(.campaign-active) #bestiary-open')?.focus();}
  private select(kind:EnemyKind){
    const restoreNavFocus=this.dialog.querySelector('.bestiary-roster')!.contains(document.activeElement);
    this.selected=kind;this.encounters.read(kind);readEntry(this.journal,kind);this.save();this.renderNotice();
    const d=ENEMIES[kind],known=this.journal.known.includes(kind);
    this.dialog.querySelector('.bestiary-count')!.textContent=`已遭遇 ${this.journal.known.length} / ${ENEMY_KINDS.length}`;
    const nav=this.dialog.querySelector('.bestiary-roster')!;
    nav.innerHTML=ENEMY_KINDS.map((k,i)=>`<button data-enemy="${k}" data-rank="${ENEMIES[k].rank??'normal'}" aria-pressed="${k===kind}"><span class="bestiary-index">0${i+1}</span>${enemyPortrait(k)}<span><b>${ENEMIES[k].name}</b><small>${this.journal.known.includes(k)?'已遭遇':'尚未遭遇'}${this.encounters.unread.includes(k)?' · 新':''}</small></span>${k===kind?icon('chevron'):''}</button>`).join('');
    nav.querySelectorAll<HTMLButtonElement>('[data-enemy]').forEach(b=>b.onclick=()=>{this.select(b.dataset.enemy as EnemyKind);this.sound();});
    const stats=[['目标偏好',TARGET_LABELS[d.preference]],['基础生命',d.hp],['攻击类型',DAMAGE_LABELS[d.damageType]],['单次伤害',d.damage],['攻击间隔',d.interval+' 秒'],['物理防御',d.armor+'%'],['魔法抗性',d.resistance+'%'],['移动速度',d.speed+' 格/秒'],['攻击距离',d.attackRange+' 格'],['击杀赏金',d.reward+' 金币'],['突破城防',d.castleDamage+' 点']];
    this.dialog.querySelector('.bestiary-entry')!.innerHTML=`<div class="bestiary-hero" style="--enemy-color:${d.color}"><div class="bestiary-illustration">${enemyPortrait(kind)}<span>FIELD NOTES / 0${ENEMY_KINDS.indexOf(kind)+1}</span></div><div><small>${d.title} · ${known?'已收录实战情报':'斥候手册 · 尚未遭遇'}</small><h3>${d.name}</h3><p>${d.description}</p><span class="bestiary-trait">${d.trait}</span></div></div><dl class="bestiary-stats">${stats.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><section class="bestiary-counter"><small>TACTICAL ADVICE</small><h4>${icon('sword')} 应对建议</h4><p>${d.counter}</p></section><p class="bestiary-formula">减伤示例：100 点物伤 → ${100-d.armor} 点；100 点法伤 → ${100-d.resistance} 点。<br>以上为基础属性。从第 2 波起，每波增加基础生命的 12%；城防损失为突破惩罚，不参与物防／法抗结算。</p>`;
    (this.dialog.querySelector('.bestiary-entry') as HTMLElement).scrollTop=0;
    if(restoreNavFocus)nav.querySelector<HTMLButtonElement>(`[data-enemy="${kind}"]`)?.focus({preventScroll:true});
  }
}
