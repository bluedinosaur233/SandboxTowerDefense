import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTINENT, sampleContinent, STAGES, REGIONS, type Biome } from '../src/campaign/continent';
import { readProgress, recordVictory } from '../src/campaign/progress';
import { MAPS } from '../src/simulation/maps';

test('the continent has large connected biome areas and dry playable outposts',()=>{
  const counts=new Map<Biome,number>();let highest=0;
  for(let z=-CONTINENT.depth/2;z<CONTINENT.depth/2;z++)for(let x=-CONTINENT.width/2;x<CONTINENT.width/2;x++){
    const t=sampleContinent(x,z);assert.ok(Number.isFinite(t.h));counts.set(t.biome,(counts.get(t.biome)??0)+1);highest=Math.max(highest,t.h);
  }
  for(const biome of ['forest','snow','desert','river','canyon','meadow'] as Biome[])assert.ok(counts.get(biome)!>300,biome);
  assert.ok(highest>=25);
  assert.equal(STAGES.length,Object.keys(MAPS).length);
  for(const n of STAGES){const t=sampleContinent(n.x,n.z);assert.ok(!['river','sea','coast'].includes(t.biome),n.id+' must sit on dry land');assert.ok(MAPS[n.id]);}
});
test('campaign progress validates storage and preserves the best completion',()=>{
  assert.deepEqual(readProgress('broken'),{});assert.deepEqual(readProgress('null'),{});
  assert.deepEqual(readProgress('{"river":3,"mountain":4,"canyon":-1}'),{river:3});
  let p=recordVictory({},'river',100);assert.equal(p.river,3);
  p=recordVictory(p,'river',10);assert.equal(p.river,3);
  p=recordVictory(p,'mountain',50);assert.equal(p.mountain,2);
  p=recordVictory(p,'canyon',5);assert.equal(p.canyon,1);
  assert.deepEqual(readProgress(JSON.stringify(p)),p);
});

test('terrain surface layers have no overlapping volumes or duplicate top faces',async()=>{
  const {terrainColumn}=await import('../src/campaign/terrain-geometry');
  // Exercise every height actually used by the generated land and water.
  const heights=new Set<number>();
  for(let z=-60;z<60;z++)for(let x=-84;x<84;x++){
    const t=sampleContinent(x,z);if(t.biome!=='sea')heights.add(t.h);
  }
  const bounds=(b:ReturnType<typeof terrainColumn>[number])=>({left:b.x-b.w/2,right:b.x+b.w/2,bottom:b.y-b.h/2,top:b.y+b.h/2});
  for(const h of heights){
    const [base,cap]=terrainColumn(0,0,h,'rock','surface').map(bounds);
    assert.ok(Math.abs(base.top-cap.bottom)<1e-12,'layers must meet without intersection');
    assert.ok(Math.abs(cap.top-h)<1e-12,'top surface must keep the original terrain elevation');
    assert.ok(base.top<cap.top-.3,'rock top must not coincide with visible surface');
    const adjacent=terrainColumn(1,0,h,'rock','surface').map(bounds);
    assert.ok(base.right<=adjacent[0].left&&cap.right<=adjacent[1].left,'adjacent columns must not overlap');
  }
});

test('the expanded atlas keeps every non-playable frontier distinct and explorable',()=>{
  const counts=new Map<Biome,number>();
  for(let z=-CONTINENT.depth/2;z<CONTINENT.depth/2;z++)for(let x=-CONTINENT.width/2;x<CONTINENT.width/2;x++){const b=sampleContinent(x,z).biome;counts.set(b,(counts.get(b)??0)+1);}
  for(const biome of ['lake','marsh','autumn','volcanic','lava','tropical','chalk'] as Biome[])assert.ok((counts.get(biome)??0)>100,`${biome} should occupy the atlas`);
  assert.equal(REGIONS.length,12);
  assert.ok(REGIONS.every(region=>Number.isFinite(sampleContinent(region.x,region.z).h)));
});

