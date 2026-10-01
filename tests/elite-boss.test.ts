import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Game } from '../src/simulation/game';
import { ENEMIES, waveEnemies, BOSS_SLAM, BOSS_ENTRANCE } from '../src/simulation/enemies';
import { unitModel } from '../src/render/units';
import { BossWarning, BossPresence, animateBoss, bossArrivalPose } from '../src/render/boss-effects';
import { createElfModel } from '../src/heroes/model';
import { HERO_SHOT } from '../src/simulation/hero';
import { SOUND_LIBRARY } from '../src/ui/sound-library';
import { LICENSED_SOUNDS } from '../src/ui/licensed-sounds';
import { BossEntrance, bossEntranceFrame } from '../src/render/boss-entrance';
import type { World } from '../src/render/world';

function arena(hero=false){
 const g=new Game(false,'windford',hero?'aerilia':null);
 for(const tile of g.tiles)Object.assign(tile,{active:true,h:1,water:false,chasm:false,spikes:false,bridge:false,paved:false});
 g.phase='battle';if(g.hero)Object.assign(g.hero,{x:20,y:.9,z:20,enteredAt:-100,lastCombat:0,rally:{x:20,z:20},state:'idle',skillCooldowns:{piercing:100,rain:100,gale:100}});
 return g;
}
function advance(g:Game,duration:number){for(let t=0;t<duration-1e-7;t+=.02)g.step(Math.min(.02,duration-t));}
test('three elite upgrades have stronger stats and visibly larger distinct geometry; final wave has one boss',()=>{
 for(const kind of ['alpha','bulwark','runecolossus'] as const){const def=ENEMIES[kind],base=ENEMIES[def.base!];assert.ok(def.hp>base.hp);assert.equal(def.rank,'elite');
 const original=new THREE.Box3().setFromObject(unitModel(def.base!)),upgraded=new THREE.Box3().setFromObject(unitModel(kind));assert.ok(upgraded.max.y>original.max.y*1.15);}
 assert.equal(waveEnemies(15,'windford').filter(k=>k==='grom').length,1);
 for(let w=1;w<15;w++)assert.equal(waveEnemies(w,'windford').includes('grom'),false);
});
test('boss locks warning location, lands one timed hit, and can be stunned out of the windup',()=>{
 const g=arena(),b=g.spawnEnemy('grom',{x:20,z:20}),wall=g.addStructure('wall',22,20);b.boss!.spawnedAt=-10;b.speed=0;b.boss!.cooldown=0;b.cooldown=100;
 const hp=wall.hp;g.step(.02);assert.ok(b.boss!.center);const center={...b.boss!.center!};assert.equal(wall.hp,hp);
 const fx=new BossWarning();fx.update(g);assert.equal(fx.group.visible,true);assert.ok(fx.group.children.length===2);
 g.paused=true;advance(g,2);assert.equal(wall.hp,hp);assert.deepEqual(b.boss!.center,center);g.paused=false;
 advance(g,BOSS_SLAM.windup-.04);assert.equal(wall.hp,hp);
 advance(g,.06);assert.ok(wall.hp<hp);const hitHp=wall.hp;advance(g,.3);assert.equal(wall.hp,hitHp);
 fx.update(g);assert.equal(fx.group.visible,false);
 assert.equal(g.soundEvents.filter(s=>s.kind==='boss-slam').length,1);
 b.boss!.cooldown=0;g.step(.02);assert.ok(b.boss!.center);b.stunUntil=g.time+2;g.step(.02);assert.equal(b.boss!.center,null);advance(g,1.7);assert.equal(wall.hp,hitHp);
});
test('moving out of a boss warning avoids its damage, rage applies once, and a dead boss cannot slam',()=>{
 const g=arena(true),h=g.hero!,b=g.spawnEnemy('grom',{x:22,z:20});b.boss!.spawnedAt=-10;b.speed=0;b.cooldown=100;b.boss!.cooldown=0;
 g.step(.02);assert.ok(b.boss!.center);const hp=h.hp;g.commandHero({x:16,z:20});advance(g,1.7);assert.equal(h.hp,hp);
 b.hp=b.maxHp*.39;g.step(.02);const speed=b.speed,damage=b.damage;assert.ok(b.boss!.enraged);advance(g,.6);assert.equal(b.speed,speed);assert.equal(b.damage,damage);
 assert.equal(g.soundEvents.filter(s=>s.kind==='boss-rage').length,1);
 b.boss!.center={x:b.x,y:b.y,z:b.z};b.boss!.windupUntil=g.time+.02;b.hp=0;const slams=g.soundEvents.filter(s=>s.kind==='boss-slam').length;g.step(.04);assert.equal(g.soundEvents.filter(s=>s.kind==='boss-slam').length,slams);assert.ok(g.soundEvents.some(s=>s.kind==='boss-death'));
});
test('old defensive lines start at full health with small and broad buildable gaps',()=>{
 const g=new Game(),walls=g.structures.filter(s=>s.kind==='wall'||s.kind==='palisade');assert.ok(walls.length>=20);
 assert.ok(walls.every(s=>s.hp===s.maxHp&&!s.ruined));
 for(const s of walls)assert.equal(g.repairStructure(s.id),false);
 for(const [x,z] of [[47,39],[47,45],[52,34],[53,34],[54,34],[55,34],[61,48]]){assert.equal(g.structureAt(x,z),undefined);assert.equal(g.validate('wall',x,z),null);}
});
test('battle-damaged walls can still be repaired atomically in preparation',()=>{
 const g=new Game(),walls=g.structures.filter(s=>s.kind==='wall');
 const s=walls[0];s.hp=s.maxHp*.5;const gold=g.resources.gold,cost=g.repairCost(s);assert.ok(g.repairStructure(s.id));assert.equal(s.hp,s.maxHp);assert.ok(!s.ruined);assert.equal(g.resources.gold,gold-cost);assert.equal(g.repairStructure(s.id),false);assert.equal(g.resources.gold,gold-cost);
 g.phase='battle';assert.equal(g.repairStructure(walls[1].id),false);
});
test('archery string touches the drawing hand; shaft points forward and vanishes at release',()=>{
 const hero=createElfModel();
 for(const t of [.16,.24,.31]){
 hero.animate(t,false,.016,true,'shoot',t);hero.root.updateMatrixWorld(true);
 const nock=hero.joints.nock.getWorldPosition(new THREE.Vector3()),palm=hero.joints.arms[0].hand.localToWorld(new THREE.Vector3(0,-.04,0));assert.ok(nock.distanceTo(palm)<1e-6);
 const shaft=hero.joints.arrow.localToWorld(new THREE.Vector3(0,0,1)).sub(hero.joints.arrow.getWorldPosition(new THREE.Vector3())).normalize();assert.ok(shaft.z>.8);assert.ok(hero.joints.arrow.visible);
 }
 hero.animate(.33,false,.016,true,'shoot',HERO_SHOT.release);assert.equal(hero.joints.arrow.visible,false);hero.dispose();
});
test('hero arrow windup pauses, commands cancel it, and a dead or occluded target gets no late release',()=>{
 for(const interrupt of ['move','dead','wall'] as const){const g=arena(true),e=g.spawnEnemy('goblin',{x:24,z:20});e.speed=0;g.step(.02);assert.ok(g.hero!.pendingArrow);assert.equal(g.shots.length,0);
 g.paused=true;advance(g,1);assert.equal(g.shots.length,0);g.paused=false;
 if(interrupt==='move')g.commandHero({x:16,z:20});if(interrupt==='dead')e.hp=0;if(interrupt==='wall')g.addStructure('wall',22,20);
 advance(g,.4);assert.equal(g.soundEvents.filter(s=>s.kind==='hero-arrow').length,0);assert.equal(g.hero!.pendingArrow,undefined);}
});
test('electric branches and magic missiles have audible gains and no fire launch timbre',()=>{
 for(const library of [SOUND_LIBRARY,LICENSED_SOUNDS])for(const cue of ['missile','missile-hit','thunder','chain-lightning','judgment'] as const)assert.ok(library[cue]!.gain>=.3);
 assert.ok(LICENSED_SOUNDS.missile!.files[0].includes('arcane-missile'));assert.ok(!SOUND_LIBRARY.missile.files[0].includes('flame'));
});

