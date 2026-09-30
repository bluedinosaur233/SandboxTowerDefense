import * as THREE from 'three';
import type { AttackAppearance, Effect, Shot, Vec3 } from '../simulation/game';
import type { ProjectileKind, TowerBranch } from '../simulation/towers';

// All frames share geometry/materials. Unlit effects stay readable on shaded slopes.
const cube=new THREE.BoxGeometry(1,1,1);
const crystal=new THREE.OctahedronGeometry(1);
const ring=new THREE.TorusGeometry(1,.035,4,24);
const materials=new Map<string,THREE.MeshBasicMaterial>();
const branchColors:Record<TowerBranch,string>={marksman:'#ffe391',ranger:'#8df2ae',inferno:'#ff8c3a',arcane:'#cd9aff',bombard:'#ffba70',shrapnel:'#91ffe0',blizzard:'#80e5ff',glacier:'#e1fcff',tempest:'#77ffd5',judgment:'#ffecae'};
const baseColors:Record<ProjectileKind,[string,string]>={missile:['#74dcc5','#b4ffe6'],arrow:['#e8d5a1','#ffe8ad'],magic:['#b5a0e2','#dbb9ff'],shell:['#b39371','#ffc17d'],ice:['#9bd8e8','#b7f5ff'],lightning:['#c3e9bf','#a4fff0']};
function style(kind:ProjectileKind,appearance?:AttackAppearance){
  const level=Math.max(1,Math.min(3,appearance?.level??1)),branch=appearance?.branch;
  return {level,branch,color:appearance?.tint??(branch?branchColors[branch]:baseColors[kind][level===1?0:1]),scale:1+(level-1)*.3};
}
function mesh(group:THREE.Group,geometry:THREE.BufferGeometry,p:Vec3,sx:number,sy:number,sz:number,color:string){
  let material=materials.get(color);if(!material){material=new THREE.MeshBasicMaterial({color});materials.set(color,material);}
  const m=new THREE.Mesh(geometry,material);m.position.set(p.x,p.y,p.z);m.scale.set(sx,sy,sz);group.add(m);return m;
}
function segment(group:THREE.Group,a:Vec3,b:Vec3,width:number,color:string){
  const from=new THREE.Vector3(a.x,a.y,a.z),to=new THREE.Vector3(b.x,b.y,b.z);
  const m=mesh(group,cube,from.clone().add(to).multiplyScalar(.5),width,width,from.distanceTo(to),color);m.lookAt(to);return m;
}
function projectilePosition(shot:Shot,t:number){
  const p=new THREE.Vector3().lerpVectors(new THREE.Vector3(shot.from.x,shot.from.y,shot.from.z),new THREE.Vector3(shot.to.x,shot.to.y,shot.to.z),Math.max(0,t));
  p.y+=Math.sin(Math.max(0,t)*Math.PI)*(shot.kind==='missile'?2.7:shot.kind==='shell'?(shot.appearance?.branch==='bombard'?4:2):shot.kind==='arrow'?.45:.3);return p;
}
function bolt(group:THREE.Group,from:Vec3,to:Vec3,time:number,appearance?:AttackAppearance){
  const s=style('lightning',appearance),width=.045*s.scale*(s.branch==='judgment'?1.8:1);
  const start=new THREE.Vector3(from.x,from.y,from.z),end=new THREE.Vector3(to.x,to.y,to.z);
  for(let strand=0;strand<(s.level===1?1:2);strand++){
    let previous=start;
    for(let i=1;i<=7;i++){
      const p=start.clone().lerp(end,i/7);
      if(i<7){const amplitude=strand?.25:.13;p.x+=Math.sin(i*13+time*22+strand*3)*amplitude;p.y+=Math.cos(i*7+time*17+strand*4)*amplitude;}
      segment(group,previous,p,strand?width*.45:width,s.color);
      if(s.level>=2&&!strand)segment(group,previous,p,width*.35,'#fffbea');
      previous=p;
    }
  }
}

