import type { Point, Tile, StructureKind } from './game';

export const WIDTH = 42;
export const DEPTH = 32;
export type MapId = 'river' | 'mountain' | 'canyon';
export interface MapDefinition {
  id: MapId; name: string; chapter: string; eyebrow: string;
  description: string; tactic: string; objective: string; intro: string;
  spawnName: string; goalName: string; spawn: Point; goal: Point;
  maxHeight: number; cameraHeight: number;
  starters: {kind: StructureKind; x:number; z:number}[];
  waveNames: string[];
}
export const MAPS: Record<MapId, MapDefinition> = {
  river: {
    id:'river', name:'暮河山谷', chapter:'第一章 · 雾林边境', eyebrow:'THE BORDERLANDS',
    description:'青蓝河流穿过林间谷地，桥梁与涉水路线交错。',
    tactic:'基础战场 · 绕墙与涉水', objective:'在暮河，筑起你的防线。',
    intro:'领主，暮河以东就交给你了。修筑防线，守住城堡。',
    spawnName:'雾林隘口',goalName:'暮河堡',spawn:{x:1,z:16},goal:{x:38,z:16},maxHeight:6,cameraHeight:.2,
    starters:[{kind:'archer',x:28,z:14},{kind:'mage',x:31,z:19},{kind:'wall',x:27,z:13},{kind:'wall',x:27,z:14},{kind:'wall',x:27,z:15},{kind:'barracks',x:35,z:14}],
    waveNames:['林间斥候','涉水来袭','破墙重兵','暗潮涌动','最后的黎明'],
  },
  mountain: {
    id:'mountain',name:'霜脊高地',chapter:'第二章 · 霜脊高地',eyebrow:'THE FROSTWARD PASS',
    description:'盘山古道绕过雪峰，层叠岩壁围出数处山口与布防台地。',
    tactic:'高差战场 · 扼守盘山隘口',objective:'守住山口，点亮霜脊烽火。',
    intro:'霜脊古道易守难攻。沿盘山隘口布防，注意高差会占用防御塔射程。',
    spawnName:'山麓古道',goalName:'霜冠要塞',spawn:{x:2,z:25},goal:{x:37,z:8},maxHeight:22,cameraHeight:3.4,
    starters:[{kind:'archer',x:11,z:20},{kind:'mage',x:25,z:13},{kind:'wall',x:22,z:17},{kind:'wall',x:22,z:16},{kind:'wall',x:24,z:17},{kind:'barracks',x:33,z:11}],
    waveNames:['雪线斥候','寒风疾袭','山口重锤','冰峰围攻','霜脊黎明'],
  },
  canyon: {
    id:'canyon',name:'风裂悬桥',chapter:'第三章 · 风裂悬桥',eyebrow:'THE SUNDERED REACH',
    description:'两道吊桥跨越深谷；一侧桥断，敌军就会转向另一侧。',
    tactic:'双桥战场 · 控桥与改道',objective:'守住吊桥，拦下深谷来敌。',
    intro:'两道悬桥连接断崖。拆桥会让敌军改道，但必须保留一条通往要塞的路线。',
    spawnName:'西崖哨口',goalName:'风裂要塞',spawn:{x:2,z:16},goal:{x:38,z:16},maxHeight:16,cameraHeight:2.4,
    starters:[{kind:'archer',x:28,z:11},{kind:'mage',x:29,z:22},{kind:'wall',x:28,z:12},{kind:'wall',x:29,z:12},{kind:'wall',x:30,z:12},{kind:'barracks',x:35,z:16}],
    waveNames:['探桥斥候','疾风渡桥','断崖重兵','双桥合围','长风破晓'],
  },
};
export const MAP_LIST = Object.values(MAPS);
const randomAt = (x: number, z: number) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };

