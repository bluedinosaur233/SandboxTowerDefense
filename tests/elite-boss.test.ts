import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Game } from '../src/simulation/game';
import { ENEMIES, waveEnemies, BOSS_SLAM } from '../src/simulation/enemies';
import { unitModel } from '../src/render/units';
import { BossWarning } from '../src/render/boss-effects';
import { createElfModel } from '../src/heroes/model';
import { HERO_SHOT } from '../src/simulation/hero';
import { SOUND_LIBRARY } from '../src/ui/sound-library';
import { LICENSED_SOUNDS } from '../src/ui/licensed-sounds';

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
 const g=arena(),b=g.spawnEnemy('grom',{x:20,z:20}),wall=g.addStructure('wall',22,20);b.speed=0;b.boss!.cooldown=0;b.cooldown=100;
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
 const g=arena(true),h=g.hero!,b=g.spawnEnemy('grom',{x:22,z:20});b.speed=0;b.cooldown=100;b.boss!.cooldown=0;
 g.step(.02);assert.ok(b.boss!.center);const hp=h.hp;g.commandHero({x:16,z:20});advance(g,1.7);assert.equal(h.hp,hp);
 b.hp=b.maxHp*.39;g.step(.02);const speed=b.speed,damage=b.damage;assert.ok(b.boss!.enraged);advance(g,.3);assert.equal(b.speed,speed);assert.equal(b.damage,damage);
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