test('visible-face terrain has a single continuous top and no interior plateau walls',async()=>{
  const {buildAtlasSurface,BIOMES}=await import('../src/campaign/surface');
  const grid={width:3,depth:3,heights:new Float32Array(9).fill(2),biomes:new Uint8Array(9).fill(BIOMES.indexOf('meadow')),shore:new Float32Array(9),landCells:9};
  const meshes=buildAtlasSurface(grid),p=meshes.land.getAttribute('position'),n=meshes.land.getAttribute('normal'),index=meshes.land.index!;
  let area=0;
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(n.getY(a)===1){assert.equal(p.getY(a),2);area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;}
    else if(n.getX(a)!==0)assert.ok(p.getX(a)===-2||p.getX(a)===1,'only boundary X walls');
    else assert.ok(p.getZ(a)===-2||p.getZ(a)===1,'only boundary Z walls');
  }
  assert.equal(area,9,'top coverage must contain no gaps or overlapping caps');
  assert.equal(meshes.water.getAttribute('position').count,0);
  for(const g of Object.values(meshes))g.dispose();
  grid.heights[4]=4;
  const stepped=buildAtlasSurface(grid),sp=stepped.land.getAttribute('position'),sn=stepped.land.getAttribute('normal');let risers=0;
  for(let i=0;i<sp.count;i++)if(sn.getY(i)===0&&Math.abs(sp.getX(i)+.5)<=.51&&Math.abs(sp.getZ(i)+.5)<=.51){assert.ok(sp.getY(i)>=2,'buried interior walls must be removed');risers++;}
  assert.ok(risers>0,'an elevated cell must retain exposed step faces');for(const g of Object.values(stepped))g.dispose();
});

test('shore distance hugs islands and coves and stays zero on dry land',async()=>{
  const {shoreDistances}=await import('../src/campaign/surface');
  const water=new Uint8Array(49).fill(1);water[24]=0;
  const shore=shoreDistances(7,7,water);
  assert.equal(shore[24],0);assert.equal(shore[25],1);assert.equal(shore[26],2);
  assert.ok(Math.abs(shore[32]-Math.SQRT2)<1e-6);assert.ok(shore[0]>shore[8]);
  water[23]=0;water[17]=0;const cove=shoreDistances(7,7,water);assert.equal(cove[16],1);assert.equal(cove[23],0);
});

test('expanded regions reserve substantially more land than individual outposts',()=>{
  assert.equal(CONTINENT.width*CONTINENT.depth,583200);
  const clearings=new Map<Biome,number>();
  // Non-overlapping 14-unit neighborhoods can house separate future stage landmarks.
  for(let z=-CONTINENT.depth/2+14;z<CONTINENT.depth/2-14;z+=14)for(let x=-CONTINENT.width/2+14;x<CONTINENT.width/2-14;x+=14){const t=sampleContinent(x,z);if(['sea','river','lake','lava'].includes(t.biome))continue;
    if([[-5,-5],[5,-5],[-5,5],[5,5]].every(([dx,dz])=>{const p=sampleContinent(x+dx,z+dz);return p.biome===t.biome&&Math.abs(p.h-t.h)<4;}))clearings.set(t.biome,(clearings.get(t.biome)??0)+1);
  }
  for(const b of ['forest','meadow','desert','canyon','autumn','marsh','tropical','chalk'] as Biome[])assert.ok((clearings.get(b)??0)>=8,`${b} needs room for many landmarks`);
});

test('ocean shelves continue past the terrain boundary without a rectangular color seam',async()=>{
  const {oceanShore}=await import('../src/campaign/ocean');const {BIOMES}=await import('../src/campaign/surface');
  const grid={width:3,depth:3,heights:new Float32Array(9),biomes:new Uint8Array(9),shore:new Float32Array(9),landCells:1};grid.biomes[5]=BIOMES.indexOf('tropical');
  const field=oceanShore(grid),row=65*field.width;
  assert.equal(field.distance[row+66],0);assert.equal(field.distance[row+67],1,'shelf must extend outside the original grid');
  assert.equal(field.distance[row+68],2);assert.ok(field.distance[row+field.width-1]>=64,'texture edge must meet deep open water');
});

test('moderate atlas sampling preserves world size and prop elevation alignment',async()=>{
  const {TERRAIN_CELL}=await import('../src/campaign/continent');const {buildAtlasGrid,gridTile}=await import('../src/campaign/surface');
  const grid=buildAtlasGrid();assert.equal(grid.width*grid.depth,259200);assert.equal(grid.width*TERRAIN_CELL,CONTINENT.width);assert.equal(grid.depth*TERRAIN_CELL,CONTINENT.depth);
  for(const stage of STAGES)assert.equal(gridTile(grid,stage.x,stage.z).h,sampleContinent(stage.x,stage.z).h);
  assert.ok(grid.blends!.filter(b=>b>0).length>grid.landCells*.2,'ecological borders need broad mixed cover');
});