export function renderAttackEffects(group:THREE.Group,shots:readonly Shot[],effects:readonly Effect[],time:number){
  for(const shot of shots){
    const s=style(shot.kind,shot.appearance),t=Math.min(1,shot.time/shot.duration),p=projectilePosition(shot,t);
    if(shot.kind==='lightning'){bolt(group,shot.from,shot.to,time,shot.appearance);continue;}
    // A short sampled trail follows the actual ballistic arc, including elevation.
    for(let i=1;i<=(s.level-1)*3;i++){
      const age=i*.032;if(t<age)break;const tail=projectilePosition(shot,t-age),size=.085*s.scale*(1-i/9);
      if(shot.kind==='arrow'||s.branch==='arcane')segment(group,tail,projectilePosition(shot,t-age+.026),size*.55,s.color);
      else mesh(group,cube,tail,size,size,size,shot.kind==='shell'?'#9f958a':s.color);
    }
    if(shot.kind==='arrow'){
      const length=s.branch==='marksman'?1.05:.45*s.scale;
      const a=mesh(group,cube,p,.045*s.scale,.045*s.scale,length,s.color);a.lookAt(shot.to.x,shot.to.y,shot.to.z);
      if(s.level>=2){const head=mesh(group,crystal,p,.09,.09,.2*s.scale,'#fff4d5');head.quaternion.copy(a.quaternion);}
    }else{
      const ice=shot.kind==='ice',spear=shot.kind==='missile'||s.branch==='arcane'||s.branch==='glacier';
      const m=mesh(group,crystal,p,.16*s.scale,.16*s.scale,(spear?.48:ice?.3:.16)*s.scale,shot.kind==='shell'?'#554e46':s.color);
      m.lookAt(shot.to.x,shot.to.y,shot.to.z);
      if(s.level>=2){
        const halo=mesh(group,ring,p,.24*s.scale,.24*s.scale,.24*s.scale,s.color);halo.quaternion.copy(m.quaternion);halo.rotateZ(time*5);
        if(shot.kind==='magic')mesh(group,crystal,p,.08,.08,.08,'#fff3e4');
      }
      if(s.level===3)for(let i=0;i<3;i++){
        const angle=time*8+i*Math.PI*2/3;
        const q={x:p.x+Math.cos(angle)*.26,y:p.y+Math.sin(angle)*.26,z:p.z};
        const fragment=mesh(group,s.branch==='inferno'?cube:crystal,q,.065,s.branch==='inferno'?.18:.065,.12,s.color);
        fragment.quaternion.copy(m.quaternion);
      }
    }
  }
  for(const effect of effects){
    const kind:ProjectileKind=effect.kind==='explosion'?'shell':effect.kind==='ice'?'ice':effect.kind==='lightning'?'lightning':effect.kind==='magic'?'magic':'arrow';
    const s=style(kind,effect.appearance),t=Math.min(1,effect.time/effect.duration);
    if(effect.kind==='lightning'&&effect.from){
      bolt(group,effect.from,effect,time,effect.appearance);
      if(s.branch==='judgment')segment(group,effect,{...effect,y:effect.y+1.6*(1-t)},.14*(1-t),s.color);
    }
    const color=effect.appearance?s.color:effect.kind==='death'?'#c6b372':effect.kind==='build'?'#e1d2a8':effect.kind==='enchant'?'#aaa0ff':effect.kind==='holy'?'#fff0a6':s.color;
    const count=8+(s.level-1)*4,radius=effect.radius||(effect.kind==='magic'? .85:.6);
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count+effect.id,spread=t*radius;
      const p={x:effect.x+Math.cos(angle)*spread,y:effect.y+Math.sin(t*Math.PI)*(.45+(i%3)*.13),z:effect.z+Math.sin(angle)*spread};
      const size=.13*s.scale*(1-t),spike=s.branch==='glacier',splinter=s.branch==='shrapnel';
      const m=mesh(group,spike||effect.kind==='ice'?crystal:cube,p,size,spike?size*4:size,splinter?size*3:size,color);
      if(splinter)m.rotation.y=-angle;
      if(s.branch==='inferno'){m.position.y+=t*.6;m.scale.y*=2.4;}
      if(s.branch==='blizzard'){m.rotation.z=angle+t*5;m.scale.y*=.35;}
    }
    if(s.level>=2&&effect.appearance){
      const r=Math.max(.02,radius*t),m=mesh(group,ring,effect,r,r,r,color);m.rotation.x=Math.PI/2;
      // Single-target arcane hits get an upright sigil; blast rings match the real splash.
      if(s.branch==='arcane'){m.rotation.x=0;m.rotation.z=t*Math.PI;}
      m.scale.multiplyScalar(1-t*.3);
    }
  }
}
