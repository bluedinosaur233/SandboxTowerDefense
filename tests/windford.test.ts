import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/simulation/game';
import { ENEMY_KINDS } from '../src/simulation/enemies';
import { MAP_LIST, makeTerrain } from '../src/simulation/maps';
import { STAGES, sampleContinent } from '../src/campaign/continent';

function finishWave(g:Game){
  for(let i=0;i<3000&&g.phase==='battle';i++){for(const e of g.enemies)e.hp=0;g.step(1/30);}
  assert.notEqual(g.phase,'battle');
}
test('Windford has fifteen complete wave briefings and distinct late-wave tower matchups',()=>{
  const g=new Game(false);
  assert.equal(g.totalWaves,15);
  assert.equal(g.map.waveBriefings.length,g.totalWaves);assert.equal(g.map.waveFronts.length,g.totalWaves);
  for(let wave=1;wave<=g.totalWaves;wave++){
    assert.ok(g.map.waveNames[wave-1]);assert.ok(g.map.waveBriefings[wave-1]);
    const plan=g.wavePlan(wave);assert.equal(plan.length,8+wave*4);
    for(const entry of plan){assert.ok(ENEMY_KINDS.includes(entry.kind));assert.ok(g.entrances[entry.entrance]);}
  }
  for(const [wave,kind] of [[6,'runner'],[7,'ironclad'],[8,'runeguard'],[9,'gargoyle'],[10,'marshling']] as const){
    const plan=g.wavePlan(wave);assert.ok(plan.filter(p=>p.kind===kind).length>=plan.length*.4);
  }
  assert.equal(new Set(g.wavePlan(15).map(p=>p.kind)).size,ENEMY_KINDS.length);
  assert.deepEqual(g.waveFronts(15),[0,1,2]);
});
test('Windford is the only playable stage and all three fronts reach the central keep',()=>{
  assert.deepEqual(MAP_LIST.map(m=>m.id),['windford']);assert.deepEqual(STAGES.map(s=>s.id),['windford']);
  assert.equal(sampleContinent(STAGES[0].x,STAGES[0].z).biome,'meadow');
  const g=new Game();assert.equal(g.tiles.length,100*80);assert.equal(g.entrances.length,3);
  for(const p of g.entrances)for(const kind of ENEMY_KINDS){const path=g.findPath(p,g.goal,kind);assert.ok(path.length>=20);assert.deepEqual(path.at(-1),g.goal);}
  assert.ok(Math.max(...g.tiles.map(t=>t.h))>=7);
  assert.equal(new Set(g.tiles.filter(t=>t.bridge).map(t=>t.z)).size,2);
  assert.deepEqual(g.tiles,makeTerrain());
});
test('each wave actually spawns at precisely its advertised fronts',()=>{
  for(let wave=1;wave<=MAP_LIST[0].waveNames.length;wave++){
    const g=new Game(false);g.wave=wave-1;const expected=g.waveFronts().map(i=>g.entrances[i].id),seen=new Set<string>();
    const spawn=g.spawnEnemy.bind(g);g.spawnEnemy=(kind,entry=g.spawn)=>{const front=g.entrances.find(p=>p.x===entry.x&&p.z===entry.z)!;seen.add(front.id);return spawn(kind,entry);};
    assert.ok(g.startWave());finishWave(g);assert.deepEqual([...seen].sort(),expected.sort());
  }
});
test('terrain editing cannot sever the secondary northern approach',()=>{
  const g=new Game(false),p=g.entrances[1];
  for(const [x,z] of [[p.x-1,p.z],[p.x+1,p.z],[p.x,p.z-1],[p.x-1,p.z+1],[p.x+1,p.z+1]])g.tile(x,z)!.active=false;
  const choke=g.tile(p.x,p.z+2)!,previous=g.tile(p.x,p.z+1)!;choke.h=previous.h+2;
  assert.ok(g.findPath(p).length);const resources={...g.resources};
  assert.equal(g.build('raise',choke.x,choke.z),false);assert.equal(choke.h,previous.h+2);assert.deepEqual(g.resources,resources);assert.ok(g.findPath(p).length);
});
test('restoration spends money atomically, reserves its footprint and never generates idle income',()=>{
  const g=new Game(false),post=g.outposts[0],before=g.resources.gold;
  g.resources.gold=post.cost-1;assert.equal(g.restoreOutpost(post.id),false);assert.equal(post.owned,false);
  g.resources.gold=before;assert.ok(g.restoreOutpost(post.id));assert.equal(g.resources.gold,before-post.cost);
  const paid=g.resources.gold;assert.equal(g.restoreOutpost(post.id),false);assert.equal(g.resources.gold,paid);
  assert.equal(g.build('dig',post.x,post.z),false);assert.equal(g.build('archer',post.x+1,post.z),false);
  g.step(120);assert.equal(g.resources.gold,paid);
  g.startWave();assert.equal(g.restoreOutpost(g.outposts[1].id),false);
});
test('production is paid exactly once per survived wave and resets on restart',()=>{
  const g=new Game(false),control=new Game(false),post=g.outposts[0];g.restoreOutpost(post.id);
  for(let wave=1;wave<=2;wave++){g.startWave();control.startWave();finishWave(g);finishWave(control);assert.equal(g.resources.gold-control.resources.gold,-post.cost+post.income*wave+4*(wave-1));const money=g.resources.gold;g.step(60);assert.equal(g.resources.gold,money);}
  assert.ok(new Game().outposts.every(p=>!p.owned&&p.hp===0));
});
test('enemies destroy exposed production, stop its payout, and it can be restored during preparation',()=>{
  const g=new Game(false),post=g.outposts[0];g.restoreOutpost(post.id);g.startWave();
  const e=g.spawnEnemy('marshling');Object.assign(e,{x:post.x-1.7,z:post.z,y:g.ground(post.x,post.z)+.35,speed:0});post.hp=1;
  g.step(1/30);assert.equal(post.owned,false);assert.equal(post.hp,0);assert.equal(post.eligible,false);
  assert.equal(g.restoreOutpost(post.id),false);finishWave(g);assert.ok(g.restoreOutpost(post.id));assert.equal(post.hp,post.maxHp);
});

