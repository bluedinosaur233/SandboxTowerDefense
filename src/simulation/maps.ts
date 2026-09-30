import type { Point, Tile, StructureKind } from './game';

export const WIDTH = 100;
export const DEPTH = 80;
export type MapId = 'windford';
export interface Approach extends Point { id:string; name:string; color:string }
export interface ProductionSite extends Point { id:string; name:string; kind:'farm'|'mine'; cost:number; income:number; description:string }
export interface MapDefinition {
  id: MapId; name: string; chapter: string; eyebrow: string;
  description: string; tactic: string; objective: string; intro: string;
  spawnName: string; goalName: string; spawn: Point; goal: Point;
  maxHeight: number; cameraHeight: number;
  approaches:Approach[]; waveFronts:number[][]; waveBriefings:string[]; sites:ProductionSite[];
  starters: {kind: StructureKind; x:number; z:number}[];
  waveNames: string[];
}
export const MAPS: Record<MapId, MapDefinition> = {
  windford: {
    id:'windford', name:'风渡前哨', chapter:'第一章 · 暮河原野', eyebrow:'WINDFORD OUTPOST',
    description:'暮河流向镜湖的旧渡口。西岸麦田、北坡矿场与中央前哨，等你重新点亮。',
    tactic:'经营外围据点 · 应对三路合围', objective:'在风渡，守住一片领地。',
    intro:'旧防线还在：西渡口石墙、北坡断墙与东南木栅都留有缺口。现有墙体均可直接使用，沿大小缺口续建即可；先守西岸，再照应两翼。',
    spawnName:'西岸林道',goalName:'风渡要塞',spawn:{x:2,z:42},goal:{x:54,z:42},maxHeight:24,cameraHeight:3,
    approaches:[{id:'west',name:'西岸林道',x:2,z:42,color:'#e5ae67'},{id:'north',name:'北坡矿道',x:54,z:2,color:'#c99be5'},{id:'southeast',name:'东南古道',x:96,z:75,color:'#e8876d'}],
    waveFronts:[[0],[0,1],[2],[0,1],[0,1,2],[0,2],[1],[0,2],[1,2],[0,1],[0,1,2],[0,2],[1,2],[0,1,2],[0,1,2]],
    waveNames:['西岸试探','矿道告急','丘陵绕袭','渡口争夺','三面围城','疾风奔袭','铁甲长阵','符文行军','暮翼掠空','水道劫掠','重锤破阵','灰烬压境','陆空夹击','无尽战鼓','黎明决战'],
    waveBriefings:[
      '西岸林道发现敌情。利用开阔地组织拦截，守住要塞的接近方向。',
      '西岸与北坡同时来袭。留出能保护外围据点的机动兵力。',
      '东南古道发现敌情。东侧防御建筑和外围生产也可能成为目标。',
      '西岸与北坡持续集结。根据斥候报告搭配火力，兼顾生产与要塞。',
      '三路同时进攻。评估外围收益与守军损失，决定坚守或收缩。',
      '疾行兵从西岸与东南穿插。用寒霜减速、兵营拦截，检验火力覆盖的缺口。',
      '北坡铁甲集结，巨盾督军压阵。用法术突破重装精英，别让它贴近防御塔。',
      '符文卫士分两路推进，法抗很高。箭塔与炮火将成为主力。',
      '暮翼石像鬼掠过山脊，白鬃猎首率领地面突袭。检查对空覆盖并布置拦截。',
      '潜行者沿水道掠夺，疾行兵趁隙突破。保护麦田与银矿，保持升级所需的收入。',
      '重锤与铁甲从三面逼近，紫晶巨卫也已现身。高法抗精英需要箭矢与炮火集火。',
      '咒术师掩护符文卫士推进。让箭塔覆盖敌方施法位置，以范围攻击清理护卫。',
      '空中突袭与铁甲部队同步压境。检验魔力导弹井与地面对抗的配合。',
      '轻装部队密集冲锋，重兵与暮翼夹杂其中。迫击炮、连锁闪电和范围法术各显身手。',
      '首领警报：北坡传来沉重战鼓，巨型攻城领主随三路军团逼近。分散塔楼，预留英雄撤离重锤范围的空间。',
    ],
    sites:[{id:'westfield',kind:'farm',name:'西岸麦田',x:37,z:42,cost:90,income:30,description:'渡桥外的旧农庄。战中运送军粮换取金币；守住后领取丰收金币。连续守住会增收。'},
      {id:'northmine',kind:'mine',name:'北坡银矿',x:54,z:28,cost:120,income:40,description:'山口旁的银矿。战中运出银矿换取金币；守住后领取采掘金币。可投资扩建矿场。'}],
    starters:[{kind:'archer',x:49,z:40},{kind:'mage',x:55,z:37},{kind:'barracks',x:51,z:44},
      // Three incomplete defensive lines: gaps are intentional buildable ground.
      ...[36,37,38,40,43,44,46,47].map(z=>({kind:'wall' as const,x:47,z})),
      ...[48,49,50,51,56,57,59].map(x=>({kind:'wall' as const,x,z:34})),
      ...[43,44,46,47,49,52,53].map(z=>({kind:'palisade' as const,x:61,z})),
      {kind:'palisade',x:33,z:39},{kind:'palisade',x:33,z:40},{kind:'palisade',x:33,z:44}
    ],
  },
};
export const MAP_LIST = Object.values(MAPS);
const randomAt = (x:number,z:number) => {const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
export const windfordRiverX=(z:number)=>43+Math.round(Math.sin((z-16)*.17)*2);

const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const mound=(x:number,z:number,cx:number,cz:number,rx:number,rz:number)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
function segmentDistance(x:number,z:number,ax:number,az:number,bx:number,bz:number){const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2)));return Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az));}

