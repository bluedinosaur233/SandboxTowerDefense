import * as THREE from 'three';
import { STAGES, sampleContinent } from './continent';
import type { MapId } from '../simulation/maps';
import type { CampaignMenu } from './menu';
import type { World } from '../render/world';
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function travelFrame(seconds:number,reduced=false,readyAt:number|null=reduced?.18:1.8){
  const handoff=reduced?.18:1.8,duration=reduced?.42:3.25;
  // Loading time must never consume the camera descent or expose unfinished terrain.
  if(seconds>=handoff)seconds=readyAt===null?handoff:handoff+Math.max(0,seconds-readyAt);
  return {handoff:seconds>=handoff,done:seconds>=duration,
    departure:reduced?0:smooth((seconds-.22)/1.58),arrival:reduced?1:smooth((seconds-handoff)/(duration-handoff)),
    cover:seconds<handoff?smooth((seconds-(reduced?0:1.15))/(reduced?.15:.42)):1-smooth((seconds-handoff-(reduced?0:.12))/(reduced?.24:1.15))};
}
export class CampaignTravel {
  active=false;
  private overlay=document.createElement('div');
  private state:{id:MapId;start:number;reduced:boolean;entered:boolean;readyAt:number|null;from:THREE.Vector3;target:THREE.Vector3;zoom:number;arrivalPosition?:THREE.Vector3;arrivalTarget?:THREE.Vector3}|null=null;
  constructor(private menu:CampaignMenu,private world:World,private enter:(id:MapId)=>void,private arrived:()=>void){
    this.overlay.id='campaign-travel';this.overlay.hidden=true;this.overlay.setAttribute('role','status');this.overlay.setAttribute('aria-live','polite');
    this.overlay.innerHTML='<div class="travel-clouds"></div><div class="travel-destination"><small>越过山川，奔赴前线</small><b></b></div>';
    document.querySelector('#app')!.append(this.overlay);
  }
  begin(id:MapId){
    if(this.active||!this.menu.visible)return;
    this.active=true;this.menu.beginDeparture();this.world.controls.enabled=false;
    const scene=this.menu.scene;scene.freeze();
    this.state={id,start:performance.now()/1000,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,entered:false,readyAt:null,from:scene.camera.position.clone(),target:scene.controls.target.clone(),zoom:scene.camera.zoom};
    this.overlay.querySelector('b')!.textContent=this.menu.root.querySelector('#atlas-level-title')!.textContent;
    this.overlay.hidden=false;document.body.classList.add('travel-active');
  }
  render(time:number){
    const s=this.state;if(!s)return;
    const f=travelFrame(time-s.start,s.reduced,s.readyAt);
    this.overlay.style.setProperty('--cover',String(f.cover));this.overlay.style.setProperty('--travel',String(f.departure+f.arrival));
    if(!f.handoff){
      if(!s.reduced){const stage=STAGES.find(n=>n.id===s.id)!,target=new THREE.Vector3(stage.x,sampleContinent(stage.x,stage.z).h+2,stage.z),scene=this.menu.scene;
        scene.controls.target.copy(s.target).lerp(target,f.departure);scene.camera.position.copy(s.from).lerp(target.clone().add(new THREE.Vector3(8,360,130)),f.departure);scene.camera.zoom=s.zoom*Math.pow(8/s.zoom,f.departure);scene.camera.updateProjectionMatrix();}
      this.menu.render(time);return;
    }
    if(!s.entered){
      s.entered=true;this.enter(s.id);s.arrivalPosition=this.world.camera.position.clone();s.arrivalTarget=this.world.controls.target.clone();this.world.controls.enabled=false;this.world.controls.enableDamping=false;
      // Warm the first visible camera pose, including its shadows and GPU buffers.
      const start=new THREE.Vector3(this.world.game.goal.x,this.world.game.map.cameraHeight,this.world.game.goal.z);
      this.world.controls.target.copy(start);this.world.camera.position.copy(start).add(new THREE.Vector3(6,115,24));this.world.camera.zoom=.7;this.world.camera.updateProjectionMatrix();
      void this.world.prepareForEntry().catch(error=>console.error('Battlefield preparation failed',error)).then(()=>{if(this.state===s)s.readyAt=performance.now()/1000-s.start;});
    }
    if(s.readyAt===null)return;
    const target=s.arrivalTarget!,start=new THREE.Vector3(this.world.game.goal.x,this.world.game.map.cameraHeight,this.world.game.goal.z);
    this.world.controls.target.copy(start).lerp(target,f.arrival);
    this.world.camera.position.copy(start).add(new THREE.Vector3(6,115,24)).lerp(s.arrivalPosition!,f.arrival);
    this.world.camera.zoom=.7+.3*f.arrival;this.world.camera.updateProjectionMatrix();this.world.render(time);
    if(f.done){this.world.controls.enableDamping=true;this.world.controls.enabled=true;this.overlay.hidden=true;document.body.classList.remove('travel-active');this.active=false;this.state=null;this.arrived();}
  }
}
