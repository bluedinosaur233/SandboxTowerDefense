import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/simulation/game';
import { HERO_STATS, HERO_SKILLS } from '../src/simulation/hero';

function arena(){
  const g=new Game(false,'windford','aerilia');
  for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,bridge:false,chasm:false,road:false,paved:false});
  Object.assign(g.hero!,{x:20,z:20,y:.9,enteredAt:-100,lastCombat:0,state:'idle',rally:{x:20,z:20}});
  return g;
}
function advance(g:Game,seconds:number){for(let t=0;t<seconds;t+=1/30)g.step(1/30);}

test('hero only joins equipped expeditions and moves in preparation without spending gold',()=>{
  assert.equal(new Game(false).hero,null);
  const g=arena(),h=g.hero!,gold=g.resources.gold;
  assert.ok(g.commandHero({x:25,z:20}));advance(g,3);
  assert.equal(h.x,25);assert.equal(h.z,20);assert.equal(h.destination,null);assert.equal(h.state,'idle');assert.equal(g.resources.gold,gold);
  g.paused=true;g.commandHero({x:30,z:20});advance(g,1);assert.equal(h.x,25);
});
test('hero routes around walls, rejects cliffs and reroutes when construction changes',()=>{
  const g=arena(),h=g.hero!;g.addStructure('wall',22,20);
  assert.ok(g.commandHero({x:25,z:20}));assert.ok(h.path.some(p=>p.z!==20));
  advance(g,.2);const next=h.path[1];g.addStructure('wall',next.x,next.z);
  for(let i=0;i<180;i++){g.step(1/30);assert.equal(g.structureAt(Math.round(h.x),Math.round(h.z)),undefined);}
  assert.equal(h.x,25);assert.equal(h.z,20);
  assert.equal(g.commandHero({x:22,z:20}),false);
  g.tile(27,20)!.h=20;assert.equal(g.commandHero({x:27,z:20}),false);
  assert.equal(g.commandHero({x:NaN,z:20}),false);
  assert.equal(g.build('wall',25,20),false);
});
test('ranged hero shoots physical arrows against ground and airborne enemies and awards kills once',()=>{
  for(const airborne of [false,true]){
    const g=arena(),h=g.hero!;g.phase='battle';const e=g.spawnEnemy('goblin',{x:24,z:20});e.airborne=airborne;e.speed=0;e.armor=50;e.hp=e.maxHp=100;
    if(airborne)e.y=h.y+2.5;
    g.step(.01);assert.equal(h.state,'ranged');assert.equal(g.shots.length,0);
    advance(g,.34);assert.equal(g.shots.length,1);
    advance(g,.34);assert.equal(e.hp,100-HERO_STATS.damage*.5);
    e.hp=1;h.cooldown=0;const gold=g.resources.gold;advance(g,.75);
    assert.equal(g.kills,1);assert.ok(g.resources.gold>gold);const rewarded=g.resources.gold;advance(g,1);assert.equal(g.kills,1);assert.equal(g.resources.gold,rewarded);
  }
});
test('hero cannot shoot through a high ridge or beyond three dimensional range',()=>{
  const g=arena();g.phase='battle';const e=g.spawnEnemy('goblin',{x:24,z:20});e.speed=0;
  g.tile(22,20)!.h=12;g.step(.1);assert.equal(g.shots.length,0);
  g.tile(22,20)!.h=1;e.y=20;g.step(.1);assert.equal(g.shots.length,0);
});
test('close enemies trigger rapier and retaliation; move orders interrupt combat',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';const e=g.spawnEnemy('goblin',{x:20.6,z:20});e.hp=e.maxHp=500;e.armor=25;e.speed=0;
  g.step(.1);assert.equal(h.state,'melee');assert.equal(e.hp,500-HERO_STATS.meleeDamage*.75);assert.ok(h.hp<h.maxHp);
  assert.ok(g.commandHero({x:17,z:20}));advance(g,1);assert.ok(h.x<18);assert.equal(e.hp,500-HERO_STATS.meleeDamage*.75);
});
test('hero dies, stops blocking and revives at the keep after countdown; pause freezes respawn',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';const e=g.spawnEnemy('goblin',{x:20.5,z:20});e.hp=500;e.damage=1000;
  g.step(.1);assert.equal(h.state,'fallen');assert.equal(h.hp,0);assert.equal(g.commandHero({x:25,z:20}),false);
  g.paused=true;advance(g,3);assert.equal(h.respawnIn,HERO_STATS.respawn);
  g.paused=false;g.enemies=[];g.phase='preparation';advance(g,HERO_STATS.respawn+2);
  assert.equal(h.state,'idle');assert.equal(h.hp,h.maxHp);assert.ok(Math.hypot(h.x-g.goal.x,h.z-g.goal.z)<5);
});
test('hero regenerates only after disengaging for five seconds',()=>{
  const g=arena(),h=g.hero!;h.hp=100;h.lastCombat=g.time;advance(g,4);assert.equal(h.hp,100);advance(g,2);assert.ok(h.hp>100);
});