test('boss entrance holds attacks and movement, pauses with simulation, then releases the boss',()=>{
 const g=arena(),b=g.spawnEnemy('grom',{x:20,z:20}),wall=g.addStructure('wall',21,20);
 const hp=wall.hp;b.boss!.cooldown=0;advance(g,1.6);
 assert.equal(b.x,20);assert.equal(b.z,20);assert.equal(wall.hp,hp);assert.equal(b.boss!.center,null);
 const model=unitModel('grom'),fx=new BossPresence();animateBoss(model,b,g.time);fx.update(g);
 const pose=model.getObjectByName('body')!.position.y;assert.ok(pose<-.35);assert.equal(fx.group.visible,true);
 g.paused=true;advance(g,3);animateBoss(model,b,g.time);assert.equal(model.getObjectByName('body')!.position.y,pose);
 g.paused=false;advance(g,BOSS_ENTRANCE);assert.ok(b.boss!.center);animateBoss(model,b,g.time);assert.equal(model.getObjectByName('body')!.position.y,-.35);
 b.hp=b.maxHp*.39;g.step(.02);fx.update(g);assert.ok(b.boss!.enragedAt!==undefined);assert.equal(fx.group.visible,true);
 const pool=fx.group.children.length;advance(g,.2);fx.update(g);assert.equal(fx.group.children.length,pool);
 b.hp=0;fx.update(g);assert.equal(fx.group.visible,false);
});

