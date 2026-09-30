import { HERO_FX_TIMING, rainImpactTime } from '../simulation/effect-timing';
import * as THREE from 'three';
import type { BattleHero, HeroEffect } from '../simulation/hero';
import type { Vec3 } from '../simulation/game';

const ring=new THREE.TorusGeometry(1,.018,4,48);
const shard=new THREE.OctahedronGeometry(1);
const cube=new THREE.BoxGeometry(1,1,1);
const materials=new Map<string,THREE.MeshBasicMaterial>();
const mint='#62f7b4',gold='#ffd878',white='#effff4';
function piece(group:THREE.Group,geo:THREE.BufferGeometry,p:Vec3,scale:number[],color=mint,opacity=1){
  const alpha=Math.round(THREE.MathUtils.clamp(opacity,0,1)*16)/16,key=`${color}:${alpha}`;
  let mat=materials.get(key);
  if(!mat){mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false,blending:THREE.NormalBlending});materials.set(key,mat);}
  const m=new THREE.Mesh(geo,mat);m.position.set(p.x,p.y,p.z);m.scale.set(scale[0],scale[1],scale[2]);group.add(m);return m;
}
function line(group:THREE.Group,a:Vec3,b:Vec3,width:number,color=mint,alpha=1){
  const length=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const m=piece(group,cube,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2},[width,width,length],color,alpha);m.lookAt(b.x,b.y,b.z);return m;
}
function halo(group:THREE.Group,p:Vec3,r:number,alpha:number,color=mint){const m=piece(group,ring,p,[r,r,r],color,alpha);m.rotation.x=Math.PI/2;return m;}

export function renderHeroEffects(group:THREE.Group,effects:readonly HeroEffect[],hero:BattleHero|null,time:number){
  for(const e of effects){
    const t=Math.min(1,e.time/e.duration),fade=Math.min(1,t*8)*(1-t),p=e.to;
    if(e.kind==='piercing'){
      const progress=Math.min(1,e.time/HERO_FX_TIMING.strike),head={x:e.from.x+(p.x-e.from.x)*progress,y:e.from.y+(p.y-e.from.y)*progress,z:e.from.z+(p.z-e.from.z)*progress};
      line(group,e.from,head,.15,mint,(1-t)*.8);line(group,e.from,head,.045,white,1-t);
      const tip=piece(group,shard,head,[.22,.22,.65],gold,1-t);tip.lookAt(p.x,p.y,p.z);
      for(let i=1;i<6;i++){
        const f=i/6*progress,c={x:e.from.x+(p.x-e.from.x)*f,y:e.from.y+(p.y-e.from.y)*f,z:e.from.z+(p.z-e.from.z)*f};
        const m=piece(group,ring,c,[.3+t*.4,.3+t*.4,.3+t*.4],mint,(1-t)*.7);m.lookAt(p.x,p.y,p.z);m.rotation.z=e.time*7+i;
      }
    }else if(e.kind==='rain'){
      halo(group,{...p,y:p.y-.27},e.radius,fade,gold);
      halo(group,{...p,y:p.y+4.8},e.radius*.65,fade,mint);
      for(let volley=0;volley<HERO_FX_TIMING.rainPulses;volley++){
        const age=e.time-rainImpactTime(volley);
        if(age < -HERO_FX_TIMING.rainFlight||age>.2)continue;
        for(let i=0;i<9;i++){
          const a=i*2.39996+volley*.61,r=Math.sqrt((i+.5)/9)*e.radius;
          const end={x:p.x+Math.cos(a)*r,y:p.y+Math.max(0,-age/HERO_FX_TIMING.rainFlight)*5,z:p.z+Math.sin(a)*r};
          if(age<0)line(group,{x:end.x-.18,y:end.y+.7,z:end.z-.12},end,.04,i%3?mint:gold,fade);
          else halo(group,{x:end.x,y:p.y-.22,z:end.z},.08+age*1.5,(1-age/.2)*fade);
        }
      }
    }else if(e.kind==='gale'){
      for(let k=0;k<4;k++){
        const r=e.radius*Math.min(1,e.time/HERO_FX_TIMING.strike)*(1-k*.10),h=halo(group,{...p,y:p.y+k*.4},r,fade,k%2?gold:mint);
        h.rotation.z=e.time*8+k;h.rotation.x+=Math.sin(e.time*8+k)*.15;
      }
    }else if(e.kind==='slash'){
      const a=Math.atan2(p.x-e.from.x,p.z-e.from.z);
      for(let i=0;i<9;i++){
        const theta=a-.9+i*.2+t*.7,r=.8;
        const q={x:e.from.x+Math.sin(theta)*r,y:e.from.y+.35+Math.sin(i/9*Math.PI)*.3,z:e.from.z+Math.cos(theta)*r};
        piece(group,shard,q,[.045,.045,.25],i%2?mint:white,(1-t)*(i/9));
      }
    }else{
      halo(group,{...p,y:p.y-.25},.3+t*e.radius,fade,e.kind==='fall'?gold:mint);
      halo(group,{...p,y:p.y+.12},.15+t*e.radius*.8,fade);
    }
    if(e.kind!=='rain'&&e.kind!=='slash')for(let i=0;i<18;i++){
      const a=i*2.39996+e.time*2,r=e.radius*t*(.5+(i%3)*.2);
      const q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(t*Math.PI)*(1+i%4*.28),z:p.z+Math.sin(a)*r};
      const m=piece(group,shard,q,[.055,.16,.035],i%3?mint:gold,fade);m.rotation.z=a;
    }
  }
  if(hero&&hero.hp>0){
    if(hero.flying)for(let i=0;i<14;i++){
      const age=(i/14+time*.8)%1,side=i%2?1:-1;
      const p={x:hero.x-Math.sin(hero.facing)*age*2.7+Math.cos(hero.facing)*side*.38,y:hero.y+.5-age*.45,z:hero.z-Math.cos(hero.facing)*age*2.7-Math.sin(hero.facing)*side*.38};
      const m=piece(group,shard,p,[.035,.035,.28*(1-age)],i%3?mint:gold,1-age);m.rotation.y=hero.facing;
    }
    if(hero.shieldUntil>time){
      const p={x:hero.x,y:hero.y+.45,z:hero.z};
      for(let i=0;i<3;i++){const m=piece(group,ring,p,[.9,.9,.9],mint,.6);m.rotation.set(i*Math.PI/3,time*2+i,Math.PI/4);}
    }
  }
}
