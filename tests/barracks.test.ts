import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/simulation/game';
import { BARRACKS_BRANCHES, SANCTUARY, soldierProfile, type BarracksBranch } from '../src/simulation/barracks';
import { unitModel, animateUnit, locomotionAmount } from '../src/render/units';
import { barracksBranchDialog, barracksDetails } from '../src/ui/barracks';
import { Box3, Group, Mesh } from 'three';
import { buildingModel } from '../src/render/world';
import { renderSanctuaries } from '../src/render/barracks-effects';

function setup(branch?:BarracksBranch){
  const g=new Game(false);for(const t of g.tiles)Object.assign(t,{h:1,active:true,water:false,chasm:false});
  g.resources.gold=2000;const b=g.addStructure('barracks',11,10);g.recruitSoldiers();
  if(branch){g.upgrade(b.id);g.upgrade(b.id,branch);}
  b.recruit=100;
  return {g,b,s:g.soldiers[0]};
}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('all barracks tiers wait fifteen seconds after a casualty and share a paused reinforcement queue',()=>{
  for(const tier of [1,2,'spellblade','paladin'] as const){
    const {g,b}=setup(typeof tier==='string'?tier:undefined);
    if(tier===2)assert.ok(g.upgrade(b.id));
    const capacity=tier===1?2:3;
    for(let i=0;i<5;i++){b.recruit=0;g.recruitSoldiers();}
    assert.equal(g.soldiers.length,capacity);
    const enemy=g.spawnEnemy('goblin',{x:2,z:2});enemy.speed=0;enemy.damage=0;g.phase='battle';
    const tick=(seconds:number)=>{for(let i=0;i<Math.round(seconds*30);i++)g.step(1/30);};
    tick(30);g.soldiers[0].hp=0;tick(1/30);
    assert.equal(g.soldiers.length,capacity-1);near(b.recruit,15);
    g.paused=true;g.step(30);near(b.recruit,15);g.paused=false;
    tick(5);g.soldiers[0].hp=0;tick(1/30);
    assert.equal(g.soldiers.length,capacity-2);assert.ok(b.recruit<10,'another casualty must not restart the queue');
    tick(9.8);assert.equal(g.soldiers.length,capacity-2,'no early replacement');
    tick(.3);assert.equal(g.soldiers.length,capacity-1);
    tick(14.7);assert.equal(g.soldiers.length,capacity-1);
    tick(.4);assert.equal(g.soldiers.length,capacity);
    tick(20);assert.equal(g.soldiers.length,capacity);
  }
});

test('barracks panels show the actual three-person branch cap and recruitment interval',()=>{
  for(const branch of ['spellblade','paladin'] as const){
    const {b}=setup(branch),html=barracksDetails(b);
    assert.match(html,/驻军编制<\/span><b>3 名/);
    assert.match(html,/战中补员间隔<\/span><b>15 秒 \/ 人/);
  }
  const dialog=barracksBranchDialog(1000);
  assert.equal((dialog.match(/编制 \/ 每人生命<\/dt><dd>3 人/g)??[]).length,2);
  assert.doesNotMatch(dialog,/训练 4 名/);
});

test('barracks upgrades are atomic and retrain survivors; reinforcements inherit either branch',()=>{
  for(const branch of Object.keys(BARRACKS_BRANCHES) as BarracksBranch[]){
    const {g,b,s}=setup();s.hp=s.maxHp*.4;
    assert.equal(g.upgrade(b.id,branch),false);assert.equal(b.level,1);
    assert.equal(g.upgrade(b.id),true);near(s.hp/s.maxHp,.4);assert.equal(s.level,2);
    const gold=g.resources.gold,max=s.maxHp;
    assert.equal(g.upgrade(b.id),false);assert.equal(g.upgrade(b.id,'arcane'),false);
    assert.equal(g.resources.gold,gold);assert.equal(s.maxHp,max);
    g.resources.gold=1;assert.equal(g.upgrade(b.id,branch),false);assert.equal(b.level,2);
    g.resources.gold=gold;assert.equal(g.upgrade(b.id,branch),true);
    assert.equal(g.resources.gold,gold-BARRACKS_BRANCHES[branch].cost.gold);
    assert.equal(b.barracksBranch,branch);assert.equal(s.branch,branch);near(s.hp/s.maxHp,.4);
    assert.equal(s.maxHp,soldierProfile(b).hp);
    for(let i=0;i<5;i++){b.recruit=0;g.recruitSoldiers();}
    assert.equal(g.soldiers.length,3);assert.ok(g.soldiers.every(u=>u.branch===branch&&u.armor===soldierProfile(b).armor));
    assert.equal(g.upgrade(b.id,branch==='paladin'?'spellblade':'paladin'),false);
  }
});

