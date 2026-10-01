import test from 'node:test';
import assert from 'node:assert/strict';
import { Game,COSTS } from '../src/simulation/game';
import { isDirectional, TURN_CLOCKWISE, TURN_COUNTERCLOCKWISE, towerAttack } from '../src/simulation/towers';
import { canTarget } from '../src/simulation/coverage';
import { BuildPlacement } from '../src/ui/placement';
function flat(){const g=new Game(false);for(const t of g.tiles)Object.assign(t,{active:true,h:1,water:false,bridge:false,chasm:false,road:false});g.resources.gold=10000;return g;}
function tick(g:Game,n:number){for(let t=0;t<n;t+=1/30)g.step(1/30);}
test('cannon cone respects facing, vertical angle and air category, while branches change its envelope',()=>{
 const origin={x:0,y:2,z:0},base=towerAttack({kind:'cannon',level:1});
 assert.ok(canTarget(origin,{x:4,y:2,z:0},base,Math.PI/2));
 assert.equal(canTarget(origin,{x:-4,y:2,z:0},base,Math.PI/2),false);
 assert.equal(canTarget(origin,{x:0,y:2,z:4},base,Math.PI/2),false);
 assert.equal(canTarget(origin,{x:1,y:6,z:0},base,Math.PI/2),false);
 assert.equal(canTarget(origin,{x:4,y:2,z:0,airborne:true},base,Math.PI/2),false);
 assert.ok(canTarget(origin,{x:0,y:2,z:4},base,0));
 const mortar=towerAttack({kind:'cannon',level:3,branch:'bombard'});
 assert.ok(canTarget(origin,{x:-7,y:2,z:0},mortar));assert.equal(canTarget(origin,{x:1,y:2,z:0},mortar),false);
 assert.equal(canTarget(origin,{x:7,y:2,z:0,airborne:true},mortar),false);
 const missile=towerAttack({kind:'cannon',level:3,branch:'shrapnel'});
 assert.ok(canTarget(origin,{x:-4,y:5,z:0,airborne:true},missile));
 assert.equal(canTarget(origin,{x:0,y:11,z:0,airborne:true},missile),false);
});
test('rotating a cannon changes actual firing, and ground splash cannot damage a flying unit',()=>{
 const g=flat(),c=g.addStructure('cannon',10,10),e=g.spawnEnemy('goblin',{x:6,z:10});e.speed=0;e.hp=1000;g.phase='battle';
 g.step(1/30);assert.equal(g.shots.length,0);assert.equal(g.rotateStructure(c.id,Math.PI),false);g.phase='preparation';assert.ok(g.rotateStructure(c.id,Math.PI));g.phase='battle';g.step(1/30);assert.equal(g.shots.length,1);c.cooldown=100;
 const air=g.spawnEnemy('gargoyle',{x:6,z:10});air.speed=0;air.y=e.y+.3;const hp=air.hp;
 // Stay inside the blast height so this checks target category, not distance.
 for(let i=0;i<25;i++){air.y=e.y+.3;g.step(1/30);}assert.ok(e.hp<1000);assert.equal(air.hp,hp);
});
test('missile silos acquire and damage flying enemies',()=>{
 const g=flat(),c=g.addStructure('cannon',10,10);g.upgrade(c.id);g.upgrade(c.id,'shrapnel');
 const e=g.spawnEnemy('gargoyle',{x:13,z:10});e.speed=0;e.hp=1000;g.phase='battle';g.step(1/30);
 assert.equal(g.shots[0]?.kind,'missile');c.cooldown=100;tick(g,.6);assert.ok(e.hp<1000);
});
test('placement preview, movement and rotation are free; only confirmation commits once',()=>{
 const g=flat(),draft=new BuildPlacement(),gold=g.resources.gold;
 draft.begin('cannon');draft.move({x:10,z:10});draft.rotate();draft.move({x:11,z:10});
 assert.equal(g.resources.gold,gold);assert.equal(g.structures.length,0);
 assert.ok(draft.confirm(g));assert.equal(g.resources.gold,gold-COSTS.cannon.gold);assert.equal(g.structures[0].x,11);assert.equal(g.structures[0].facing,draft.facing);
 assert.equal(draft.confirm(g),false);assert.equal(g.structures.length,1);
 draft.begin('wall');draft.move({x:11,z:10});const before=g.resources.gold;assert.equal(draft.confirm(g),false);assert.ok(draft.point);assert.equal(g.resources.gold,before);
 draft.move({x:12,z:10});draft.cancel();assert.equal(draft.confirm(g),false);assert.equal(g.resources.gold,before);
});
test('spikes damage and slow only ground enemies, remain walkable and can be refunded',()=>{
 const g=flat();assert.ok(g.build('spikes',10,10));const ground=g.spawnEnemy('goblin',{x:10,z:10}),air=g.spawnEnemy('gargoyle',{x:10,z:10});ground.speed=air.speed=0;
 const hp=ground.hp,airHp=air.hp;g.phase='battle';tick(g,1);assert.ok(ground.hp<hp-10);assert.equal(air.hp,airHp);
 assert.ok(g.findPath({x:9,z:10},{x:11,z:10}).some(p=>p.x===10&&p.z===10));
 ground.x=20;air.x=20;const money=g.resources.gold;assert.ok(g.build('remove',10,10));assert.equal(g.tile(10,10)!.spikes,undefined);assert.equal(g.resources.gold,money+10);
});
test('palisades block and take damage; paving is walkable and cannot be stacked or refunded twice',()=>{
 const g=flat();assert.ok(g.build('palisade',10,10));assert.equal(g.structureAt(10,10)?.hp,75);
 assert.ok(g.moveCost(g.tile(9,10)!,g.tile(10,10)!,'goblin')>5);
 assert.ok(g.build('road',12,10));assert.equal(g.tile(12,10)!.paved,true);assert.equal(g.build('road',12,10),false);assert.equal(g.build('archer',12,10),false);
 const money=g.resources.gold;assert.ok(g.build('remove',12,10));assert.equal(g.resources.gold,money+2);assert.equal(g.build('remove',12,10),false);
});
test('lowering terrain preserves routes and refuses unsafe excavation atomically',()=>{
 const g=flat();for(const t of g.tiles)t.active=t.z===42;Object.assign(g.goal,{x:54,z:42});g.entrances.splice(0,g.entrances.length,{id:'west',name:'west',x:2,z:42,color:'#fff'});
 g.tile(10,42)!.h=4;g.tile(9,42)!.h=2;g.tile(11,42)!.h=2;
 // A different tile cannot be lowered if a resulting three-level cliff seals the route.
 const money=g.resources.gold;assert.equal(g.build('lower',9,42),false);assert.equal(g.tile(9,42)!.h,2);assert.equal(g.resources.gold,money);
 assert.ok(g.build('lower',10,42));assert.equal(g.tile(10,42)!.h,3);
});
test('flying enemies cross walls without damage or soldier interception',()=>{
 const g=flat();Object.assign(g.goal,{x:20,z:10});const wall=g.addStructure('wall',11,10);g.addStructure('barracks',12,11);g.recruitSoldiers();
 const e=g.spawnEnemy('gargoyle',{x:10,z:10});g.phase='battle';tick(g,3);assert.ok(e.x>12);assert.equal(wall.hp,wall.maxHp);assert.equal(e.hp,e.maxHp);
});

