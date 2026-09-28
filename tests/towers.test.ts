import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Structure, type Enemy } from '../src/simulation/game';
import { BRANCHES, TOWER_KINDS, towerAttack, branchesFor, type TowerKind, type TowerBranch } from '../src/simulation/towers';
import { buildingModel } from '../src/render/world';
function flat(){const g=new Game(false);for(const t of g.tiles){t.h=1;t.active=true;t.water=false;t.bridge=false;t.chasm=false;}g.resources={gold:10000,wood:10000,stone:10000};return g;}
function tick(g:Game,time:number){for(let t=0;t<time-1e-9;t+=1/30)g.step(Math.min(1/30,time-t));}
function enemy(g:Game,x=12,z=10,kind:Enemy['kind']='goblin'){const e=g.spawnEnemy(kind);Object.assign(e,{x,z,y:.9,speed:0,damage:0,hp:2000,maxHp:2000});return e;}
function tower(g:Game,kind:TowerKind,branch?:TowerBranch){const t=g.addStructure(kind,10,10);if(branch){assert.ok(g.upgrade(t.id));assert.ok(g.upgrade(t.id,branch));}return t;}
function shoot(g:Game,t:Structure){g.phase='battle';g.step(1/30);t.cooldown=100;tick(g,.8);}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}