test('barracks branch choices show real costs and disable unaffordable options',()=>{
  const html=barracksBranchDialog(BARRACKS_BRANCHES.spellblade.cost.gold);
  assert.match(html,/data-branch="spellblade"\s+aria-label/);
  assert.match(html,/data-branch="paladin" disabled/);
  assert.ok(html.includes(`${BARRACKS_BRANCHES.spellblade.cost.gold} 金币`));assert.ok(html.includes(`${BARRACKS_BRANCHES.paladin.cost.gold} 金币`));
});

test('spellblades apply armor and resistance independently in melee',()=>{
  const {g,s}=setup('spellblade');Object.assign(s,{x:10,z:10,y:.9});
  const e=g.spawnEnemy('brute',{x:9.3,z:10});Object.assign(e,{speed:0,damage:0,armor:50,resistance:75,y:.9});
  g.phase='battle';g.step(.01);
  near(e.maxHp-e.hp,28*.5+20*.25);
  assert.ok(g.drainSounds().some(e=>e.kind==='spellblade-slash'));
});

test('spellblade ranged shots hit air targets at impact and cannot pass through cover',()=>{
  for(const wall of [false,true]){
    const {g,s}=setup('spellblade');Object.assign(s,{x:10,z:10,y:.9});
    const e=g.spawnEnemy('gargoyle',{x:8,z:10});Object.assign(e,{speed:0,damage:0});
    if(wall){g.tile(9,10)!.h=9;g.revision++;}
    g.phase='battle';g.step(.01);
    if(wall){assert.equal(g.shots.length,0);continue;}
    assert.equal(g.shots[0].hitSound,'spellblade-hit');assert.equal(e.hp,e.maxHp);
    assert.equal(s.state,'casting');g.step(.3);
    near(e.maxHp-e.hp,26*(1-e.resistance/100));
    assert.ok(g.drainSounds().some(e=>e.kind==='spellblade-hit'));
  }
});

test('paladins cast one shared sanctuary per barracks and pause freezes its clock',()=>{
  const {g,b,s}=setup('paladin');b.recruit=0;g.recruitSoldiers();s.hp=70;
  const e=g.spawnEnemy('brute',{x:s.x-2,z:s.z});Object.assign(e,{speed:0,damage:0});
  g.phase='battle';g.step(.01);
  assert.equal(g.sanctuaries.length,1);assert.equal(b.sanctuaryCooldown,SANCTUARY.cooldown);
  assert.equal(g.sanctuaryProtection(s),.25);
  const hp=s.hp;g.step(.1);near(s.hp-hp,1.2);
  const age=g.sanctuaries[0].time;g.paused=true;g.step(1);assert.equal(g.sanctuaries[0].time,age);
  g.paused=false;s.hp=0;g.step(.01);assert.equal(g.sanctuaries.length,0);
});

test('overlapping sanctuaries do not stack healing, reduction expires and dead troops stay dead',()=>{
  const {g,b,s}=setup('paladin');s.hp=80;s.castUntil=100;b.sanctuaryCooldown=100;
  const e=g.spawnEnemy('goblin',{x:2,z:2});e.speed=0;e.damage=0;
  const field={id:100,home:b.id,caster:s.id,x:s.x,y:s.y,z:s.z,time:0,duration:4,radius:2.6};
  g.sanctuaries=[{...field},{...field,id:101}];g.phase='battle';g.step(.1);
  near(s.hp,81.2);assert.equal(g.sanctuaryProtection(s),.25);
  g.sanctuaries.forEach(a=>a.time=3.95);g.step(.1);near(s.hp,81.8);
  assert.equal(g.sanctuaryProtection(s),0);assert.equal(g.sanctuaries.length,0);
});

