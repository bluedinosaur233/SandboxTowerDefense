import * as THREE from 'three';
import type { Sanctuary } from '../simulation/game';

const disc=new THREE.CircleGeometry(1,48),ring=new THREE.TorusGeometry(1,.018,6,48),cube=new THREE.BoxGeometry(1,1,1);
const fill=new THREE.MeshBasicMaterial({color:'#ffe9a1',transparent:true,opacity:.09,depthWrite:false});
const glow=new THREE.MeshBasicMaterial({color:'#fff0ae',transparent:true,opacity:.65,depthWrite:false});
// Shared GPU resources survive the transient effect groups cleared each frame.
export function renderSanctuaries(group:THREE.Group,fields:Sanctuary[],ground:(x:number,z:number)=>number,time:number){
  for(const field of fields){
    const y=ground(field.x,field.z)+.065;
    for(const [geometry,material] of [[disc,fill],[ring,glow]] as const){
      const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;
      mesh.scale.setScalar(field.radius);mesh.position.set(field.x,y,field.z);group.add(mesh);
    }
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3+field.id,rise=(time*.5+i/6)%1;
      for(const vertical of [true,false]){
        const mesh=new THREE.Mesh(cube,glow);mesh.scale.set(vertical?.035:.16,vertical?.22:.035,.035);
        mesh.position.set(field.x+Math.cos(angle)*field.radius*.73,y+.15+rise*.65,field.z+Math.sin(angle)*field.radius*.73);group.add(mesh);
      }
    }
  }
}