test('every attack tower has two exclusive tier-three branches and invalid upgrades never spend',()=>{
  for(const kind of TOWER_KINDS){
    const g=flat(),t=tower(g,kind),branches=branchesFor(kind);assert.equal(branches.length,2);
    const initial={...g.resources};assert.equal(g.upgrade(t.id,branches[0].id),false);assert.deepEqual(g.resources,initial);
    assert.equal(g.upgrade(t.id),true);const funds={...g.resources},revision=g.revision;
    assert.equal(g.upgrade(t.id),false);assert.deepEqual(g.resources,funds);assert.equal(g.revision,revision);
    const wrong=Object.values(BRANCHES).find(b=>b.kind!==kind)!.id;
    assert.equal(g.upgrade(t.id,wrong),false);assert.deepEqual(g.resources,funds);
    assert.equal(g.upgrade(t.id,branches[0].id),true);assert.equal(t.level,3);assert.equal(t.branch,branches[0].id);
    assert.equal(g.resources.gold,funds.gold-branches[0].cost.gold);const after={...g.resources};
    assert.equal(g.upgrade(t.id,branches[1].id),false);assert.deepEqual(g.resources,after);assert.equal(t.branch,branches[0].id);
  }
});
test('insufficient resources and completed battles prevent specialization atomically',()=>{
  const g=flat(),t=tower(g,'cannon');g.upgrade(t.id);g.resources={gold:1000,wood:0,stone:1000};
  const before={...g.resources},rev=g.revision;assert.equal(g.upgrade(t.id,'bombard'),false);assert.equal(t.level,2);assert.equal(t.branch,undefined);assert.deepEqual(g.resources,before);assert.equal(g.revision,rev);
  g.resources.wood=1000;g.phase='victory';assert.equal(g.upgrade(t.id,'bombard'),false);assert.equal(t.level,2);
});
test('cannon splash is physical, spherical, and explodes even after its original target dies',()=>{
  const g=flat(),t=tower(g,'cannon'),a=enemy(g,12,10,'ironclad'),b=enemy(g,12,11,'runeguard'),high=enemy(g,12,9);g.tile(12,9)!.h=20;high.y=g.ground(12,9)+.35;
  shoot(g,t);close(2000-a.hp,40*.4);close(2000-b.hp,40*.9);assert.equal(high.hp,2000);
  const h=flat(),c=tower(h,'cannon'),target=enemy(h,12,10),nearby=enemy(h,11.7,10);h.phase='battle';h.step(1/30);c.cooldown=100;target.hp=0;tick(h,.8);assert.ok(nearby.hp<2000);
});
test('frost slows movement, expires, and does not slow attack cooldowns',()=>{
  const g=flat(),t=tower(g,'frost'),e=enemy(g);shoot(g,t);assert.equal(e.slow,.3);e.speed=1;
  const x=e.x;tick(g,.3);assert.ok(e.x-x>.19&&e.x-x<.24);const before=e.cooldown;g.step(.1);close(e.cooldown,before-.1);
  tick(g,2.1);const restored=e.x;tick(g,.3);assert.ok(e.x-restored>.28);
});
test('frost areas hit multiple enemies while ice specialization briefly stops attacking and walking',()=>{
  const g=flat(),t=tower(g,'frost','blizzard'),a=enemy(g),b=enemy(g,12,11);shoot(g,t);assert.equal(a.slow,.45);assert.equal(b.slow,.45);
  const h=flat(),ice=tower(h,'frost','glacier'),victim=enemy(h);h.phase='battle';h.step(1/30);ice.cooldown=100;tick(h,.45);assert.ok((victim.stunUntil??0)>h.time);
  victim.speed=1;const x=victim.x;tick(h,.3);assert.equal(victim.x,x);h.paused=true;const time=h.time;tick(h,2);assert.equal(h.time,time);h.paused=false;tick(h,.9);assert.ok(victim.x>x);
});
test('lightning chains use unique victims, 3D jump range, and per-jump resistance',()=>{
  const g=flat(),t=tower(g,'tesla');const targets=[enemy(g,14,10),enemy(g,13,10,'runeguard'),enemy(g,12,10),enemy(g,11,10)];const high=enemy(g,13,9);g.tile(13,9)!.h=20;high.y=g.ground(13,9)+.35;
  shoot(g,t);close(2000-targets[0].hp,24);close(2000-targets[1].hp,24*.72*.35);close(2000-targets[2].hp,24*.72**2);assert.equal(targets[3].hp,2000);assert.equal(high.hp,2000);
  const h=flat(),storm=tower(h,'tesla','tempest');const crowd=Array.from({length:6},(_,i)=>enemy(h,14-i*.6,10));shoot(h,storm);assert.equal(crowd.filter(e=>e.hp<2000).length,5);
});
test('ranger shoots at three distinct enemies while marksman bypasses 35 armor points',()=>{
  const g=flat(),t=tower(g,'archer','ranger');const crowd=Array.from({length:4},(_,i)=>enemy(g,12+i*.3,10));shoot(g,t);assert.equal(crowd.filter(e=>e.hp<2000).length,3);crowd.filter(e=>e.hp<2000).forEach(e=>close(2000-e.hp,23));
  const h=flat(),sniper=tower(h,'archer','marksman'),e=enemy(h,15,10,'ironclad');shoot(h,sniper);close(2000-e.hp,65*.75);assert.equal(h.towerRange(sniper),9.4);
});
test('arcane bypasses resistance and removes mage splash; judgment replaces the chain with one hit',()=>{
  const g=flat(),t=tower(g,'mage','arcane'),a=enemy(g,12,10,'runeguard'),b=enemy(g,11.8,10);shoot(g,t);close(2000-a.hp,94*.7);assert.equal(b.hp,2000);
  const h=flat(),j=tower(h,'tesla','judgment'),x=enemy(h,12,10),y=enemy(h,11.8,10);h.phase='battle';h.step(1/30);j.cooldown=100;tick(h,.13);close(2000-x.hp,112);assert.equal(y.hp,2000);assert.ok((x.stunUntil??0)>h.time);
});
test('burn uses magic resistance and awards a kill once when damage over time finishes a target',()=>{
  const g=flat(),t=tower(g,'mage','inferno'),e=enemy(g,12,10,'runeguard');enemy(g,30,25);shoot(g,t);const hp=e.hp;tick(g,1);close(hp-e.hp,7*.35);
  e.hp=1;const kills=g.kills,gold=g.resources.gold;tick(g,1);assert.equal(g.kills,kills+1);assert.equal(g.resources.gold,gold+20);tick(g,2);assert.equal(g.kills,kills+1);
});
test('shrapnel reduces later physical hits without stacking, then armor returns',()=>{
  const g=flat(),t=tower(g,'cannon','shrapnel'),e=enemy(g,12,10,'ironclad');shoot(g,t);close(2000-e.hp,51*.4);assert.equal(g.enemyArmor(e),35);
  t.cooldown=0;shoot(g,t);assert.equal(g.enemyArmor(e),35);
  const archer=tower(g,'archer');const hp=e.hp;shoot(g,archer);close(hp-e.hp,18*.65);
  tick(g,4.1);assert.equal(g.enemyArmor(e),60);
});
test('all towers respect spherical elevation and branch attacks are snapshotted at launch',()=>{
  for(const kind of TOWER_KINDS){const g=flat(),t=tower(g,kind),e=enemy(g);e.y=50;g.phase='battle';g.step(1/30);assert.equal(g.shots.length,0);}
  const g=flat(),t=tower(g,'mage'),e=enemy(g);g.phase='battle';g.step(1/30);assert.equal(g.shots[0].attack.damage,36);g.upgrade(t.id);g.upgrade(t.id,'inferno');t.cooldown=100;tick(g,.5);close(2000-e.hp,36);assert.equal(e.burn,undefined);
});
test('all tower tiers and branches have distinct model geometry',()=>{
  for(const kind of TOWER_KINDS){
    const signature=(level:number,branch?:TowerBranch)=>{const g=buildingModel(kind,level,branch);g.updateMatrixWorld(true);const meshes:unknown[]=[];g.traverse(o=>{if((o as any).isMesh)meshes.push([o.matrixWorld.toArray(),(o as any).geometry.type,(o as any).material.color?.getHexString()]);});return JSON.stringify(meshes);};
    assert.notEqual(signature(1),signature(2));const branches=branchesFor(kind);assert.notEqual(signature(3,branches[0].id),signature(3,branches[1].id));
    for(const branch of branches)assert.equal(towerAttack({kind,level:3,branch:branch.id}).damageType,kind==='cannon'||kind==='archer'?'physical':'magic');
  }
});