test('idle recruits and blocked paths stay still, actual movement animates and pause freezes pose',()=>{
  const {g,s}=setup();const model=unitModel('soldier');model.userData.unitId=s.id;
  assert.equal(locomotionAmount(model,s,0),0);
  for(let i=0;i<20;i++){g.step(.05);const motion=locomotionAmount(model,s,g.time);animateUnit(model,g.time,motion,100);assert.equal(motion,0);}
  near(model.getObjectByName('leg-left')!.rotation.x,0);
  s.x+=.15;const amount=locomotionAmount(model,s,g.time+.1);assert.ok(amount>.5);
  animateUnit(model,g.time+.1,amount,100);const angle=model.getObjectByName('leg-left')!.rotation.x;
  assert.notEqual(angle,0);assert.equal(locomotionAmount(model,s,g.time+.1),amount);
  animateUnit(model,g.time+.1,amount,100);assert.equal(model.getObjectByName('leg-left')!.rotation.x,angle);
  for(let i=1;i<12;i++)locomotionAmount(model,s,g.time+.1+i*.05);
  assert.equal(locomotionAmount(model,s,g.time+.7),0);
  assert.equal(locomotionAmount(unitModel('soldier'),s,10),0,'model replacement starts at rest');
});

test('troop tiers and branches have distinct geometry, clone poses independently, and batch draw calls',()=>{
  const variants=[unitModel('soldier'),unitModel('soldier',2),unitModel('soldier',3,'spellblade'),unitModel('soldier',3,'paladin')];
  const signatures=variants.map(m=>{let vertices=0,draws=0;m.traverse(o=>{if(o instanceof Mesh){draws++;vertices+=o.geometry.getAttribute('position').count;}});assert.ok(draws<=9);assert.ok(new Box3().setFromObject(m).max.y>0);const positions:number[]=[];m.traverse(o=>{if(o instanceof Mesh)positions.push(...o.geometry.getAttribute('position').array);});return JSON.stringify(positions);});
  assert.equal(new Set(signatures).size,4);
  const a=unitModel('soldier'),b=unitModel('soldier');animateUnit(a,1,1,100);near(b.getObjectByName('leg-left')!.rotation.x,0);
  const buildings=['spellblade','paladin'].map(branch=>buildingModel('barracks',3,undefined,branch as BarracksBranch));
  const count=(g:Group)=>{let n=0;g.traverse(o=>{if(o instanceof Mesh)n+=o.geometry.getAttribute('position').count;});return n;};
  assert.notEqual(count(buildings[0]),count(buildings[1]));
  const field={id:1,home:2,caster:3,x:0,y:1,z:0,radius:2.6,time:0,duration:4};const one=new Group(),two=new Group();
  renderSanctuaries(one,[field],()=>1,0);renderSanctuaries(two,[field],()=>1,.1);
  assert.equal((one.children[0] as Mesh).geometry,(two.children[0] as Mesh).geometry);
  assert.equal((one.children[0] as Mesh).material,(two.children[0] as Mesh).material);
});

test('soldiers retaliate on a slope even when no old narrow melee slot fits',()=>{
  const {g,b,s}=setup();g.soldiers=[s];g.phase='battle';
  Object.assign(s,{x:10,z:10,y:g.ground(10,10)+.35,guard:{x:10,z:10}});
  g.tile(9,10)!.h=2;
  const e=g.spawnEnemy('goblin',{x:9.3,z:10});Object.assign(e,{speed:0,hp:1000,maxHp:1000,damage:1});
  for(let i=0;i<60;i++)g.step(1/30);
  assert.ok(e.hp<1000-soldierProfile(b).physical,'the soldier attacks repeatedly without waiting for a formation slot');
});