/** A river valley with mountain shoulders and three broad approach spurs. */
export function makeTerrain(_mapId:MapId='windford'):Tile[]{
  const tiles:Tile[]=[];
  for(let z=0;z<DEPTH;z++)for(let x=0;x<WIDTH;x++){
    const river=windfordRiverX(z),riverDistance=Math.abs(x-river),water=riverDistance<=1;
    const bridge=water&&(z===42||z===32);
    const northRoad=Math.abs(x-54)<=1&&z<=42;
    const westRoad=Math.abs(z-42)<=1&&x<=55;
    const eastRoad=(Math.abs(z-50)<=1&&x>=54&&x<=92)||(Math.abs(x-92)<=1&&z>=50)||(Math.abs(x-54)<=1&&z>=42&&z<=51)||(Math.abs(z-75)<=1&&x>=91);
    const road=northRoad||westRoad||eastRoad||(z===32&&x>=37&&x<=54);
    // Rounded ridges replace parallel north/east staircases. The central keep stands above the floodplain.
    let height=1+20*mound(x,z,68,15,14,19)+12*mound(x,z,23,22,14,15)+11*mound(x,z,83,51,17,23)+3*mound(x,z,25,63,19,12);
    height+=.6*Math.sin(x*.14+z*.08)*Math.cos(z*.13);
    height=Math.min(height,1+Math.max(0,riverDistance-1)*1.15);
    const keepWeight=1-smooth(7,14,Math.hypot(x-54,z-42));height=height*(1-keepWeight)+5*keepWeight;
    for(const site of MAPS.windford.sites){const weight=1-smooth(2.8,7,Math.hypot(x-site.x,z-site.z)),level=site.kind==='farm'?1:5;height=height*(1-weight)+level*weight;}
    let h=Math.max(1,Math.round(height));if(water)h=0;if(bridge)h=1;
    const outline=Math.hypot((x-49)/49,(z-39)/39);
    const rim=.91+.05*Math.sin(x*.19+z*.08)+.035*Math.cos(z*.24-x*.1);
    const spur=Math.min(segmentDistance(x,z,2,42,26,42)-6,segmentDistance(x,z,54,2,54,23)-7,segmentDistance(x,z,96,75,76,54)-8);
    const active=(outline<rim||spur<0)&&x>0&&x<WIDTH-1&&z>0&&z<DEPTH-1;
    const reserve=MAPS.windford.sites.some(s=>Math.abs(x-s.x)<=2&&Math.abs(z-s.z)<=2)||MAPS.windford.approaches.some(p=>Math.hypot(x-p.x,z-p.z)<3);
    const forestWeight=(Math.sin(x*.12+z*.06)+Math.cos(z*.15-x*.035)+2)/4;
    // Open deployment ground around the keep; feather it into the outer woods.
    const keepDistance=Math.hypot(x-MAPS.windford.goal.x,z-MAPS.windford.goal.z);
    const siteDistance=Math.min(...MAPS.windford.sites.map(s=>Math.hypot(x-s.x,z-s.z)));
    const clearing=smooth(9,19,keepDistance)*smooth(4,9,siteDistance);
    const treeChance=(.055+.20*forestWeight)*(1-smooth(10,19,h))*clearing;
    const decoration=active&&!water&&!road&&!reserve&&randomAt(x,z)>1-treeChance?1:active&&!water&&!road&&!reserve&&randomAt(x+12,z+3)>.94?(h>11?2:3):0;
    const paving=(z===42&&x>=48&&x<=51)||(x===54&&z>=31&&z<=36&&z!==33&&z!==34);
    const stakes=(x===60&&(z===44||z===47||z===52))||(z===35&&(x===49||x===57));
    const gapRubble=(x===47&&(z===39||z===45))||(z===34&&(x===52||x===58))||(x===61&&z===48);
    tiles.push({x,z,h,water:water&&!bridge,bridge,bridgeBed:bridge?0:undefined,road:road||paving,active,decoration:gapRubble?2:paving||stakes?0:decoration,paved:paving||undefined,spikes:stakes||undefined});
  }
  return tiles;
}
