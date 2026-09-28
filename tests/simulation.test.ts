import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, inSphere, HEIGHT_UNIT, type EnemyKind } from '../src/simulation/game';
import type { MapId } from '../src/simulation/maps';

function flat(corridor=false) {
  const g=new Game(false);
  for(const t of g.tiles){t.h=1;t.active=!corridor||t.z===16;t.water=false;t.bridge=false;t.decoration=0;}
  return g;
}
function tick(g:Game,seconds:number){for(let t=0;t<seconds;t+=1/30)g.step(1/30);}
test('normal map has an entry-to-castle route for every enemy class',()=>{
  const g=new Game();for(const kind of ['goblin','runner','brute'] as EnemyKind[]){const path=g.previewPath(kind);assert.ok(path.length>20);assert.deepEqual(path.at(-1),g.goal);}
});
test('every campaign map keeps all enemy classes connected',()=>{
  for(const mapId of ['river','mountain','canyon'] as MapId[]){
    const g=new Game(false,mapId);
    for(const kind of ['goblin','runner','brute'] as EnemyKind[]){
      const path=g.previewPath(kind);
      assert.ok(path.length>30,`${mapId}/${kind} should have a meaningful route`);
      assert.deepEqual(path.at(-1),g.goal);
    }
  }
});
test('mountain map exposes meaningful stepped elevation',()=>{
  const g=new Game(false,'mountain');
  assert.ok(Math.max(...g.tiles.map(t=>t.h))>=20);
  assert.ok(Math.min(...g.tiles.map(t=>t.h))>=2);
  const path=g.previewPath('goblin');
  assert.ok(new Set(path.map(p=>g.tile(p.x,p.z)!.h)).size>=8);
});
test('canyon bridges can be switched while preserving one route',()=>{
  const g=new Game(false,'canyon');
  const first=g.tiles.find(t=>t.bridge&&t.z===10)!;
  const second=g.tiles.find(t=>t.bridge&&t.z===23)!;
  const before=g.previewPath('goblin').length;
  assert.ok(g.build('remove',first.x,first.z));
  assert.ok(g.previewPath('goblin').length>before);
  assert.equal(g.build('remove',second.x,second.z),false);
  assert.equal(second.bridge,true);
  assert.ok(g.build('bridge',first.x,first.z));
  assert.equal(g.tile(first.x,first.z)!.bridge,true);
  assert.ok(g.previewPath('goblin').length>0);
});
test('walls force a cheaper detour and recompute routes immediately',()=>{
  const g=flat();const before=g.findPath(g.spawn);assert.ok(before.some(p=>p.x===8&&p.z===16));
  assert.equal(g.build('wall',8,16),true);const after=g.findPath(g.spawn);assert.ok(!after.some(p=>p.x===8&&p.z===16));assert.ok(after.some(p=>p.z!==16));
});
test('a weak wall is cheaper to break than a long detour',()=>{
  const g=flat();const wall=g.addStructure('wall',8,16);wall.hp=1;
  const path=g.findPath(g.spawn,g.goal,'brute');assert.ok(path.some(p=>p.x===8&&p.z===16));
});
test('enemies attack and destroy an unavoidable wall',()=>{
  const g=flat(true);g.phase='battle';const wall=g.addStructure('wall',4,16);wall.hp=24;g.spawnEnemy('goblin');tick(g,6);
  assert.equal(g.structureAt(4,16),undefined);assert.ok(g.enemies[0].x>4);
});
test('water slows goblins to 38 percent and runners are better swimmers',()=>{
  function travel(water:boolean,kind:EnemyKind){const g=flat(true);g.phase='battle';g.tile(1,16)!.water=water;const e=g.spawnEnemy(kind);tick(g,0.3);return e.x-1;}
  assert.ok(Math.abs(travel(true,'goblin')/travel(false,'goblin')-0.38)<0.02);
  assert.ok(Math.abs(travel(true,'runner')/travel(false,'runner')-0.65)<0.02);
});
test('routing avoids water when dry detours take less time',()=>{
  const g=flat();for(let x=5;x<10;x++)g.tile(x,16)!.water=true;
  assert.ok(g.findPath(g.spawn).some(p=>p.z!==16));
});
test('sphere targeting includes vertical distance',()=>{
  assert.equal(inSphere({x:0,y:0,z:0},{x:4,y:4,z:0},5),false);
  assert.equal(inSphere({x:0,y:0,z:0},{x:3,y:4,z:0},5),true);
  const g=flat();const tower=g.addStructure('archer',10,16);const e=g.spawnEnemy('goblin');e.x=16;e.z=16;e.y=-2;
  assert.equal(inSphere(g.muzzle(tower),e,g.towerRange(tower)),false);
});
test('tower actually fires inside the 3D sphere and refuses distant elevations',()=>{
  const g=flat();g.phase='battle';const t=g.addStructure('archer',10,16);const e=g.spawnEnemy('goblin');e.x=14;e.z=16;e.y=1;e.speed=0;
  g.step(1/30);assert.equal(g.shots.length,1);g.shots=[];t.cooldown=0;e.y=20;g.step(1/30);assert.equal(g.shots.length,0);
});
test('height changes can alter paths; sealing all routes is rejected without cost',()=>{
  const g=flat(true);g.tile(8,16)!.h=3;const before={...g.resources};
  assert.equal(g.build('raise',8,16),false);assert.equal(g.tile(8,16)!.h,3);assert.deepEqual(g.resources,before);
});
test('construction charges real resources, blocks occupied tiles, and refunds half',()=>{
  const g=flat(),before={...g.resources};assert.equal(g.build('archer',10,16),true);assert.equal(g.resources.gold,before.gold-75);
  assert.equal(g.build('mage',10,16),false);assert.equal(g.build('remove',10,16),true);assert.equal(g.resources.gold,before.gold-75+37);assert.equal(g.structures.length,0);
});
test('barracks soldiers walk to enemies and intercept them in melee',()=>{
  const g=flat();const b=g.addStructure('barracks',10,14);g.recruitSoldiers();const s=g.soldiers[0];const initial={x:s.x,z:s.z};
  g.phase='battle';const e=g.spawnEnemy('goblin');e.x=7;e.z=15;e.y=HEIGHT_UNIT+0.35;e.hp=500;e.maxHp=500;e.speed=0;
  tick(g,3);assert.ok(Math.hypot(s.x-initial.x,s.z-initial.z)>0.8,'soldier leaves its initial position');assert.ok(e.hp<500,'soldier reaches and attacks enemy');assert.ok(s.hp<s.maxHp,'enemy fights blocker');assert.equal(b.kind,'barracks');
});
test('barracks replace casualties and upgrades expand squad capacity',()=>{
  const g=flat();const b=g.addStructure('barracks',10,14);tick(g,2);assert.equal(g.soldiers.length,2);g.soldiers=[];b.recruit=1;g.phase='battle';const e=g.spawnEnemy('brute');e.speed=0;tick(g,1.5);assert.equal(g.soldiers.length,1);
  g.phase='preparation';assert.equal(g.upgrade(b.id),true);b.recruit=0;tick(g,2);assert.equal(g.soldiers.length,3);
});
test('pause freezes all simulation, then a wave can complete and grant supplies',()=>{
  const g=flat();g.startWave();g.paused=true;tick(g,2);assert.equal(g.time,0);assert.equal(g.enemies.length,0);g.paused=false;g.castleHp=10000;tick(g,90);assert.equal(g.phase,'preparation');assert.equal(g.wave,1);assert.ok(g.resources.wood>180);
});
test('castle damage produces defeat and surviving five waves produces victory',()=>{
  const lost=flat();lost.phase='battle';lost.castleHp=1;const e=lost.spawnEnemy('goblin');e.x=lost.goal.x;e.z=lost.goal.z;lost.step(1/30);assert.equal(lost.phase,'defeat');assert.equal(lost.castleHp,0);
  const won=flat();won.castleHp=100000;for(let wave=1;wave<=5;wave++){assert.equal(won.startWave(),true);tick(won,110);}assert.equal(won.phase,'victory');assert.equal(won.wave,5);
});