test('spike movement penalty is real and paving speeds up soldier movement',()=>{
 function enemyTravel(spikes:boolean){const g=flat();for(const t of g.tiles){t.active=t.z===10;t.spikes=spikes;}Object.assign(g.goal,{x:35,z:10});const e=g.spawnEnemy('goblin',{x:10,z:10});e.hp=1000;g.phase='battle';tick(g,.3);return e.x-10;}
 const normal=enemyTravel(false),slowed=enemyTravel(true);assert.ok(Math.abs(slowed/normal-.65)<.01);
 function soldierTravel(paved:boolean){const g=flat();g.addStructure('barracks',10,10);g.recruitSoldiers();const s=g.soldiers[0];g.soldiers=[s];Object.assign(s,{x:14,z:10,y:.9,guard:{x:18,z:10},path:[],revision:-1});for(const t of g.tiles)t.paved=paved;tick(g,.3);return Math.hypot(s.x-14,s.z-10);}
 assert.ok(soldierTravel(true)>soldierTravel(false)*1.3);
});

test('card drag release is free, next click builds once, and only terrain creates extensions',()=>{
 const g=flat(),draft=new BuildPlacement(),gold=g.resources.gold;
 draft.begin('cannon');draft.dragging=true;draft.move({x:10,z:10});
 assert.equal(draft.click(g,{x:10,z:10}),'invalid');assert.equal(draft.confirm(g),false);
 draft.dragging=false;assert.equal(g.resources.gold,gold);
 assert.equal(draft.click(g,{x:10,z:10}),'built');assert.equal(draft.anchor,null);assert.equal(g.resources.gold,gold-COSTS.cannon.gold);
 draft.begin('wall');assert.equal(draft.click(g,{x:14,z:10}),'built');assert.equal(draft.neighbors(g).length,4);
 draft.move({x:25,z:25});assert.equal(draft.point,null);
 assert.equal(draft.click(g,{x:15,z:10}),'built');assert.deepEqual(draft.anchor,{x:15,z:10});assert.equal(draft.neighbors(g).length,3);
 const money=g.resources.gold;assert.equal(draft.click(g,{x:20,z:20}),'cancelled');assert.equal(draft.tool,'inspect');assert.equal(g.resources.gold,money);
 draft.begin('barracks');assert.equal(draft.click(g,{x:20,z:20}),'built');assert.equal(draft.anchor,null);
});
test('extension ghosts revalidate occupation and gold, while invalid first placement stays available',()=>{
 const g=flat(),draft=new BuildPlacement();draft.begin('wall');draft.click(g,{x:10,z:10});
 g.addStructure('wall',11,10);assert.equal(draft.neighbors(g).length,3);const money=g.resources.gold;
 assert.equal(draft.click(g,{x:11,z:10}),'cancelled');assert.equal(g.resources.gold,money);
 draft.begin('wall');assert.equal(draft.click(g,{x:11,z:10}),'invalid');assert.ok(draft.point);
 draft.click(g,{x:15,z:10});g.resources.gold=0;assert.deepEqual(draft.neighbors(g),[]);assert.equal(draft.click(g,{x:16,z:10}),'cancelled');
 assert.equal(g.resources.gold,0);draft.begin('wall');draft.click(g,null);draft.cancel();assert.equal(draft.anchor,null);
});
test('directional structures accept free angles only in preparation, with correct handedness',()=>{
 const g=flat(),c=g.addStructure('cannon',10,10),a=g.addStructure('archer',12,10),money=g.resources.gold;
 assert.ok(isDirectional(c));assert.equal(isDirectional(a),false);
 assert.ok(g.orientStructure(c.id,.371));assert.ok(Math.abs(c.facing!-.371)<1e-10);
 assert.ok(g.orientStructure(c.id,0));assert.ok(g.rotateStructure(c.id,TURN_CLOCKWISE));
 // From +Z (down on an overhead map), clockwise points toward -X (left).
 assert.ok(Math.sin(c.facing!)<0);assert.ok(g.rotateStructure(c.id,TURN_COUNTERCLOCKWISE));assert.ok(Math.abs(c.facing!)<1e-10);
 assert.equal(g.orientStructure(c.id,NaN),false);assert.equal(g.orientStructure(a.id,1),false);
 for(const phase of ['battle','victory','defeat'] as const){g.phase=phase;const before=c.facing;assert.equal(g.orientStructure(c.id,1),false);assert.equal(c.facing,before);}
 assert.equal(g.resources.gold,money);g.phase='preparation';g.upgrade(c.id);g.upgrade(c.id,'bombard');assert.equal(isDirectional(c),false);assert.equal(g.orientStructure(c.id,1),false);
});