function makeRiverTerrain(): Tile[] {
  const tiles: Tile[] = [];
  for (let z = 0; z < DEPTH; z++) for (let x = 0; x < WIDTH; x++) {
    const edge = Math.min(x, WIDTH - x - 1, z, DEPTH - z - 1);
    const active = !((x < 2 || x > WIDTH-3) && (z < 3 || z > DEPTH-4)) && !(edge === 0 && randomAt(x, z) > 0.76);
    const riverX = 21 + Math.round(Math.sin(z * 0.25) * 2);
    const water = Math.abs(x - riverX) < 1.1;
    const bridge = water && z >= 15 && z <= 16;
    const roadZ = 16 + Math.round(Math.sin(x * 0.19) * 1.3);
    const road = Math.abs(z - roadZ) < 1.05 || (x >= 35 && z >= 14 && z <= 18);
    let h = 1;
    if (z < 8) h += Math.min(3, Math.floor((8 - z) / 2));
    if (z > 24) h += Math.min(2, Math.floor((z - 24) / 2));
    if (x > 33) h += Math.min(2, Math.floor((x - 33) / 2));
    if (x >= 7 && x <= 14 && z >= 8 && z <= 11) h += 1;
    if (water) h = 0;
    if (bridge) h = 1;
    if (x >= 36 && x <= 40 && z >= 14 && z <= 18) h = 3;
    if (x <= 2 && z >= 14 && z <= 18) h = 1;
    tiles.push({ x, z, h, water: water && !bridge, bridge, bridgeBed: bridge ? 0 : undefined, road, active, decoration: !water && !road && randomAt(x, z) > 0.75 ? 1 + Math.floor(randomAt(x + 90, z) * 3) : 0 });
  }
  return tiles;
}

function traceRoad(points: Point[]): Point[] {
  const path:Point[]=[{...points[0]}];
  for(const end of points.slice(1)){
    const p={...path[path.length-1]};
    while(p.x!==end.x||p.z!==end.z){
      if(p.x!==end.x)p.x+=Math.sign(end.x-p.x);else p.z+=Math.sign(end.z-p.z);
      path.push({...p});
    }
  }
  return path;
}
function makeMountainTerrain():Tile[]{
  const road=traceRoad([{x:2,z:25},{x:10,z:25},{x:10,z:18},{x:23,z:18},{x:23,z:10},{x:34,z:10},{x:34,z:8},{x:37,z:8}]);
  const tiles:Tile[]=[];
  for(let z=0;z<DEPTH;z++)for(let x=0;x<WIDTH;x++){
    const active=x>0&&x<WIDTH-1&&z>0&&z<DEPTH-1;
    let nearest=0,dist=Infinity;
    road.forEach((p,i)=>{const d=Math.abs(p.x-x)+Math.abs(p.z-z);if(d<dist){dist=d;nearest=i;}});
    const peak=Math.max(0,10-Math.hypot((x-16)*.95,z-6),12-Math.hypot((x-29)*1.1,z-25),7-Math.hypot(x-5,z-7));
    let h=Math.floor(10+peak);
    if(dist<=2)h=2+Math.floor(nearest/6)+(dist===2?1:0);
    if(x>=35&&x<=40&&z>=6&&z<=10)h=11;
    tiles.push({x,z,h,active,water:false,bridge:false,road:dist===0,decoration:dist>1&&randomAt(x,z)>.66?(h>=14?2:1):0});
  }
  return tiles;
}
export function canyonBanks(z:number){
  return {left:15+Math.round(Math.sin(z*.23)*1.8),right:25+Math.round(Math.sin(z*.22+.3)*1.2)};
}
function makeCanyonTerrain():Tile[]{
  const tiles:Tile[]=[];
  for(let z=0;z<DEPTH;z++)for(let x=0;x<WIDTH;x++){
    const active=x>0&&x<WIDTH-1&&z>0&&z<DEPTH-1;
    const banks=canyonBanks(z),chasm=x>=banks.left&&x<=banks.right;
    const bridge=chasm&&(z===10||z===23);
    const road=Math.abs(z-10)<=1||Math.abs(z-23)<=1||(Math.abs(x-8)<=1&&z>=10&&z<=23)||(Math.abs(x-31)<=1&&z>=10&&z<=23)||(z>=15&&z<=17&&(x<=8||x>=31));
    let h=7;
    if(z<6)h+=Math.floor((6-z)/2);
    if(z>26)h+=Math.floor((z-26)/2);
    if(chasm)h=bridge?7:-10;
    tiles.push({x,z,h,active,water:false,bridge,road:!chasm&&road,decoration:!chasm&&!road&&randomAt(x,z)>.76?1+Math.floor(randomAt(x+80,z)*3):0,...(chasm?{chasm:true,bridgeDeck:7}:{}),...(bridge?{suspension:true,bridgeBed:-10}:{})});
  }
  return tiles;
}
export function makeTerrain(mapId:MapId='river'):Tile[]{
  return mapId==='mountain'?makeMountainTerrain():mapId==='canyon'?makeCanyonTerrain():makeRiverTerrain();
}
