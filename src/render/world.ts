import { BossWarning } from './boss-effects';
import { BOSS_SLAM } from '../simulation/enemies';
import { towerModel } from './tower-models';
import { renderSanctuaries } from './barracks-effects';
import { renderHeroEffects } from './hero-effects';
import { createElfModel } from '../heroes/model';
import { renderAttackEffects } from './attack-effects';
import { isDirectional, isTower, towerAttack, type TowerBranch } from '../simulation/towers';
import { type BarracksBranch } from '../simulation/barracks';
import { unitModel as detailedUnitModel, animateUnit, locomotionAmount } from './units';
import * as THREE from 'three';
import { DamageVisibility } from './health';
import { RangeDisplay } from './range';
import { terrainPalette } from './terrain-palette';
import { cameraMotion } from './camera-motion';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game, WIDTH, DEPTH, HEIGHT_UNIT, STATS, type Point, type Structure, type Tool, type Enemy, type Soldier, type Outpost } from '../simulation/game';

const C = { grass: '#718b43', grass2: '#91a955', dirt: '#b69a6c', stone: '#aaa18a', rock: '#827158', darkRock: '#5d594b', wood: '#5c3f29', woodLight: '#a06f3e', cream: '#d7c79c', teal: '#2f8790', blue: '#4d9eb8', leaf: '#3f6d3e', leafLight: '#6f9748', water: '#3b9eaa', gold: '#d8b35e' };
const cube = new THREE.BoxGeometry(1, 1, 1);
const pickGeometry = new THREE.PlaneGeometry(1,1);
const pickMaterial = new THREE.MeshBasicMaterial({visible:false});
const crystalGeometry = new THREE.OctahedronGeometry(0.42);
const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string) { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true })); return materials.get(color)!; }
function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
  const mesh = new THREE.Mesh(cube, mat(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
const placementGridMaterial=new THREE.LineBasicMaterial({color:'#ffedb6',transparent:true,opacity:.35,depthWrite:false});
function groundWorkModel(tool:string){const g=new THREE.Group();box(g,0,.08,0,.96,tool==='raise'?.55:.14,.96,tool==='dig'?'#6edee0':tool==='road'?'#c2bcab':'#b4ba83');if(tool==='spikes')for(const x of [-.3,0,.3])for(const z of [-.3,.3])box(g,x,.35,z,.1,.55,.1,C.woodLight);return g;}
function flag(parent: THREE.Object3D, x: number, y: number, z: number, color = C.teal) {
  box(parent,x,y,z,0.055,1.25,0.055,C.wood);
  box(parent,x+0.28,y+0.35,z,0.5,0.35,0.06,color);
  box(parent,x+0.44,y+0.17,z,0.18,0.13,0.06,color);
}
function steppedRoof(g: THREE.Object3D, y: number, width: number, color = C.teal) {
  for(let i=0;i<4;i++) box(g,0,y+i*0.2,0,width-i*width*0.19,0.23,width-i*width*0.19,color);
}
function banner(g: THREE.Object3D, x:number, y:number, z:number, color=C.blue) {
  box(g,x,y,z,.32,.62,.035,color);
  box(g,x,y+.33,z,.41,.045,.06,C.gold);
  box(g,x,y-.13,z+.026,.038,.29,.018,C.gold);
  box(g,x,y-.07,z+.026,.17,.038,.018,C.gold);
}
export function outpostModel(post:Pick<Outpost,'kind'|'owned'|'level'|'streak'>):THREE.Group {
  const g=new THREE.Group(),working=post.owned;
  box(g,0,.05,0,2.9,.1,2.9,post.kind==='farm'?'#826344':'#8b8673');
  if(post.kind==='farm'){
    box(g,-.6,.55,-.6,1.2,1.1,1,C.cream);
    for(let i=0;i<(working?4:2);i++)box(g,-.6,1.15+i*.18,-.6,1.5-i*.3,.2,1.4,'#9a5740');
    box(g,-.6,.36,-.05,.3,.72,.06,C.wood);
    for(let x=0;x<4;x++)for(let z=0;z<6;z++)box(g,.15+x*.32,.18+(working?.18:0),-.95+z*.36,.13,working?.55:.15,.16,working?'#d5ba58':'#827a48');
    for(const z of [-1.4,1.4]){box(g,0,.36,z,2.8,.08,.08,C.woodLight);for(const x of [-1.3,0,1.3])box(g,x,.25,z,.09,.5,.09,C.wood);}
  }else{
    box(g,0,.7,-.6,2.5,1.4,1.4,'#777d76');box(g,0,.55,.12,1.1,1.1,.08,'#252f2a');
    for(const x of [-.66,.66])box(g,x,.65,.24,.18,1.3,.2,C.woodLight);
    box(g,0,1.3,.24,1.6,.2,.24,C.woodLight);
    for(const x of [-.28,.28])box(g,x,.1,.85,.05,.08,1.2,'#575954');
    box(g,0,.35,.9,.75,.45,.6,working?'#a48351':'#645b4e');
    if(working)for(let i=0;i<3;i++)box(g,(i-1)*.2,.65,.9,.22,.25,.24,'#b6c7c2');
  }
  if(working&&post.level>=2){box(g,1,1.05,-1,.65,2.1,.7,C.cream);box(g,1,2.2,-1,.8,.3,.85,C.teal);flag(g,1,2.8,-1,C.gold);}
  if(working)for(let i=0;i<Math.min(post.streak,3);i++)box(g,-1+i*.5,.25,1,.36,.5,.4,C.gold);
  if(working)flag(g,-1.2,1.8,0,C.teal);else{box(g,-1,.3,.8,.8,.2,.3,C.wood);box(g,.5,.2,1.1,.5,.25,.4,C.rock);}
  return g;
}
type FenceDirection = readonly [number,number];
const fenceDirections:FenceDirection[]=[[1,0],[-1,0],[0,1],[0,-1]];
export function connectedBuildingModel(game:Pick<Game,'structureAt'>,s:Pick<Structure,'kind'|'x'|'z'|'level'|'branch'|'barracksBranch'|'ruined'>){
  const connections=fenceDirections.filter(([dx,dz])=>{const neighbor=game.structureAt(s.x+dx,s.z+dz);return neighbor?.kind==='wall'||neighbor?.kind==='palisade';});
  const model=buildingModel(s.kind,s.level,s.branch,s.barracksBranch,s.ruined,connections);
  if(s.kind==='wall'&&connections.some(([,dz])=>dz!==0))model.rotation.y=Math.PI/2;
  return model;
}
export function buildingModel(kind: Structure['kind'], level=1, branch?:TowerBranch, barracksBranch?:BarracksBranch,ruined=false,connections:readonly FenceDirection[]=[]): THREE.Group {
  if(isTower(kind)||kind==='barracks')return towerModel(kind,level,branch,barracksBranch);
  const g=new THREE.Group();
  if(kind==='wall') {
    box(g,0,0.1,0,1.04,0.2,0.72,C.darkRock);
    for(let layer=0;layer<(ruined?2:3);layer++) for(let k=0;k<2;k++) box(g,(k-0.5)*0.48,0.35+layer*0.3,0,0.465,0.285,0.52,layer%2?C.cream:C.stone);
    for(let k=0;k<(ruined?1:3);k++) box(g,(k-1)*0.38,ruined?.88:1.22,0,0.22,0.3,0.58,C.cream);
  }
  if(kind==='palisade'){
    if(ruined)g.scale.y=.58;
    const directions=connections.length?connections:fenceDirections.slice(0,2);
    for(const [x,z] of [[0,0],...directions.map(([dx,dz])=>[dx*.36,dz*.36])]){
      box(g,x,.6,z,.24,1.2,.27,C.woodLight);
      const tip=new THREE.Mesh(crystalGeometry,mat(C.woodLight));tip.scale.set(.3,.55,.3);tip.position.set(x,1.28,z);g.add(tip);
    }
    // Each rail reaches the shared cell edge, including corners and T junctions.
    for(const [dx,dz] of directions)for(const y of [.35,.8])box(g,dx*.26,y,dz*.26,dx?.56:.14,.14,dz?.56:.14,C.wood);
  }
  if(kind==='wall' && level>=2){for(const x of [-.5,.5])box(g,x,.66,0,.18,1.32,.78,C.stone);box(g,0,.65,.31,.95,.14,.09,C.gold);if(level===3)for(const x of [-.36,0,.36])box(g,x,1.43,0,.15,.32,.15,'#63757b');}
  g.userData={kind,level,branch};return g;
}
export function bridgeModel(rails = { north: true, south: true, east: false, west: false }, suspended = false) {
  const g = new THREE.Group();
  for (let i=0;i<5;i++) box(g,-.4+i*.2,.04,0,.18,.12,1,i%2?C.woodLight:C.wood);
  for (const z of [-.33,.33]) box(g,0,-.13,z,1.02,.18,.12,C.wood);
  for (const x of [-.44,.44]) for (const z of [-.44,.44]) box(g,x,.12,z,.09,.65,.09,C.wood);
  if (rails.north) box(g,0,.34,-.44,1,.09,.07,C.woodLight);
  if (rails.south) box(g,0,.34,.44,1,.09,.07,C.woodLight);
  if (rails.east) box(g,.44,.34,0,.07,.09,1,C.woodLight);
  if (rails.west) box(g,-.44,.34,0,.07,.09,1,C.woodLight);
  if (suspended) for (const x of [-.43, .43]) {
    box(g,x,.47,0,.035,.035,.95,C.gold); box(g,x,.63,0,.035,.035,.95,C.gold);
    for (const z of [-.38,0,.38]) box(g,x,.48,z,.035,.3,.035,C.woodLight);
  }
  g.userData.kind='bridge'; return g;
}
function castleModel() {
  const g=new THREE.Group();
  box(g,0,0.15,0,3.7,0.3,3.6,C.stone);
  box(g,0,1.12,0,2.45,2.05,2.45,C.cream);
  box(g,0,1.0,1.24,0.58,1.65,0.07,C.wood);
  box(g,-1.24,0.9,0,0.07,1.45,0.7,'#534f40');
  for(let i=0;i<5;i++)box(g,-1.28,0.85,(i-2)*0.14,0.05,1.25,0.045,'#aa9270');
  box(g,0,2.32,0,2.66,0.5,2.66,C.stone);
  for(const x of [-1.25,1.25])for(const z of [-1.25,1.25]){
    const tower=new THREE.Group();tower.position.set(x,0,z);g.add(tower);
    box(tower,0,1.6,0,0.96,3,0.96,C.cream);box(tower,0,2.75,0,1.06,0.23,1.06,C.stone);
    box(tower,0,2.15,0.491,0.17,0.52,0.04,'#657676');
    steppedRoof(tower,3.13,1.25);box(tower,0,3.95,0,0.12,0.28,0.12,C.gold);
  }
  const keep=new THREE.Group();keep.position.set(0,1.3,-0.15);g.add(keep);
  box(keep,0,1.2,0,1.35,2.4,1.4,C.cream);steppedRoof(keep,2.5,1.8);
  flag(keep,0,3.85,0);box(keep,0,1.48,0.73,0.5,0.85,0.04,C.teal);box(keep,0,1.53,0.76,0.12,0.38,0.03,C.gold);
  for(const x of [-.83,.83])banner(g,x,1.45,1.25);
  return g;
}
export { unitModel } from './units';
class Batch {
  entries: { x:number;y:number;z:number;w:number;h:number;d:number;color:string }[]=[];
  add(x:number,y:number,z:number,w:number,h:number,d:number,color:string){this.entries.push({x,y,z,w,h,d,color});}
  mesh(){const mesh=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),this.entries.length);const o=new THREE.Object3D();this.entries.forEach((e,i)=>{o.position.set(e.x,e.y,e.z);o.scale.set(e.w,e.h,e.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(e.color));});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();return mesh;}
}
export class World {
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-22,22,16,-16,0.1,180);
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private terrain=new THREE.Group();private structures=new THREE.Group();private props=new THREE.Group();private fx=new THREE.Group();
  private tileMeshes: THREE.Mesh[]=[];private unitMeshes=new Map<number,THREE.Group>();private structuresById=new Map<number,THREE.Group>();
  private raycaster=new THREE.Raycaster();private pointer=new THREE.Vector2();private revision=-1;private hover:Point|null=null;private tool:Tool='inspect';private selection:number|null=null;
  private cursor=new THREE.Group();readonly rangeDisplay=new RangeDisplay();private ghost:THREE.Group|null=null;private lastGhost='';private draft:Point|null=null;private draftFacing=Math.PI/2;private placementGrid=new THREE.Group();
  private extensions:Point[]|null=null;private extensionGhosts=new THREE.Group();private extensionKey='';private aim:{id:number;facing:number}|null=null;
  private wind=new THREE.Group();private castle=new THREE.Group();private floor!:THREE.Mesh;private contextLost=false;
  private damageVisibility=new DamageVisibility();
  onUnitClick:(id:number)=>void=()=>{};
  aimPoint:Point|null=null;
  showGrid=false;
  private bossWarning=new BossWarning();
  heroCommand=false;
  private heroModel:ReturnType<typeof createElfModel>|null=null;
  private heroClock=0;
  private heroDefeatTime=0;
  private heroRenderClock=0;
  private heroRing=this.makeHeroRing(.58,.68,'#b3ffe0');
  private heroDestination=this.makeHeroRing(.35,.47,'#fff0ab');
  private makeHeroRing(inner:number,outer:number,color:string){
    const ring=new THREE.Mesh(new THREE.RingGeometry(inner,outer,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.visible=false;return ring;
  }
  setHeroCommand(active:boolean){this.heroCommand=active;this.controls.touches.ONE=(active?undefined:THREE.TOUCH.PAN) as THREE.TOUCH;this.renderer.domElement.style.cursor=active?'crosshair':'';}

  onHover: (p:Point|null)=>void=()=>{};onClick:(p:Point|null)=>void=()=>{};
  constructor(public host:HTMLElement,public game:Game){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.setSize(host.clientWidth,host.clientHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
    this.renderer.domElement.setAttribute('aria-label','风渡前哨三维战场，点击地块建造');host.append(this.renderer.domElement);
    this.scene.background=new THREE.Color('#d6d0ad');this.scene.fog=new THREE.Fog('#d6d0ad',100,185);
    this.scene.add(new THREE.HemisphereLight('#fff4d0','#496848',2.2));
    const sun=new THREE.DirectionalLight('#ffe8c4',3.5);sun.position.set(-10,65,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:200});sun.shadow.normalBias=0.04;sun.shadow.bias=-0.0003;sun.target.position.set(WIDTH/2,0,DEPTH/2);this.scene.add(sun,sun.target);
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300),mat('#a08e68'));this.floor.rotation.x=-Math.PI/2;this.floor.position.set((WIDTH-1)/2,-3.35,(DEPTH-1)/2);this.floor.receiveShadow=true;this.scene.add(this.floor);
    this.scene.add(this.bossWarning.group,this.heroRing,this.heroDestination,this.extensionGhosts,this.terrain,this.props,this.structures,this.cursor,this.placementGrid,this.rangeDisplay.group,this.fx,this.wind);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=0.1;this.controls.minPolarAngle=0.3;this.controls.maxPolarAngle=1.22;this.controls.enablePan=true;this.controls.minZoom=0.65;this.controls.maxZoom=10;
    this.controls.mouseButtons={LEFT:undefined as unknown as THREE.MOUSE,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.resetCamera();
    this.castle=castleModel();this.castle.position.set(game.goal.x,game.ground(game.goal.x,game.goal.z),game.goal.z);this.scene.add(this.castle);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03,0.09,1.03)),new THREE.LineBasicMaterial({color:'#ffeab1',depthTest:false}));this.cursor.add(outline);this.cursor.visible=false;
    this.addInput();window.addEventListener('resize',()=>this.resize());
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.game.paused=true;this.game.say('图形连接暂时中断，正在等待恢复');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.revision=-1;this.game.say('画面已恢复，点击继续以恢复游戏');});
    this.rebuild();this.resize();
  }
  resetCamera(){this.controls.enableDamping=false;this.controls.update();this.controls.target.set((WIDTH-1)/2,this.game.map.cameraHeight,(DEPTH-1)/2);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(34,39,39));this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();this.controls.enableDamping=true;}
  focusFront(index:number){const p=this.game.entrances[index];if(!p)return;const next=new THREE.Vector3((p.x+this.game.goal.x)/2,this.game.map.cameraHeight,(p.z+this.game.goal.z)/2);const delta=next.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(next);this.controls.update();}
  moveCamera(right:number,forward:number,dt:number){
    const direction=this.camera.getWorldDirection(new THREE.Vector3());
    const delta=cameraMotion(direction.x,direction.z,right,forward,dt*22/Math.sqrt(this.camera.zoom));
    const x=THREE.MathUtils.clamp(this.controls.target.x+delta.x,-3,WIDTH+3)-this.controls.target.x;
    const z=THREE.MathUtils.clamp(this.controls.target.z+delta.z,-3,DEPTH+3)-this.controls.target.z;
    this.camera.position.x+=x;this.camera.position.z+=z;this.controls.target.x+=x;this.controls.target.z+=z;
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight,aspect=w/h,vertical=Math.max(43,57/aspect);this.camera.left=-vertical*aspect;this.camera.right=vertical*aspect;this.camera.top=vertical;this.camera.bottom=-vertical;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
  setGame(game:Game){this.heroModel?.dispose();this.heroModel=null;this.heroClock=0;this.heroDefeatTime=0;this.heroRing.visible=false;this.heroDestination.visible=false;this.setHeroCommand(false);this.rangeDisplay.hide();this.damageVisibility.clear();this.game=game;this.floor.position.y=-3.35;this.castle.position.set(game.goal.x,game.ground(game.goal.x,game.goal.z),game.goal.z);this.revision=-1;for(const m of this.unitMeshes.values())this.scene.remove(m);this.unitMeshes.clear();this.selection=null;}
  setExtensions(points:Point[]|null){this.extensions=points;this.updateHover();}
  setAim(id:number|null,facing=0){this.aim=id===null?null:{id,facing};this.controls.touches.ONE=(id===null?THREE.TOUCH.PAN:undefined) as THREE.TOUCH;this.updateHover();}
  setPlacement(point:Point|null,facing=Math.PI/2){this.draft=point;this.draftFacing=facing;this.updateHover();}
  setTool(tool:Tool){this.tool=tool;this.draft=null;this.controls.touches.ONE=(tool==='inspect'||tool==='remove'?THREE.TOUCH.PAN:undefined) as THREE.TOUCH;this.lastGhost='!refresh';this.updateHover();}
  select(id:number|null){this.selection=id;this.updateHover();}
  private clearGroup(g:THREE.Group,dispose=false){while(g.children.length){const child=g.children[0];g.remove(child);if(dispose && child instanceof THREE.InstancedMesh){child.dispose();(child.material as THREE.Material).dispose();}}}
  private rebuild(){for(const _ of this.rebuildSteps()){/* Synchronous rebuild for in-battle edits. */}}
  async prepareForEntry(){
    const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    // Keep the opaque transition painted while generating and uploading the battlefield.
    await nextFrame();
    for(const _ of this.rebuildSteps())await nextFrame();
    try{await this.renderer.compileAsync(this.scene,this.camera);}catch(error){console.warn('Shader prewarm unavailable; using normal rendering.',error);}
    await nextFrame();
    this.render(performance.now()/1000);
    await nextFrame();
    this.render(performance.now()/1000);
    await nextFrame();
  }
  private *rebuildSteps():Generator<void>{
    this.clearGroup(this.terrain,true);this.clearGroup(this.props,true);this.clearGroup(this.structures);this.structuresById.clear();this.tileMeshes=[];
    const terrainBatch=new Batch(),propBatch=new Batch();
    let sliceStart=performance.now();
    for(const t of this.game.tiles){
      if(performance.now()-sliceStart>4){yield;sliceStart=performance.now();}
      if(!t.active)continue;
      if(t.chasm&&!t.bridge){terrainBatch.add(t.x,-4.9,t.z,.98,.18,.98,'#263336');continue;}
      const y=t.h*HEIGHT_UNIT,bed=(t.bridge?(t.suspension?t.h:(t.bridgeBed??t.h-1)):t.h)*HEIGHT_UNIT,r=((t.x*13+t.z*7)%9)/9;
      const nearRoad=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>this.game.tile(t.x+dx,t.z+dz)?.road);
      const palette=terrainPalette(t,nearRoad),tint=palette.top,rockTint=palette.rock;
      terrainBatch.add(t.x,(bed-2.8)/2-0.08,t.z,0.994,bed+2.64,0.994,rockTint);
      terrainBatch.add(t.x,-2.9,t.z,0.99,0.28,0.99,C.darkRock);
      terrainBatch.add(t.x,bed-0.1,t.z,1,0.2,1,tint);
      const pick=new THREE.Mesh(pickGeometry,pickMaterial);pick.rotation.x=-Math.PI/2;pick.position.set(t.x,y+0.04,t.z);pick.userData.tile={x:t.x,z:t.z};this.terrain.add(pick);this.tileMeshes.push(pick);
      if(t.bridge){const water=(x:number,z:number)=>!!this.game.tile(x,z)?.water;const model=bridgeModel(t.suspension?{north:true,south:true,east:true,west:true}:{north:water(t.x,t.z-1),south:water(t.x,t.z+1),east:water(t.x+1,t.z),west:water(t.x-1,t.z)},!!t.suspension);model.position.set(t.x,y,t.z);this.props.add(model);}
      if(t.water&&r>0.28){
        propBatch.add(t.x+0.13,y+0.025,t.z-0.13,0.39,0.015,0.03,'#a6d8ce');
        if(r>0.62)propBatch.add(t.x-0.21,y+0.026,t.z+0.2,0.22,0.012,0.025,'#d3e5c4');
      }
      if(t.spikes)for(const dx of [-.3,0,.3])for(const dz of [-.3,.3]){propBatch.add(t.x+dx,y+.22,t.z+dz,.1,.44,.1,C.woodLight);propBatch.add(t.x+dx,y+.44,t.z+dz,.05,.13,.05,'#c0b39a');}
      if(t.paved)for(const dx of [-.24,.24])for(const dz of [-.24,.24])propBatch.add(t.x+dx,y+.04,t.z+dz,.44,.08,.44,'#ada58d');
      if(t.road&&!t.bridge&&!t.water&&r>0.34){
        propBatch.add(t.x-0.22,y+0.012,t.z+0.18,0.28,0.024,0.21,'#d8c38e');
        if(r>0.7)propBatch.add(t.x+0.28,y+0.01,t.z-0.16,0.22,0.02,0.18,'#a98a5d');
      }
      if(t.water){
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const bank=this.game.tile(t.x+dx,t.z+dz);
          if(bank?.active&&!bank.water&&!bank.bridge)propBatch.add(t.x+dx*.43,y+.013,t.z+dz*.43,dx ? .045 : .62,.018,dz ? .045 : .62,'#aad3b5');
        }
      }
      const distance=Math.hypot(t.x-this.game.goal.x,t.z-this.game.goal.z);
      if(t.decoration&&!this.game.structureAt(t.x,t.z)&&distance>3&&!t.water){
        if(t.decoration===1){
          const height=1.2+r;
          propBatch.add(t.x,y+height/2,t.z,0.21,height,0.21,C.wood);
          for(let k=0;k<4;k++){const w=1.45-k*0.29;propBatch.add(t.x,y+0.7+k*0.4,t.z,w,0.65,w,k%2?C.leaf:C.leafLight);}
        }else if(t.decoration===2){propBatch.add(t.x+0.1,y+0.18,t.z,0.46,0.36,0.42,'#969d81');propBatch.add(t.x-0.22,y+0.1,t.z+0.15,0.28,0.2,0.25,'#b1b398');}
        else{for(let k=0;k<3;k++)propBatch.add(t.x+(k-1)*0.17,y+0.13,t.z+(k%2)*0.16,0.08,0.26,0.08,C.leaf);if(r>0.65)propBatch.add(t.x,y+0.29,t.z,0.12,0.09,0.12,'#d8ca85');}
      }
    }
    yield;
    this.terrain.add(terrainBatch.mesh());
    yield;
    this.props.add(propBatch.mesh());
    yield;
    for(const s of this.game.structures){const model=connectedBuildingModel(this.game,s);if(isDirectional(s))model.rotation.y=s.facing??Math.PI/2;model.position.set(s.x,this.game.ground(s.x,s.z),s.z);model.userData.healthY=new THREE.Box3().setFromObject(model).max.y+.3;this.structures.add(model);this.structuresById.set(s.id,model);}
    for(const entry of this.game.entrances){
      const gate=new THREE.Group();for(const z of [-.8,.8]){box(gate,0,.8,z,.4,1.6,.4,C.darkRock);box(gate,0,1.85,z,.65,.45,.65,C.rock);}box(gate,0,2.15,0,.5,.3,2.3,C.rock);flag(gate,0,2.6,-.8,entry.color);
      gate.rotation.y=Math.atan2(this.game.goal.z-entry.z,this.game.goal.x-entry.x);gate.position.set(entry.x,this.game.ground(entry.x,entry.z),entry.z);this.props.add(gate);
    }
    for(const post of this.game.outposts){const model=outpostModel(post);model.position.set(post.x,this.game.ground(post.x,post.z),post.z);this.props.add(model);}
    this.rangeDisplay.setTerrain(this.game.tiles);this.updateHover();this.revision=this.game.revision;
  }
  private addInput(){let down:{x:number;y:number;id:number}|null=null,didMove=false;const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;down={x:e.clientX,y:e.clientY,id:e.pointerId};didMove=false;});
    canvas.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)didMove=true;this.aimPoint=this.pick(e.clientX,e.clientY,true);this.hover=this.pick(e.clientX,e.clientY);this.onHover(this.hover);this.updateHover();});
    canvas.addEventListener('pointerup',e=>{const clicked=down?.id===e.pointerId&&!didMove&&e.button===0;down=null;if(!clicked)return;if(this.tool==='inspect'&&!this.aim&&!this.heroCommand){const id=this.pickUnit(e.clientX,e.clientY);if(id!==null){this.onUnitClick(id);return;}}this.onClick(this.pick(e.clientX,e.clientY,!!this.aim));});
    canvas.addEventListener('pointercancel',()=>{down=null;});
    canvas.addEventListener('pointerleave',()=>{this.hover=null;this.onHover(null);this.updateHover();});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  pick(clientX:number,clientY:number,precise=false){
    const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    this.extensionGhosts.updateMatrixWorld(true);
    const hit=this.raycaster.intersectObjects([...this.tileMeshes,this.extensionGhosts],true)[0];if(!hit)return null;
    if(precise)return {x:hit.point.x,z:hit.point.z};
    let object:THREE.Object3D|null=hit.object;while(object){if(object.userData.tile)return object.userData.tile as Point;object=object.parent;}return null;
  }

  pickUnit(clientX:number,clientY:number):number|null {
    const r=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    this.scene.updateMatrixWorld(true);
    const hit=this.raycaster.intersectObjects([...this.unitMeshes.values(),this.structures,this.terrain],true)[0];
    let object:THREE.Object3D|null=hit?.object??null;
    while(object){if(typeof object.userData.unitId==='number')return object.userData.unitId;object=object.parent;}
    return null;
  }
  project(x:number,z:number,y?:number){const v=new THREE.Vector3(x,y??this.game.ground(x,z)+0.08,z).project(this.camera);return {x:(v.x+1)/2*this.host.clientWidth,y:(1-v.y)/2*this.host.clientHeight};}
  private updateHover(){
    const p=this.extensions?null:this.tool==='inspect'||this.tool==='remove'?this.hover:this.draft;this.cursor.visible=!!p;
    if(p){this.cursor.position.set(p.x,this.game.ground(p.x,p.z)+0.09,p.z);const valid=!this.game.validate(this.tool,p.x,p.z);(this.cursor.children[0] as THREE.LineSegments<THREE.BufferGeometry,THREE.LineBasicMaterial>).material.color.set(valid?'#fff0bc':'#df8e7b');}
    const ghostKey=p&&this.tool!=='inspect'&&this.tool!=='remove'?`${this.tool}:${p.x}:${p.z}:${this.draftFacing}:${this.game.revision}:${this.game.resources.gold}:${this.game.validate(this.tool,p.x,p.z)??'valid'}`:'';
    if(ghostKey!==this.lastGhost){if(this.ghost){this.scene.remove(this.ghost);this.ghost.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();});this.ghost=null;}if(ghostKey&&p){this.ghost=this.tool==='bridge'?bridgeModel():['dig','raise','lower','road','spikes'].includes(this.tool)?groundWorkModel(this.tool):connectedBuildingModel(this.game,{kind:this.tool as Structure['kind'],level:1,...p});const valid=!this.game.validate(this.tool,p.x,p.z);this.ghost.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.Material).clone();const m=o.material as THREE.MeshStandardMaterial;m.transparent=true;m.opacity=0.48;m.color.set(valid?'#c1d9a7':'#d77c69');o.castShadow=false;}});if(isDirectional({kind:this.tool}))this.ghost.rotation.y=this.draftFacing;this.ghost.position.set(p.x,this.game.ground(p.x,p.z)+(this.tool==='bridge'?HEIGHT_UNIT:0),p.z);this.scene.add(this.ghost);}this.lastGhost=ghostKey;this.updatePlacementGrid(p);}
    const extensionKey=JSON.stringify([this.tool,this.extensions,this.game.revision]);
    if(extensionKey!==this.extensionKey){
      this.extensionGhosts.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();});this.extensionGhosts.clear();
      for(const q of this.extensions??[]){
        const model=this.tool==='bridge'?bridgeModel():['dig','raise','lower','road','spikes'].includes(this.tool)?groundWorkModel(this.tool):connectedBuildingModel(this.game,{kind:this.tool as Structure['kind'],level:1,...q});
        model.traverse(o=>{if(o instanceof THREE.Mesh){const m=(o.material as THREE.MeshStandardMaterial).clone();o.material=m;m.transparent=true;m.opacity=.55;m.color.set('#b9f4bd');m.emissive.set('#427147');m.depthWrite=false;o.castShadow=false;}});
        model.userData.tile=q;model.position.set(q.x,this.game.ground(q.x,q.z)+(this.tool==='bridge'?HEIGHT_UNIT:0),q.z);
        const plus=new THREE.Group();box(plus,0,1.65,0,.55,.06,.13,'#f8ffca');box(plus,0,1.65,0,.13,.06,.55,'#f8ffca');for(const edge of [-.46,.46]){box(plus,edge,.08,0,.06,.05,.96,'#6feac0');box(plus,0,.08,edge,.96,.05,.06,'#6feac0');}
        plus.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.Material).clone();o.castShadow=false;}});model.add(plus);this.extensionGhosts.add(model);
      }this.extensionKey=extensionKey;
    }
    let selected=this.game.structures.find(s=>s.id===this.selection);
    if(p&&this.tool==='inspect'&&!this.aim)selected=this.game.structureAt(p.x,p.z)??selected;
    if(p&&isTower(this.tool)){
      const s={x:p.x,z:p.z,kind:this.tool,level:1,facing:this.draftFacing} as Structure;
      this.rangeDisplay.show(this.game.muzzle(s),this.game.towerRange(s),s.kind,towerAttack({...s,kind:s.kind as import("../simulation/towers").TowerKind}),s.facing);
    } else if(selected&&(isTower(selected.kind)||selected.kind==='barracks'))this.rangeDisplay.show(this.game.muzzle(selected),this.game.towerRange(selected),selected.kind,isTower(selected.kind)?towerAttack({...selected,kind:selected.kind}):undefined,this.aim?.id===selected.id?this.aim.facing:selected.facing);
    else this.rangeDisplay.hide();
  }

  private updatePlacementGrid(p:Point|null){
    for(const child of this.placementGrid.children)if(child instanceof THREE.LineSegments)child.geometry.dispose();this.placementGrid.clear();
    if(!p||this.tool==='inspect'||this.tool==='remove')return;
    const vertices:number[]=[];for(let z=p.z-4;z<=p.z+4;z++)for(let x=p.x-4;x<=p.x+4;x++){const tile=this.game.tile(x,z);if(!tile?.active)continue;const y=this.game.ground(x,z)+.045;for(const [ax,az,bx,bz]of [[-.5,-.5,.5,-.5],[.5,-.5,.5,.5],[.5,.5,-.5,.5],[-.5,.5,-.5,-.5]])vertices.push(x+ax,y,z+az,x+bx,y,z+bz);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.placementGrid.add(new THREE.LineSegments(geo,placementGridMaterial));
  }

  render(time:number){
    if(this.contextLost)return;if(this.revision!==this.game.revision)this.rebuild();this.controls.update();this.rangeDisplay.updateCamera(this.camera);
    const ids=new Set<number>();for(const unit of [...this.game.enemies,...this.game.soldiers]){
      ids.add(unit.id);
      const home='home' in unit?this.game.structures.find(s=>s.id===unit.home):undefined;
      const soldier=unit as Soldier;
      const modelKey='kind' in unit?unit.kind:`soldier:${home?.level??soldier.level??1}:${home?.barracksBranch??soldier.branch??''}`;
      let model=this.unitMeshes.get(unit.id);
      if(model?.userData.modelKey!==modelKey){if(model)this.scene.remove(model);model=detailedUnitModel('kind'in unit?unit.kind:'soldier',home?.level??soldier.level??1,home?.barracksBranch??soldier.branch);model.userData.modelKey=modelKey;model.userData.unitId=unit.id;model.userData.headY=model.userData.height??new THREE.Box3().setFromObject(model).max.y;this.unitMeshes.set(unit.id,model);this.scene.add(model);}
      const motion=locomotionAmount(model,unit,this.game.time);
      const bob=Math.sin(this.game.time*10+unit.id)*.025*motion;
      model.position.set(unit.x,unit.y+bob,unit.z);model.rotation.y=unit.facing;
      animateUnit(model,this.game.time,motion,Math.max(0,this.game.time-(unit.attackAt??-100)),unit.state==='casting','boss' in unit&&unit.boss?.center?Math.max(.01,1-(unit.boss.windupUntil-this.game.time)/BOSS_SLAM.windup):0);
    }
    const hero=this.game.hero;
    const visualDt=Math.min(.05,Math.max(0,time-this.heroRenderClock));this.heroRenderClock=time;
    if(this.game.phase==='defeat')this.heroDefeatTime+=visualDt;
    const fallenTime=hero?this.game.phase==='defeat'?this.heroDefeatTime:this.game.time-hero.fallenAt:0;
    if(hero&&(hero.hp>0||fallenTime<2)){
      if(!this.heroModel){this.heroModel=createElfModel();this.heroModel.root.scale.setScalar(.44);}
      const model=this.heroModel.root;ids.add(hero.id);
      if(!this.unitMeshes.has(hero.id)){this.unitMeshes.set(hero.id,model);this.scene.add(model);model.userData.unitId=hero.id;model.userData.headY=1.92;}
      const heroFloor=hero.state==='fallen'?THREE.MathUtils.lerp(hero.y-.35,this.game.ground(hero.x,hero.z),Math.min(1,fallenTime/.65)):hero.y-.35;
      model.position.set(hero.x,heroFloor,hero.z);model.rotation.y+=Math.atan2(Math.sin(hero.facing-model.rotation.y),Math.cos(hero.facing-model.rotation.y))*(1-Math.exp(-visualDt*12));
      const pose=hero.state==='fallen'?'defeat':hero.state==='entering'?'enter':hero.state==='casting'?(hero.skill==='piercing'?'shoot':'cast'):hero.state==='moving'?'walk':hero.state==='ranged'?'shoot':hero.state==='melee'?'melee':'idle';
      const actionTime=pose==='defeat'?fallenTime:pose==='enter'?this.game.time-hero.enteredAt:this.game.time-hero.attackStarted;
      this.heroModel.animate(this.game.time,hero.flying||hero.state==='entering'||hero.state==='casting',this.game.phase==='defeat'?visualDt:Math.min(.1,Math.max(0,this.game.time-this.heroClock)),false,pose,hero.state==='casting'&&hero.skill==='piercing'?actionTime*1.6:actionTime,this.game.time-Math.max(hero.lastCombat,hero.enteredAt+1.1));
      model.userData.headY=hero.state==='entering'?1.92+Math.max(0,1-actionTime/1.1)**2*1.32:1.92;
      this.heroRing.visible=hero.hp>0&&hero.state!=='fallen';this.heroRing.position.set(hero.x,this.game.ground(hero.x,hero.z)+.035,hero.z);this.heroRing.material.opacity=this.heroCommand?1:.48;
      this.heroDestination.visible=!!hero.destination;
      if(hero.destination)this.heroDestination.position.set(hero.destination.x,this.game.ground(hero.destination.x,hero.destination.z)+.04,hero.destination.z);
    }else{this.heroRing.visible=false;this.heroDestination.visible=false;}
    this.heroClock=this.game.time;
    for(const [id,mesh]of this.unitMeshes)if(!ids.has(id)){this.scene.remove(mesh);this.unitMeshes.delete(id);}
    for(const s of this.game.structures){const mesh=this.structuresById.get(s.id);if(mesh&&isDirectional(s))mesh.rotation.y=this.aim?.id===s.id?this.aim.facing:s.facing??Math.PI/2;const crystal=mesh?.getObjectByName('crystal');if(crystal){crystal.rotation.y=time*0.6;crystal.position.y=(crystal.userData.restY??2.85)+Math.sin(time*2)*0.08;}}
    this.clearGroup(this.fx);
    renderAttackEffects(this.fx,this.game.shots,this.game.effects,time);
    renderSanctuaries(this.fx,this.game.sanctuaries,(x,z)=>this.game.ground(x,z),this.game.time);
    renderHeroEffects(this.fx,this.game.heroEffects,this.game.hero,this.game.time);
    for(const e of this.game.enemies){
      if((e.slowUntil??0)>this.game.time||(e.stunUntil??0)>this.game.time){
        for(const x of [-.24,.24])box(this.fx,e.x+x,e.y-.1,e.z,.07,(e.stunUntil??0)>this.game.time?.6:.2,.07,'#bdebf2');
      }
      if((e.burnUntil??0)>this.game.time)for(let i=0;i<3;i++)box(this.fx,e.x+(i-1)*.18,e.y+.2+Math.sin(time*12+i)*.1,e.z-.1,.08,.2,.08,i%2?'#ffe3a6':'#e88747');
      if((e.shredUntil??0)>this.game.time)box(this.fx,e.x,e.y+.86,e.z,.3,.05,.08,'#eab173');
    }
    this.bossWarning.update(this.game);
    this.renderer.render(this.scene,this.camera);
  }
  healthBars() {
    const entries:{id:number;x:number;y:number;ratio:number;opacity:number;friendly:boolean;structure:boolean}[]=[];
    this.damageVisibility.update([...this.game.enemies,...this.game.soldiers,...(this.game.hero?[this.game.hero]:[]),...this.game.structures],this.game.time);
    for(const u of [...this.game.enemies,...this.game.soldiers,...(this.game.hero&&this.game.hero.hp>0?[this.game.hero]:[])]) {
      if('boss' in u&&u.boss)continue;
      const opacity=this.damageVisibility.opacity(u.id,this.game.time);if(!opacity)continue;
      const enemy='kind' in u;
      const model=this.unitMeshes.get(u.id);if(!model)continue;
      const p=this.project(model.position.x,model.position.z,model.position.y+model.userData.headY);p.y-=7;
      entries.push({id:u.id,...p,ratio:Math.max(0,Math.min(1,u.hp/u.maxHp)),opacity,friendly:!enemy,structure:false});
    }
    for(const s of this.game.structures) {
      const opacity=this.damageVisibility.opacity(s.id,this.game.time);if(!opacity)continue;
      const top=this.structuresById.get(s.id)?.userData.healthY ?? this.game.ground(s.x,s.z)+STATS[s.kind].muzzle+.8;
      const p=this.project(s.x,s.z,top);
      entries.push({id:s.id,...p,ratio:Math.max(0,Math.min(1,s.hp/s.maxHp)),opacity,friendly:true,structure:true});
    }
    return arrangeHealthBars(entries,this.host.clientWidth,this.host.clientHeight);
  }
}

export function arrangeHealthBars<T extends {id:number;x:number;y:number}>(entries:T[],width:number,height:number) {
  // Never displace bars to avoid overlaps: their position must stay tied to the head.
  return entries.filter(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.x>=0&&e.x<=width&&e.y>=0&&e.y<=height);
}
