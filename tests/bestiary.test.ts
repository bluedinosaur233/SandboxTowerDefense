import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, HEIGHT_UNIT } from '../src/simulation/game';
import { ENEMIES, ENEMY_KINDS, waveEnemies, type EnemyKind } from '../src/simulation/enemies';
import { damageAfterDefense } from '../src/simulation/combat';
import { readJournal, discover, readEntry } from '../src/bestiary/progress';
import { unitModel } from '../src/render/world';
import type { MapId } from '../src/simulation/maps';
function flat(){const g=new Game(false);for(const t of g.tiles){t.h=1;t.active=true;t.water=false;t.bridge=false;t.chasm=false;}return g;}
function enemy(g:Game,kind:EnemyKind,x=10,z=10){const e=g.spawnEnemy(kind);Object.assign(e,{x,z,y:HEIGHT_UNIT+.35,speed:0});return e;}
function near(actual:number,expected:number){assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);}

test('physical defense and magic resistance only mitigate their own damage channel',()=>{
  const defenses={armor:60,resistance:25};
  near(damageAfterDefense(100,'physical',defenses),40);near(damageAfterDefense(100,'magic',defenses),75);
  near(damageAfterDefense(100,'physical',{armor:0,resistance:90}),100);
  assert.equal(damageAfterDefense(-20,'magic',defenses),0);
  assert.equal(damageAfterDefense(100,'physical',{armor:150,resistance:0}),0);
});
test('arrow impacts use armor and magic splash applies each victim’s own resistance',()=>{
  const arrows=flat();arrows.phase='battle';arrows.addStructure('archer',8,10);const plated=enemy(arrows,'ironclad');
  arrows.step(1/30);arrows.step(.3);near(plated.maxHp-plated.hp,18*.4);
  const magic=flat();magic.phase='battle';magic.addStructure('mage',8,10);
  const a=enemy(magic,'ironclad'),b=enemy(magic,'runeguard',10,11);
  magic.step(1/30);magic.step(.5);near(a.maxHp-a.hp,36);near(b.maxHp-b.hp,36*.35);
});
test('soldier swords use physical defense while enemy spells use soldier resistance',()=>{
  const g=flat();g.addStructure('barracks',11,10);g.recruitSoldiers();const s=g.soldiers[0];s.x=10;s.z=10;s.y=.9;
  const e=enemy(g,'ironclad',9.3,10);e.damage=0;g.phase='battle';g.step(1/30);near(e.maxHp-e.hp,15*.4);
  const h=flat();h.addStructure('barracks',11,10);h.recruitSoldiers();const defender=h.soldiers[0];Object.assign(defender,{x:10,z:10,y:.9,armor:80,resistance:25});
  enemy(h,'hexer',8,10);h.phase='battle';h.step(1/30);near(defender.maxHp-defender.hp,18*.75);
  assert.ok(h.drainSounds().some(c=>c.kind==='cast'));
});
test('ranged spells cannot pass through a wall or elevated terrain',()=>{
  for(const obstacle of ['wall','cliff']){
    const g=flat();g.addStructure('barracks',11,10);g.recruitSoldiers();const s=g.soldiers[0];Object.assign(s,{x:10,z:10,y:.9});
    const e=enemy(g,'hexer',8,10);
    if(obstacle==='wall')g.addStructure('wall',9,10);else{g.tile(9,10)!.h=8;g.revision++;}
    g.phase='battle';g.step(1/30);assert.equal(s.hp,s.maxHp,obstacle);assert.notEqual(e.state,'attacking');
  }
});
test('attacks against buildings apply matching defense and path costs include mitigation',()=>{
  const g=flat();for(const t of g.tiles)t.active=t.z===16;
  const wall=g.addStructure('wall',4,16);const e=enemy(g,'hexer',3,16);e.speed=1;e.damageType='magic';g.phase='battle';g.step(.2);g.step(1/30);
  near(wall.maxHp-wall.hp,e.damage);
  const from=g.tile(3,16)!,to=g.tile(4,16)!;
  const armored=g.moveCost(from,to,'goblin');wall.armor=0;
  assert.ok(armored>g.moveCost(from,to,'goblin'));
});
test('all new enemy types have distinct models and participate in reachable campaign waves',()=>{
  const models=ENEMY_KINDS.map(kind=>{const model=unitModel(kind);assert.equal(model.userData.kind,kind);return JSON.stringify(model.children.map(c=>[c.position.toArray(),c.scale.toArray(),(c as any).material?.color?.getHexString()]));});
  assert.equal(new Set(models).size,ENEMY_KINDS.length);
  for(const map of ['river','mountain','canyon'] as MapId[]){
    const kinds=new Set<EnemyKind>();
    for(let wave=1;wave<=5;wave++){const troops=waveEnemies(wave,map);assert.equal(troops.length,8+wave*4);troops.forEach(k=>kinds.add(k));}
    assert.equal(kinds.size,ENEMY_KINDS.length);
    const g=new Game(false,map);for(const kind of kinds)assert.deepEqual(g.previewPath(kind).at(-1),g.goal);
  }
});
test('marshlings retain 90 percent movement in water',()=>{
  function distance(water:boolean){const g=flat();for(const t of g.tiles)t.active=t.z===16;g.tile(1,16)!.water=water;g.phase='battle';const e=g.spawnEnemy('marshling');g.step(.2);return e.x-1;}
  near(distance(true)/distance(false),.9);
});
test('encounter events survive fast kills and are emitted only once per kind per battle',()=>{
  const g=flat();g.spawnEnemy('ironclad');g.spawnEnemy('ironclad');const dead=g.spawnEnemy('hexer');dead.hp=0;
  g.phase='battle';g.step(1/30);assert.deepEqual(g.drainEncounters(),['ironclad','hexer']);assert.deepEqual(g.drainEncounters(),[]);
  g.spawnEnemy('hexer');assert.deepEqual(g.drainEncounters(),[]);
});
test('journal persists discoveries and pending intel without repeating known enemies',()=>{
  const journal=readJournal(null);assert.equal(discover(journal,'ironclad'),true);assert.equal(discover(journal,'hexer'),true);
  readEntry(journal,'ironclad');const restored=readJournal(JSON.stringify(journal));
  assert.deepEqual(restored,{known:['ironclad','hexer'],unread:['hexer']});assert.equal(discover(restored,'ironclad'),false);
  readEntry(restored,'goblin');assert.equal(restored.known.includes('goblin'),false,'browsing an entry does not count as encountering it');
});
test('journal tolerates corrupt, duplicate and obsolete saved data',()=>{
  assert.deepEqual(readJournal('{oops'),{known:[],unread:[]});
  assert.deepEqual(readJournal('{"known":["goblin","bad",1,"goblin"],"unread":["goblin","hexer","goblin"]}'),{known:['goblin'],unread:['goblin']});
});
test('bestiary baseline health and defenses agree with spawned units across all waves',()=>{
  for(const kind of ENEMY_KINDS)for(let wave=1;wave<=5;wave++){
    const g=flat();g.wave=wave;const e=g.spawnEnemy(kind),d=ENEMIES[kind];
    assert.equal(e.maxHp,Math.round(d.hp*(1+(wave-1)*.12)));assert.equal(e.armor,d.armor);assert.equal(e.resistance,d.resistance);assert.equal(e.damageType,d.damageType);
  }
});
