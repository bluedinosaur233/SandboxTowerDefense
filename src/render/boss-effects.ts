import * as THREE from 'three';
import { BOSS_SLAM } from '../simulation/enemies';
import type { Game } from '../simulation/game';

/** Persistent meshes: the warning follows each terrain sample, with no per-frame GPU allocations. */
export class BossWarning {
  readonly group=new THREE.Group();
  private fill=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:'#f28a37',transparent:true,opacity:.15,toneMapped:false,depthWrite:false,side:THREE.DoubleSide}));
  private edge=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:'#ffbb67',transparent:true,opacity:.95,toneMapped:false,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  private key='';
  constructor(){this.group.add(this.fill,this.edge);this.group.visible=false;this.fill.renderOrder=5;this.edge.renderOrder=6;}
  update(game:Game){
    const enemy=game.enemies.find(e=>e.hp>0&&e.boss?.center),boss=enemy?.boss;
    this.group.visible=!!boss?.center&&game.phase==='battle';
    if(!this.group.visible||!boss?.center)return;
    const center=boss.center,key=`${center.x}:${center.z}:${game.revision}`;
    if(key!==this.key){
      this.key=key;const fill:number[]=[],edge:number[]=[],r=BOSS_SLAM.radius,segments=96;
      const point=(angle:number,radius:number)=>{const x=center.x+Math.cos(angle)*radius,z=center.z+Math.sin(angle)*radius;return [x,game.ground(x,z)+.065,z];};
      // Concentric strips also track slopes inside the danger zone.
      for(let i=0;i<segments;i++){
        const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
        for(let ring=0;ring<12;ring++){
          const p=point(a,r*ring/12),q=point(b,r*ring/12),u=point(a,r*(ring+1)/12),v=point(b,r*(ring+1)/12);
          fill.push(...p,...u,...v,...p,...v,...q);
        }
        const p=point(a,r-.10),q=point(b,r-.10),u=point(a,r),v=point(b,r);edge.push(...p,...u,...v,...p,...v,...q);
      }
      for(const [mesh,positions] of [[this.fill,fill],[this.edge,edge]] as const){mesh.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));mesh.geometry.computeBoundingSphere();}
    }
    const progress=THREE.MathUtils.clamp(1-(boss.windupUntil-game.time)/BOSS_SLAM.windup,0,1);
    this.fill.material.color.set(progress>.7?'#ff513b':'#f28a37');this.fill.material.opacity=.23+progress*.15+Math.sin(game.time*18)*.035;
    this.edge.material.color.set(progress>.7?'#ff8660':'#ffca7b');
  }
}
