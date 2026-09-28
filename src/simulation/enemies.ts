import type { DamageType, Defenses } from './combat';
import type { MapId } from './maps';
export const ENEMY_KINDS=['goblin','runner','brute','ironclad','runeguard','marshling','hexer'] as const;
export type EnemyKind=typeof ENEMY_KINDS[number];
export interface EnemyDefinition extends Defenses {
  name:string; title:string; description:string; counter:string; trait:string;
  hp:number;speed:number;damage:number;damageType:DamageType;interval:number;attackRange:number;
  reward:number;water:number;castleDamage:number;color:string;
}
export const ENEMIES:Record<EnemyKind,EnemyDefinition>={
  goblin:{name:'林地地精',title:'林间斥候',description:'从雾林成群出没的劫掠者。装备简陋，数量是它们唯一的优势。',counter:'箭塔能高效清理；密集成群时，用法师塔的范围攻击。',trait:'无护甲 · 基础步兵',hp:66,speed:1.15,damage:12,damageType:'physical',interval:.9,attackRange:.85,armor:0,resistance:0,reward:9,water:.38,castleDamage:7,color:'#7d9e57'},
  runner:{name:'荒野疾行兵',title:'快速突袭',description:'披着兽皮的轻装掠夺者，奔跑迅速，涉水时也不易掉队。',counter:'用兵营拦住它，避免只依赖河流减速。',trait:'高速 · 涉水保留 65% 移速',hp:48,speed:1.75,damage:9,damageType:'physical',interval:.9,attackRange:.85,armor:0,resistance:10,reward:10,water:.65,castleDamage:7,color:'#bc8a50'},
  brute:{name:'破墙重兵',title:'攻城先锋',description:'拖着巨锤的高大兽人。行动迟缓，却能持续重创挡路的工事。',counter:'用法师塔削弱其轻甲，再以多座塔集中火力；不要只靠石墙拖延。',trait:'高生命 · 重锤破墙',hp:230,speed:.72,damage:32,damageType:'physical',interval:.9,attackRange:.85,armor:25,resistance:0,reward:24,water:.3,castleDamage:18,color:'#85836c'},
  ironclad:{name:'铁甲卫兵',title:'钢铁壁垒',description:'厚重铁盔与宽盾遮住全身，能抵挡大多数箭矢，面对法术却毫无保护。',counter:'优先布置法师塔。箭塔与卫兵的物理攻击只能造成 40% 伤害。',trait:'高物防 · 缓慢推进',hp:145,speed:.85,damage:18,damageType:'physical',interval:1.1,attackRange:.85,armor:60,resistance:0,reward:19,water:.3,castleDamage:10,color:'#8396a1'},
  runeguard:{name:'符文卫士',title:'秘法克星',description:'紫晶符文吸收周围的魔力，但轻薄的护身甲并不能有效抵挡箭矢。',counter:'以箭塔和卫兵为主力，避免把法师塔的火力全部浪费在它身上。',trait:'高法抗 · 轻型护甲',hp:155,speed:1.0,damage:16,damageType:'physical',interval:1.0,attackRange:.85,armor:10,resistance:65,reward:20,water:.4,castleDamage:10,color:'#a586bd'},
  marshling:{name:'沼泽潜行者',title:'水道奇袭',description:'来自苔沼的两栖猎手。蹼足使它几乎不受水流阻碍，常绕开桥头防线。',counter:'覆盖河岸与浅滩，别只守桥。用卫兵拦截，再用箭塔快速击杀。',trait:'两栖 · 涉水保留 90% 移速',hp:85,speed:1.4,damage:13,damageType:'physical',interval:.9,attackRange:.85,armor:10,resistance:15,reward:13,water:.9,castleDamage:8,color:'#4eaa97'},
  hexer:{name:'灰烬咒术师',title:'远程法术',description:'戴着骨面具的咒术师，以短程秘火灼伤守卫。法袍耐受魔力，却挡不住箭矢。',counter:'箭塔优先覆盖它的施法位置。它能隔着一段距离攻击卫兵，物防无法减免秘火。',trait:'远程法伤 · 射程 2.6 格',hp:90,speed:.92,damage:18,damageType:'magic',interval:1.5,attackRange:2.6,armor:0,resistance:45,reward:21,water:.4,castleDamage:10,color:'#bf6e72'},
};
export function isEnemyKind(value:unknown):value is EnemyKind{return typeof value==='string'&&(ENEMY_KINDS as readonly string[]).includes(value);}
// Each introduction wave includes its new specialist; mixed waves teach both counters.
export function waveEnemies(wave:number,map:MapId):EnemyKind[]{
  const specialist:Record<MapId,EnemyKind>={river:'marshling',mountain:'ironclad',canyon:'runner'};
  const compositions:EnemyKind[][]=[
    ['goblin','goblin','goblin','runner'],
    ['goblin','runner','goblin',specialist[map],'ironclad','goblin'],
    ['goblin','brute','runner','runeguard','marshling','goblin'],
    ['goblin','ironclad','hexer','runner','runeguard','marshling','goblin'],
    ['goblin','brute','ironclad','runeguard','hexer','marshling','runner'],
  ];
  const pool=compositions[Math.max(0,Math.min(4,wave-1))];
  return Array.from({length:8+wave*4},(_,i)=>pool[i%pool.length]);
}
