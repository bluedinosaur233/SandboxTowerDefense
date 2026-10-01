import * as THREE from 'three';
import { BOSS_ENTRANCE, BOSS_IMPACTS } from '../simulation/enemies';
import type { Enemy, Game } from '../simulation/game';
import type { World } from './world';

const ease=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function bossEntranceFrame(time:number,reduced=false){
  const focus=reduced?.25:1.3,returnAt=focus+BOSS_ENTRANCE,doneAt=returnAt+(reduced?.25:1.15);
  return {focus:ease(time/focus),returning:ease((time-returnAt)/(doneAt-returnAt)),age:time-focus,done:time>=doneAt};
}

/** The battle clock stops for this presentation, so unattended troops take no damage. */
export class BossEntrance {
  private state:{game:Game;enemy:Enemy;elapsed:number;position:THREE.Vector3;target:THREE.Vector3;zoom:number;focus:THREE.Vector3;close:THREE.Vector3;closeZoom:number;enabled:boolean;damping:boolean;inert:boolean;reduced:boolean;hammerSound:boolean;bodySound:boolean;warcrySound:boolean}|null=null;
  private seen=new WeakSet<Enemy>();
  get active(){return this.state!==null;}
  constructor(private world:World,private root:HTMLElement,private prepare:()=>void,private reveal:()=>void,private arrival:(impact:'hammer'|'body'|'warcry')=>void){}
  begin(game:Game){
    if(this.active||game.paused||game.phase!=='battle')return false;
    const enemy=game.enemies.find(e=>e.boss&&e.hp>0&&!this.seen.has(e));if(!enemy)return false;
    this.seen.add(enemy);this.prepare();
    const {camera,controls}=this.world;
    // Drain OrbitControls' residual drag before saving the exact player view.
    const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
    const position=camera.position.clone(),target=controls.target.clone();
    const focus=new THREE.Vector3(enemy.x,enemy.y+1.8,enemy.z);
    const offset=position.clone().sub(target),close=focus.clone().add(offset);
    const closeZoom=Math.max(camera.zoom,Math.min(7,Math.max(camera.zoom*1.35,3.6)));
    this.state={game,enemy,elapsed:0,position,target,zoom:camera.zoom,focus,close,closeZoom,enabled:controls.enabled,damping,inert:this.root.inert,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,hammerSound:false,bodySound:false,warcrySound:false};
    controls.enabled=false;this.world.bossPresentationAge=-1;this.root.inert=true;
    document.body.classList.add('boss-cinematic');return true;
  }
  update(dt:number){
    const s=this.state;if(!s)return;
    if(s.game!==this.world.game||s.enemy.hp<=0||s.game.phase!=='battle'){this.finish();return;}
    if(!s.game.paused)s.elapsed+=Math.max(0,dt);
    const f=bossEntranceFrame(s.elapsed,s.reduced),{camera,controls}=this.world;
    this.world.bossPresentationAge=f.age;
    if(f.age>=BOSS_IMPACTS.hammer&&!s.hammerSound){s.hammerSound=true;this.arrival('hammer');}
    if(f.age>=BOSS_IMPACTS.body&&!s.bodySound){s.bodySound=true;this.arrival('body');}
    if(f.age>=BOSS_IMPACTS.warcry&&!s.warcrySound){s.warcrySound=true;this.arrival('warcry');}
    const amount=s.reduced?0:f.focus*(1-f.returning);
    controls.target.copy(s.target).lerp(s.focus,amount);camera.position.copy(s.position).lerp(s.close,amount);
    if(!s.reduced){
      const impactAge=f.age-(f.age<BOSS_IMPACTS.body?BOSS_IMPACTS.hammer:BOSS_IMPACTS.body);
      if(impactAge>=0&&impactAge<.35){const force=(1-impactAge/.35)*.16;camera.position.x+=Math.sin(impactAge*75)*force;camera.position.y+=Math.sin(impactAge*95)*force;}
    }
    camera.zoom=THREE.MathUtils.lerp(s.zoom,s.closeZoom,amount);camera.updateProjectionMatrix();
    if(f.done)this.finish();
  }
  finish(){
    const s=this.state;if(!s)return;
    const {camera,controls}=this.world;
    camera.position.copy(s.position);camera.zoom=s.zoom;camera.updateProjectionMatrix();controls.target.copy(s.target);controls.update();
    controls.enabled=s.enabled;controls.enableDamping=s.damping;this.world.bossPresentationAge=null;
    if(s.enemy.boss)s.enemy.boss.spawnedAt=s.game.time-BOSS_ENTRANCE;
    this.root.inert=s.inert;document.body.classList.remove('boss-cinematic');this.state=null;this.reveal();
  }
}
