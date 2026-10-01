import { towerAttack } from './towers';
export type BarracksBranch='spellblade'|'paladin';
export const BARRACKS_RECRUIT_SECONDS=15;
export function barracksCapacity(home:{level:number}){return home.level===1?2:3;}
export interface SoldierProfile {
  name:string;hp:number;armor:number;resistance:number;physical:number;magic:number;interval:number;
  rangedDamage:number;range:number;rangedInterval:number;
}
export const BARRACKS_BRANCHES={
  spellblade:{id:'spellblade' as const,name:'星纹魔剑营',unit:'魔剑士',color:'#aca5ff',cost:{gold:280},description:'训练 3 名魔剑士。远处发射可对空的法弹，近身用附魔长剑同时造成物伤与法伤。',features:['近战：28 物伤 + 20 法伤，每 0.85 秒','法弹：26 法伤，每 1.6 秒，球形射程 4.6 格','远程对地 / 对空，需要无遮挡视线','已有卫兵即刻换装，保留生命比例']},
  paladin:{id:'paladin' as const,name:'曙光骑士堂',unit:'圣骑士',color:'#ffe4a1',cost:{gold:300},description:'训练 3 名剑盾圣骑士。受伤接敌时自动召唤圣光领域，为附近士兵和英雄回血并降低所受伤害。',features:['近战：36 物伤，每 1 秒','圣光领域：半径 2.6 格，持续 4 秒','领域内每秒回复 12 生命、所受伤害降低 25%','全营共享 16 秒冷却，多个领域不叠加']},
};
export const SANCTUARY={radius:2.6,duration:4,heal:12,reduction:.25,cooldown:16};
export function isBarracksBranch(value:unknown):value is BarracksBranch{return value==='spellblade'||value==='paladin';}
export function soldierProfile(home:{level:number;barracksBranch?:BarracksBranch}):SoldierProfile{
  const level=home.level,branch=level>=3?home.barracksBranch:undefined;
  if(branch==='spellblade')return {name:'星纹魔剑士',hp:155,armor:30,resistance:35,physical:28,magic:20,interval:.85,rangedDamage:26,range:4.6,rangedInterval:1.6};
  if(branch==='paladin')return {name:'曙光圣骑士',hp:205,armor:45,resistance:25,physical:36,magic:0,interval:1,rangedDamage:0,range:0,rangedInterval:0};
  return {name:level===1?'暮河新兵':level===2?'暮河卫士':'暮河精锐',hp:95+level*15,armor:20+(level-1)*5,resistance:10,physical:15*level,magic:0,interval:.8,rangedDamage:0,range:0,rangedInterval:0};
}
export function spellbladeAttack(){return {...towerAttack({kind:'mage',level:1}),damage:26,range:4.6,splash:0,interval:1.6};}
