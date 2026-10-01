import type { DamageType, Defenses } from './combat';
import type { MapId } from './maps';
export const ENEMY_KINDS=['goblin','runner','brute','ironclad','runeguard','marshling','hexer','gargoyle','alpha','bulwark','runecolossus','grom'] as const;
export type EnemyKind=typeof ENEMY_KINDS[number];
export type TargetPreference='keep'|'defense'|'economy';
export const TARGET_LABELS={keep:'突破要塞',defense:'摧毁防御建筑',economy:'掠夺生产据点'} as const;
export interface EnemyDefinition extends Defenses {
  rank?:'elite'|'boss'; base?:EnemyKind; scale?:number; flying?:boolean;name:string; title:string; description:string; counter:string; trait:string;
  hp:number;speed:number;damage:number;damageType:DamageType;interval:number;attackRange:number;
  reward:number;water:number;castleDamage:number;color:string;
  preference:TargetPreference; caution:number;
}
export const ENEMIES:Record<EnemyKind,EnemyDefinition>={
  gargoyle:{flying:true,preference:'keep',caution:0,name:'暮翼石像鬼',title:'空中突袭',description:'掠过山脊与工事的飞行魔物，直扑要塞。地面封锁对它不起作用。',counter:'箭塔、法师塔和魔力导弹井可以对空；普通炮塔、迫击炮与地面陷阱无法伤害它。',trait:'飞行 · 越过围墙与河流',hp:80,speed:1.05,damage:12,damageType:'physical',interval:1,attackRange:.85,armor:15,resistance:15,reward:10,water:1,castleDamage:8,color:'#8b98b5'},
  goblin:{preference:'keep',caution:0.15,name:'林地地精',title:'林间斥候',description:'从雾林成群出没的劫掠者。装备简陋，通常直奔要塞，依靠数量突破。',counter:'箭塔能高效清理；密集成群时，用法师塔的范围攻击。',trait:'无护甲 · 基础步兵',hp:66,speed:1.15,damage:12,damageType:'physical',interval:.9,attackRange:.85,armor:0,resistance:0,reward:5,water:.38,castleDamage:7,color:'#7d9e57'},
  runner:{preference:'keep',caution:0.9,name:'荒野疾行兵',title:'快速突袭',description:'披着兽皮的轻装掠夺者，奔跑迅速，会寻找火力薄弱处直奔要塞，涉水时也不易掉队。',counter:'用兵营拦住它，避免只依赖河流减速。',trait:'高速 · 涉水保留 65% 移速',hp:48,speed:1.75,damage:9,damageType:'physical',interval:.9,attackRange:.85,armor:0,resistance:10,reward:6,water:.65,castleDamage:7,color:'#bc8a50'},
  brute:{preference:'defense',caution:0,name:'破墙重兵',title:'攻城先锋',description:'拖着巨锤的高大兽人。行动迟缓，优先摧毁防御塔与兵营，不惧火力，也擅长拆除挡路的工事。',counter:'用法师塔削弱其轻甲，再以多座塔集中火力；不要只靠石墙拖延。',trait:'高生命 · 重锤破墙',hp:230,speed:.72,damage:32,damageType:'physical',interval:.9,attackRange:.85,armor:25,resistance:0,reward:14,water:.3,castleDamage:18,color:'#85836c'},
  ironclad:{preference:'defense',caution:0.1,name:'铁甲卫兵',title:'钢铁壁垒',description:'厚重铁盔与宽盾遮住全身，能抵挡大多数箭矢，优先逼近防御建筑，面对法术却毫无保护。',counter:'优先布置法师塔。箭塔与卫兵的物理攻击只能造成 40% 伤害。',trait:'高物防 · 缓慢推进',hp:145,speed:.85,damage:18,damageType:'physical',interval:1.1,attackRange:.85,armor:60,resistance:0,reward:11,water:.3,castleDamage:10,color:'#8396a1'},
  runeguard:{preference:'keep',caution:0.2,name:'符文卫士',title:'秘法克星',description:'紫晶符文吸收周围的魔力，以突破要塞为首要目标，但轻薄的护身甲并不能有效抵挡箭矢。',counter:'以箭塔和卫兵为主力，避免把法师塔的火力全部浪费在它身上。',trait:'高法抗 · 轻型护甲',hp:155,speed:1.0,damage:16,damageType:'physical',interval:1.0,attackRange:.85,armor:10,resistance:65,reward:12,water:.4,castleDamage:10,color:'#a586bd'},
  marshling:{preference:'economy',caution:0.8,name:'沼泽潜行者',title:'水道奇袭',description:'来自苔沼的两栖猎手。蹼足使它几乎不受水流阻碍，会绕开火力，优先掠夺麦田和矿场。',counter:'在生产据点、河岸与浅滩部署守军，别只守桥。用卫兵拦截，再用箭塔快速击杀。',trait:'两栖 · 涉水保留 90% 移速',hp:85,speed:1.4,damage:13,damageType:'physical',interval:.9,attackRange:.85,armor:10,resistance:15,reward:8,water:.9,castleDamage:8,color:'#4eaa97'},
  hexer:{preference:'defense',caution:0.6,name:'灰烬咒术师',title:'远程法术',description:'戴着骨面具的咒术师，优先以短程秘火轰击防御建筑，也会攻击拦路守卫。法袍耐受魔力，却挡不住箭矢。',counter:'箭塔优先覆盖它的施法位置。它能隔着一段距离攻击卫兵，物防无法减免秘火。',trait:'远程法伤 · 射程 2.6 格',hp:90,speed:.92,damage:18,damageType:'magic',interval:1.5,attackRange:2.6,armor:0,resistance:45,reward:12,water:.4,castleDamage:10,color:'#bf6e72'},
  alpha:{rank:'elite',base:'runner',scale:1.3,preference:'keep',caution:.95,name:'白鬃猎首',title:'精英 · 荒野猎群首领',description:'白鬃与赤红披肩标记着猎群首领。比普通疾行兵更强壮，双刃能迅速击倒薄弱守军，仍以突破要塞为首要目标。',counter:'用寒霜减速配合高阶兵营拦截，再由箭塔集中点杀。不要让它越过主防线。',trait:'精英 · 高速双刃 · 体型增大',hp:260,speed:1.72,damage:26,damageType:'physical',interval:.72,attackRange:.95,armor:20,resistance:20,reward:27,water:.65,castleDamage:16,color:'#d9dbce'},
  bulwark:{rank:'elite',base:'ironclad',scale:1.3,preference:'defense',caution:.05,name:'铁壁督军',title:'精英 · 重装攻城卫队',description:'铁甲卫兵的督军，披挂黑钢重甲，持厚重塔盾与钉锤。体型更宽大，优先拆毁防御建筑。',counter:'高物防但法抗很低，使用炎爆、奥术或雷电集中打击。不要只依赖箭矢和士兵硬扛。',trait:'精英 · 70% 物防 · 巨盾重甲',hp:490,speed:.69,damage:37,damageType:'physical',interval:1.2,attackRange:1.1,armor:70,resistance:10,reward:36,water:.32,castleDamage:22,color:'#687c91'},
  runecolossus:{rank:'elite',base:'runeguard',scale:1.3,preference:'keep',caution:.1,name:'紫晶巨卫',title:'精英 · 古代符文构装体',description:'由更庞大的紫晶核心驱动的符文卫士，层叠石甲与晶簇覆盖全身。它会顶着法术径直推进，用晶锤粉碎拦路守军。',counter:'75% 法抗会吸收大部分法术，优先使用鹰眼箭塔、炮塔与物理兵种。减速后集火更有效。',trait:'精英 · 75% 法抗 · 紫晶重锤',hp:560,speed:.8,damage:32,damageType:'physical',interval:1.15,attackRange:1.1,armor:20,resistance:75,reward:39,water:.4,castleDamage:24,color:'#ae7bdc'},
  grom:{rank:'boss',base:'brute',scale:2.1,preference:'keep',caution:0,name:'格罗姆',title:'碎冠者 · 风渡破城领主',description:'披挂碎冠与黑铁战甲的兽人攻城领主。重锤蓄势时，脚下会亮起范围预警；锤击震伤附近守军并重创工事。生命低于 40% 后进入狂怒。',counter:'看到橙红预警圈后，立刻把英雄移出范围。分散防御塔，用远程火力持续削血；寒霜可以拖慢推进，但眩晕对领主持续时间减半。',trait:'首领 · 裂地重锤 · 40% 生命狂怒',hp:3200,speed:.60,damage:68,damageType:'physical',interval:1.35,attackRange:1.7,armor:40,resistance:30,reward:160,water:.38,castleDamage:65,color:'#c58b45'},

};
export function isEnemyKind(value:unknown):value is EnemyKind{return typeof value==='string'&&(ENEMY_KINDS as readonly string[]).includes(value);}
// Each introduction wave includes its new specialist; mixed waves teach both counters.
export function waveEnemies(wave:number,map:MapId):EnemyKind[]{
  const specialist:Record<MapId,EnemyKind>={windford:'ironclad'};
  const compositions:EnemyKind[][]=[
    ['goblin','goblin','goblin','runner'],
    ['goblin','marshling','runner',specialist[map],'ironclad','goblin'],
    ['goblin','brute','runner','runeguard','marshling','goblin'],
    ['goblin','ironclad','hexer','runner','runeguard','marshling','goblin'],
    ['goblin','brute','ironclad','runeguard','hexer','marshling','runner'],
    ['runner','goblin','runner','marshling','runner','goblin','runner'],
    ['ironclad','ironclad','goblin','brute','ironclad','runner','goblin'],
    ['runeguard','runner','runeguard','goblin','hexer','runeguard','goblin'],
    ['gargoyle','gargoyle','runner','goblin','gargoyle','runeguard','gargoyle'],
    ['marshling','runner','marshling','goblin','marshling','hexer','runner'],
    ['brute','ironclad','goblin','brute','runeguard','hexer','ironclad'],
    ['hexer','runeguard','goblin','hexer','runner','runeguard','marshling'],
    ['gargoyle','ironclad','gargoyle','brute','runeguard','gargoyle','hexer'],
    ['goblin','runner','goblin','marshling','goblin','brute','gargoyle'],
    ['brute','ironclad','gargoyle','runeguard','hexer','marshling','runner','goblin'],
  ];
  const index=Math.max(0,Math.min(compositions.length-1,wave-1)),pool=compositions[index];
  const result=Array.from({length:12+index*4},(_,i)=>pool[i%pool.length]);if(wave===4||wave===5)result[result.length-1]='gargoyle';
  if(wave===7)result[result.length-1]='bulwark';
  if(wave===9)result[result.length-2]='alpha';
  if(wave===11)result[result.length-2]='runecolossus';
  if(wave===12)result[result.length-1]='alpha';
  if(wave>=13){result[result.length-3]='bulwark';result[result.length-2]='alpha';result[result.length-1]='runecolossus';}
  if(wave===15)result[12]='grom';
  return result;
}

export const BOSS_SLAM={radius:3.8,windup:1.6,cooldown:9.5,unitDamage:65,structureDamage:105,wallMultiplier:1.65} as const;

/** Shared simulation / presentation timing; never tied to wall-clock time. */
export const BOSS_ENTRANCE=4.4;
export const BOSS_IMPACTS={hammer:.5,body:1.55,pickup:2.45,gripped:2.95,warcry:3.675} as const;

export const BOSS_RAGE={duration:1.6,warcry:.45} as const;
