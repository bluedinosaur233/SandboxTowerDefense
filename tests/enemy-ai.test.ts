import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, distance3 } from '../src/simulation/game';
import { ENEMIES, type EnemyKind } from '../src/simulation/enemies';
import { EncounterTracker, discover, readJournal } from '../src/bestiary/progress';
import { scoutGroups } from '../src/ui/scouting';

function flat(){const g=new Game(false);for(const t of g.tiles){t.active=true;t.h=1;t.water=false;t.bridge=false;t.road=false;}Object.assign(g.goal,{x:35,z:10});return g;}
test('individual enemies choose keep, defense and economy targets, then retarget after loss',()=>{
  const g=flat(),tower=g.addStructure('archer',17,10),post=g.outposts[0];Object.assign(post,{x:20,z:16,owned:true,hp:post.maxHp});
  const units=['goblin','runner','brute','marshling','hexer'].map(k=>g.spawnEnemy(k as EnemyKind,{x:4,z:10}));g.phase='battle';g.step(1/30);
  assert.deepEqual(units.map(e=>e.objective?.type),['keep','keep','defense','economy','defense']);
  assert.deepEqual(units[2].objective,{type:'defense',id:tower.id});assert.deepEqual(units[3].objective,{type:'economy',id:post.id});
  g.destroyStructure(tower.id);post.owned=false;g.step(1/30);
  assert.ok(units.every(e=>e.objective?.type==='keep'));assert.ok(units.every(e=>g.enemyTarget(e)?.point===g.goal));
});
test('a keep attacker passes a nearby farm while a raider damages it',()=>{
  const g=flat(),post=g.outposts[0];Object.assign(post,{x:10,z:10,owned:true,hp:post.maxHp});g.phase='battle';
  const runner=g.spawnEnemy('runner',{x:8,z:10});g.step(.1);assert.equal(post.hp,post.maxHp);assert.equal(runner.objective?.type,'keep');
  const raider=g.spawnEnemy('marshling',{x:8,z:10});g.step(.1);assert.equal(raider.objective?.type,'economy');assert.ok(post.hp<post.maxHp);
});
test('unreachable preferred targets fall back to the keep without freezing',()=>{
  const g=flat(),post=g.outposts[0];Object.assign(post,{x:15,z:20,owned:true,hp:post.maxHp});
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])g.tile(post.x+dx,post.z+dz)!.h=10;
  const e=g.spawnEnemy('marshling',{x:4,z:10});g.phase='battle';g.step(.2);assert.equal(e.objective?.type,'keep');assert.ok(e.path.length);assert.ok(e.x>4);
});
test('cautious runners avoid tower coverage more than siege troops and retain stable individual routes',()=>{
  const g=flat(),tower=g.addStructure('archer',16,10),start={x:4,z:10},end={x:29,z:10};
  const runner=g.spawnEnemy('runner',start),brute=g.spawnEnemy('brute',start);
  const runnerPath=g.findPath(start,end,'runner',false,undefined,runner),brutePath=g.findPath(start,end,'brute',false,undefined,brute);
  const danger=(path:{x:number;z:number}[])=>path.filter(p=>distance3(g.muzzle(tower),{...p,y:.9})<=g.towerRange(tower)).length;
  assert.ok(danger(runnerPath)<danger(brutePath));assert.deepEqual(g.findPath(start,end,'runner',false,undefined,runner),runnerPath);
});
test('scouting hides undiscovered identities and matches every actual spawn by front',()=>{
  const totalWaves=new Game(false).totalWaves;
  for(let wave=1;wave<=totalWaves;wave++){
    const g=new Game(false);g.wave=wave-1;const expected=g.wavePlan();
    for(const i of g.waveFronts()){
      const hidden=scoutGroups(expected,i,()=>false);assert.equal(hidden.length,1);assert.equal(hidden[0].kind,null);
      assert.equal(hidden[0].count,expected.filter(p=>p.entrance===i).length);
      const visible=scoutGroups(expected,i,k=>k==='goblin');assert.ok(visible.every(p=>p.kind===null||p.kind==='goblin'));
    }
    const seen:{kind:EnemyKind;entrance:number}[]=[],spawn=g.spawnEnemy.bind(g);
    g.spawnEnemy=(kind,p=g.spawn)=>{seen.push({kind,entrance:g.entrances.findIndex(e=>e===p)});return spawn(kind,p);};
    g.startWave();for(let i=0;i<2000&&g.phase==='battle';i++){for(const e of g.enemies)e.hp=0;g.step(1/30);}assert.deepEqual(seen,expected);
  }
});
test('first-encounter alerts repeat on replay while the permanent journal stays learned',()=>{
  const journal=readJournal(null),alerts=new EncounterTracker();
  for(let run=0;run<2;run++){
    alerts.reset();const g=new Game(false);g.spawnEnemy('goblin');g.spawnEnemy('goblin');
    for(const kind of g.drainEncounters()){discover(journal,kind);assert.ok(alerts.record(kind));}
    assert.deepEqual(alerts.unread,['goblin']);alerts.read('goblin');assert.deepEqual(alerts.unread,[]);
    g.spawnEnemy('goblin');assert.deepEqual(g.drainEncounters(),[]);assert.equal(alerts.record('goblin'),false);
  }
  assert.deepEqual(journal.known,['goblin']);
});
test('expanded approaches leave at least 25 tiles between every spawn and production',()=>{
  const g=new Game();for(const entry of g.entrances)for(const post of g.outposts)assert.ok(Math.hypot(entry.x-post.x,entry.z-post.z)>=25);
});
test('shipments have a per-wave cap, pause correctly, and upgraded production has real stakes',()=>{
  const g=new Game(false),p=g.outposts[0];assert.ok(g.restoreOutpost(p.id));const gold=g.resources.gold;
  assert.ok(g.upgradeOutpost(p.id));assert.equal(g.resources.gold,gold-g.outpostUpgradeCost(p));assert.equal(p.level,2);assert.equal(p.hp,p.maxHp);
  assert.equal(g.upgradeOutpost(p.id),false);g.startWave();const sentinel=g.spawnEnemy('goblin');sentinel.speed=0;
  const tick=(seconds:number)=>{for(let i=0;i<seconds*30;i++){for(const e of g.enemies)if(e!==sentinel)e.hp=0;g.step(1/30);}};
  tick(35);assert.equal(p.deliveries,2);assert.equal(p.waveGold,36);const after=g.resources.gold;tick(40);assert.equal(g.resources.gold,after);
  g.paused=true;g.step(60);assert.equal(g.resources.gold,after);g.paused=false;
  p.streak=3;p.hp=1;const raider=g.spawnEnemy('marshling',{x:p.x-2,z:p.z});g.step(1/30);
  assert.equal(p.owned,false);assert.equal(p.level,1);assert.equal(p.streak,0);assert.equal(p.eligible,false);assert.equal(p.waveGold,36);
  sentinel.hp=0;raider.hp=0;g.step(1/30);assert.equal(g.harvestReport?.sites[0].bonus,0);assert.equal(g.harvestReport?.sites[0].lost,true);
});

