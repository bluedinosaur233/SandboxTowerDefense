import test from 'node:test';
import assert from 'node:assert/strict';
import { equipHero, readHeroLoadouts } from '../src/heroes/roster';
import { createElfModel } from '../src/heroes/model';
import * as THREE from 'three';

test('hero weapons follow articulated hands and folded magic wings are hidden',()=>{
  const hero=createElfModel();
  assert.ok(hero.joints.bow.parent===hero.joints.torso);
  hero.animate(0,false,.016,true);
  assert.ok(hero.joints.wings.every(w=>!w.visible));
  hero.root.updateMatrixWorld(true);
  const before=hero.joints.bow.getWorldPosition(new THREE.Vector3());
  for(let t=0;t<=.25;t+=.016)hero.animate(t,false,.016,false,'walk');hero.root.updateMatrixWorld(true);
  const after=hero.joints.bow.getWorldPosition(new THREE.Vector3());
  assert.ok(before.distanceTo(after)>.02);
  assert.ok(hero.joints.legs[0].thigh.rotation.x*hero.joints.legs[1].thigh.rotation.x<0);
  hero.animate(1,true,.016,true);assert.ok(hero.joints.wings.every(w=>w.visible));
  hero.root.updateMatrixWorld(true);
  for(const arm of hero.joints.arms){
    const palm=arm.hand.localToWorld(new THREE.Vector3(0,-.04,0));
    assert.ok(palm.distanceTo(arm.shoulder.getWorldPosition(new THREE.Vector3()))>.82,'flight arms relax instead of bending onto the hips');
    assert.ok(hero.joints.torso.worldToLocal(palm).y<-.18);
  }
  hero.animate(2,false,.016,true);assert.ok(hero.joints.wings.every(w=>!w.visible));
  for(const pose of ['idle','shoot'] as const){
    hero.animate(3,false,.016,true,pose,.29);hero.root.updateMatrixWorld(true);
    const center=hero.joints.bow.localToWorld(new THREE.Vector3());
    const tip=hero.joints.bow.localToWorld(new THREE.Vector3(0,1,0));
    if(pose==='idle')assert.ok(Math.abs(tip.y-center.y)<.25,'ready bow is horizontal');
    else assert.ok(tip.y-center.y>.95,'aimed bow is upright');
  }
  hero.animate(3,false,.016,true,'melee');assert.ok(hero.joints.blade.visible);assert.ok(!hero.joints.bow.visible);
  hero.animate(4,false,.016,true,'idle');assert.ok(!hero.joints.blade.visible);assert.ok(hero.joints.bow.visible);
  hero.dispose();
});

test('hero assignment survives validated storage and ignores retired stages', () => {
  const selected = equipHero({}, 'windford', 'aerilia');
  assert.deepEqual(selected, { windford: 'aerilia' });
  assert.deepEqual(equipHero(selected, 'windford', null), {});
  assert.deepEqual(readHeroLoadouts(JSON.stringify(selected)), selected);
  assert.deepEqual(readHeroLoadouts('{"windford":"aerilia","river":"aerilia","mountain":"aerilia","canyon":"aerilia"}'), selected);
  assert.deepEqual(readHeroLoadouts('{"windford":"unknown"}'), {});
  for (const bad of ['broken', 'null', '[]', '"aerilia"']) assert.deepEqual(readHeroLoadouts(bad), {});
});

test('entry descends, defeat kneels and pose transitions interpolate rather than snapping',()=>{
  const hero=createElfModel();
  hero.animate(0,true,.016,true,'enter',0);const high=hero.joints.body.position.y;
  hero.animate(1,false,.016,true,'enter',1.1);assert.ok(high-hero.joints.body.position.y>2);
  hero.animate(2,false,.016,true,'idle');const before=hero.joints.arms[0].shoulder.rotation.x;
  hero.animate(2.016,false,.016,false,'cast',0);
  assert.ok(Math.abs(hero.joints.arms[0].shoulder.rotation.x-before)<.6);
  hero.animate(3,false,.016,true,'defeat',1.2);assert.ok(hero.joints.head.rotation.x>.3);assert.ok(hero.joints.legs[0].shin.rotation.x>1.5);
  hero.dispose();
});

test('draw extends the bow arm, anchors at the cheek and keeps both string segments outside the head',()=>{
  const hero=createElfModel();hero.animate(0,false,.016,true,'idle');
  for(let frame=0;frame<80;frame++){
    const time=frame/120;hero.animate(time,false,1/120,false,'shoot',time);hero.root.updateMatrixWorld(true);
    const nock=hero.joints.nock.getWorldPosition(new THREE.Vector3());
    for(const side of [-1,1]){
      const tip=hero.joints.bow.localToWorld(new THREE.Vector3(.06,side*.91,0));
      for(let sample=0;sample<=100;sample++){
        const p=hero.joints.head.worldToLocal(tip.clone().lerp(nock,sample/100));
        assert.ok(!(Math.abs(p.x)<.445&&p.y>.04&&p.y<.86&&Math.abs(p.z)<.355),`string enters skull at ${time}`);
      }
    }
  }
  hero.animate(1,false,.016,true,'shoot',.30);hero.root.updateMatrixWorld(true);
  const arm=hero.joints.arms[1],shoulder=arm.shoulder.getWorldPosition(new THREE.Vector3()),palm=arm.hand.localToWorld(new THREE.Vector3(0,-.04,0));
  assert.ok(shoulder.distanceTo(palm)>.75,'bow arm extends rather than folding into chest');
  assert.ok(palm.distanceTo(hero.joints.bow.getWorldPosition(new THREE.Vector3()))<1e-6,'grip stays in palm');
  const cheek=hero.joints.head.worldToLocal(hero.joints.arms[0].hand.localToWorld(new THREE.Vector3(0,-.04,0)));
  assert.ok(Math.abs(cheek.x)>.4&&Math.abs(cheek.x)<.7&&cheek.y>.1&&cheek.y<.4,'draw hand anchors beside lower cheek');
  hero.dispose();
});

test('long rest stows the bow behind the body and retrieval is continuous',()=>{
  const hero=createElfModel();hero.animate(0,false,.016,true,'idle',0,7.9);assert.equal(hero.joints.bow.userData.stowed,false);
  let previous=hero.joints.bow.position.clone();
  for(let i=0;i<180;i++){
    hero.animate(i/60,false,1/60,false,'idle',0,8+i/60);
    assert.ok(previous.distanceTo(hero.joints.bow.position)<.35,'no socket teleport during stow');previous.copy(hero.joints.bow.position);
  }
  assert.equal(hero.joints.bow.userData.stowed,true);assert.ok(hero.joints.bow.position.z<-.55);
  for(let i=0;i<24;i++){
    hero.animate(3+i/60,false,1/60,false,'idle',0,0);
    assert.ok(previous.distanceTo(hero.joints.bow.position)<.45,'no socket teleport during retrieval');previous.copy(hero.joints.bow.position);
  }
  assert.ok(hero.joints.bow.userData.stowProgress<.01);assert.ok(hero.joints.bow.position.z>.1);
  hero.root.updateMatrixWorld(true);
  assert.ok(hero.joints.bow.getWorldPosition(new THREE.Vector3()).distanceTo(hero.joints.arms[1].hand.localToWorld(new THREE.Vector3(0,-.04,0)))<1e-6);
  hero.dispose();
});