test('hero walks around the castle and cancels a destination occupied by a new tower',()=>{
  const g=arena(),h=g.hero!;Object.assign(h,{x:g.goal.x-2,z:g.goal.z-2,y:g.ground(g.goal.x-2,g.goal.z-2)+.35});
  assert.ok(g.commandHero({x:g.goal.x+2,z:g.goal.z+2}));
  assert.ok(h.path.every(p=>Math.hypot(p.x-g.goal.x,p.z-g.goal.z)>=2.2));
  const destination=h.destination!;g.addStructure('archer',destination.x,destination.z);g.step(.1);
  assert.equal(h.destination,null);assert.equal(h.state,'idle');
});

test('a stationary hero blocks one melee enemy rather than freezing the entire crowd',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';
  for(const x of [19.5,20.5]){const e=g.spawnEnemy('goblin',{x,z:20});e.hp=e.maxHp=500;}
  g.step(.1);assert.equal(g.enemies.filter(e=>e.state==='attacking').length,1);assert.ok(h.hp<h.maxHp);
});

test('short movement follows a straight diagonal instead of alternating grid axes',()=>{
  const g=arena(),h=g.hero!;g.commandHero({x:23,z:23});
  for(let i=0;i<10;i++){g.step(1/30);assert.ok(Math.abs((h.x-20)-(h.z-20))<.001);}
  assert.ok(h.x>20.5&&h.z>20.5);assert.equal(h.flying,false);
});
test('long movement flies across an unbridged canyon, pauses, and lands on the target',()=>{
  const g=arena(),h=g.hero!;
  for(let z=0;z<80;z++)g.tile(24,z)!.chasm=true;
  assert.ok(g.commandHero({x:30,z:20}));g.step(.2);assert.equal(h.flying,true);assert.ok(h.y>.9);
  const pos={x:h.x,y:h.y};g.paused=true;advance(g,1);assert.equal(h.x,pos.x);assert.equal(h.y,pos.y);
  g.paused=false;advance(g,5);assert.equal(h.x,30);assert.equal(h.z,20);assert.equal(h.flying,false);assert.equal(h.destination,null);assert.ok(Math.abs(h.y-.9)<.001);
});
test('flight finds another landing site if a building occupies its destination',()=>{
  const g=arena(),h=g.hero!;g.commandHero({x:31,z:20});advance(g,.5);g.addStructure('wall',31,20);advance(g,6);
  assert.equal(h.flying,false);assert.equal(g.structureAt(Math.round(h.x),Math.round(h.z)),undefined);assert.equal(h.destination,null);
});

