import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, COSTS } from '../src/simulation/game';
import { ECONOMY, deliveryGold } from '../src/simulation/economy';
import { ENEMIES } from '../src/simulation/enemies';
import { BRANCHES } from '../src/simulation/towers';
import { runInvestmentScenario } from '../scripts/balance-audit';

test('scripted investment preserves gold accounting through victory or defeat',()=>{
  const result=runInvestmentScenario(),last=result.rows.at(-1)!;
  // Combat balance changes can defeat this fixed strategy. Its economic contract
  // is conservation of earned/spent gold, not guaranteed victory with old tactics.
  assert.ok(last.phase==='victory'||last.phase==='defeat');
  assert.equal(last.phase==='victory'?last.wave:last.hp,last.phase==='victory'?15:0);
  let balance=ECONOMY.startingGold as number,spent=0;
  for(const [i,row] of result.rows.entries()){
    assert.equal(row.wave,i+1);assert.ok(row.gold>=0&&row.income>=0&&row.spent>=0);
    balance+=row.income-row.spent;spent+=row.spent;assert.equal(row.gold,balance);
  }
  assert.equal(result.spend,spent);
  assert.ok(last.gold<1500,`excess ${last.gold} after investing in defenses and estates`);
  assert.ok(result.rows.filter(row=>row.wave>=6&&row.wave<=14).every(row=>row.spent>0),'late waves must still require investment');
});

test('fifteen-wave income cannot fund the old runaway specialization budget',()=>{
  const g=new Game(false);
  const bounty=Array.from({length:g.totalWaves},(_,i)=>g.wavePlan(i+1).reduce((n,e)=>n+ENEMIES[e.kind].reward,0)).reduce((a,b)=>a+b,0);
  // Deliberately generous ceiling: free level-two estates before wave one,
  // every enemy killed, every delivery collected, no damage or lost streaks.
  const production=Array.from({length:g.totalWaves},(_,i)=>g.outposts.reduce((sum,p)=>sum+
    g.outpostHarvest({...p,level:2,streak:i})+deliveryGold({level:2})*ECONOMY.deliveriesPerWave,0)).reduce((a,b)=>a+b,0);
  const ceiling=g.resources.gold+bounty+production+ECONOMY.waveSupply*(g.totalWaves-1);
  assert.ok(ceiling>=11000&&ceiling<=13500,`perfect income ceiling ${ceiling}; old balance allowed 22244`);
  const maxProduction=g.outposts.reduce((sum,p)=>sum+g.outpostHarvest({...p,level:2,streak:3})+deliveryGold({level:2})*2,0);
  assert.ok(maxProduction<=250,'two estates must not pay for multiple branches every wave');
  for(const b of Object.values(BRANCHES)){
    const tower=g.addStructure(b.kind,40,40);
    const total=COSTS[b.kind].gold+g.upgradeCost(tower).gold+b.cost.gold;
    assert.ok(total>=330&&total<=550,`${b.name}: ${total}`);
    g.destroyStructure(tower.id);
  }
});

test('production investments need multiple protected waves to repay and remain worthwhile',()=>{
  const g=new Game(false);
  for(const p of g.outposts){
    const yieldAt=(level:number,streak:number)=>g.outpostHarvest({...p,level,streak})+deliveryGold({level})*ECONOMY.deliveriesPerWave;
    assert.ok(yieldAt(1,0)<p.cost,'rebuilding must not repay itself on its first wave');
    assert.ok(yieldAt(1,0)+yieldAt(1,1)>=p.cost,'protecting a base estate for two full waves repays restoration');
    const gain=yieldAt(2,3)-yieldAt(1,3),cost=g.outpostUpgradeCost(p);
    assert.ok(cost>gain*2&&cost<=gain*4,'expansion repays its extra investment in three or four waves');
  }
});

test('new specialization prices charge exactly once and cannot be recouped by demolition',()=>{
  const g=new Game(false);
  for(const t of g.tiles){t.active=true;t.h=1;t.water=false;t.bridge=false;t.chasm=false;}
  assert.ok(g.build('archer',40,40));const tower=g.structureAt(40,40)!;
  assert.ok(g.upgrade(tower.id));g.resources.gold=BRANCHES.ranger.cost.gold-1;
  assert.equal(g.upgrade(tower.id,'ranger'),false);assert.equal(tower.level,2);
  g.resources.gold++;assert.ok(g.upgrade(tower.id,'ranger'));assert.equal(g.resources.gold,0);
  assert.equal(g.upgrade(tower.id,'ranger'),false);
  assert.ok(g.build('remove',40,40));assert.equal(g.resources.gold,Math.floor(COSTS.archer.gold*.5));
});
