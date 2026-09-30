import type { DamageType } from './combat';
export const TOWER_KINDS=['archer','mage','cannon','frost','tesla'] as const;
export type TowerKind=typeof TOWER_KINDS[number];
export type TowerBranch='marksman'|'ranger'|'inferno'|'arcane'|'bombard'|'shrapnel'|'blizzard'|'glacier'|'tempest'|'judgment';
export type ProjectileKind='arrow'|'magic'|'shell'|'ice'|'lightning'|'missile';
export interface TowerAttack {
  air:boolean;minRange:number;coneAngle:number;
  damage:number;range:number;interval:number;projectile:ProjectileKind;damageType:DamageType;
  splash:number;targets:number;chain:number;chainRange:number;chainFalloff:number;
  slow:number;slowDuration:number;stun:number;burn:number;burnDuration:number;shred:number;shredDuration:number;
  armorPierce:number;resistPierce:number;
}
const defaults={air:true,minRange:0,coneAngle:0,splash:0,targets:1,chain:1,chainRange:2.4,chainFalloff:.72,slow:0,slowDuration:0,stun:0,burn:0,burnDuration:0,shred:0,shredDuration:0,armorPierce:0,resistPierce:0};
export const TOWER_STATS={
  archer:{hp:140,range:6.4,damage:18,interval:.82,muzzle:2.25,armor:10,resistance:0},
  mage:{hp:125,range:5.9,damage:36,interval:1.8,muzzle:2.7,armor:5,resistance:25},
  cannon:{hp:180,range:6.0,damage:40,interval:2.4,muzzle:1.75,armor:25,resistance:0},
  frost:{hp:130,range:5.6,damage:12,interval:1.35,muzzle:2.5,armor:5,resistance:30},
  tesla:{hp:135,range:5.5,damage:24,interval:1.6,muzzle:2.85,armor:10,resistance:20},
};
const base:Record<TowerKind,TowerAttack>={
  archer:{...defaults,...TOWER_STATS.archer,projectile:'arrow',damageType:'physical'},
  mage:{...defaults,...TOWER_STATS.mage,projectile:'magic',damageType:'magic',splash:1.5},
  cannon:{...defaults,...TOWER_STATS.cannon,air:false,coneAngle:Math.PI*100/180,projectile:'shell',damageType:'physical',splash:1.65},
  frost:{...defaults,...TOWER_STATS.frost,projectile:'ice',damageType:'magic',slow:.3,slowDuration:2},
  tesla:{...defaults,...TOWER_STATS.tesla,projectile:'lightning',damageType:'magic',chain:3},
};
export interface BranchDefinition {
  id:TowerBranch;kind:TowerKind;name:string;description:string;color:string;
  cost:{gold:number};attack:Partial<TowerAttack>;
}
export const BRANCHES:Record<TowerBranch,BranchDefinition>={
  marksman:{id:'marksman',kind:'archer',name:'鹰眼长弓塔',description:'射程 9.4 格，重箭忽略 35 个百分点物防；专攻重甲单体。',color:'#d4b15f',cost:{gold:210},attack:{damage:65,range:9.4,interval:1.45,armorPierce:35}},
  ranger:{id:'ranger',kind:'archer',name:'游侠连弩塔',description:'每轮向至多 3 名敌人各发一箭，快速清理轻装群敌。',color:'#76b66e',cost:{gold:200},attack:{damage:23,range:7.2,interval:.72,targets:3}},
  inferno:{id:'inferno',kind:'mage',name:'炎爆法师塔',description:'爆炸半径 2.3 格，并附加每秒 7 点法伤的灼烧，持续 3 秒。',color:'#e48a51',cost:{gold:260},attack:{damage:57,range:7,interval:2.15,splash:2.3,burn:7,burnDuration:3}},
  arcane:{id:'arcane',kind:'mage',name:'奥术棱镜塔',description:'改为单体重击，忽略 35 个百分点法抗，猎杀抗魔精英。',color:'#d9a1ff',cost:{gold:280},attack:{damage:94,range:7.5,interval:1.55,splash:0,resistPierce:35}},
  bombard:{id:'bombard',kind:'cannon',name:'高地迫击炮',description:'全向抛射地面敌军，射程 10 格；近身 2.2 格为盲区，爆炸半径 2.8 格。',color:'#b8754b',cost:{gold:270},attack:{damage:90,range:10,minRange:2.2,coneAngle:0,interval:3,splash:2.8}},
  shrapnel:{id:'shrapnel',kind:'cannon',name:'魔力导弹井',description:'全向追踪地面与空中敌军，造成范围法伤；爆炸削减物防 25 个百分点，持续 4 秒。',color:'#74dfc2',cost:{gold:260},attack:{air:true,coneAngle:0,projectile:'missile',damageType:'magic',damage:51,range:8,interval:1.85,splash:1.8,shred:25,shredDuration:4}},
  blizzard:{id:'blizzard',kind:'frost',name:'暴风雪塔',description:'对半径 2 格内群敌造成法伤并减速 45%，持续 3 秒。',color:'#9adce8',cost:{gold:230},attack:{damage:23,range:6.8,interval:1.65,splash:2,slow:.45,slowDuration:3}},
  glacier:{id:'glacier',kind:'frost',name:'冰川禁锢塔',description:'集中冰矛使单体冻结 0.65 秒，之后仍受 55% 减速，总计 2.5 秒。',color:'#c6f5ff',cost:{gold:240},attack:{damage:42,range:7,interval:2.05,slow:.55,slowDuration:2.5,stun:.65}},
  tempest:{id:'tempest',kind:'tesla',name:'风暴电网',description:'闪电可连击至多 5 名敌人，跳跃距离 3 格，每跳保留 80% 伤害。',color:'#98d8bc',cost:{gold:270},attack:{damage:38,range:6.7,interval:1.55,chain:5,chainRange:3,chainFalloff:.8}},
  judgment:{id:'judgment',kind:'tesla',name:'雷罚尖塔',description:'放弃连锁，集中雷击造成高额单体法伤并麻痹 0.4 秒。',color:'#efd991',cost:{gold:280},attack:{damage:112,range:7.3,interval:2.2,chain:1,stun:.4}},
};
export function isTower(kind:string):kind is TowerKind{return (TOWER_KINDS as readonly string[]).includes(kind);}
/** Directional coverage opts buildings into preparation-time orientation controls. */
export function isDirectional(s:{kind:string;level?:number;branch?:TowerBranch}){return isTower(s.kind)&&towerAttack({kind:s.kind,level:s.level??1,branch:s.branch}).coneAngle>0;}
// Positive Y rotation is counterclockwise when viewed from above.
export const TURN_CLOCKWISE=-Math.PI/4;
export const TURN_COUNTERCLOCKWISE=Math.PI/4;
export function branchesFor(kind:string){return Object.values(BRANCHES).filter(b=>b.kind===kind);}
export function towerAttack(tower:{kind:TowerKind;level:number;branch?:TowerBranch}):TowerAttack {
  const b=base[tower.kind],level=tower.level;
  const branch=tower.branch&&level===3&&BRANCHES[tower.branch]?.kind===tower.kind?BRANCHES[tower.branch].attack:{};
  return {...b,damage:b.damage*(1+(level-1)*.55),range:b.range+(level-1)*.6,interval:b.interval/(1+(level-1)*.1),...branch};
}
export function towerFeatures(p:TowerAttack):string[]{
  const lines:string[]=[p.air?'对地 / 对空':'仅对地',p.coneAngle?`朝向锥形射界 ${Math.round(p.coneAngle*180/Math.PI)}°`:'全向球形射界'];
  if(p.minRange)lines.push(`近身盲区 ${p.minRange} 格`);
  if(p.splash)lines.push(`爆炸半径 ${p.splash} 格`);
  if(p.targets>1)lines.push(`每轮攻击 ${p.targets} 个目标`);
  if(p.chain>1)lines.push(`连锁 ${p.chain} 人 · 每跳保留 ${Math.round(p.chainFalloff*100)}% 伤害`);
  if(p.slow)lines.push(`减速 ${Math.round(p.slow*100)}% · ${p.slowDuration} 秒`);
  if(p.stun)lines.push(`${p.projectile==='ice'?'冻结':'麻痹'} ${p.stun} 秒`);
  if(p.burn)lines.push(`灼烧 ${p.burn} 法伤/秒 · ${p.burnDuration} 秒`);
  if(p.shred)lines.push(`削减物防 ${p.shred} 个百分点 · ${p.shredDuration} 秒`);
  if(p.armorPierce)lines.push(`忽略 ${p.armorPierce} 个百分点物防`);
  if(p.resistPierce)lines.push(`忽略 ${p.resistPierce} 个百分点法抗`);
  return lines;
}