test('flight climbs above a ridge before crossing it',()=>{
  const g=arena(),h=g.hero!;g.tile(24,20)!.h=12;g.addStructure('archer',24,20);g.commandHero({x:30,z:20});
  let crossed=false;
  for(let i=0;i<240;i++){g.step(1/30);if(Math.round(h.x)===24){crossed=true;assert.ok(h.y>g.ground(24,20)+3.5);}}
  assert.ok(crossed);assert.equal(h.destination,null);assert.equal(h.flying,false);
});
test('hero proactively intercepts near enemies, keeps melee spacing and returns to rally',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';const e=g.spawnEnemy('brute',{x:22.5,z:20});e.speed=0;e.hp=1000;
  advance(g,.6);assert.ok(h.x>21);assert.ok(Math.hypot(h.x-e.x,h.z-e.z)>.65);assert.equal(h.rally.x,20);
  g.enemies=[];g.phase='preparation';advance(g,2);assert.ok(Math.abs(h.x-20)<.05);
  g.phase='battle';g.spawnEnemy('brute',{x:22,z:20});g.commandHero({x:17,z:20});advance(g,1);assert.ok(h.x<18,'manual retreat wins over automatic interception');
});
test('piercing arrow damages aligned armored enemies once and respects its cooldown',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';h.skillCooldowns.piercing=0;
  const targets=[24,26].map(x=>{const e=g.spawnEnemy('brute',{x,z:20});e.speed=0;e.hp=e.maxHp=1000;e.armor=50;return e;});
  g.step(.01);assert.equal(h.skill,'piercing');assert.equal(h.skillCooldowns.piercing,HERO_SKILLS.piercing.cooldown);
  advance(g,.3);assert.deepEqual(targets.map(e=>e.hp),[923.5,923.5]);
  advance(g,.3);assert.deepEqual(targets.map(e=>e.hp),[923.5,923.5]);
  g.paused=true;const cd=h.skillCooldowns.piercing;advance(g,1);assert.equal(h.skillCooldowns.piercing,cd);
});
test('arrow rain strikes six times with magic resistance and a slow',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';h.skillCooldowns={piercing:100,rain:0,gale:100};
  const targets=[24,24.5,25].map(x=>{const e=g.spawnEnemy('brute',{x,z:20});e.speed=0;e.hp=e.maxHp=1000;e.resistance=50;return e;});
  g.step(.01);assert.equal(h.skill,'rain');h.cooldown=100;advance(g,2.3);
  assert.deepEqual(targets.map(e=>e.hp),[946,946,946]);assert.ok(targets.every(e=>e.slow===.4&&(e.slowUntil??0)>g.time));
});
test('windstorm stuns nearby enemies and halves damage during its shield window',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';h.skillCooldowns={piercing:100,rain:100,gale:0};
  const targets=[20.5,19.5].map(x=>{const e=g.spawnEnemy('goblin',{x,z:20});e.speed=0;e.hp=e.maxHp=1000;e.resistance=20;e.damage=20;return e;});
  g.step(.01);assert.equal(h.skill,'gale');assert.equal(h.hp,312);advance(g,.25);
  assert.deepEqual(targets.map(e=>e.hp),[948,948]);assert.ok(targets.every(e=>(e.stunUntil??0)>g.time));assert.ok(h.shieldUntil>g.time);
});
test('entry finishes in preparation and defeat records a final pose',()=>{
  const g=new Game(false,'windford','aerilia'),h=g.hero!;assert.equal(h.state,'entering');advance(g,1.3);assert.equal(h.state,'idle');
  g.phase='battle';g.castleHp=0;g.step(.1);assert.equal(g.phase,'defeat');assert.equal(h.state,'fallen');assert.equal(h.fallenAt,g.time);
});

test('a stowed bow must be retrieved before ordinary shots or piercing skills; pause freezes retrieval',()=>{
  for(const skill of [false,true]){
    const g=arena(),h=g.hero!;h.lastCombat=-100;g.phase='battle';g.heroEffects=[];
    h.skillCooldowns={piercing:skill?0:100,rain:100,gale:100};
    const enemy=g.spawnEnemy('brute',{x:24,z:20});enemy.speed=0;enemy.hp=1000;
    g.step(.01);assert.equal(h.state,'idle');assert.equal(h.pendingArrow,undefined);assert.equal(g.heroEffects.length,0);
    g.paused=true;advance(g,1);assert.equal(g.time,.01);g.paused=false;
    advance(g,.3);assert.equal(h.pendingArrow,undefined);assert.equal(g.heroEffects.length,0);
    advance(g,.12);assert.equal(h.state,skill?'casting':'ranged');
    if(skill)assert.equal(h.skill,'piercing');else assert.ok(h.pendingArrow);
    assert.equal(g.soundEvents.filter(e=>e.kind==='hero-arrow').length,0);
  }
});

test('hero retaliates on a one-step slope instead of endlessly reacquiring an intercept point',()=>{
  const g=arena(),h=g.hero!;g.phase='battle';g.tile(21,20)!.h=2;
  Object.assign(h,{x:19.9,z:20,y:g.ground(19.9,20)+.35,rally:{x:19.9,z:20},skillCooldowns:{piercing:100,rain:100,gale:100}});
  const e=g.spawnEnemy('goblin',{x:21,z:20});Object.assign(e,{hp:2000,maxHp:2000,speed:0,damage:1});
  advance(g,2);
  assert.ok(e.hp<2000-HERO_STATS.meleeDamage,'repeated melee attacks must occur even with height difference');
  assert.ok(h.hp<h.maxHp,'the enemy is close enough to retaliate');
});
