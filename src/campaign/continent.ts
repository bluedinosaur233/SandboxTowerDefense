import type { MapId } from '../simulation/maps';

export type Biome='sea'|'coast'|'forest'|'meadow'|'mountain'|'snow'|'canyon'|'desert'|'river'|'lake'|'marsh'|'autumn'|'volcanic'|'lava'|'tropical'|'chalk';
export const ATLAS_SCALE=3;
export const CONTINENT={width:900,depth:648};
export const SEA_LEVEL=0;
export const TERRAIN_CELL=1.5;
export const HEIGHT_STEP=.75;
export const BEDROCK=-14;
export const worldPoint=(x:number,z:number)=>({x:x*ATLAS_SCALE,z:z*ATLAS_SCALE});
export const STAGES: {id:MapId;number:string;x:number;z:number;region:string}[]=[
  {id:'river' as MapId,number:'01',x:-24,z:13,region:'暮河原野'},
  {id:'mountain' as MapId,number:'02',x:-48,z:-43,region:'霜脊山脉'},
  {id:'canyon' as MapId,number:'03',x:48,z:-3,region:'风裂断崖'},
].map(stage=>({...stage,...worldPoint(stage.x,stage.z)}));
export const REGIONS=[
  {name:'霜脊山脉',subtitle:'THE FROSTWARD',x:-34,z:-67,detail:'连绵雪峰、冰川与蜿蜒山口，暮河的源头藏在群山之间。'},
  {name:'碎冰峡湾',subtitle:'SHATTERED FJORDS',x:-99,z:-51,detail:'冰海切入嶙峋海岸，孤立雪岛与灯塔守望北境航道。'},
  {name:'翡翠密林',subtitle:'THE EMERALD WILD',x:-78,z:-5,detail:'古老针叶林围绕巨树生长，林间留有石环与精灵遗迹。'},
  {name:'暮河原野',subtitle:'RIVERWATCH',x:-27,z:31,detail:'河流穿过起伏牧场、风车与村庄，古道连接边境的三座要塞。'},
  {name:'紫雾湿地',subtitle:'THE VIOLET FEN',x:-73,z:49,detail:'紫色苔地与浅潭交错，芦苇、枯木和半沉的遗迹隐入水泽。'},
  {name:'镜湖盆地',subtitle:'LAKE MIRRORMERE',x:-5,z:53,detail:'宽阔内陆湖承接群山来水，湖心小岛与渔港点缀蓝色水面。'},
  {name:'白垩海崖',subtitle:'THE IVORY COAST',x:23,z:80,detail:'白色阶崖高出南海，河水沿岩壁倾泻，古老水道桥横跨山谷。'},
  {name:'金叶丘陵',subtitle:'THE GOLDEN MARCH',x:35,z:-43,detail:'金红树林沿山麓延伸，修道院和葡萄田坐落在温暖的台地。'},
  {name:'风裂断崖',subtitle:'THE SUNDERED REACH',x:63,z:-19,detail:'红岩台地被深谷切开，吊桥横跨碧水，石柱与孤峰立在风中。'},
  {name:'琥珀沙海',subtitle:'THE AMBER SEA',x:74,z:43,detail:'沙丘、绿洲、阶梯古墓和商队驿站延伸到东南海岸。'},
  {name:'烬火群峰',subtitle:'THE CINDER CROWN',x:83,z:-53,detail:'黑曜石山岭围绕火山口，熔岩穿过灰烬坡地注入东海。'},
  {name:'碧潮群岛',subtitle:'THE JADE ARCHIPELAGO',x:127,z:33,detail:'珊瑚浅海环绕热带岛链，棕榈、港湾与海上灯塔标记远航的方向。'},
].map(region=>({...region,...worldPoint(region.x,region.z)}));
export const random=(x:number,z:number)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
// Geography is authored in reference-image coordinates, sampled at full world resolution.
export const riverX=(z:number)=>-9+Math.sin(z*.061)*9+Math.sin(z*.14)*2;
export const canyonX=(z:number)=>65+Math.sin(z*.093)*9+Math.sin(z*.21)*2;
const ellipse=(x:number,z:number,cx:number,cz:number,rx:number,rz:number)=>Math.hypot((x-cx)/rx,(z-cz)/rz);
export const ISLANDS=[{x:126,z:16,r:9},{x:134,z:35,r:10},{x:117,z:52,r:10},{x:142,z:58,r:5},{x:105,z:72,r:5},{x:139,z:-7,r:5},{x:147,z:24,r:3},{x:124,z:68,r:3}];
const smooth=(a:number,b:number,t:number)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v);};
export function coastShape(x:number,z:number){
  const noise=Math.sin(x*.067+z*.043)*.055+Math.sin(z*.13-x*.057)*.04+Math.sin(x*.31+z*.24)*.012+Math.sin(x*.63-z*.45)*.012;
  // Broad bays and capes replace a circular tabletop silhouette.
  return Math.hypot(x/132,z/91)+noise+Math.exp(-((x+115)**2+(z-12)**2)/240)*.11+Math.exp(-((x-100)**2+(z-47)**2)/140)*.1+Math.exp(-((x+36)**2+(z-85)**2)/250)*.14+Math.exp(-((x-53)**2+(z-81)**2)/180)*.09;
}
export type Geography={h:number;biome:Biome;fringe?:Biome;blend?:number};
/** Broad ecological belts blend elevation and cover separately from true river/cliff edges. */
export function sampleGeography(x:number,z:number):Geography{
  const edge=coastShape(x,z),fjord=x<-72&&z<-29&&Math.sin(x*.24+z*.075)>.4&&edge>.69;
  if(edge>1||fjord){
    for(const island of ISLANDS){const d=Math.hypot(x-island.x,z-island.z)/island.r;if(d<1)return {h:d>.85?.35:1+smooth(1,.65,d)*2.5,biome:d>.85?'coast':'tropical'};}
    for(const [ix,iz,r] of [[-114,-56,5],[-98,-74,7],[-74,-86,5],[-48,-95,4]]){const d=Math.hypot(x-ix,z-iz)/r;if(d<1)return {h:1+(1-d)*13,biome:'snow'};}
    return {h:BEDROCK,biome:'sea'};
  }
  const hills=Math.sin(x*.073)*Math.cos(z*.081)*1.3+Math.sin(x*.16+z*.11)*.65;
  let h=2.5+Math.max(0,hills+1),biome:Biome='meadow',fringe:Biome|undefined,blend=0;
  const cover=(next:Biome,w:number)=>{if(w<=0||next===biome)return;const old=biome;if(w>=1){biome=next;fringe=undefined;blend=0;}else if(w>=.5){biome=next;fringe=old;blend=1-w;}else{fringe=next;blend=w;}};
  const layer=(next:Biome,height:number,w:number)=>{h+=(height-h)*w;cover(next,w);};
  cover('forest',smooth(-9,12,(-46+Math.sin(z*.075)*9+Math.sin(z*.19)*2)-x));
  const mountainWeight=smooth(-10,9,(-27+Math.sin(x*.06)*6)-z)*smooth(-8,9,24-x);
  if(mountainWeight>0){
    const peaks=[[-80,-47,26],[-60,-59,37],[-37,-63,46],[-16,-53,33],[5,-57,25],[-57,-36,22],[-87,-64,24],[-25,-38,18]];
    const warpX=x+Math.sin(z*.2)*1.5,warpZ=z+Math.sin(x*.18)*1.3;
    const peak=Math.max(0,...peaks.map(([px,pz,ph])=>{const dx=warpX-px,dz=warpZ-pz,a=Math.atan2(dz,dx);return ph-Math.hypot(dx*1.45,dz*1.48)*(1+Math.sin(a*5+px)*.13+Math.cos(a*9)*.04);}));
    const ridges=(1-Math.abs(Math.sin(x*.26+z*.19)))*1.6+(1-Math.abs(Math.sin(x*.15-z*.25)))*1.1;
    const rise=peak*1.13+ridges*smooth(0,5,peak)+smooth(-75,-95,x)*3;
    h+=rise*mountainWeight;cover('mountain',mountainWeight*smooth(1,9,rise));
    cover('snow',smooth(-5,7,h-(25+Math.sin(x*.2+z*.16)*4))*mountainWeight);
  }
  const autumnWeight=smooth(-9,12,x-(20+Math.sin(z*.08)*6))*smooth(-10,10,(-25+Math.sin(x*.075)*6)-z);
  layer('autumn',5+Math.max(0,hills+1)*1.5,autumnWeight);
  const eastWeight=smooth(-10,15,x-(30+Math.sin(z*.067)*10+Math.sin(z*.19)*3))*smooth(-10,12,z-(-27+Math.sin(x*.075)*6));
  if(eastWeight>0){
    const sand=smooth(-12,18,z-(17+Math.sin(x*.068)*7));
    const dune=Math.sin(x*.15+z*.067+Math.sin(z*.09))*.5+.5;
    const sandHeight=2.5+dune*dune*3.4+(Math.sin(z*.12)+1);
    const d=Math.abs(x-canyonX(z)),mesa=15+Math.max(0,hills)*2+smooth(.35,.9,Math.sin(x*.17)*Math.cos(z*.16))*6;
    const canyonHeight=.4+(mesa-.4)*smooth(2.7,11,d);
    layer(sand>.5?'desert':'canyon',canyonHeight*(1-sand)+sandHeight*sand,eastWeight);
    if(eastWeight>.98&&sand>0&&sand<1){biome=sand>.5?'desert':'canyon';fringe=sand>.5?'canyon':'desert';blend=Math.min(sand,1-sand);}
    if(d<2.6&&eastWeight>.85&&sand<.45){h=.4;biome='river';fringe=undefined;blend=0;}
  }
  const fenDistance=ellipse(x,z,-76,45,38,25)-Math.sin(x*.12+z*.05)*.06;
  const wetness=smooth(1.22,.78,fenDistance);
  if(wetness>0){
    const pool=Math.sin(x*.18+z*.06)+Math.cos(z*.24-x*.04),poolWeight=smooth(.1,.85,pool)*wetness;
    layer('marsh',1.6+Math.max(0,-pool)*.5,wetness);h+=(.4-h)*poolWeight;
    if(poolWeight>.9){h=.4;biome='river';fringe=undefined;blend=0;}
  }
  const lake=ellipse(x,z,-5,49,27,21)+Math.sin(x*.22+z*.13)*.025+Math.sin(z*.32-x*.17)*.02;
  if(lake<1.24){const shore=smooth(1.24,1,lake);h+=(.4-h)*shore;cover('coast',shore*.65);if(lake<1){h=.4;biome='lake';fringe=undefined;blend=0;}}
  if(ellipse(x,z,-5,49,4,3)<1){h=2.5;biome='meadow';fringe=undefined;blend=0;}
  const chalk=ellipse(x,z,15,79,36,18)-Math.sin(x*.12+z*.08)*.05;
  layer('chalk',9+Math.max(0,Math.sin(x*.1)+Math.cos(z*.09))*2,smooth(1.28,.76,chalk));
  const water=(b:Biome='river')=>{h=.4;biome=b;fringe=undefined;blend=0;};
  if(z>-29&&z<33){const d=Math.abs(x-riverX(z)),valley=smooth(-29,-24,z);h+=(Math.min(h,1+Math.max(0,d-2.2)*1.3)-h)*valley;if(d<2.2&&valley>.98)water();}
  if(x>-65&&x<riverX(z)){const d=Math.abs(z-(5+Math.sin(x*.075)*8));if(d<4)h=Math.min(h,.4+Math.max(0,d-1.2)*1.4);if(d<1.2)water();}
  if(z>66&&Math.abs(x-(7+Math.sin(z*.095)*5))<1.6)water();
  const oasis=ellipse(x,z,74,29,6,4);if(oasis<1.8){h=Math.min(h,.4+Math.max(0,oasis-1)*3);if(oasis<1)water('lake');}
  const volcano=ellipse(x,z,82,-49,32,29),ash=smooth(1.3,.83,volcano);
  if(ash>0){
    const dx=x-82,dz=(z+49)*1.1,d=Math.hypot(dx,dz),a=Math.atan2(dz,dx),flutes=Math.sin(a*13+d*.2)*.7+Math.sin(a*23)*.3;
    layer('volcanic',5+Math.max(0,38-d*1.15)+flutes,ash);
    if(d<5.2){h=27;biome='lava';fringe=undefined;blend=0;}
    if(d>=5.2&&d<7)h+=2;
    if(d>6&&ash>.8&&((x>82&&Math.abs(z-(-49+Math.sin((x-82)*.15)*4+(x-82)*.4))<.9)||(z>-49&&Math.abs(x-(82+Math.sin(z*.3)*1.8))<.7))){h=Math.max(2,h-.4);biome='lava';fringe=undefined;blend=0;}
  }
  const cliff=['mountain','snow','chalk','volcanic','canyon'].includes(biome);
  if(edge>.91&&!cliff){h*=smooth(1,.91,edge);cover('coast',smooth(.94,.993,edge));if(edge>.973)h=.2+(1-edge)*12;}
  return {h:Math.max(.2,h),biome,fringe,blend};
}
/** Coarser 1.5-unit voxels retain the full continental area and align props to their tops. */
export function sampleContinent(x:number,z:number):Geography{
  const sx=Math.round(x/TERRAIN_CELL)*TERRAIN_CELL,sz=Math.round(z/TERRAIN_CELL)*TERRAIN_CELL;
  const t=sampleGeography(sx/ATLAS_SCALE,sz/ATLAS_SCALE);
  return {...t,h:t.biome==='sea'?BEDROCK:Math.max(HEIGHT_STEP,Math.round(t.h*2.4/HEIGHT_STEP)*HEIGHT_STEP)};
}
export const ROUTES=[
  [[-24,13],[-35,6],[-45,-8],[-55,-24],[-48,-43]],
  [[-48,-43],[-30,-29],[-14,-24],[5,-23],[26,-25],[40,-22],[48,-3]],
].map(route=>route.map(([x,z])=>[x*ATLAS_SCALE,z*ATLAS_SCALE]));