test('excessive wall detours become a direct breach and enemies actually attack the barrier',()=>{
  const g=flat(),start={x:10,z:20},end={x:20,z:20};Object.assign(g.goal,end);
  for(let z=5;z<=35;z++){const wall=g.addStructure('wall',15,z);wall.hp=wall.maxHp=10000;}
  const e=g.spawnEnemy('goblin',start),path=g.findPath(start,end,e.kind,false,undefined,e);
  assert.equal(path.length,10);assert.ok(path.some(p=>p.x===15&&p.z===20));
  g.phase='battle';for(let i=0;i<240;i++)g.step(1/30);
  assert.ok(g.structureAt(15,20)!.hp<10000,'a direct route must damage, not pass through, the wall');
  assert.ok(e.x<15);
});
test('detour limits allow necessary mountain passes and never cross a cliff or chasm',()=>{
  const g=flat(),start={x:10,z:20},end={x:20,z:20};
  for(let z=5;z<=35;z++){g.tile(15,z)!.h=12;g.tile(16,z)!.chasm=true;}
  const e=g.spawnEnemy('runner',start),path=g.findPath(start,end,e.kind,false,undefined,e);
  assert.ok(path.length>40);assert.deepEqual(path.at(-1),end);
  let previous=g.tile(start.x,start.z)!;
  for(const p of path){const tile=g.tile(p.x,p.z)!;assert.ok(Number.isFinite(g.moveCost(previous,tile,e.kind)));previous=tile;}
});
test('enemies wade directly when the dry crossing is too far away',()=>{
  const g=flat(),start={x:10,z:20},end={x:25,z:20};
  for(let x=13;x<=22;x++)for(let z=15;z<=25;z++)g.tile(x,z)!.water=true;
  const path=g.findPath(start,end,'goblin');assert.equal(path.length,15);assert.ok(path.some(p=>g.tile(p.x,p.z)!.water));
});
test('the keep has open deployment ground with woodland remaining on the outskirts',()=>{
  const g=new Game(false),trees=g.tiles.filter(t=>t.active&&t.decoration===1);
  assert.ok(trees.length>100,'outer forests remain part of the valley');
  assert.ok(trees.every(t=>Math.hypot(t.x-g.goal.x,t.z-g.goal.z)>9));
  assert.ok(trees.every(t=>g.outposts.every(p=>Math.hypot(t.x-p.x,t.z-p.z)>4)));
});