test('bridges span water, restore the riverbed and refund half their price',()=>{
  const g=flat(true),t=g.tile(8,16)!;t.h=0;t.water=true;const before={...g.resources};
  assert.equal(g.build('bridge',8,16),true);assert.equal(t.bridge,true);assert.equal(t.water,false);assert.equal(t.h,1);assert.equal(t.bridgeBed,0);
  assert.equal(g.resources.gold,before.gold-12);assert.equal(g.resources.wood,before.wood-12);
  assert.equal(g.build('raise',8,16),false);assert.equal(g.build('archer',8,16),false);
  assert.equal(g.build('remove',8,16),true);assert.equal(t.bridge,false);assert.equal(t.water,true);assert.equal(t.h,0);
  assert.equal(g.resources.gold,before.gold-6);assert.equal(g.resources.wood,before.wood-6);
});
test('the original river bridges can be dismantled and rebuilt',()=>{
  const g=new Game(false),t=g.tiles.find(t=>t.bridge)!;
  assert.equal(g.build('remove',t.x,t.z),true);assert.equal(t.water,true);assert.equal(t.h,0);
  assert.equal(g.build('bridge',t.x,t.z),true);assert.equal(t.h,1);assert.equal(t.water,false);
  for(const kind of ['goblin','runner','brute'] as const)assert.ok(g.findPath(g.spawn,g.goal,kind).length);
});
test('bridges cannot be built on land, duplicated, or removed under a unit',()=>{
  const g=flat(),before={...g.resources};assert.equal(g.build('bridge',8,16),false);assert.deepEqual(g.resources,before);
  g.tile(8,16)!.water=true;g.tile(8,16)!.h=0;assert.equal(g.build('bridge',8,16),true);
  const after={...g.resources};assert.equal(g.build('bridge',8,16),false);
  const e=g.spawnEnemy('goblin');e.x=8;e.z=16;assert.equal(g.build('remove',8,16),false);assert.equal(g.tile(8,16)!.bridge,true);assert.deepEqual(g.resources,after);
});
test('removing the only traversable bridge rolls back terrain and resources',()=>{
  const g=flat(true),t=g.tile(8,16)!;t.water=true;t.h=0;assert.equal(g.build('bridge',8,16),true);
  g.tile(7,16)!.h=3;g.tile(9,16)!.h=3;const before={...t},money={...g.resources},revision=g.revision;
  assert.equal(g.build('remove',8,16),false);assert.deepEqual(t,before);assert.deepEqual(g.resources,money);assert.equal(g.revision,revision);
});
test('bridges remove the wading speed penalty',()=>{
  function travel(bridge:boolean){const g=flat(true);g.tile(8,16)!.h=0;g.tile(8,16)!.water=true;if(bridge)assert.ok(g.build('bridge',8,16));g.phase='battle';const e=g.spawnEnemy('goblin');e.x=8;e.z=16;e.y=g.ground(8,16)+.35;tick(g,.2);return e.x-8;}
  assert.ok(travel(true)>travel(false)*2);
});
test('periodic replans never move enemies backwards on an unchanged route',()=>{
  for(const kind of ['goblin','runner','brute'] as const){
    const g=flat(true);g.phase='battle';const e=g.spawnEnemy(kind);
    for(let i=0;i<600;i++){const x=e.x;g.step(1/30);assert.ok(e.x>=x-1e-9,kind+' reversed at frame '+i);}
    assert.ok(e.x>10);
  }
});
test('unrelated terrain revisions preserve the current edge and facing',()=>{
  for(const fraction of [.1,.3,.49,.51,.8]){
    const g=flat();g.phase='battle';const e=g.spawnEnemy('goblin');g.step(1/30);e.x=5+fraction;e.z=16;e.path=g.findPath({x:5,z:16});
    g.addStructure('wall',12,12);const x=e.x;g.step(1/30);assert.ok(e.x>x);assert.equal(e.z,16);
  }
});
test('moving enemies still reroute around newly constructed obstacles',()=>{
  const g=flat();g.phase='battle';const e=g.spawnEnemy('goblin');tick(g,1.2);assert.ok(g.build('wall',6,16));
  tick(g,8);assert.ok(e.x>6);assert.equal(g.structureAt(6,16)!.hp,160);
});

