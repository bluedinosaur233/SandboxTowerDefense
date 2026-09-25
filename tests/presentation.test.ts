import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTH, DEPTH, Game, type EnemyKind } from '../src/simulation/game';
import { buildingModel } from '../src/render/world';
import { sphereSliceRadius } from '../src/render/range';
import { cameraMotion } from '../src/render/camera-motion';
import { TRACKS } from '../src/ui/audio';

test('the expanded battlefield keeps its entrance and castle connected',()=>{
  assert.equal(WIDTH,42);assert.equal(DEPTH,32);assert.equal(WIDTH*DEPTH,1344);
  const game=new Game();for(const kind of ['goblin','runner','brute'] as EnemyKind[])assert.ok(game.findPath(game.spawn,game.goal,kind).length>35);
});
test('camera-relative WASD movement rotates with the current viewing angle',()=>{
  const move=(angle:number,key:'forward'|'right')=>{const f={x:Math.sin(angle),z:-Math.cos(angle)};return cameraMotion(f.x,f.z,key==='right'?1:0,key==='forward'?1:0,10);};
  const front=move(0,'forward'),right=move(0,'right'),turned=move(Math.PI/2,'forward');
  assert.ok(front.z < -9 && Math.abs(front.x)<.01);
  assert.ok(right.x>9&&Math.abs(right.z)<.01);
  assert.ok(turned.x>9&&Math.abs(turned.z)<.01);
});
test('3D range intersections shrink at high and low elevation slices',()=>{
  const radius=6;
  assert.equal(sphereSliceRadius(radius,2,2),6);
  assert.ok(Math.abs(sphereSliceRadius(radius,2,4)-Math.sqrt(32))<1e-9);
  assert.equal(sphereSliceRadius(radius,2,8),0);
});
test('each defensive tower has distinct silhouettes at all upgrade tiers',()=>{
  for(const kind of ['archer','mage','wall','barracks'] as const){
    const tiers=[1,2,3].map(level=>{const g=buildingModel(kind,level);let meshes=0;g.traverse(o=>{if((o as any).isMesh)meshes++;});return {g,meshes};});
    assert.ok(tiers[0].meshes<tiers[1].meshes&&tiers[1].meshes<tiers[2].meshes,`${kind} upgrades add real model geometry`);
    tiers.forEach(x=>x.g.clear());
  }
});
test('combat actions queue sound cues for the Web Audio adapter',()=>{
  const game=new Game(false);game.phase='battle';const tower=game.addStructure('archer',10,10);const enemy=game.spawnEnemy('goblin');enemy.x=13;enemy.z=10;enemy.speed=0;enemy.hp=2;enemy.maxHp=2;
  game.step(1/30);assert.ok(game.drainSounds().some(e=>e.kind==='arrow'));
  game.step(1/3);const cues=game.drainSounds().map(e=>e.kind);assert.ok(cues.includes('impact'));assert.ok(cues.includes('death'));assert.equal(tower.kind,'archer');
});
test('music credits identify locally bundled CC BY 4.0 licensed recordings',()=>{
  assert.deepEqual(TRACKS.map(x=>x.title),['Skye Cuillin','Ascending the Vale']);
  for(const track of TRACKS){assert.ok(track.file.endsWith('.mp3'));assert.ok(track.isrc.startsWith('US'));}
});
