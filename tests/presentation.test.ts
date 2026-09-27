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

test('bridge geometry opens railings toward connected tiles',async()=>{
  const {bridgeModel}=await import('../src/render/world');
  const open=bridgeModel({north:false,south:false,east:false,west:false});
  const guarded=bridgeModel({north:true,south:true,east:true,west:true});
  assert.equal(guarded.children.length-open.children.length,4);assert.equal(open.userData.kind,'bridge');
});
test('health bars stay anchored even when units overlap or approach screen edges',async()=>{
  const {arrangeHealthBars}=await import('../src/render/world');
  const entries=[{id:1,x:200,y:200},{id:2,x:206,y:200},{id:3,x:2,y:201},{id:4,x:-30,y:200}];
  assert.deepEqual(arrangeHealthBars(entries,800,600),entries.slice(0,3));
});
test('damage bars hide at rest, refresh on damage, expire and reset between maps',async()=>{
  const {DamageVisibility}=await import('../src/render/health');const bars=new DamageVisibility();
  const unit={id:1,hp:100,maxHp:100};
  bars.update([unit],0);assert.equal(bars.opacity(1,0),0);
  unit.hp=80;bars.update([unit],1);assert.equal(bars.opacity(1,1),1);
  bars.update([unit],3.8);assert.ok(bars.opacity(1,3.8)>0&&bars.opacity(1,3.8)<1);
  unit.hp=70;bars.update([unit],3.9);assert.equal(bars.opacity(1,4),1);
  unit.hp=90;bars.update([unit],5);assert.equal(bars.opacity(1,7),0,'healing must not extend the timer');
  unit.hp=50;bars.update([unit],8);assert.equal(bars.opacity(1,8),1);
  bars.update([],8);assert.equal(bars.opacity(1,8),0,'removed units leave no bars');
  bars.update([unit],9);bars.clear();unit.hp=100;bars.update([unit],0);assert.equal(bars.opacity(1,0),0);
});