test('ecological borders change elevation continuously instead of switching plateaus',async()=>{
  const {sampleGeography}=await import('../src/campaign/continent');
  const transects=[{x:-65,z:-10,dx:1,dz:0,length:45},{x:90,z:-5,dx:0,dz:1,length:50},{x:-103,z:17,dx:1,dz:0,length:25},{x:20,z:53,dx:0,dz:1,length:24},{x:35,z:-49,dx:1,dz:0,length:23}];
  for(const line of transects){let prev=sampleGeography(line.x,line.z);for(let d=.03;d<=line.length;d+=.03){const t=sampleGeography(line.x+line.dx*d,line.z+line.dz*d);if(!['sea','river','lake','lava'].includes(t.biome)&&!['sea','river','lake','lava'].includes(prev.biome))assert.ok(Math.abs(t.h-prev.h)<.3,`abrupt dry boundary at ${line.x+line.dx*d},${line.z+line.dz*d}`);prev=t;}}
});

test('regional capitals and settlements respect habitability, foundations and distinct architecture',async()=>{
  const {atlasSettlements,settlementBlocks}=await import('../src/campaign/settlements');const towns=atlasSettlements(),capitals=towns.filter(t=>t.capital);
  assert.equal(capitals.length,11);assert.equal(towns.filter(t=>!t.capital).length,24);assert.ok(!towns.some(t=>t.region===10),'volcanic zone has no residents');
  assert.equal(new Set(capitals.map(t=>t.region)).size,11);assert.equal(new Set(capitals.map(t=>t.theme)).size,11);
  for(const capital of capitals){assert.ok(capital.buildings.length>=8,capital.name+' needs a civic cluster');assert.ok(towns.some(t=>!t.capital&&t.region===capital.region));}
  assert.ok(capitals.find(t=>t.theme==='meadow')!.buildings.length>capitals.find(t=>t.theme==='marsh')!.buildings.length);
  for(const town of towns)for(const b of town.buildings){assert.ok(b.floor>=b.bottom);for(const [dx,dz] of [[0,0],[-b.width/2,-b.depth/2],[b.width/2,-b.depth/2],[-b.width/2,b.depth/2],[b.width/2,b.depth/2]]){const tile=sampleContinent(b.x+dx,b.z+dz);assert.ok(!['sea','lava'].includes(tile.biome),town.name);if(town.theme!=='marsh')assert.ok(!['river','lake'].includes(tile.biome),town.name);assert.ok(b.floor>=tile.h,town.name+' foundation must support the full footprint');}assert.ok(STAGES.every(stage=>Math.hypot(stage.x-b.x,stage.z-b.z)>12),'settlements must not swallow playable keeps');}
  const blocks=settlementBlocks();assert.ok(blocks.length>3000);assert.ok(blocks.every(b=>[b.x,b.y,b.z,b.w,b.h,b.d].every(Number.isFinite)&&b.w>0&&b.h>0&&b.d>0));
});

test('scaled voxel geometry and sea shelves use world units consistently',async()=>{
  const {buildAtlasSurface,BIOMES}=await import('../src/campaign/surface');const {oceanShore}=await import('../src/campaign/ocean');
  const grid={width:2,depth:2,cellSize:1.5,heights:new Float32Array(4).fill(3),biomes:new Uint8Array(4).fill(BIOMES.indexOf('meadow')),landCells:4};
  const mesh=buildAtlasSurface(grid),g=mesh.land,p=g.getAttribute('position'),n=g.getAttribute('normal'),indices=g.index!;let area=0;
  for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);if(n.getY(a)===1)area+=Math.abs((p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a))-(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a)))/2;}
  assert.equal(area,9);for(const geo of Object.values(mesh))geo.dispose();
  const shore=oceanShore(grid),pad=Math.ceil(64/1.5),row=pad*shore.width;
  assert.equal(shore.distance[row+pad+2],1.5);assert.equal(shore.distance[row+pad+3],3);assert.ok(shore.distance[row+shore.width-1]>=64);
});