function assertSoldierSpacing(g:Game){
  for(let i=0;i<g.soldiers.length;i++)for(const b of g.soldiers.slice(i+1)){
    const a=g.soldiers[i];
    if(Math.abs(a.y-b.y)<.6)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>.69,`soldiers ${a.id}/${b.id} overlap`);
  }
}
test('a full squad keeps individual guard posts while a wave approaches',()=>{
  const g=flat(),home=g.addStructure('barracks',10,14);home.level=3;tick(g,3);
  assert.equal(g.soldiers.length,4);
  const posts=g.soldiers.map(s=>({x:s.x,z:s.z}));
  g.phase='battle';const e=g.spawnEnemy('brute');e.speed=0;
  tick(g,12);assertSoldierSpacing(g);
  assert.deepEqual(g.soldiers.map(s=>({x:s.x,z:s.z})),posts);
});
test('four soldiers surround a single enemy and return to separate posts after combat',()=>{
  const g=flat(),home=g.addStructure('barracks',10,14);home.level=3;tick(g,3);
  g.phase='battle';const e=g.spawnEnemy('brute');Object.assign(e,{x:7,z:15,y:HEIGHT_UNIT+.35,hp:10000,maxHp:10000,speed:0,damage:0});
  const attackers=new Set<number>();
  for(let i=0;i<450;i++){
    g.step(1/30);assertSoldierSpacing(g);
    for(const s of g.soldiers)if(s.state==='fighting')attackers.add(s.id);
  }
  assert.equal(attackers.size,4,'every squad member can reach a melee position');
  assert.ok(e.hp<9500);assert.equal(e.state,'attacking');
  e.hp=0;tick(g,15);assert.equal(g.phase,'preparation');assertSoldierSpacing(g);
  for(const s of g.soldiers)assert.ok(Math.hypot(s.x-s.guard.x,s.z-s.guard.z)<.1,'soldier returns to its own guard post');
});
test('adjacent barracks reserve different posts and replacements reuse a vacancy',()=>{
  const g=flat(),a=g.addStructure('barracks',10,14),b=g.addStructure('barracks',10,16);a.level=3;b.level=3;
  tick(g,4);assert.equal(g.soldiers.length,8);assertSoldierSpacing(g);
  assert.equal(new Set(g.soldiers.map(s=>`${s.guard.x},${s.guard.z}`)).size,8);
  const lost=g.soldiers[0];g.soldiers=g.soldiers.filter(s=>s!==lost);a.recruit=0;tick(g,1);
  assert.equal(g.soldiers.length,8);assertSoldierSpacing(g);
  assert.ok(g.soldiers.some(s=>s.id!==lost.id&&s.guard.x===lost.guard.x&&s.guard.z===lost.guard.z));
});
test('soldier avoidance stays on a narrow bridge with blocked approaches',()=>{
  const g=flat(true);g.tile(10,15)!.active=true;
  const home=g.addStructure('barracks',10,15);home.level=3;
  for(let x=5;x<=12;x++){const tile=g.tile(x,16)!;tile.chasm=true;tile.bridge=true;}
  tick(g,3);assert.ok(g.soldiers.length>=2);
  g.phase='battle';const e=g.spawnEnemy('brute');Object.assign(e,{x:6,z:16,y:HEIGHT_UNIT+.35,hp:10000,maxHp:10000,speed:0,damage:0});
  for(let i=0;i<360;i++){
    g.step(1/30);assertSoldierSpacing(g);
    for(const s of g.soldiers){const tile=g.tile(Math.round(s.x),Math.round(s.z))!;assert.ok(tile.active&&(!tile.chasm||tile.bridge));assert.equal(g.structureAt(tile.x,tile.z),undefined);}
  }
  assert.ok(e.hp<10000,'front soldier still blocks and attacks on the narrow bridge');
});
test('soldiers choose a new free guard post when their original post is built over',()=>{
  const g=flat(),home=g.addStructure('barracks',10,14);home.level=3;tick(g,3);
  g.phase='battle';const e=g.spawnEnemy('brute');Object.assign(e,{x:7,z:15,y:HEIGHT_UNIT+.35,hp:10000,maxHp:10000,speed:0,damage:0});
  tick(g,8);const old={...g.soldiers[0].guard};assert.equal(g.build('wall',old.x,old.z),true);
  e.hp=0;tick(g,20);assertSoldierSpacing(g);
  for(const s of g.soldiers){assert.ok(Math.hypot(s.x-s.guard.x,s.z-s.guard.z)<.1);assert.ok(s.guard.x!==old.x||s.guard.z!==old.z);}
});
test('adjacent squads share moving enemy targets without stacking',()=>{
  const g=flat();g.addStructure('barracks',10,14);g.addStructure('barracks',10,18);tick(g,3);
  g.phase='battle';
  for(let i=0;i<2;i++){const e=g.spawnEnemy('brute');Object.assign(e,{x:7-i,z:16,y:HEIGHT_UNIT+.35,hp:10000,maxHp:10000,damage:0});}
  for(let i=0;i<450;i++){g.step(1/30);assertSoldierSpacing(g);}
  assert.ok(g.enemies.some(e=>e.hp<10000));
  assert.ok(g.enemies.every(e=>e.x<14),'soldiers continue to block advancing enemies');
  g.enemies[0].hp=0;tick(g,5);assertSoldierSpacing(g);
  assert.ok(g.enemies[0].hp<10000,'soldiers acquire the next enemy after their target dies');
});
test('existing overlapping soldiers spread out instead of remaining fused',()=>{
  const g=flat();g.addStructure('barracks',10,14);tick(g,2);
  for(const s of g.soldiers){s.x=9;s.z=15;}
  tick(g,3);assertSoldierSpacing(g);
  for(const s of g.soldiers)assert.ok(Math.hypot(s.x-s.guard.x,s.z-s.guard.z)<.1);
});
