import type { HeroId } from '../heroes/roster';
import type { Defenses } from './combat';
import type { Point, Vec3 } from './game';
import { towerAttack } from './towers';

export const HERO_STATS = { hp:320, armor:20, resistance:15, speed:3.8, range:7.5, damage:34, interval:.95, meleeDamage:26, meleeInterval:.65, respawn:18, regenDelay:5, regen:16 } as const;
export const HERO_SHOT={release:.32,recovery:.67,stowAfter:8,equip:.40} as const;
export const HERO_ARROW = { ...towerAttack({kind:'archer',level:1}), damage:HERO_STATS.damage, range:HERO_STATS.range, interval:HERO_STATS.interval };
export const HERO_SKILLS = {
  piercing:{name:'贯风箭',mark:'➶',cooldown:8,description:'贯穿前方 10 格，造成 90 物伤，忽略 35 个百分点物防。'},
  rain:{name:'翠羽箭雨',mark:'✧',cooldown:13,description:'半径 2.8 格内降下六轮箭雨，每轮 18 法伤，并减速 40%。'},
  gale:{name:'护身风暴',mark:'↻',cooldown:17,description:'周围 3.2 格造成 65 法伤、眩晕 0.8 秒，自身获得 3 秒减伤 50%。'},
} as const;
export type HeroSkill = keyof typeof HERO_SKILLS;
export type HeroState = 'idle'|'moving'|'flying'|'entering'|'casting'|'ranged'|'melee'|'fallen';
export const HERO_STATES:Record<HeroState,string> = {idle:'驻守',moving:'赶往阵地',flying:'光翼飞行',entering:'乘风而至',casting:'风灵咏唱',ranged:'弓箭迎敌',melee:'刺剑迎战',fallen:'等待复活'};
export interface HeroEffect {id:number;kind:HeroSkill|'arrival'|'fall'|'slash';from:Vec3;to:Vec3;time:number;duration:number;radius:number;pulses:number}
export interface BattleHero extends Vec3, Defenses {
  pendingArrow?:{target:number;releaseAt:number};
  bowReadyAt?:number;
  id:number; heroId:HeroId; hp:number; maxHp:number; facing:number;
  state:HeroState; path:Point[]; revision:number; repath:number;
  destination:Point|null; rally:Point; cooldown:number; lastCombat:number;
  respawnIn:number; attackUntil:number; blockedBy?:number;
  order:'player'|'intercept'|'return'|null; engagementTarget:number|null;
  flying:boolean; enteredAt:number; fallenAt:number; attackStarted:number; castUntil:number;
  skill:HeroSkill|null; skillCooldowns:Record<HeroSkill,number>; shieldUntil:number;
}