test('initial tower foundations reserve upgrade space and cannot be overlapped from either side',()=>{
 const g=flat();assert.ok(g.build('archer',10,10));const tower=g.structureAt(10,10)!,gold=g.resources.gold;
 for(const [x,z] of [[11,10],[11,11]])for(const kind of ['mage','barracks','wall','palisade','road','dig','raise','lower','spikes'] as const){
  assert.equal(g.build(kind,x,z),false,kind);assert.equal(g.resources.gold,gold);
 }
 assert.ok(g.build('mage',12,10));assert.ok(g.upgrade(tower.id));assert.ok(g.upgrade(tower.id,'ranger'));
 assert.ok(g.build('wall',10,12));assert.ok(g.build('wall',11,12),'walls still join without gaps');
 const reverse=flat();assert.ok(reverse.build('wall',10,10));assert.equal(reverse.build('mage',11,10),false);
 const cannon=flat();assert.ok(cannon.build('cannon',10,10));assert.equal(cannon.build('archer',12,10),false);assert.ok(cannon.build('archer',13,10));
});
test('expanded foundations reject unsupported ground and earthworks without spending gold',()=>{
 for(const patch of [{water:true},{chasm:true},{h:4},{active:false},{spikes:true},{paved:true}]){
  const g=flat();Object.assign(g.tile(11,11)!,patch);const gold=g.resources.gold;
  assert.equal(g.build('mage',10,10),false);assert.equal(g.resources.gold,gold);assert.equal(g.structures.length,0);
 }
});
test('terrain fortifications cannot be upgraded but retain repair and removal',()=>{
 const g=flat();for(const kind of ['wall','palisade'] as const){
  const s=g.addStructure(kind,10,10),gold=g.resources.gold;assert.equal(g.upgrade(s.id),false);assert.equal(s.level,1);assert.equal(g.resources.gold,gold);
  s.hp-=20;assert.ok(g.repairStructure(s.id));assert.equal(s.hp,s.maxHp);assert.ok(g.build('remove',10,10));
 }
});
test('all tower tiers and branches fit inside their reserved footprint, including cannon rotation',async()=>{
 const {towerModel}=await import('../src/render/tower-models');const {Box3}=await import('three');
 const {TOWER_KINDS,BRANCHES}=await import('../src/simulation/towers');const {buildingFootprint}=await import('../src/simulation/footprint');
 for(const kind of [...TOWER_KINDS,'barracks'] as const)for(const level of [1,2,3]){
  const branches=level<3?[undefined]:kind==='barracks'?['spellblade','paladin'] as const:Object.values(BRANCHES).filter(b=>b.kind===kind).map(b=>b.id);
  for(const branch of branches){const model=towerModel(kind,level,kind==='barracks'?undefined:branch as any,kind==='barracks'?branch as any:undefined);
   for(const angle of kind==='cannon'?[0,Math.PI/8,Math.PI/4]:[0]){model.rotation.y=angle;const bounds=new Box3().setFromObject(model),half=buildingFootprint(kind)/2;
    assert.ok(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z))<=half+.001,`${kind} ${level} ${branch}`);
   }
   model.traverse(o=>{if('geometry' in o)(o.geometry as any).dispose();});
  }
 }
});
