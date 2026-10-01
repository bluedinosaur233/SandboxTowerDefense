import * as THREE from 'three';
import type { TowerKind, TowerBranch } from '../simulation/towers';
import type { BarracksBranch } from '../simulation/barracks';
import { voxel as b, bakeVoxels } from './voxel-kit';

const P={stone:'#c8c4ae',light:'#eee3c5',shade:'#9f9f91',dark:'#394b51',wood:'#73502e',oak:'#ae7d43',teal:'#247f75',green:'#386b40',blue:'#274d96',purple:'#604190',gold:'#d8ad50',silver:'#aabfcb',ice:'#69d8f2',snow:'#e3f3ed',copper:'#a57242'};
const prototypes=new Map<string,THREE.Group>();
const crystalBody=new THREE.CylinderGeometry(.5,.5,1,6);
const crystalTip=new THREE.ConeGeometry(.5,1,6);
const barrelShape=new THREE.CylinderGeometry(.5,.5,1,8);
const barrelRim=new THREE.TorusGeometry(.5,.065,4,8);
const ringShape=new THREE.TorusGeometry(1,.035,4,16);
function group(parent:THREE.Group,x=0,y=0,z=0,angle=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);return g;}
function beam(g:THREE.Group,a:THREE.Vector3,c:THREE.Vector3,width:number,color:string,glow=false){
  const center=a.clone().add(c).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),c.clone().sub(a).normalize());
  b(g,center.x,center.y,center.z,width,a.distanceTo(c),width,color,new THREE.Euler().setFromQuaternion(q),glow);
}
function gem(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,color:string){
  b(g,x,y-h*.045,z,w,h*.49,w,color,new THREE.Euler(),true,crystalBody);
  b(g,x,y+h*.305,z,w,h*.21,w,color,new THREE.Euler(),true,crystalTip);
  b(g,x,y-h*.365,z,w,h*.15,w,color,new THREE.Euler(Math.PI,0,0),true,crystalTip);
}
function base(g:THREE.Group,size=1.42,color=P.stone){
  size=Math.max(size,1.9);
  b(g,0,.07,0,size,.14,size,P.shade);
  for(let x=0;x<4;x++)for(let z=0;z<4;z++)b(g,(x-1.5)*size/4,.16,(z-1.5)*size/4,size/4-.018,.16,size/4-.018,(x+z)%3?color:P.light);
}
function masonry(g:THREE.Group,width:number,depth:number,bottom:number,height:number,color=P.stone){
  b(g,0,bottom+height/2,0,width-.045,height,depth-.045,P.shade);
  const rows=Math.ceil(height/.25),dy=height/rows;
  for(let r=0;r<rows;r++)for(let side=0;side<4;side++){
    const along=side%2?depth:width,across=side%2?width:depth,y=bottom+(r+.5)*dy;
    const wall=group(g,0,0,0,side*Math.PI/2),n=Math.ceil(along/.32);
    for(let k=0;k<n;k++){const start=-along/2+k*along/n,end=start+along/n;b(wall,(start+end)/2,y,across/2,.98*(end-start),dy-.012,.045,(r+k+side)%5===0?P.light:color);}
  }
}
function pillar(g:THREE.Group,x:number,z:number,height:number,color=P.light){
  for(let i=0;i<Math.ceil(height/.26);i++)b(g,x,.24+(i+.5)*height/Math.ceil(height/.26),z,.21,height/Math.ceil(height/.26)-.009,.21,i%3?color:P.stone);
  b(g,x,.3,z,.32,.16,.32,color);b(g,x,height+.23,z,.28,.13,.28,color);
}
function roof(g:THREE.Group,y:number,width:number,depth:number,color=P.teal){
  for(let row=0;row<5;row++){
    const w=width*(1-row*.16),d=depth*(1-row*.16),n=Math.max(1,Math.ceil(w/.26));
    for(let i=0;i<n;i++)b(g,-w/2+(i+.5)*w/n,y+row*.13,0,w/n-.013,.15,d,i%3===row%3?color:new THREE.Color(color).multiplyScalar(.86).getStyle());
  }
}
function flag(g:THREE.Group,x:number,y:number,z:number,color=P.blue){
  b(g,x,y,z,.038,.88,.038,P.oak);gem(g,x,y+.48,z,.09,.15,P.gold);
  b(g,x+.16,y+.18,z,.3,.29,.025,color);b(g,x+.28,y+.04,z,.075,.12,.025,color);
  b(g,x+.16,y+.18,z+.018,.033,.16,.012,P.gold);b(g,x+.16,y+.19,z+.018,.12,.025,.013,P.gold);
}
function banner(g:THREE.Group,x:number,y:number,z:number,color=P.teal,symbol='cross'){
  b(g,x,y,z,.27,.61,.035,color);b(g,x,y-.31,z,.18,.08,.035,color);b(g,x,y+.33,z,.37,.046,.055,P.gold);
  if(symbol==='gem')gem(g,x,y,z+.03,.13,.23,P.ice);
  else {b(g,x,y,z+.028,.035,.27,.015,P.gold);b(g,x,y+.04,z+.03,.15,.035,.016,P.gold);}
}
function crenels(g:THREE.Group,y:number,size:number,color=P.light){
  b(g,0,y-.16,0,size,.18,size,color);
  for(let side=0;side<4;side++){const s=group(g,0,0,0,side*Math.PI/2);for(const x of [-.5,0,.5])b(s,x*size,y,size*.45,.23,.27,.21,color);}
}
function slit(g:THREE.Group,x:number,y:number,z:number,color='#469cd0'){b(g,x,y,z,.105,.45,.027,P.dark);b(g,x,y,z+.016,.043,.34,.01,color);}
function crossbow(g:THREE.Group,x:number,y:number,z:number,scale=1){
  const s=group(g,x,y,z);s.scale.setScalar(scale);
  b(s,0,0,0,.12,.2,.18,P.oak);b(s,0,.14,.09,.09,.07,.62,P.wood);
  for(const sign of [-1,1]){beam(s,new THREE.Vector3(0,.18,.1),new THREE.Vector3(sign*.35,.18,.22),.055,P.oak);beam(s,new THREE.Vector3(sign*.35,.18,.22),new THREE.Vector3(0,.18,-.15),.013,P.light);}
  b(s,0,.2,.2,.022,.02,.66,P.silver);gem(s,0,.2,.55,.055,.06,P.silver);
}
function archer(g:THREE.Group,level:number,branch?:TowerBranch){
  const marks=branch==='marksman',ranger=branch==='ranger',upper=level>=2,deck=1.87;
  base(g,upper?1.55:1.32);
  if(upper)masonry(g,marks?.83:1.02,.88,.24,1.5,marks?P.light:P.stone);
  for(const x of [-.44,.44])for(const z of [-.4,.4]){
    if(marks)pillar(g,x,z,1.68);else {b(g,x,1.05,z,.14,1.64,.14,P.wood);b(g,x,1.48,z,.18,.12,.18,P.oak);}
  }
  if(!upper)for(const z of [-.4,.4])beam(g,new THREE.Vector3(-.4,.42,z),new THREE.Vector3(.4,1.5,z),.095,P.oak);
  b(g,0,deck,0,upper?1.38:1.16,.19,1.19,marks?P.light:P.oak);
  if(marks){crenels(g,2.13,1.28);crossbow(g,0,2.2,.1,1.45);banner(g,0,1.44,.48,P.blue);slit(g,0,.74,.46);flag(g,-.54,2.66,-.45,P.blue);}
  else {
    for(let side=0;side<4;side++){const s=group(g,0,0,0,side*Math.PI/2);b(s,0,2.08,.58,1.25,.22,.095,P.oak);for(const x of [-.48,0,.48])b(s,x,2.08,.636,.04,.04,.02,P.silver);}
    for(const x of [-.46,.46])for(const z of [-.44,.44])b(g,x,2.38,z,.075,.8,.075,P.wood);
    roof(g,2.76,1.42,1.4,ranger?P.green:P.teal);
    if(ranger){for(const x of [-.5,0,.5])crossbow(g,x,2.13,.52,.8);for(const x of [-.43,.43]){roof(group(g,x,0,.52),1.15,.55,.5,P.green);banner(g,x,.66,.54,P.green);} }
    else crossbow(g,0,2.15,.47,.8);
    // Ladder remains readable from the front and side.
    for(const x of [-.13,.13])b(g,x,.97,.57,.046,1.57,.045,P.wood);
    for(let i=0;i<7;i++)b(g,0,.28+i*.21,.59,.3,.04,.05,P.oak);
    if(upper){banner(g,.33,1.17,.48,ranger?P.green:P.teal);flag(g,-.64,2.61,-.3,P.teal);}
  }
}
function mage(g:THREE.Group,level:number,branch?:TowerBranch){
  const fire=branch==='inferno',arcane=branch==='arcane',upper=level>=2,color=fire?P.dark:P.light;
  base(g,upper?1.48:1.26,fire?P.dark:P.stone);masonry(g,.8,.8,.24,1.8,color);
  for(const x of [-.43,.43])for(const z of [-.43,.43]){pillar(g,x,z,upper?1.7:.5,color);if(upper){b(g,x*1.18,.47,z*1.18,.3,.48,.3,fire?P.dark:P.stone);b(g,x*1.08,.86,z*1.08,.26,.3,.26,color);}}
  for(let side=0;side<4;side++){const s=group(g,0,0,0,side*Math.PI/2);slit(s,0,.76,.42,fire?'#ff8c30':'#43cfff');banner(s,0,1.65,.47,fire?'#a43924':P.purple);}
  if(fire)for(const x of [-.3,.3]){b(g,x,.75,.428,.032,.65,.02,'#dc641f');b(g,x,1.17,.43,.17,.025,.02,'#dc641f');}
  crenels(g,2.2,1.16,color);b(g,0,2.2,0,.53,.12,.53,P.gold);
  const core=group(g,0,2.78,0);core.name='crystal';core.userData.restY=2.78;
  gem(core,0,0,0,arcane?.68:.52,arcane?1.25:.9,fire?'#ffae2c':arcane?'#b085ff':'#43cfff');
  for(const sign of [-1,1]){
    beam(g,new THREE.Vector3(sign*.19,2.27,0),new THREE.Vector3(sign*.46,2.63,0),.07,P.gold);
    beam(g,new THREE.Vector3(sign*.46,2.63,0),new THREE.Vector3(sign*.39,2.96,0),.065,P.gold);
  }
  if(fire)for(let i=0;i<5;i++)gem(core,Math.sin(i*2.4)*.34,-.09,Math.cos(i*2.4)*.26,.23,.63+i%2*.2,i%2?'#fff299':'#ff6c1d');
  if(arcane){b(core,0,-.1,0,.5,.5,.5,P.gold,new THREE.Euler(Math.PI/2,0,0),false,ringShape);for(let i=0;i<6;i++)gem(core,Math.cos(i*Math.PI/3)*.67,Math.sin(i*Math.PI/3)*.25,Math.sin(i*Math.PI/3)*.48,.16,.24,'#bd8fff');}
}
function cannon(g:THREE.Group,level:number,branch?:TowerBranch){
  const missile=branch==='shrapnel',mortar=branch==='bombard';base(g,1.58);masonry(g,1.04,.92,.24,missile?1.35:.64);
  for(const x of [-.64,.64])for(const z of [-.5,.5])pillar(g,x,z,missile?1.35:level>=2?1.05:.75);
  banner(g,-.32,.74,.54,P.teal);if(level>=2)banner(g,.32,.74,.54,P.teal);
  if(missile){
    b(g,0,1.62,0,1.39,.15,1.21,P.light);for(const x of [-.36,.36])for(const z of [-.3,.3]){
      b(g,x,1.88,z,.43,.41,.43,P.teal);b(g,x,2.09,z,.5,.08,.5,P.gold);b(g,x,2.135,z,.34,.025,.34,P.dark);gem(g,x,2.43,z,.25,.66,'#8cffe7');
    }
    slit(g,0,.96,.49,'#80ffe0');return;
  }
  b(g,0,.94,0,.64,.2,.71,P.wood);
  for(const x of [-.33,.33]){b(g,x,1.21,-.05,.14,.58,.56,P.oak);b(g,x*1.17,1.22,-.04,.06,.16,.16,P.gold);}
  const barrel=group(g,0,mortar?1.52:1.56,0);barrel.rotation.x=mortar?-1.04:-.17;
  // Eight flat faces keep a heavy cannon silhouette with a clearly inset bore.
  const width=mortar?.65:level>=2?.49:.42,length=mortar?.71:level>=2?1.22:1.04;
  b(barrel,0,0,-.13,width,length,width,P.dark,new THREE.Euler(Math.PI/2,0,0),false,barrelShape);
  for(const z of [-length*.48,.01,length*.5-.13])b(barrel,0,0,z,width,width,width,P.gold,new THREE.Euler(),false,barrelRim);
  const end=length*.5-.11;
  b(barrel,0,0,end,width*.87,.024,width*.87,'#101d24',new THREE.Euler(Math.PI/2,0,0),false,barrelShape);
  b(barrel,0,0,end+.018,width,width,width,P.gold,new THREE.Euler(),false,barrelRim);
  b(g,.45,.38,-.63,.54,.14,.38,P.oak);for(let i=0;i<level+1;i++)b(g,.29+i%2*.22,.52+Math.floor(i/2)*.18,-.64,.18,.18,.18,P.dark,new THREE.Euler(0,.3,.2));
  if(mortar)flag(g,-.63,1.95,-.51,'#b84534');
}
function frost(g:THREE.Group,level:number,branch?:TowerBranch){
  const storm=branch==='blizzard',spear=branch==='glacier';base(g,level>=2?1.55:1.3);
  if(storm){
    b(g,0,.42,0,1.22,.28,1.22,P.snow);
    for(const x of [-.54,.54])for(const z of [-.54,.54]){pillar(g,x,z,1.1,P.snow);gem(g,x,1.63,z,.25,.59,P.ice);}
    for(const x of [-.64,.64]){pillar(g,x,0,1.72,P.snow);for(let i=0;i<3;i++)b(g,x*(1-i*.3),2.04+i*.16,0,.32,.22,.22,P.snow);}
    for(const y of [.72,1.09,1.46])b(g,0,y,0,.51,.51,.51,'#43cbff',new THREE.Euler(Math.PI/2,0,0),true,ringShape);
    gem(g,0,1.1,0,.3,1.1,'#77ecff');banner(g,0,.55,.66,'#347cb0');return;
  }
  masonry(g,.68,.68,.24,1.64,P.light);
  for(const x of [-.39,.39])for(const z of [-.39,.39]){pillar(g,x,z,level>=2?1.82:.66);if(level>=2)gem(g,x,2.39,z,.2,.63,P.ice);}
  for(const y of [.57,1.29,2.08])b(g,0,y,0,.91,.12,.91,P.snow);
  for(let side=0;side<4;side++){const s=group(g,0,0,0,side*Math.PI/2);slit(s,0,1.04,.35,'#78e1fb');for(const x of [-.34,.34])gem(s,x,1.94,.4,.1,.44,P.ice);}
  banner(g,0,.84,.41,'#3b87ad');gem(g,0,spear?2.52:2.5,0,spear?.67:.5,spear?1.85:1.05,P.ice);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;gem(g,Math.cos(a)*.31,2.25,Math.sin(a)*.31,.22,.66,i%2?P.snow:'#50b2e0');}
  for(const x of [-.58,.58])for(const z of [-.5,.5])gem(g,x,.45,z,.22,.48,P.ice);
}
function coil(g:THREE.Group,x:number,y:number,z:number,height:number){
  b(g,x,y+height/2,z,.13,height,.13,P.dark);for(let i=0;i<5;i++)b(g,x,y+i*height/5,z,.31,.08,.31,i%2?P.gold:P.copper);
  b(g,x,y+height,z,.32,.1,.32,P.gold);for(const dx of [-.17,.17])b(g,x+dx,y+height+.15,z,.06,.31,.07,P.gold);gem(g,x,y+height+.21,z,.14,.36,'#59d8ff');
}
function tesla(g:THREE.Group,level:number,branch?:TowerBranch){
  const judgment=branch==='judgment',storm=branch==='tempest';base(g,1.52);masonry(g,.82,.82,.24,judgment?1.8:1.1,judgment?P.dark:P.light);
  for(const x of [-.47,.47])for(const z of [-.47,.47])pillar(g,x,z,judgment?1.85:.88,judgment?P.light:P.stone);
  for(let side=0;side<4;side++){const s=group(g,0,0,0,side*Math.PI/2);banner(s,0,.72,.48,P.teal);}
  if(judgment){gem(g,0,2.81,0,.62,1.62,'#ffe69e');for(const sign of [-1,1]){
    beam(g,new THREE.Vector3(sign*.15,1.48,0),new THREE.Vector3(sign*.48,2.63,0),.095,P.gold);
    beam(g,new THREE.Vector3(sign*.48,2.63,0),new THREE.Vector3(sign*.34,3.08,0),.075,P.gold);
  }return;}
  const points=storm?[[-.5,1.55,.35],[.5,1.55,.35],[0,1.88,-.43]]:level>=2?[[-.36,1.68,0],[.36,1.68,0]]:[[0,1.55,0]];
  for(const [x,y,z] of points){b(g,x,(1.34+y)/2,z,.2,y-1.34+.04,.2,P.light);b(g,x,y-.08,z,.37,.12,.37,P.gold);coil(g,x,y,z,.64);}
  if(level===1){gem(g,0,2.74,0,.42,.53,'#39baff');for(const x of [-.47,.47])coil(g,x,.56,0,.56);}
  if(level>=2)for(let i=0;i<points.length-1;i++){
    const a=points[i],c=points[i+1],v=new THREE.Vector3(a[0],a[1]+.85,a[2]),u=new THREE.Vector3(c[0],c[1]+.85,c[2]);
    const mid=v.clone().lerp(u,.5);mid.y+=.14;beam(g,v,mid,.025,'#72edff',true);beam(g,mid,u,.025,'#72edff',true);
  }
  if(storm)for(const x of [-.6,.6])banner(g,x,.68,.52,P.teal);
}
function barracks(g:THREE.Group,level:number,branch?:BarracksBranch){
  const spell=branch==='spellblade',holy=branch==='paladin',upper=level>=2,color=spell?'#6e7593':P.light;
  base(g,1.72);masonry(g,1.33,1.1,.24,1.14,color);
  for(const side of [1,2,3]){
    const wall=group(g,0,0,0,side*Math.PI/2),z=side===2?.574:.684;
    for(const x of [-.26,.26]){b(wall,x,.9,z,.17,.36,.033,P.dark);b(wall,x,.92,z+.02,.09,.27,.013,spell?'#797de9':'#699fbc');b(wall,x,.71,z,.24,.055,.08,holy?P.gold:P.stone);}
    if(!upper){b(wall,0,1.34,z,side===2?1.3:1.1,.085,.065,P.wood);b(wall,0,.78,z,.07,1.04,.065,P.wood);}
    if(spell)banner(wall,0,1.12,z+.04,P.purple,'gem');
  }
  // Inset oak gate and stepped stone arch.
  b(g,0,.69,.573,.42,.85,.035,P.wood);for(const x of [-.14,0,.14])b(g,x,.65,.6,.09,.76,.03,P.oak);
  for(const x of [-.26,.26])b(g,x,.67,.62,.11,.89,.12,P.stone);b(g,0,1.13,.62,.53,.15,.14,P.light);
  b(g,.08,.68,.63,.045,.055,.035,P.gold);
  for(const x of [-.6,.6])for(const z of [-.5,.5]){
    if(upper)pillar(g,x,z,holy?1.86:1.37,color);else b(g,x,.86,z,.12,1.23,.12,P.wood);
  }
  if(holy){
    crenels(g,1.76,1.45,P.light);const bell=group(g,0,0,-.17);masonry(bell,.56,.55,1.81,.68);
    b(bell,0,2.13,.28,.23,.39,.025,P.dark);roof(bell,2.5,.82,.8,P.gold);
    b(g,0,3.12,-.17,.055,.36,.055,P.gold);b(g,0,3.17,-.17,.22,.055,.055,P.gold);
    banner(g,-.5,1.31,.68,'#f1ead4');banner(g,.5,1.31,.68,'#f1ead4');
  }else {
    roof(g,1.46,1.71,1.48,spell?P.blue:P.teal);
    if(spell){
      // Blue-purple gabled annexes and silver edging distinguish the mage garrison.
      for(const x of [-.65,.65]){roof(group(g,x,0,0),1.65,.49,1.36,'#3b4e88');gem(g,x,1.23,.57,.14,.86,'#758bff');b(g,x,1.65,.58,.22,.075,.17,P.silver);}
      gem(g,0,2.35,0,.25,.6,'#b28aff');banner(g,0,1.48,.64,P.purple,'gem');
    }else if(upper){for(const x of [-.63,.63]){crenels(group(g,x,0,-.43),1.83,.41);flag(g,x,2.23,-.43,P.blue);}banner(g,.44,1.14,.6,P.blue);}
    else {banner(g,-.58,1.19,.6,P.blue);b(g,0,1.39,.6,1.42,.095,.08,P.wood);}
  }
  if(upper)for(const x of [-.7,.7]){b(g,x,.42,.76,.17,.3,.17,P.dark);for(let i=0;i<3;i++){b(g,x+(i-1)*.045,.8,.76,.019,.58,.018,P.oak);gem(g,x+(i-1)*.045,1.12,.76,.045,.13,spell?'#a9aaff':P.silver);}}
}
export function towerModel(kind:TowerKind|'barracks',level=1,branch?:TowerBranch,barracksBranch?:BarracksBranch):THREE.Group{
  const key=[kind,level,branch,barracksBranch].join(':');
  if(!prototypes.has(key)){
    const g=new THREE.Group();g.userData={kind,level,branch,barracksBranch};
    const effective=branch??(level===3?({archer:'marksman',mage:'arcane',cannon:'bombard',frost:'glacier',tesla:'judgment'} as const)[kind as TowerKind]:undefined);
    if(kind==='barracks')barracks(g,level,barracksBranch??(level===3?'paladin':undefined));
    else ({archer,mage,cannon,frost,tesla})[kind](g,level,effective);
    bakeVoxels(g);prototypes.set(key,g);
  }
  return prototypes.get(key)!.clone(true);
}
