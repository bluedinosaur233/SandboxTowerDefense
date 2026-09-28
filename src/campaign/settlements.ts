import { sampleContinent, STAGES, worldPoint, random, type Biome } from './continent';
import type { Block } from './terrain-geometry';

export type SettlementTheme='snow'|'fjord'|'forest'|'meadow'|'marsh'|'lake'|'chalk'|'autumn'|'canyon'|'desert'|'tropical';
type Plan={region:number;theme:SettlementTheme;name:string;x:number;z:number;capital:boolean;houses:number};
export type BuildingSite={x:number;z:number;width:number;depth:number;bottom:number;floor:number;central:boolean};
export type Settlement=Plan&{radius:number;buildings:BuildingSite[]};
export const REGION_LIFE=[
  '霜门堡驻守避风山口，只有矿工营地与牧羊小村；高海拔雪峰无人定居。',
  '寒湾港以长屋、船坞和灯塔围成小港城，周围仅有一处渔村。',
  '翠冠庭由绿顶尖塔、林间厅堂和木栈道组成，三座林间聚落散布古树周围。',
  '暮河城以红顶城堡、集市和城墙为中心，农庄与磨坊聚落沿牧场分布。',
  '苇灯镇是一座紧凑的高脚木镇，只有一处采药聚落；深水沼泽保留荒废遗迹。',
  '镜湖城围绕蓝顶议事厅和码头生长，湖岸还有渔村与渡口。',
  '白帆城的白石教堂、蓝顶民居与海崖灯塔面向海洋，外围是牧场和海岸小镇。',
  '金穗城以钟楼修道院为中心，红铜屋顶、酿酒庄园与葡萄田点缀金色丘陵。',
  '双桥堡由赭石堡楼、商队庭院和崖边哨塔组成，只有两处小型驿站。',
  '琥珀泉城依绿洲而建，砂岩院落、阶梯穹顶和遮阳集市形成沙漠城镇；外围仅有商队驿站。',
  '烬火群峰不设首都或常住聚落。火山口、熔岩坡与高危灰烬带仅留破败堡垒。',
  '碧潮港汇集青绿屋顶的港务厅、吊脚木屋和帆船码头，较大的岛屿各有渔村。',
];
const plans:Plan[]=[];
function region(region:number,theme:SettlementTheme,capital:[string,number,number,number],villages:[string,number,number,number][]){
  const add=(p:[string,number,number,number],isCapital:boolean)=>plans.push({region,theme,name:p[0],...worldPoint(p[1],p[2]),capital:isCapital,houses:p[3]});add(capital,true);villages.forEach(p=>add(p,false));
}
region(0,'snow',['霜门堡',-48,-30,10],[['霜铁矿营',-65,-37,4],['雪松村',-24,-36,4]]);
region(1,'fjord',['寒湾港',-103,-27,10],[['鲸灯渔村',-109,-14,4]]);
region(2,'forest',['翠冠庭',-78,15,17],[['鹿铃村',-101,-7,6],['青枝营',-58,-6,5],['西林村',-100,15,5]]);
region(3,'meadow',['暮河城',-27,29,22],[['风穗村',-45,29,7],['牧铃庄',-41,44,6],['东溪村',12,20,7],['麦丘庄',-22,74,5]]);
region(4,'marsh',['苇灯镇',-79,48,8],[['萤草村',-66,48,4]]);
region(5,'lake',['镜湖城',-34,54,16],[['北汀渡',-20,27,5],['东湖渔村',23,55,6]]);
region(6,'chalk',['白帆城',-4,76,16],[['石湾镇',33,79,6],['白羊牧场',9,70,5]]);
region(7,'autumn',['金穗城',35,-39,20],[['酒橡庄',49,-30,6],['落枫村',22,-39,6],['琥叶庄',30,-25,5]]);
region(8,'canyon',['双桥堡',43,8,12],[['北桥驿',48,-22,4],['红岩驿',91,1,4]]);
region(9,'desert',['琥珀泉城',83,27,14],[['驼铃驿',61,39,5],['流沙驿',90,61,4]]);
region(11,'tropical',['碧潮港',134,35,12],[['珊瑚村',126,16,5],['椰湾村',117,52,6]]);
const preferred:Record<SettlementTheme,Biome[]>={snow:['mountain','snow','meadow'],fjord:['forest','mountain','meadow'],forest:['forest'],meadow:['meadow'],marsh:['marsh'],lake:['meadow','coast'],chalk:['chalk'],autumn:['autumn'],canyon:['canyon'],desert:['desert'],tropical:['tropical']};
const wet=new Set<Biome>(['sea','lake','river','lava']);
// Keep settlement foundations clear of existing monuments and playable keeps.
const exclusions=[{...worldPoint(-80,-6),r:32},{...worldPoint(-5,49),r:13},{...worldPoint(79,48),r:19},{...worldPoint(66,53),r:14},{...worldPoint(91,43),r:10},...STAGES.map(s=>({...s,r:12}))];
export function buildingSite(x:number,z:number,width:number,depth:number,central=false,stilts=false):BuildingSite|null{
  const points=[[0,0],[-width/2,-depth/2],[width/2,-depth/2],[-width/2,depth/2],[width/2,depth/2]].map(([dx,dz])=>sampleContinent(x+dx,z+dz));
  if(points.some(p=>p.biome==='sea'||p.biome==='lava'||(!stilts&&wet.has(p.biome))||p.h>75))return null;
  const bottom=Math.min(...points.map(p=>p.h)),top=Math.max(...points.map(p=>p.h));
  if(top-bottom>(central?8:4.5))return null;
  return {x,z,width,depth,bottom,floor:top+(stilts?2.5:.3),central};
}
let cached:Settlement[]|undefined;
export function atlasSettlements():Settlement[]{
  if(cached)return cached;
  const placed:Settlement[]=[];
  for(const plan of plans){
    let center:BuildingSite|null=null,best=-Infinity;
    for(let dz=-36;dz<=36;dz+=3)for(let dx=-36;dx<=36;dx+=3){
      const x=plan.x+dx,z=plan.z+dz,t=sampleContinent(x,z);if(!preferred[plan.theme].includes(t.biome)&&!(t.fringe&&preferred[plan.theme].includes(t.fringe)&&(t.blend??0)>.2))continue;
      if(exclusions.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+12)||placed.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+20))continue;
      const s=buildingSite(x,z,plan.capital?10:5,plan.capital?9:4,true,plan.theme==='marsh');if(!s)continue;
      const score=-Math.hypot(dx,dz)-(s.floor-s.bottom)*2+(t.biome===preferred[plan.theme][0]?8:0);
      if(score>best){best=score;center=s;}
    }
    if(!center){if(!plan.capital)continue;throw new Error(`No habitable site for ${plan.name}`);}
    const buildings:BuildingSite[]=[center];
    for(let i=0;i<180&&buildings.length<=plan.houses;i++){
      const angle=i*2.39996,r=plan.capital?12+Math.floor(i/14)*5:7+Math.floor(i/10)*4,x=center.x+Math.cos(angle)*r,z=center.z+Math.sin(angle)*r;
      if(r>(plan.capital?30:18))break;
      const w=3.4+random(x,z)*1.3,d=3.2+random(z,x)*1.1;
      if(exclusions.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+3)||buildings.some(p=>Math.hypot(p.x-x,p.z-z)<(p.central?10:6)))continue;
      const s=buildingSite(x,z,w,d,false,plan.theme==='marsh');if(!s)continue;
      if(plan.theme!=='marsh'&&!preferred[plan.theme].includes(sampleContinent(x,z).biome))continue;
      buildings.push(s);
    }
    const radius=Math.max(...buildings.map(p=>Math.hypot(p.x-center!.x,p.z-center!.z)+Math.max(p.width,p.depth)/2))+3;
    placed.push({...plan,x:center.x,z:center.z,radius,buildings});
  }
  cached=placed;return placed;
}
export function settlementClearance(x:number,z:number){return atlasSettlements().some(s=>Math.hypot(x-s.x,z-s.z)<s.radius+(s.capital?5:0));}

