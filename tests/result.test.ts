import test from 'node:test';
import assert from 'node:assert/strict';
import { battleRating, victoryStars, resultTimeline, BOSS_FALL } from '../src/simulation/result';
import { Game } from '../src/simulation/game';
import { HERO_STATS } from '../src/simulation/hero';
import { recordVictory, readProgress, readPlating } from '../src/campaign/progress';
import { unitModel } from '../src/render/units';
import { animateBossDeath, bossDeathPose } from '../src/render/boss-effects';
import { Box3, Mesh } from 'three';

test('rating boundaries are 100 / 50 / 1 and never award a loss',()=>{
 for(const [hp,stars] of [[100,3],[99,2],[50,2],[49,1],[1,1],[0,0],[-1,0]])assert.equal(victoryStars(hp),stars);
 assert.deepEqual(battleRating({phase:'defeat',castleHp:100,hero:{},heroDeaths:0}),{stars:0,plated:false});
 assert.deepEqual(battleRating({phase:'victory',castleHp:50,hero:{},heroDeaths:0}),{stars:2,plated:false});
 assert.equal(battleRating({phase:'victory',castleHp:100,hero:{},heroDeaths:0}).plated,true);
 assert.equal(battleRating({phase:'victory',castleHp:99,hero:{},heroDeaths:0}).plated,false);
 assert.equal(battleRating({phase:'victory',castleHp:1,hero:{},heroDeaths:0}).plated,false);
 assert.equal(battleRating({phase:'victory',castleHp:100,hero:null,heroDeaths:0}).plated,false);
 assert.equal(battleRating({phase:'victory',castleHp:100,hero:{},heroDeaths:1}).plated,false);
});
test('hero death is counted once and remains recorded after resurrection',()=>{
 const g=new Game(false,'windford','aerilia');g.hero!.hp=0;g.step(.1);assert.equal(g.heroDeaths,1);
 for(let t=0;t<HERO_STATS.respawn+.5;t+=.1)g.step(.1);
 assert.ok(g.hero!.hp>0);assert.equal(g.heroDeaths,1);
 g.hero!.hp=0;g.step(.1);assert.equal(g.heroDeaths,2);
 assert.equal(new Game(false,'windford','aerilia').heroDeaths,0);
});
test('boss corpse survives final-wave cleanup without duplicate kill rewards',()=>{
 const g=new Game(false);g.phase='battle';g.wave=15;const e=g.spawnEnemy('grom');e.hp=0;const gold=g.resources.gold;
 g.step(.01);assert.equal(g.phase,'victory');assert.equal(g.enemies.length,0);assert.equal(g.bossDefeats.length,1);assert.equal(g.bossDefeats[0].enemy,e);assert.equal(g.kills,1);assert.ok(g.resources.gold>gold);
 const paid=g.resources.gold;g.step(5);assert.equal(g.resources.gold,paid);assert.equal(g.bossDefeats.length,1);
});
test('result beats finish the collapse and banner exit before HUD, flourish, stars and plating',()=>{
 for(const reduced of [false,true]){const t=resultTimeline(BOSS_FALL.duration,reduced);
  assert.ok(t.hudAt>=BOSS_FALL.duration+.7);assert.ok(t.flourishAt>t.hudAt);assert.ok(t.panelAt>t.flourishAt);
  assert.ok(t.starAt(0)>t.panelAt);assert.ok(t.starAt(1)>t.starAt(0));assert.ok(t.starAt(2)>t.starAt(1));assert.ok(t.plateAt(3)>t.starAt(2));
 }
 assert.ok(resultTimeline(0).panelAt<resultTimeline(BOSS_FALL.duration).panelAt);
});
test('only three-star crystal records survive migration, while normal best is preserved',()=>{
 assert.deepEqual(readPlating('{"windford":1}'),{});assert.deepEqual(readPlating('{"windford":2}'),{});
 assert.deepEqual(readPlating('{"windford":3}'),{windford:3});assert.deepEqual(readPlating('broken'),{});
 const normal=recordVictory({},'windford',100);assert.equal(recordVictory(normal,'windford',50).windford,3);
 assert.deepEqual(recordVictory({},'windford',0),{});assert.deepEqual(readProgress(JSON.stringify(normal)),normal);
});
test('boss fall settles into a distinct grounded pose rather than disappearing',()=>{
 const model=unitModel('grom');let previous=0;
 for(const age of [0,.4,.8,1.2,1.5,2.4]){
  const pose=bossDeathPose(age);assert.ok(pose.fall>=previous);previous=pose.fall;animateBossDeath(model,age);model.updateMatrixWorld(true);
  const bounds=new Box3();model.traverseVisible(o=>{if(o instanceof Mesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));}});
  assert.ok(bounds.min.y>=-.65,`must not sink into terrain at ${age}: ${bounds.min.y}`);assert.ok(Number.isFinite(bounds.max.y));assert.equal(model.visible,true);
 }
 assert.ok(model.getObjectByName('body')!.rotation.x>1.4);assert.equal(model.getObjectByName('siege hammer')!.visible,false);assert.equal(model.getObjectByName('arrival-hammer')!.visible,true);
});
