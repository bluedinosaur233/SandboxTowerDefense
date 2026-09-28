import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONTINENT, sampleContinent, random, STAGES, ROUTES, REGIONS, worldPoint, TERRAIN_CELL } from './continent';
import { continentLandmarks } from './landmarks';
import { atlasSettlements, settlementBlocks, settlementClearance } from './settlements';
import type { Block } from './terrain-geometry';
import { buildAtlasGrid, buildAtlasSurface, gridTile } from './surface';
import { createAtlasWater } from './ocean';
import type { MapId } from '../simulation/maps';

export class CampaignScene {
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.OrthographicCamera(-400,400,300,-300,.5,6000);
  readonly controls:OrbitControls;
  readonly landCells:number;
  private clouds:THREE.Group[]=[];
  private beacons=new Map<MapId,THREE.Mesh>();
  private focusTarget:THREE.Vector3|null=null;
  private clock=0;
  private smoke=new THREE.Group();
  private mesh:THREE.InstancedMesh;
  private water:THREE.ShaderMaterial;
  constructor(private renderer:THREE.WebGLRenderer){
    this.scene.background=new THREE.Color('#086086');
    this.scene.add(new THREE.HemisphereLight('#f2f5db','#54758b',1.65));
    const sun=new THREE.DirectionalLight('#fff0d5',2.6);sun.position.set(-350,650,280);sun.castShadow=true;
    sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-530,right:530,top:420,bottom:-420,near:1,far:1500});sun.shadow.normalBias=.4;sun.shadow.bias=-.00008;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;this.scene.add(sun);
    const grid=buildAtlasGrid(),surface=buildAtlasSurface(grid);this.landCells=grid.landCells;
    const terrain=new THREE.Mesh(surface.land,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.castShadow=true;terrain.receiveShadow=true;this.scene.add(terrain);
    const {material:water}=createAtlasWater(grid);this.water=water;
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(10000,10000),water);ocean.rotation.x=-Math.PI/2;this.scene.add(ocean);
    const inland=new THREE.Mesh(surface.water,water);this.scene.add(inland);
    const lava=new THREE.Mesh(surface.lava,new THREE.MeshStandardMaterial({color:'#ff9b39',emissive:'#f96917',emissiveIntensity:.8,roughness:1}));this.scene.add(lava);
    const blocks:Block[]=[];
    const block=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>blocks.push({x,y,z,w,h,d,color});
    const tree=(x:number,z:number,h:number,snow=false,palm=false,broad=false)=>{
      const y=gridTile(grid,x,z).h;block(x,y+h*.4,z,palm?.4:.5,h*.8,.5,'#705437');
      if(palm){for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){block(x+dx*1.2,y+h,z+dz*1.2,dx?3.2:.7,.25,dz?3.2:.7,'#5d8c3f');block(x+dx*2,y+h-.6,z+dz*2,dx?1.3:.65,.25,dz?1.3:.65,'#719d43');}}
      else if(broad){for(let k=0;k<3;k++)block(x,y+h*.64+k*.85,z,h*.62-k*.4,1.2,h*.56-k*.3,k===2?'#769a43':'#568333');}
      else for(let i=0;i<4;i++){const w=h*(.67-i*.13);block(x,y+h*.4+i*h*.18,z,w,h*.24,w,snow&&i>1?'#dfe9df':i%2?'#497b48':'#346a43');}
    };
    const nearStage=(x:number,z:number)=>STAGES.some(n=>Math.hypot(n.x-x,n.z-z)<11);
    const routePoints:THREE.Vector3[]=[];
    for(const route of ROUTES){const curve=new THREE.CatmullRomCurve3(route.map(([x,z])=>new THREE.Vector3(x,0,z)));routePoints.push(...curve.getSpacedPoints(800));}
    const roads=new Set<string>();for(const p of routePoints)for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)roads.add(`${Math.round(p.x)+dx},${Math.round(p.z)+dz}`);
    // Spaced, jittered candidates keep forests dense without repeating a grid of crowns.
    for(let z=-CONTINENT.depth/2+2;z<CONTINENT.depth/2-2;z+=3.8)for(let x=-CONTINENT.width/2+2;x<CONTINENT.width/2-2;x+=3.8){
      const r=random(x,z),px=x+(random(z,x)-.5)*2,pz=z+(random(x+19,z)-.5)*2,sample=gridTile(grid,px,pz),t={...sample,biome:random(px+53,pz+97)<sample.blend?sample.fringe:sample.biome};
      if(settlementClearance(px,pz)||nearStage(px,pz)||roads.has(`${Math.round(px)},${Math.round(pz)}`)||Math.hypot(px+240,pz+18)<24)continue;
      const h=4+r*5;
      if(t.biome==='forest'&&r>.23+.15*Math.sin(x*.037)*Math.cos(z*.031))tree(px,pz,h,false,false,r>.89);
      else if((t.biome==='meadow'||t.biome==='chalk')&&r>.87+.07*Math.sin(x*.05+z*.04))tree(px,pz,h*.75,false,false,r>.97);
      else if(t.biome==='mountain'&&t.h<39&&r>.69)tree(px,pz,h*.7,true);
      else if(t.biome==='autumn'&&r>.39){block(px,t.h+h*.35,pz,.45,h*.7,.45,'#71523a');const color=r>.78?'#c97631':r>.6?'#d4a23d':'#a6933b';for(let i=0;i<3;i++)block(px,t.h+h*.55+i*1.1,pz,3.7-i*.65,1.65,3.4-i*.5,color);}
      else if(t.biome==='tropical'&&r>.56)tree(px,pz,5+r*3,false,true);
      else if(t.biome==='marsh'&&r>.57){block(px,t.h+.75,pz,.25,1.5,.25,'#a1a398');if(r>.87){block(px,t.h+2.2,pz,.5,4.4,.5,'#73707b');block(px+.75,t.h+3.2,pz,1.8,.28,.3,'#817b84');}else block(px+.4,t.h+.8,pz,.7,.6,.7,'#9474a5');}
      else if(t.biome==='volcanic'&&r>.93)block(px,t.h+1.5,pz,1,3,1.1,'#42434b');
      else if(t.biome==='desert'&&Math.hypot(px/3-74,pz/3-29)<8&&r>.55)tree(px,pz,6,false,true);
      else if((t.biome==='canyon'||t.biome==='mountain')&&r>.91)block(px,t.h+.75,pz,1.4,1.5,1.5,t.biome==='canyon'?'#ca9056':'#9caaa3');
    }
    // Sparse ochre roads have a consistent width, without hundreds of flashing coplanar caps.
    const roadCells=new Set<string>();for(const p of routePoints){const x=Math.round(p.x/TERRAIN_CELL)*TERRAIN_CELL,z=Math.round(p.z/TERRAIN_CELL)*TERRAIN_CELL,key=`${x},${z}`;if(roadCells.has(key))continue;roadCells.add(key);const t=gridTile(grid,x,z);if(['sea','lake','river'].includes(t.biome))continue;block(x,t.h+.065,z,TERRAIN_CELL,.12,TERRAIN_CELL,'#cbb887');}
    routePoints.forEach((p,i)=>{if(i%44===0){const t=gridTile(grid,p.x,p.z);if(t.h>1)block(p.x,t.h+.24,p.z,.55,.35,.55,'#f4d798');}});
    blocks.push(...continentLandmarks(),...settlementBlocks());
    for(const stage of STAGES){const {x,z}=stage,y=sampleContinent(x,z).h;
      block(x,y+.2,z,7,.45,6,'#9a9d85');block(x,y+1.8,z,3.8,3.2,3.5,'#d7cdae');
      for(const dx of [-2.7,2.7])for(const dz of [-2.3,2.3]){block(x+dx,y+2.2,z+dz,1.6,4.4,1.6,'#cdc7ac');for(let k=0;k<3;k++)block(x+dx,y+4.5+k*.4,z+dz,2.1-k*.5,.45,2.1-k*.5,'#476e79');}
      block(x,y+4,z,3.4,1.1,2.8,'#cbc3a2');block(x,y+4.8,z,3.8,.5,3.2,'#567881');block(x,y+7,z,.18,6,.18,'#73583b');block(x+.9,y+8.5,z,1.8,2.3,.12,'#b94135');block(x+.9,y+9.75,z,2.2,.14,.18,'#edc778');
      const ring=new THREE.Mesh(new THREE.RingGeometry(5,5.22,64),new THREE.MeshBasicMaterial({color:'#ffe5a0',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,y+.47,z);this.scene.add(ring);this.beacons.set(stage.id,ring);
    }
    const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({roughness:1});this.mesh=new THREE.InstancedMesh(geometry,material,blocks.length);const matrix=new THREE.Object3D(),color=new THREE.Color();
    blocks.forEach((b,i)=>{matrix.position.set(b.x,b.y,b.z);matrix.scale.set(b.w,b.h,b.d);matrix.updateMatrix();this.mesh.setMatrixAt(i,matrix.matrix);this.mesh.setColorAt(i,color.set(b.color));});this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.computeBoundingSphere();this.scene.add(this.mesh);
    const smokeMat=new THREE.MeshStandardMaterial({color:'#aaa5a0',transparent:true,opacity:.3,depthWrite:false,roughness:1});const crater=worldPoint(82,-49);this.smoke.position.set(crater.x,75,crater.z);
    for(let i=0;i<10;i++){const m=new THREE.Mesh(geometry,smokeMat);m.position.set(Math.sin(i)*3,i*4,Math.cos(i)*2);m.scale.set(6+i*.9,5,6+i*.8);this.smoke.add(m);}this.scene.add(this.smoke);
    const cloudMat=new THREE.MeshStandardMaterial({color:'#e5ece8',transparent:true,opacity:.35,depthWrite:false,roughness:1});
    for(const [ax,az] of [[-135,55],[130,93],[-34,-108],[-72,101]]){const cloud=new THREE.Group(),p=worldPoint(ax,az);cloud.position.set(p.x,70,p.z);for(let i=0;i<8;i++){const m=new THREE.Mesh(geometry,cloudMat);m.position.set(i*4-14,Math.sin(i)*1.5,Math.cos(i)*5);m.scale.set(13,3+random(i,ax)*5,11);cloud.add(m);}this.clouds.push(cloud);this.scene.add(cloud);}
    this.controls=new OrbitControls(this.camera,renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.085;this.controls.enableRotate=false;this.controls.screenSpacePanning=false;this.controls.minZoom=.7;this.controls.maxZoom=9;
    this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.PAN};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};this.controls.addEventListener('start',()=>this.focusTarget=null);this.reset();this.controls.enabled=false;
  }
  reset(){this.focusTarget=null;this.controls.enableDamping=false;this.controls.update();this.controls.target.set(-30,0,-15);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(40,660,760));this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();this.controls.enableDamping=true;}
  resize(width:number,height:number){const aspect=width/height,extent=Math.max(337,465/aspect),shift=width<=580?-extent*.2:0;this.camera.left=-extent*aspect;this.camera.right=extent*aspect;this.camera.top=extent+shift;this.camera.bottom=-extent+shift;this.camera.updateProjectionMatrix();}
  focus(id:MapId){const stage=STAGES.find(n=>n.id===id)!;this.focusTarget=new THREE.Vector3(stage.x*.48,0,stage.z*.45);this.camera.zoom=1;this.camera.updateProjectionMatrix();}
  explore(index:number){const region=REGIONS[index];if(!region)return;const capital=atlasSettlements().find(s=>s.region===index&&s.capital),x=capital?.x??region.x,z=capital?.z??region.z;this.focusTarget=new THREE.Vector3(x,sampleContinent(x,z).h*.45,z-15);this.camera.zoom=2.8;this.camera.updateProjectionMatrix();}
  zoom(delta:number){this.camera.zoom=THREE.MathUtils.clamp(this.camera.zoom*delta,.7,9);this.camera.updateProjectionMatrix();}
  project(x:number,z:number,y=sampleContinent(x,z).h){const p=new THREE.Vector3(x,y,z).project(this.camera);const rect=this.renderer.domElement.getBoundingClientRect();return {x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};}
  render(time:number,selected:MapId){
    const dt=Math.min(.05,Math.max(0,time-this.clock));this.clock=time;
    if(this.focusTarget){const delta=this.focusTarget.clone().sub(this.controls.target).multiplyScalar(1-Math.exp(-dt*5));this.camera.position.add(delta);this.controls.target.add(delta);if(delta.length()<.01)this.focusTarget=null;}
    this.controls.update();const clamped=this.controls.target.clone();clamped.x=THREE.MathUtils.clamp(clamped.x,-435,445);clamped.z=THREE.MathUtils.clamp(clamped.z,-300,300);clamped.y=THREE.MathUtils.clamp(clamped.y,0,80);this.camera.position.add(clamped.clone().sub(this.controls.target));this.controls.target.copy(clamped);
    this.beacons.forEach((ring,id)=>{ring.visible=id===selected;ring.scale.setScalar(1+Math.sin(time*2)*.045);});this.water.uniforms.time.value=time;
    this.smoke.children.forEach((p,i)=>{p.position.x=Math.sin(time*.2+i*.45)*(2+i*.7);p.position.y=i*4+Math.sin(time*.35+i)*1.2;});this.clouds.forEach((cloud,i)=>{cloud.position.x+=Math.sin(time*.035+i)*dt*.4;});this.renderer.render(this.scene,this.camera);
  }
  get blockCount(){return this.mesh.count;}
}
