import * as THREE from 'three';
import { RangeDisplay } from './range';
import { cameraMotion } from './camera-motion';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game, WIDTH, DEPTH, HEIGHT_UNIT, STATS, type Point, type Structure, type Tool, type Enemy, type Soldier } from '../simulation/game';

const C = { grass: '#7e9654', grass2: '#8da365', dirt: '#b9a279', stone: '#aaa690', rock: '#897b65', darkRock: '#6c6756', wood: '#70573e', woodLight: '#a18350', cream: '#d1cbb0', teal: '#347778', blue: '#5899ac', leaf: '#547b46', leafLight: '#6f934f', water: '#529ca3', gold: '#d6b666' };
const cube = new THREE.BoxGeometry(1, 1, 1);
const pickGeometry = new THREE.PlaneGeometry(1,1);
const pickMaterial = new THREE.MeshBasicMaterial({visible:false});
const routeGeometry = new THREE.CircleGeometry(0.047,6);
const routeMaterial = new THREE.MeshBasicMaterial({color:'#ede7bf',transparent:true,opacity:0.8,depthWrite:false});
const crystalGeometry = new THREE.OctahedronGeometry(0.42);
const crystalMaterial = new THREE.MeshStandardMaterial({color:'#a5c9e8',emissive:'#588ccf',emissiveIntensity:1,roughness:0.3});
const projectileGeometry = new THREE.OctahedronGeometry(0.16);
const materials = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string) { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true })); return materials.get(color)!; }
function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
  const mesh = new THREE.Mesh(cube, mat(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function flag(parent: THREE.Object3D, x: number, y: number, z: number, color = C.teal) {
  box(parent,x,y,z,0.055,1.25,0.055,C.wood);
  box(parent,x+0.28,y+0.35,z,0.5,0.35,0.06,color);
  box(parent,x+0.44,y+0.17,z,0.18,0.13,0.06,color);
}
function steppedRoof(g: THREE.Object3D, y: number, width: number, color = C.teal) {
  for(let i=0;i<4;i++) box(g,0,y+i*0.2,0,width-i*width*0.19,0.23,width-i*width*0.19,color);
}
export function buildingModel(kind: Structure['kind'], level=1): THREE.Group {
  const g=new THREE.Group();
  if(kind==='wall') {
    box(g,0,0.1,0,1.04,0.2,0.72,C.darkRock);
    for(let layer=0;layer<3;layer++) for(let k=0;k<2;k++) box(g,(k-0.5)*0.48,0.35+layer*0.3,0,0.465,0.285,0.52,layer%2?C.cream:C.stone);
    for(let k=0;k<3;k++) box(g,(k-1)*0.38,1.22,0,0.22,0.3,0.58,C.cream);
  }
  if(kind==='archer') {
    box(g,0,0.12,0,1.02,0.24,1.02,C.stone);
    for(const x of [-0.32,0.32]) for(const z of [-0.32,0.32]) box(g,x,0.97,z,0.16,1.7,0.16,C.wood);
    for(const z of [-0.32,0.32]) { const b=box(g,0,0.9,z,0.12,1.45,0.1,C.woodLight);b.rotation.z=0.5; }
    box(g,0,1.82,0,1.08,0.22,1.08,C.woodLight);
    for(const x of [-0.45,0.45]) box(g,x,2.06,0,0.1,0.3,1.03,C.wood);
    for(const z of [-0.45,0.45]) box(g,0,2.06,z,1.03,0.3,0.1,C.wood);
    box(g,0,2.19,0,0.24,0.47,0.22,C.blue);box(g,0,2.52,0,0.23,0.23,0.23,'#cbb596');
    for(const x of [-0.43,0.43]) for(const z of [-0.43,0.43]) box(g,x,2.5,z,0.07,0.8,0.07,C.wood);
    steppedRoof(g,2.94,1.4,C.teal);
    flag(g,0,3.98,0);
  }
  if(kind==='mage') {
    box(g,0,0.1,0,1.04,0.2,1.04,C.darkRock);
    box(g,0,1.13,0,0.7,2.05,0.7,C.cream);
    for(let i=0;i<4;i++) box(g,0,0.35+i*0.5,0,0.8,0.14,0.8,C.stone);
    box(g,0,1.6,0.36,0.18,0.45,0.03,'#526e83');
    box(g,0,2.24,0,1.07,0.3,1.07,'#6c7190');
    for(const x of [-0.38,0.38])for(const z of [-0.38,0.38])box(g,x,2.56,z,0.14,0.45,0.14,C.cream);
    const crystal = new THREE.Mesh(crystalGeometry,crystalMaterial);
    crystal.position.y=2.87; crystal.name='crystal';g.add(crystal);
    box(g,0,2.45,0,0.56,0.15,0.56,'#cfb377');
  }
  if(kind==='barracks') {
    box(g,0,0.1,0,1.55,0.2,1.2,C.stone);
    box(g,0,0.66,0,1.35,1.0,1.05,C.cream);
    for(const x of [-0.62,0.62])box(g,x,0.68,0.54,0.12,1.15,0.07,C.wood);
    box(g,0,0.5,0.56,0.4,0.8,0.06,C.wood);
    for(let i=0;i<4;i++)box(g,0,1.23+i*0.16,0,1.64-i*0.28,0.2,1.35,C.teal);
    flag(g,0.66,1.65,0.25);
    box(g,-0.72,0.45,0.4,0.2,0.6,0.3,'#8e9ea2');
  }
  // Successive tiers alter silhouette, material and equipment, not just a level badge.
  if(kind==='archer' && level>=2){
    for(const x of [-.39,.39])for(const z of [-.39,.39]){
      box(g,x,.83,z,.27,1.42,.27,C.cream);box(g,x,1.55,z,.34,.16,.34,C.stone);
    }
    box(g,0,1.78,0,1.25,.2,1.25,C.stone);
    for(const z of [-.67,.67]){box(g,0,2.14,z,1.25,.45,.13,C.cream);for(const x of [-.52,0,.52])box(g,x,2.45,z,.23,.25,.18,C.cream);}
    flag(g,-.67,2.7,0,level===3?'#ae4545':C.teal);
    if(level===3){
      for(const x of [-.67,.67])box(g,x,1.05,0,.25,2.1,.9,C.stone);
      box(g,0,3.76,0,.85,.18,.85,C.gold);
      box(g,0,3.98,.04,1.85,.16,.16,C.wood);box(g,0,4.1,.04,.11,.12,1.0,'#d1c9a1');
      for(const x of [-.88,.88])box(g,x,3.95,.1,.13,.32,.18,C.gold);
      flag(g,.7,3.15,0,'#ae4545');
      for(const z of [-.77,.77])box(g,0,2.18,z,.35,.42,.05,C.teal);
    }
  }
  if(kind==='mage' && level>=2){
    for(const x of [-.48,.48])for(const z of [-.48,.48]){box(g,x,1.2,z,.22,2.35,.22,'#6b658c');box(g,x,2.45,z,.3,.18,.3,C.gold);}
    for(const y of [.5,1.4,2.26])box(g,0,y,0,.97,.13,.97,'#b9a4d6');
    const crystal=g.getObjectByName('crystal')!;crystal.scale.setScalar(level===3?1.8:1.35);
    for(const x of [-.65,.65]){const spire=new THREE.Group();spire.position.set(x,0,0);g.add(spire);box(spire,0,1.5,0,.18,3,.18,C.cream);box(spire,0,2.9,0,.27,.16,.27,C.gold);}
    if(level===3){
      for(const z of [-.65,.65]){box(g,0,1.55,z,.22,3.1,.22,'#6b658c');box(g,0,3.1,z,.3,.2,.3,C.gold);}
      const halo=new THREE.Mesh(new THREE.TorusGeometry(.83,.045,4,8),mat(C.gold));halo.position.y=3.12;halo.rotation.x=Math.PI/2;g.add(halo);
      for(const x of [-.67,.67])for(const z of [-.67,.67]){const gem=new THREE.Mesh(crystalGeometry,crystalMaterial);gem.scale.setScalar(.43);gem.position.set(x,2.82,z);g.add(gem);}
      box(g,0,.19,0,1.38,.25,1.38,'#716583');
    }
  }
  if(kind==='wall' && level>=2){for(const x of [-.5,.5])box(g,x,.66,0,.18,1.32,.78,C.stone);box(g,0,.65,.31,.95,.14,.09,C.gold);if(level===3)for(const x of [-.36,0,.36])box(g,x,1.43,0,.15,.32,.15,'#63757b');}
  if(kind==='barracks' && level>=2){for(const x of [-.75,.75])box(g,x,.6,0,.23,1.15,1.22,C.stone);flag(g,-.7,1.8,.28);if(level===3){box(g,0,1.1,-.57,1.1,1.65,.65,C.cream);box(g,0,2,-.57,1.34,.22,.83,C.teal);flag(g,0,2.8,-.57,'#ae4545');}}
  for(let i=0;i<level;i++)box(g,(i-(level-1)/2)*.2,.24,.66,.1,.16,.05,C.gold);
  g.userData.level=level;g.userData.kind=kind;
  return g;
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
  return g;
}
function unitModel(kind: string) {
  const g=new THREE.Group(),friendly=kind==='soldier',brute=kind==='brute';
  const skin=friendly?'#d4b28b':brute?'#7d8660':'#7d9e57',armor=friendly?'#617f91':brute?'#615b60':kind==='runner'?'#98724d':'#8b6451';
  for(const x of [-0.1,0.1])box(g,x,-0.18,0,0.13,0.32,0.16,'#4e5142');
  box(g,0,0.05,0,0.34,0.35,0.25,armor);box(g,0,0.4,0,0.29,0.28,0.28,skin);
  box(g,0,0.54,0,0.34,0.12,0.31,friendly?'#acb5af':'#6a6b50');
  box(g,0,0.41,0.148,0.22,0.055,0.03,'#2f3e32');
  box(g,0.26,0.12,0.02,0.12,0.37,0.12,skin);
  box(g,-0.28,0.13,0.02,0.14,0.38,0.12,friendly?C.blue:armor);
  box(g,0.27,0.35,0.12,0.08,0.5,0.07,friendly?'#dce2d4':C.wood);
  if(brute) {box(g,0.27,0.61,0.12,0.33,0.3,0.3,C.rock);g.scale.setScalar(1.45);}
  if(friendly)box(g,-0.31,0.18,0.15,0.26,0.34,0.09,C.teal);
  return g;
}
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
  private terrain=new THREE.Group();private structures=new THREE.Group();private props=new THREE.Group();private routes=new THREE.Group();private fx=new THREE.Group();
  private tileMeshes: THREE.Mesh[]=[];private unitMeshes=new Map<number,THREE.Group>();private structuresById=new Map<number,THREE.Group>();
  private raycaster=new THREE.Raycaster();private pointer=new THREE.Vector2();private revision=-1;private hover:Point|null=null;private tool:Tool='inspect';private selection:number|null=null;
  private cursor=new THREE.Group();readonly rangeDisplay=new RangeDisplay();private ghost:THREE.Group|null=null;private lastGhost='';
  private wind=new THREE.Group();private castle=new THREE.Group();private contextLost=false;
  showPaths=true;showGrid=false;
  onHover: (p:Point|null)=>void=()=>{};onClick:(p:Point)=>void=()=>{};
  constructor(public host:HTMLElement,public game:Game){
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));this.renderer.setSize(host.clientWidth,host.clientHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.28;
    this.renderer.domElement.setAttribute('aria-label','暮河山谷三维战场，点击地块建造');host.append(this.renderer.domElement);
    this.scene.background=new THREE.Color('#c4cbb4');this.scene.fog=new THREE.Fog('#c4cbb4',62,120);
    this.scene.add(new THREE.HemisphereLight('#fff6d8','#6d826d',2.5));
    const sun=new THREE.DirectionalLight('#fff0ce',3.7);sun.position.set(-12,40,26);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:120});sun.shadow.normalBias=0.04;sun.shadow.bias=-0.0003;sun.target.position.set(21,0,16);this.scene.add(sun,sun.target);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300),mat('#a9b6a0'));floor.rotation.x=-Math.PI/2;floor.position.set((WIDTH-1)/2,-3.35,(DEPTH-1)/2);floor.receiveShadow=true;this.scene.add(floor);
    this.scene.add(this.terrain,this.props,this.structures,this.routes,this.cursor,this.rangeDisplay.group,this.fx,this.wind);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=0.1;this.controls.minPolarAngle=0.3;this.controls.maxPolarAngle=1.22;this.controls.enablePan=true;this.controls.minZoom=0.65;this.controls.maxZoom=3.8;
    this.controls.mouseButtons={LEFT:undefined as unknown as THREE.MOUSE,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
    this.resetCamera();
    this.castle=castleModel();this.castle.position.set(game.goal.x,game.ground(game.goal.x,game.goal.z),game.goal.z);this.scene.add(this.castle);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.03,0.09,1.03)),new THREE.LineBasicMaterial({color:'#ffeab1',depthTest:false}));this.cursor.add(outline);this.cursor.visible=false;
    this.addInput();window.addEventListener('resize',()=>this.resize());
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.game.paused=true;this.game.say('图形连接暂时中断，正在等待恢复');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.revision=-1;this.game.say('画面已恢复，点击继续以恢复游戏');});
    this.rebuild();this.resize();
  }
  resetCamera(){this.controls.enableDamping=false;this.controls.update();this.controls.target.set((WIDTH-1)/2,.2,(DEPTH-1)/2);this.camera.position.copy(this.controls.target).add(new THREE.Vector3(34,39,39));this.camera.zoom=1;this.camera.updateProjectionMatrix();this.controls.update();this.controls.enableDamping=true;}
  moveCamera(right:number,forward:number,dt:number){
    const direction=this.camera.getWorldDirection(new THREE.Vector3());
    const delta=cameraMotion(direction.x,direction.z,right,forward,dt*12/Math.sqrt(this.camera.zoom));
    const x=THREE.MathUtils.clamp(this.controls.target.x+delta.x,-3,WIDTH+3)-this.controls.target.x;
    const z=THREE.MathUtils.clamp(this.controls.target.z+delta.z,-3,DEPTH+3)-this.controls.target.z;
    this.camera.position.x+=x;this.camera.position.z+=z;this.controls.target.x+=x;this.controls.target.z+=z;
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight,aspect=w/h,vertical=Math.max(21.5,28/aspect);this.camera.left=-vertical*aspect;this.camera.right=vertical*aspect;this.camera.top=vertical;this.camera.bottom=-vertical;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
  setGame(game:Game){this.rangeDisplay.hide();this.game=game;this.revision=-1;for(const m of this.unitMeshes.values())this.scene.remove(m);this.unitMeshes.clear();this.selection=null;}
  setTool(tool:Tool){this.tool=tool;this.lastGhost='';this.updateHover();}
  select(id:number|null){this.selection=id;this.updateHover();}
  private clearGroup(g:THREE.Group,dispose=false){while(g.children.length){const child=g.children[0];g.remove(child);if(dispose && child instanceof THREE.InstancedMesh){child.dispose();(child.material as THREE.Material).dispose();}}}
  private rebuild(){
    this.clearGroup(this.terrain,true);this.clearGroup(this.props,true);this.clearGroup(this.structures);this.structuresById.clear();this.tileMeshes=[];
    const terrainBatch=new Batch(),propBatch=new Batch();
    for(const t of this.game.tiles){
      if(!t.active)continue;
      const y=t.h*HEIGHT_UNIT,r=((t.x*13+t.z*7)%9)/9;
      const tint=t.water?['#438d98','#4e9aa1','#579fa2'][Math.floor(r*3)]:t.road?['#bbac81','#c5b58a','#bbae84'][Math.floor(r*3)]:['#81935c','#8b9d66','#93a66d'][Math.floor(r*3)];
      terrainBatch.add(t.x,(y-2.8)/2-0.08,t.z,0.994,y+2.64,0.994,['#9b8970','#a09077','#95876c'][Math.floor(r*3)]);
      terrainBatch.add(t.x,-2.9,t.z,0.99,0.28,0.99,C.darkRock);
      terrainBatch.add(t.x,y-0.1,t.z,1,0.2,1,tint);
      const pick=new THREE.Mesh(pickGeometry,pickMaterial);pick.rotation.x=-Math.PI/2;pick.position.set(t.x,y+0.04,t.z);pick.userData.tile={x:t.x,z:t.z};this.terrain.add(pick);this.tileMeshes.push(pick);
      if(t.bridge){for(let p=0;p<5;p++)propBatch.add(t.x-0.4+p*0.2,y+0.06,t.z,0.17,0.12,0.95,p%2?C.woodLight:C.wood);if(t.z===15)propBatch.add(t.x,y+0.34,t.z-0.46,1,0.12,0.08,C.wood);if(t.z===16)propBatch.add(t.x,y+0.34,t.z+0.46,1,0.12,0.08,C.wood);}
      if(t.water&&r>0.45)propBatch.add(t.x+0.13,y+0.025,t.z-0.13,0.39,0.015,0.03,'#82b8b6');
      const distance=Math.hypot(t.x-this.game.goal.x,t.z-this.game.goal.z);
      if(t.decoration&&!this.game.structureAt(t.x,t.z)&&distance>3&&!t.water){
        if(t.decoration===1 && (t.z<10||t.z>23||t.x<6)){
          const height=1.2+r;
          propBatch.add(t.x,y+height/2,t.z,0.21,height,0.21,C.wood);
          for(let k=0;k<4;k++){const w=1.45-k*0.29;propBatch.add(t.x,y+0.7+k*0.4,t.z,w,0.65,w,k%2?C.leaf:C.leafLight);}
        }else if(t.decoration===2){propBatch.add(t.x+0.1,y+0.18,t.z,0.46,0.36,0.42,'#969d81');propBatch.add(t.x-0.22,y+0.1,t.z+0.15,0.28,0.2,0.25,'#b1b398');}
        else{for(let k=0;k<3;k++)propBatch.add(t.x+(k-1)*0.17,y+0.13,t.z+(k%2)*0.16,0.08,0.26,0.08,C.leaf);if(r>0.65)propBatch.add(t.x,y+0.29,t.z,0.12,0.09,0.12,'#d8ca85');}
      }
    }
    this.terrain.add(terrainBatch.mesh());this.props.add(propBatch.mesh());
    for(const s of this.game.structures){const model=buildingModel(s.kind,s.level);if(s.kind==='wall' && [this.game.structureAt(s.x,s.z-1),this.game.structureAt(s.x,s.z+1)].some(n=>n?.kind==='wall'))model.rotation.y=Math.PI/2;model.position.set(s.x,this.game.ground(s.x,s.z),s.z);this.structures.add(model);this.structuresById.set(s.id,model);}
    const gate=new THREE.Group();for(const z of [-0.8,0.8]){box(gate,0,0.8,z,0.4,1.6,0.4,C.darkRock);box(gate,0,1.85,z,0.65,0.45,0.65,C.rock);}box(gate,0,2.15,0,0.5,0.3,2.3,C.rock);flag(gate,0,2.6,-0.8,'#a26042');gate.position.set(this.game.spawn.x-.4,HEIGHT_UNIT,this.game.spawn.z);this.props.add(gate);
    this.rangeDisplay.setTerrain(this.game.tiles);this.rebuildRoutes();this.updateHover();this.revision=this.game.revision;
  }
  rebuildRoutes(){this.clearGroup(this.routes);const points=this.game.previewPath();for(let i=0;i<points.length-1;i++){const p=points[i],q=points[i+1];for(const t of [0.2,0.65]){const x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;const dot=new THREE.Mesh(routeGeometry,routeMaterial);dot.rotation.x=-Math.PI/2;dot.position.set(x,this.game.ground(x,z)+0.07,z);this.routes.add(dot);}}this.routes.visible=this.showPaths;}
  private addInput(){let down={x:0,y:0},didMove=false;const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};didMove=false;});
    canvas.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)didMove=true;this.hover=this.pick(e.clientX,e.clientY);this.updateHover();this.onHover(this.hover);});
    canvas.addEventListener('pointerup',e=>{if(e.button===0&&!didMove){const p=this.pick(e.clientX,e.clientY);if(p)this.onClick(p);}});
    canvas.addEventListener('pointerleave',()=>{this.hover=null;this.updateHover();this.onHover(null);});
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  pick(clientX:number,clientY:number){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects(this.tileMeshes,false)[0];return hit?hit.object.userData.tile as Point:null;}
  project(x:number,z:number,y?:number){const v=new THREE.Vector3(x,y??this.game.ground(x,z)+0.08,z).project(this.camera);return {x:(v.x+1)/2*this.host.clientWidth,y:(1-v.y)/2*this.host.clientHeight};}
  private updateHover(){
    const p=this.hover;this.cursor.visible=!!p;
    if(p){this.cursor.position.set(p.x,this.game.ground(p.x,p.z)+0.09,p.z);const valid=!this.game.validate(this.tool,p.x,p.z);(this.cursor.children[0] as THREE.LineSegments<THREE.BufferGeometry,THREE.LineBasicMaterial>).material.color.set(valid?'#fff0bc':'#df8e7b');}
    const ghostKey=p&&['wall','archer','mage','barracks'].includes(this.tool)?`${this.tool}:${p.x}:${p.z}:${this.game.revision}`:'';
    if(ghostKey!==this.lastGhost){if(this.ghost){this.scene.remove(this.ghost);this.ghost.traverse(o=>{if(o instanceof THREE.Mesh)(o.material as THREE.Material).dispose();});this.ghost=null;}if(ghostKey&&p){this.ghost=buildingModel(this.tool as Structure['kind']);const valid=!this.game.validate(this.tool,p.x,p.z);this.ghost.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.Material).clone();const m=o.material as THREE.MeshStandardMaterial;m.transparent=true;m.opacity=0.48;m.color.set(valid?'#c1d9a7':'#d77c69');o.castShadow=false;}});this.ghost.position.set(p.x,this.game.ground(p.x,p.z),p.z);this.scene.add(this.ghost);}this.lastGhost=ghostKey;}
    let selected=this.game.structures.find(s=>s.id===this.selection);
    if(p&&this.tool==='inspect')selected=this.game.structureAt(p.x,p.z)??selected;
    if(p&&(this.tool==='archer'||this.tool==='mage')){
      const s={x:p.x,z:p.z,kind:this.tool,level:1} as Structure;
      this.rangeDisplay.show(this.game.muzzle(s),this.game.towerRange(s),s.kind);
    } else if(selected&&selected.kind!=='wall')this.rangeDisplay.show(this.game.muzzle(selected),this.game.towerRange(selected),selected.kind);
    else this.rangeDisplay.hide();
  }

  render(time:number){
    if(this.contextLost)return;if(this.revision!==this.game.revision)this.rebuild();this.controls.update();this.rangeDisplay.updateCamera(this.camera);this.routes.visible=this.showPaths;
    const ids=new Set<number>();for(const unit of [...this.game.enemies,...this.game.soldiers]){
      ids.add(unit.id);let model=this.unitMeshes.get(unit.id);if(!model){model=unitModel('kind'in unit?unit.kind:'soldier');this.unitMeshes.set(unit.id,model);this.scene.add(model);}
      const moving='kind'in unit?unit.state!=='attacking':unit.state!=='fighting';const bob=moving&&this.game.phase==='battle'&&!this.game.paused?Math.sin(time*10+unit.id)*0.035:0;
      model.position.set(unit.x,unit.y+bob,unit.z);model.rotation.y=unit.facing;
    }
    for(const [id,mesh]of this.unitMeshes)if(!ids.has(id)){this.scene.remove(mesh);this.unitMeshes.delete(id);}
    for(const s of this.game.structures){const mesh=this.structuresById.get(s.id);const crystal=mesh?.getObjectByName('crystal');if(crystal){crystal.rotation.y=time*0.6;crystal.position.y=2.85+Math.sin(time*2)*0.08;}}
    this.clearGroup(this.fx);
    for(const shot of this.game.shots){const t=shot.time/shot.duration,position=new THREE.Vector3().lerpVectors(new THREE.Vector3(shot.from.x,shot.from.y,shot.from.z),new THREE.Vector3(shot.to.x,shot.to.y,shot.to.z),t);position.y+=Math.sin(t*Math.PI)*(shot.kind==='arrow'?0.45:0.3);if(shot.kind==='arrow'){const a=box(this.fx,position.x,position.y,position.z,0.045,0.045,0.42,'#ecdb9c');a.lookAt(shot.to.x,shot.to.y,shot.to.z);}else{const m=new THREE.Mesh(projectileGeometry,mat('#b2d6f1'));m.position.copy(position);this.fx.add(m);}}
    for(const effect of this.game.effects){const t=effect.time/effect.duration;for(let i=0;i<5;i++){const angle=i*Math.PI*0.4+effect.id,spread=t*(effect.kind==='magic'?1.4:0.6);box(this.fx,effect.x+Math.cos(angle)*spread,effect.y+Math.sin(t*Math.PI)*0.7,effect.z+Math.sin(angle)*spread,0.12*(1-t),0.12*(1-t),0.12*(1-t),effect.kind==='magic'?'#a8cde9':effect.kind==='death'?'#c6b372':'#e1d2a8');}}
    this.renderer.render(this.scene,this.camera);
  }
  healthBars(){const entries:{id:number;x:number;y:number;ratio:number;friendly:boolean}[]=[];for(const u of [...this.game.enemies,...this.game.soldiers]){if(u.hp>=u.maxHp)continue;const p=this.project(u.x,u.z,u.y+0.9);entries.push({id:u.id,...p,ratio:Math.max(0,u.hp/u.maxHp),friendly:!('kind'in u)});}for(const s of this.game.structures){if(s.hp>=s.maxHp)continue;const p=this.project(s.x,s.z,this.game.ground(s.x,s.z)+STATS[s.kind].muzzle+0.6);entries.push({id:s.id,...p,ratio:Math.max(0,s.hp/s.maxHp),friendly:true});}return entries;}
}