const schemes:Record<SettlementTheme,{wall:string;roof:string;trim:string;wood:string}>={
  snow:{wall:'#c6cfcb',roof:'#49616a',trim:'#dfbc76',wood:'#655848'},fjord:{wall:'#b6bbaa',roof:'#416f79',trim:'#e5d8b1',wood:'#785c43'},
  forest:{wall:'#dddcc0',roof:'#3d8170',trim:'#c8c373',wood:'#776443'},meadow:{wall:'#ddd0ad',roof:'#aa563b',trim:'#e0be79',wood:'#805a3f'},
  marsh:{wall:'#a1a898',roof:'#566f71',trim:'#d5c690',wood:'#78654e'},lake:{wall:'#e2d8b8',roof:'#437c91',trim:'#d3b973',wood:'#8a6948'},
  chalk:{wall:'#e8e7d2',roof:'#4b728d',trim:'#c7b074',wood:'#8c7652'},autumn:{wall:'#d9c5a0',roof:'#9b5838',trim:'#d3a64d',wood:'#755739'},
  canyon:{wall:'#b58055',roof:'#cfb17d',trim:'#e4cba1',wood:'#765b41'},desert:{wall:'#dcc087',roof:'#4c9b9b',trim:'#ede0b4',wood:'#a47a49'},
  tropical:{wall:'#d9d9b0',roof:'#3a9990',trim:'#efd599',wood:'#8b6845'},
};
export function settlementBlocks():Block[]{
  const blocks:Block[]=[],box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{if(h>0)blocks.push({x,y,z,w,h,d,color});};
  for(const town of atlasSettlements()){
    const c=schemes[town.theme],stilts=town.theme==='marsh'||town.theme==='tropical';
    const tower=(x:number,z:number,h:number,w=3)=>{const floor=sampleContinent(x,z).h;box(x,floor+h/2,z,w,h,w,c.wall);box(x,floor+h,z,w+1,.7,w+1,c.trim);for(let i=0;i<4;i++)box(x,floor+h+.6+i*.6,z,w+1-i*.8,.7,w+1-i*.8,c.roof);box(x,floor+h*.66,z+w/2+.04,.6,1.4,.1,'#52636a');};
    for(const b of town.buildings){
      const {x,z,width:w,depth:d,floor:y,bottom}=b,h=b.central?(town.capital?6:3.8):3;
      if(stilts){for(const dx of [-w*.42,w*.42])for(const dz of [-d*.42,d*.42]){const gy=sampleContinent(x+dx,z+dz).h;box(x+dx,(gy+y)/2,z+dz,.45,y-gy,.45,c.wood);}box(x,y,z,w+1,.35,d+1,c.wood);}
      else box(x,(bottom+y)/2,z,w+.7,y-bottom,d+.7,c.wall);
      box(x,y+h/2,z,w,h,d,c.wall);
      if(town.theme==='canyon'||town.theme==='desert'){
        box(x,y+h,z,w+1,.65,d+1,c.trim);for(const side of [-1,1]){box(x+side*w/2,y+h+.65,z,.45,.8,d+.5,c.wall);box(x,y+h+.65,z+side*d/2,w+.5,.8,.45,c.wall);}
        if(town.theme==='desert'&&(b.central||random(x,z)>.62))for(let k=0;k<4;k++)box(x,y+h+1+k*.55,z,w*.72-k*w*.13,.6,d*.72-k*d*.13,c.roof);
      }else{
        const tiers=b.central?5:3;for(let k=0;k<tiers;k++)box(x,y+h+.3+k*.55,z,Math.max(.5,w+1.1-k*(w+.6)/tiers),.6,d+1,c.roof);
        if(town.theme==='forest')box(x,y+h+3.9,z,.4,2.7,.4,c.trim);
      }
      // Broad doors, shutters and beams read at the map's deliberately moderate resolution.
      box(x,y+1.1,z+d/2+.05,.9,2.2,.14,c.wood);for(const dx of [-w*.3,w*.3])box(x+dx,y+2,z+d/2+.08,.7,.8,.14,b.central?c.trim:'#697983');
      if(['meadow','fjord','forest','marsh','tropical'].includes(town.theme)){for(const dx of [-w/2,w/2])box(x+dx,y+h/2,z+d/2+.07,.22,h,.2,c.wood);box(x,y+h*.7,z+d/2+.08,w,.23,.2,c.wood);}
      if(b.central&&town.capital){
        if(['snow','meadow','canyon'].includes(town.theme))for(const dx of [-w*.55,w*.55])tower(x+dx,z-d*.35,town.theme==='snow'?12:11,2.8);
        if(['autumn','chalk','lake','fjord'].includes(town.theme)){tower(x-w*.32,z-d*.32,town.theme==='chalk'?19:16,3.4);if(town.theme==='autumn'){box(x-w*.32,y+12,z-d*.32+1.76,1.65,1.65,.1,c.trim);box(x-w*.32,y+12,z-d*.32+1.84,.16,1.1,.08,'#514d43');}}
        if(town.theme==='forest'){for(const dx of [-w*.57,w*.57]){tower(x+dx,z,12,2.2);box(x+dx,y+14,z,.25,3,.25,c.trim);}}
        if(town.theme==='desert'){tower(x+w*.65,z-d*.4,13,2.2);box(x,y+.7,z+d*.8,4,.8,3,c.trim);box(x,y+1.15,z+d*.8,3,.14,2,'#4faab0');}
        if(town.theme==='marsh'){box(x,y+5,z+d*.6,w+4,.35,2,c.wood);for(const dx of [-w*.55,w*.55]){box(x+dx,y+6.3,z+d*.6,.25,2.7,.25,c.wood);box(x+dx,y+7.4,z+d*.6,.75,.7,.75,'#e7c977');}}
        if(town.theme==='tropical'){box(x,y+h+3,z,w*.65,2,d*.65,c.wall);for(let k=0;k<3;k++)box(x,y+h+4.3+k*.6,z,w*.85-k*1.7,.65,d*.8,c.roof);}
      }
      // Each doorstep joins a short local lane; crossings in the fen are raised boardwalks.
      if(!b.central){const length=Math.hypot(x-town.x,z-town.z),end=Math.max(0,length-6);for(let t=3;t<end;t+=1.5){const px=town.x+(x-town.x)*t/length,pz=town.z+(z-town.z)*t/length,ground=sampleContinent(px,pz);if(ground.biome==='sea'||ground.biome==='lava')continue;if(town.theme==='marsh'){const deck=Math.max(y,town.buildings[0].floor);box(px,deck-.15,pz,1.45,.3,1.45,c.wood);if(Math.round(t)%6===0)box(px,(ground.h+deck)/2,pz,.35,deck-ground.h,.35,c.wood);}else if(!wet.has(ground.biome))box(px,ground.h+.09,pz,1.45,.16,1.45,'#c1b18a');}}
    }
    // Fortified capitals follow the local contour, with a broad open southern gate.
    if(town.capital&&['snow','meadow','canyon'].includes(town.theme)){
      const radius=town.radius+2,cells=new Set<string>(),steps=Math.ceil(radius*6);
      for(let i=0;i<=steps;i++){const a=Math.PI*.64+i*Math.PI*1.72/steps,x=Math.round((town.x+Math.cos(a)*radius)/1.5)*1.5,z=Math.round((town.z+Math.sin(a)*radius)/1.5)*1.5,key=`${x},${z}`;
        if(cells.has(key))continue;cells.add(key);const s=buildingSite(x,z,1.5,1.5);if(!s)continue;
        box(x,(s.bottom+s.floor+3)/2,z,1.5,s.floor+3-s.bottom,1.5,c.wall);
        if(cells.size%2===0)box(x,s.floor+3.4,z,1.5,.8,1.5,c.trim);
        if(cells.size%24===0){box(x,s.floor+2.7,z,3.2,5.4,3.2,c.wall);for(const dx of [-1.2,1.2])for(const dz of [-1.2,1.2])box(x+dx,s.floor+5.7,z+dz,.7,.75,.7,c.trim);}
      }
    }
    const center=town.buildings[0],y=center.floor;
    if(town.capital){
      // A few stalls and a banner give every capital a recognisable civic centre.
      for(const side of [-1,1]){const x=town.x+side*7,z=town.z+7,t=buildingSite(x,z,3,2);if(t){box(x,t.floor+.8,z,2.7,1.4,1.6,c.wood);box(x,t.floor+2.3,z,3.5,.3,2.4,side>0?c.roof:c.trim);}}
      box(town.x,y+10,town.z,.18,8,.18,c.wood);box(town.x+.9,y+12.6,town.z,1.8,2.2,.13,c.roof);
    }
    if(['meadow','autumn','chalk'].includes(town.theme)){
      const x=town.x-town.radius-4,z=town.z;for(let row=0;row<6;row++){const px=x-row*1.3,t=buildingSite(px,z,.7,7);if(t)box(px,t.floor,z,.7,town.theme==='autumn'?.7:.15,7,row%2?'#a8a05a':'#c0ae61');}
      if(town.theme==='meadow'){const t=buildingSite(x-3,z+8,2.5,2.5);if(t){box(x-3,t.floor+3,z+8,2.2,6,2.2,c.wall);box(x-3,t.floor+6,z+8,3,.8,3,c.roof);box(x-3,t.floor+5,z+9.4,.3,7,.15,c.trim);box(x-3,t.floor+5,z+9.5,7,.3,.15,c.trim);}}
    }
    if(['fjord','lake','chalk','tropical'].includes(town.theme)){
      let shore:{x:number;z:number;dx:number;dz:number}|undefined;
      for(let r=8;r<70&&!shore;r+=2)for(const [dx,dz] of [[0,1],[1,0],[-1,0],[0,-1]]){const x=town.x+dx*r,z=town.z+dz*r,t=sampleContinent(x,z);if(['sea','lake'].includes(t.biome)&&sampleContinent(x-dx*3,z-dz*3).h>0){shore={x,z,dx,dz};break;}}
      if(shore){const {x,z,dx,dz}=shore,sea=sampleContinent(x,z).biome==='sea',water=sea?0:.75,deck=water+1.6;
        for(let k=-3;k<10;k++){const px=x+dx*k,pz=z+dz*k;box(px,deck,pz,dx?.9:2.3,.4,dz?.9:2.3,c.wood);if(k%3===0)box(px,water-1,pz,.4,5,.4,c.wood);}
        const bx=x+dx*10-dz*3,bz=z+dz*10+dx*3;box(bx,water+.5,bz,2,.7,5,c.wood);box(bx,water+3,bz,.16,5,.16,c.wood);box(bx+.95,water+3.7,bz,1.9,2.4,.12,'#eee0bc');
      }
    }
  }
  return blocks;
}
