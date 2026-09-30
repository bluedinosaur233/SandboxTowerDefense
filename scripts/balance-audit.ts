import {Game, type StructureKind} from '../src/simulation/game';
import {HERO} from '../src/heroes/roster';
import type {TowerBranch} from '../src/simulation/towers';
import type {BarracksBranch} from '../src/simulation/barracks';
import {pathToFileURL} from 'node:url';

/** Replays only legal player commands, with normal gold, damage, travel and recruitment. */
export function runInvestmentScenario(mode:'economy'|'keep'='economy'){
const g=new Game(true,'windford',HERO.id);
const sites=mode!=='keep';
const plans:{wave:number;kind:StructureKind;x:number;z:number;branch:TowerBranch|BarracksBranch}[]=[
  ...(sites?[{wave:1,kind:'archer' as const,x:34,z:40,branch:'ranger' as const},{wave:1,kind:'barracks' as const,x:35,z:40,branch:'spellblade' as const}]:[]),
  {wave:1,kind:'frost',x:58,z:44,branch:'blizzard'},
  {wave:2,kind:'mage',x:52,z:36,branch:'inferno'},
  {wave:2,kind:'archer',x:56,z:36,branch:'marksman'},
  {wave:7,kind:'cannon',x:59,z:46,branch:'shrapnel'},
  {wave:5,kind:'mage',x:56,z:47,branch:'inferno'},
  {wave:8,kind:'tesla',x:59,z:41,branch:'tempest'},
  {wave:4,kind:'barracks' as const,x:53,z:35,branch:'spellblade' as const},
  {wave:9,kind:'archer',x:50,z:40,branch:'ranger'},
  {wave:10,kind:'archer',x:56,z:43,branch:'ranger'},
  {wave:11,kind:'tesla',x:53,z:46,branch:'judgment'},
];
const rows=[];let spend=0;
for(let wave=1;wave<=15;wave++){
 const before=g.resources.gold;
 if(sites)for(const p of g.outposts)if(p.kind==='farm'&&(p.owned||wave<=10)&&(!p.owned||p.hp<p.maxHp))g.restoreOutpost(p.id);
 for(const plan of plans)if(plan.wave<=wave&&(plan.x>=40||g.outposts[0].owned)&&!g.structureAt(plan.x,plan.z))g.build(plan.kind,plan.x,plan.z);
 for(const s of [...g.structures].sort((a,b)=>Number(b.kind==='barracks')-Number(a.kind==='barracks'))){
   if(s.kind==='wall'||s.kind==='palisade')continue;
   if(s.hp<s.maxHp)g.repairStructure(s.id);
   if(wave<3)continue;
   const branch=plans.find(p=>p.x===s.x&&p.z===s.z)?.branch??(s.kind==='archer'?'ranger':s.kind==='mage'?'inferno':'spellblade');
   if(s.level===1)g.upgrade(s.id);
   if(wave>=4&&s.level===2)g.upgrade(s.id,branch);
 }
 if(sites&&wave>=6&&wave<=10)for(const p of g.outposts)g.upgradeOutpost(p.id);
 const used=before-g.resources.gold;spend+=used;const start=g.resources.gold,t=g.time;let combatSpent=0;
 g.commandHero(wave===3||wave===6||wave===8||wave===9?{x:58,z:45}:wave===2||wave===7||wave===13?{x:53,z:35}:{x:48,z:40});for(let i=0;i<360;i++)g.step(1/30);g.startWave();let frames=0;while(g.phase==='battle'&&frames++<9000){g.step(1/30);g.drainSounds();g.drainEncounters();
 if(frames%30===0&&g.phase==='battle'&&wave>=3){
  const b=g.resources.gold;
  for(const plan of plans)if(plan.wave<=wave&&(plan.x>=40||g.outposts[0].owned)&&!g.structureAt(plan.x,plan.z))g.build(plan.kind,plan.x,plan.z);
  for(const s of [...g.structures].sort((a,b)=>b.level-a.level)){
   if(s.kind==='wall'||s.kind==='palisade'||s.level>=3)continue;
   const branch=plans.find(p=>p.x===s.x&&p.z===s.z)?.branch??(s.kind==='archer'?'ranger':s.kind==='mage'?'inferno':'spellblade');
   if(g.canAfford(g.upgradeCost(s,s.level===2?branch:undefined)))g.upgrade(s.id,s.level===2?branch:undefined);
  }
  spend+=b-g.resources.gold;combatSpent+=b-g.resources.gold;
 }
 }
 const row={wave,hp:g.castleHp,phase:g.phase,gold:g.resources.gold,spent:used+combatSpent,income:g.resources.gold-start+combatSpent,sites:g.outposts.map(p=>`${p.owned?p.level:0}/${Math.round(p.hp)}`).join(' '),towers:g.structures.filter(s=>s.kind!=='wall'&&s.kind!=='palisade').length,seconds:Math.round(g.time-t)};
 rows.push(row);
 if(g.phase!=='preparation')break;
}
return {spend,rows};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 for(const mode of ['economy','keep'] as const){
  const result=runInvestmentScenario(mode);
  console.log(mode==='economy'?'保护据点 + 战中再投资':'集中守城 + 战中再投资');
  console.table(result.rows);
  console.log(`累计花费 ${result.spend} 金币`);
 }
}