test('frozen enemies cannot damage a blocking wall and resume attacks after thawing',()=>{
  const g=flat(),ice=tower(g,'frost','glacier'),e=enemy(g);
  g.phase='battle';g.step(1/30);ice.cooldown=100;tick(g,.45);
  const wall=g.addStructure('wall',13,10);e.x=12.2;e.damage=50;e.cooldown=0;
  e.path=[{x:13,z:10}];e.revision=g.revision;e.repath=10;
  const hp=wall.hp;tick(g,.3);assert.equal(wall.hp,hp);
  tick(g,.6);assert.ok(wall.hp<hp);
});
test('weaker slow never refreshes a stronger slow, but can apply again after expiry',()=>{
  const g=flat(),ice=tower(g,'frost','glacier'),e=enemy(g);shoot(g,ice);
  const expiry=e.slowUntil,weak=g.addStructure('frost',9,10);shoot(g,weak);
  assert.equal(e.slow,.55);assert.equal(e.slowUntil,expiry);
  tick(g,Math.max(0,expiry!-g.time)+.1);weak.cooldown=0;shoot(g,weak);
  assert.equal(e.slow,.3);assert.ok(e.slowUntil!>g.time);
});

test('projectiles follow a moving victim and retain the last known impact point after its death',()=>{
  const g=flat(),c=tower(g,'cannon'),e=enemy(g);e.speed=1;
  g.phase='battle';g.step(1/30);c.cooldown=100;const shot=g.shots[0],launchX=shot.to.x;
  tick(g,.2);assert.ok(shot.to.x>launchX);close(shot.to.x,e.x);
  const last={...shot.to};e.hp=0;const bystander=enemy(g,last.x,last.z);
  tick(g,.6);assert.deepEqual(shot.to,last);assert.ok(bystander.hp<2000);
});