test('a damaged operating site can be repaired for less than rebuilding, without spending twice',()=>{
  const g=new Game(false),post=g.outposts[0];g.restoreOutpost(post.id);post.hp=post.maxHp/2;
  const cost=g.outpostRepairCost(post),gold=g.resources.gold;assert.ok(cost>0&&cost<post.cost);
  assert.ok(g.restoreOutpost(post.id));assert.equal(g.resources.gold,gold-cost);assert.equal(post.hp,post.maxHp);
  assert.equal(g.restoreOutpost(post.id),false);assert.equal(g.resources.gold,gold-cost);
});
test('Windford opening five waves remain survivable with normal resources and investment',()=>{
  const g=new Game();
  const plans=[
    [{kind:'archer',x:35,z:39},{kind:'barracks',x:37,z:39},{kind:'frost',x:58,z:44}],
    [{kind:'mage',x:52,z:36},{kind:'archer',x:57,z:37}],
    [{kind:'cannon',x:58,z:47},{kind:'mage',x:55,z:47}],
    [{kind:'tesla',x:59,z:41}],[],
  ] as const;
  assert.ok(g.restoreOutpost('westfield'));
  for(let w=0;w<5;w++){
    for(const s of plans[w])assert.ok(g.build(s.kind,s.x,s.z),g.message);
    const farm=g.outposts[0];if(w&&farm.owned&&farm.hp<farm.maxHp)assert.ok(g.restoreOutpost(farm.id));
    if(w>=3)for(const s of g.structures.filter(s=>['mage','archer','cannon'].includes(s.kind)&&s.level===1))if(g.canAfford(g.upgradeCost(s)))assert.ok(g.upgrade(s.id));
    assert.ok(g.startWave());for(let i=0;i<6000&&g.phase==='battle';i++)g.step(1/30);
    assert.equal(g.phase,'preparation');assert.ok(g.castleHp>0);
    assert.ok(Object.values(g.resources).every(n=>n>=0));if(!w)assert.equal(farm.owned,true);
  }
  assert.ok(g.castleHp>0);assert.equal(g.wave,5);
});
test('Windford terrain uses a rounded irregular boundary and readable elevation bands',()=>{
  const g=new Game();
  const boundary=[] as {x:number;z:number}[];
  for(const t of g.tiles)if(t.active&&[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>!g.tile(t.x+dx,t.z+dz)?.active))boundary.push(t);
  assert.ok(boundary.length>0);
  const spans=new Set<number>();for(let z=5;z<75;z++){const row=g.tiles.filter(t=>t.active&&t.z===z);if(row.length)spans.add(row.at(-1)!.x-row[0].x);}
  assert.ok(spans.size>15);for(const [x,z]of [[1,1],[98,1],[1,78]])assert.equal(g.tile(x,z)!.active,false);
  assert.ok(Math.max(...g.tiles.map(t=>t.h))>=15);
  assert.ok(Math.min(...g.tiles.filter(t=>t.active&&!t.water).map(t=>t.h))<=5);
});