test('boss camera sequence hides the actor until focused and restores the exact view and controls',t=>{
 const classes=new Set<string>();
 const priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),priorMatch=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{classList:{add:(s:string)=>classes.add(s),remove:(s:string)=>classes.delete(s)}}}});
 Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:false})});
 t.after(()=>{for(const [name,prior] of [['document',priorDocument],['matchMedia',priorMatch]] as const)if(prior)Object.defineProperty(globalThis,name,prior);else delete (globalThis as any)[name];});
 const game=arena(),enemy=game.spawnEnemy('grom',{x:20,z:20}),camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,200);
 camera.position.set(42,38,40);camera.zoom=1.7;
 const controls={target:new THREE.Vector3(30,2,30),enabled:true,enableDamping:true,update(){}};
 const world={game,camera,controls,bossPresentationAge:null} as unknown as World,root={inert:false} as HTMLElement;
 let prepared=0,revealed=0,sounded=0;const cinematic=new BossEntrance(world,root,()=>prepared++,()=>revealed++,()=>sounded++);
 const position=camera.position.clone(),target=controls.target.clone(),time=game.time;
 assert.equal(cinematic.begin(game),true);assert.equal(prepared,1);assert.equal(root.inert,true);assert.equal(controls.enabled,false);assert.equal(world.bossPresentationAge,-1);
 cinematic.update(.7);assert.equal(sounded,0);assert.ok(world.bossPresentationAge!<0);
 game.paused=true;const pausedPosition=camera.position.clone();cinematic.update(1);assert.deepEqual(camera.position,pausedPosition);game.paused=false;
 cinematic.update(1.2);assert.equal(sounded,1);assert.ok(world.bossPresentationAge!>0);assert.equal(game.time,time);
 cinematic.update(5);assert.equal(cinematic.active,false);assert.deepEqual(camera.position,position);assert.deepEqual(controls.target,target);assert.equal(camera.zoom,1.7);assert.equal(controls.enabled,true);assert.equal(controls.enableDamping,true);assert.equal(root.inert,false);assert.equal(revealed,1);assert.equal(classes.size,0);
 assert.equal(enemy.boss!.spawnedAt,game.time-BOSS_ENTRANCE);assert.equal(cinematic.begin(game),false);
 const another=game.spawnEnemy('grom',{x:21,z:20});assert.equal(cinematic.begin(game),true);cinematic.finish();assert.equal(another.boss!.spawnedAt,game.time-BOSS_ENTRANCE);assert.deepEqual(camera.position,position);
 assert.ok(bossEntranceFrame(1.3).age===0);assert.equal(bossEntranceFrame(7).done,true);assert.equal(bossEntranceFrame(5,true).done,true);
});

test('hammer falls from above frame before boss, pickup joins the hand without a pop',()=>{
 const g=arena(),e=g.spawnEnemy('grom',{x:20,z:20}),model=unitModel('grom');
 assert.ok(Math.abs(e.facing-Math.atan2(g.goal.x-e.x,g.goal.z-e.z))<1e-9);
 animateBoss(model,e,0,30);assert.equal(model.getObjectByName('body')!.visible,false);assert.ok(model.getObjectByName('arrival-hammer')!.position.y>30);
 animateBoss(model,e,.6,30);assert.equal(model.getObjectByName('body')!.visible,false);assert.equal(model.getObjectByName('siege hammer')!.visible,false);assert.ok(model.getObjectByName('arrival-hammer')!.position.y<2);
 animateBoss(model,e,.98,30);assert.ok(model.getObjectByName('body')!.position.y>29);
 animateBoss(model,e,2.9499,30);model.updateMatrixWorld(true);
 const falling=model.getObjectByName('arrival-hammer')!,held=model.getObjectByName('siege hammer')!;
 assert.ok(falling.getWorldPosition(new THREE.Vector3()).distanceTo(held.getWorldPosition(new THREE.Vector3()))<.001);
 animateBoss(model,e,3,30);assert.equal(falling.visible,false);assert.equal(held.visible,true);
 assert.ok(bossArrivalPose(1.6).crouch>.95);assert.equal(bossArrivalPose(BOSS_ENTRANCE).bodyHeight,0);
});
