import * as THREE from 'three';
import { BOSS_SLAM, BOSS_ENTRANCE, BOSS_IMPACTS, BOSS_RAGE } from '../simulation/enemies';
import type { Game, Enemy } from '../simulation/game';

const hammerMatrix=new THREE.Matrix4(),inverseRoot=new THREE.Matrix4(),heldPosition=new THREE.Vector3(),heldRotation=new THREE.Quaternion(),heldScale=new THREE.Vector3();
const restRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI-.1));
const smooth=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export function bossArrivalPose(age:number,height=18){
  const hammerFall=THREE.MathUtils.clamp(age/BOSS_IMPACTS.hammer,0,1);
  const bodyFall=THREE.MathUtils.clamp((age-.98)/(BOSS_IMPACTS.body-.98),0,1);
  return {hammerHeight:height*(1-hammerFall*hammerFall),bodyHeight:height*(1-bodyFall*bodyFall),bodyVisible:age>=.98,
    crouch:age<BOSS_IMPACTS.body?0:1-smooth((age-BOSS_IMPACTS.body)/(BOSS_IMPACTS.gripped-BOSS_IMPACTS.body)),
    pickup:smooth((age-BOSS_IMPACTS.pickup)/(BOSS_IMPACTS.gripped-BOSS_IMPACTS.pickup)),
    salute:Math.sin(Math.PI*smooth((age-BOSS_IMPACTS.gripped)/(BOSS_ENTRANCE-BOSS_IMPACTS.gripped)))};
}
/** A separate copy drops first; its transform blends into the real hand at pickup. */
export function animateBoss(model:THREE.Group,enemy:Enemy,time:number,dropHeight=18){
  if(!enemy.boss)return;
  const body=model.getObjectByName('body')!,head=model.getObjectByName('head')!,hammer=model.getObjectByName('siege hammer')!,falling=model.getObjectByName('arrival-hammer')!;
  const age=time-enemy.boss.spawnedAt,enter=age<BOSS_ENTRANCE;
  body.position.set(0,-.35,0);body.rotation.set(0,0,0);body.visible=true;head.rotation.x=0;hammer.visible=true;falling.visible=false;
  for(const name of ['leg-left','leg-right'])model.getObjectByName(name)!.rotation.z=0;
  const cape=model.getObjectByName('boss-cape');
  if(cape)cape.rotation.x=.08+Math.sin(time*3)*.055;
  if(!enter){
    body.rotation.x=Math.sin(time*2.8)*.012+(enemy.boss.enraged?Math.sin(time*6)*.013:0);
    const rageAge=enemy.boss.enragedAt===undefined?Infinity:time-enemy.boss.enragedAt;
    if(rageAge>=0&&rageAge<BOSS_RAGE.duration){
      const lift=smooth(rageAge/BOSS_RAGE.warcry)*(1-smooth((rageAge-.9)/.7));
      const brace=Math.sin(Math.PI*THREE.MathUtils.clamp(rageAge/BOSS_RAGE.warcry,0,1));
      body.position.y-=brace*.18;body.rotation.x=brace*.15-lift*.16;head.rotation.x=-lift*.23;
      model.getObjectByName('arm-right')!.rotation.set(-lift*2.5,0,-lift*.15);model.getObjectByName('arm-left')!.rotation.x=-lift*.8;
    }
    return;
  }
  const pose=bossArrivalPose(age,dropHeight),left=model.getObjectByName('arm-left')!,right=model.getObjectByName('arm-right')!;
  body.visible=pose.bodyVisible;hammer.visible=false;falling.visible=age>=0;
  body.position.y+=pose.bodyHeight-pose.crouch*.48;body.rotation.x=pose.crouch*.30-pose.salute*.11;
  head.rotation.x=-pose.salute*.2-pose.crouch*.1;
  left.rotation.x=-.25-pose.crouch*.65;right.rotation.x=-pose.salute*2.2+pose.crouch*.2;right.rotation.z=-pose.salute*.18;
  for(const [name,sign] of [['leg-left',-1],['leg-right',1]] as const){const leg=model.getObjectByName(name)!;leg.rotation.x=pose.crouch*.5;leg.rotation.z=sign*pose.crouch*.12;}
  // Hammer head is grounded beside the right hand, with the handle upright.
  falling.position.set(1.12,1.3+pose.hammerHeight,.42);falling.quaternion.copy(restRotation);falling.scale.setScalar(2.1);
  if(pose.pickup>0){
    model.updateMatrixWorld(true);inverseRoot.copy(model.matrixWorld).invert();hammerMatrix.multiplyMatrices(inverseRoot,hammer.matrixWorld);hammerMatrix.decompose(heldPosition,heldRotation,heldScale);
    falling.position.lerp(heldPosition,pose.pickup);falling.quaternion.slerp(heldRotation,pose.pickup);falling.scale.lerp(heldScale,pose.pickup);
  }
  if(age>=BOSS_IMPACTS.gripped){falling.visible=false;hammer.visible=true;}
}

/** One reusable particle pool for the single boss; no growing effect list or cloned materials. */
export class BossPresence {
  readonly group=new THREE.Group();
  private motes=new THREE.InstancedMesh(new THREE.BoxGeometry(.10,.10,.10),new THREE.MeshBasicMaterial({color:'#ffc16a',transparent:true,depthWrite:false,toneMapped:false}),36);
  private ring=new THREE.Mesh(new THREE.RingGeometry(.91,1,64),new THREE.MeshBasicMaterial({color:'#efaa62',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
  private aura=new THREE.Mesh(new THREE.CylinderGeometry(.65,1.35,2.8,20,1,true),new THREE.MeshBasicMaterial({color:'#ee4f26',transparent:true,opacity:.08,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  private transform=new THREE.Object3D();
  constructor(){
    this.group.add(this.ring,this.aura,this.motes);this.group.visible=false;
    this.ring.rotation.x=-Math.PI/2;this.motes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.motes.frustumCulled=false;
  }
  update(game:Game,presentationAge:number|null=null){
    const enemy=game.enemies.find(e=>e.hp>0&&e.boss),boss=enemy?.boss;
    this.group.visible=!!enemy&&game.phase==='battle';if(!enemy||!boss)return;
    const age=presentationAge??game.time-boss.spawnedAt,impact=age<BOSS_IMPACTS.body?BOSS_IMPACTS.hammer:BOSS_IMPACTS.body,landing=age-impact,rageAge=boss.enragedAt===undefined?Infinity:game.time-boss.enragedAt;
    const arrival=landing>=0&&landing<1.6,burst=rageAge>=0&&rageAge<1.3;
    const active=arrival||boss.enraged;this.group.visible=this.group.visible&&active;if(!active)return;
    const hammerImpact=impact===BOSS_IMPACTS.hammer&&!boss.enraged;
    const dx=hammerImpact?Math.cos(enemy.facing)*1.12+Math.sin(enemy.facing)*.42:0,dz=hammerImpact?-Math.sin(enemy.facing)*1.12+Math.cos(enemy.facing)*.42:0;
    this.group.position.set(enemy.x+dx,game.ground(enemy.x+dx,enemy.z+dz)+.08,enemy.z+dz);
    const pulse=.5+.5*Math.sin(game.time*5);
    const radius=arrival?1+landing*3.6:burst?1+rageAge*3:1.65+pulse*.12;
    this.ring.visible=true;this.ring.scale.setScalar(radius);
    this.ring.material.opacity=arrival?.65*(1-landing/1.6):burst?.8*(1-rageAge/1.3):.23+pulse*.16;
    this.ring.material.color.set(boss.enraged?'#ff7840':'#d9bd8c');
    this.aura.visible=boss.enraged;this.aura.position.y=1.4;this.aura.rotation.y=game.time*.45;
    this.aura.scale.set(1+pulse*.12,1+pulse*.1,1+pulse*.12);this.aura.material.opacity=.045+pulse*.035;
    this.motes.material.color.set(boss.enraged?'#ffb44c':'#c6b38c');this.motes.material.opacity=boss.enraged?.85:.6*(1-landing/1.6);
    for(let i=0;i<this.motes.count;i++){
      const p=boss.enraged?(game.time*.55+i*.618)%1:Math.min(1,landing/1.6),a=i*2.399+game.time*.3;
      const r=boss.enraged?.85+(i%4)*.16: .65+p*(2.2+(i%4)*.25);
      this.transform.position.set(Math.cos(a)*r,boss.enraged?p*3.7:.08+Math.sin(p*Math.PI)*(.75+(i%3)*.35),Math.sin(a)*r);
      this.transform.rotation.set(i*.4,game.time+i,Math.PI/4);
      const size=(boss.enraged?1-p:.8+(i%3)*.4);this.transform.scale.set(size,boss.enraged?size*2.8:size,size);this.transform.updateMatrix();
      this.motes.setMatrixAt(i,this.transform.matrix);
    }
    this.motes.instanceMatrix.needsUpdate=true;
  }
}

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

/** Buckle, lose the hammer, then fall forward with a small impact rebound. */
export function bossDeathPose(age:number){
 const kneel=smooth(age/.7),fall=smooth((age-.65)/.85),settle=Math.max(0,age-1.5);
 return {kneel,fall,impact:age>=1.5,roll:Math.sin(settle*22)*Math.exp(-settle*9)*.065};
}
export function animateBossDeath(model:THREE.Group,age:number){
 const p=bossDeathPose(age),body=model.getObjectByName('body')!,head=model.getObjectByName('head')!;
 const left=model.getObjectByName('arm-left')!,right=model.getObjectByName('arm-right')!;
 model.visible=true;body.visible=true;body.position.set(0,-.35-.10*p.kneel+1.62*p.fall,.18*p.kneel);
 body.rotation.set(p.fall*1.46+p.roll,0,-.08*p.kneel*(1-p.fall));head.rotation.x=.24*p.kneel;
 left.rotation.set(-.7*p.kneel-.65*p.fall,0,-.32*p.fall);right.rotation.set(-.22*p.kneel,0,.35*p.fall);
 for(const [name,sign] of [['leg-left',-1],['leg-right',1]] as const){const leg=model.getObjectByName(name)!;leg.rotation.set(-.85*p.kneel*(1-p.fall),0,sign*.14*p.kneel);}
 model.getObjectByName('siege hammer')!.visible=false;
 const hammer=model.getObjectByName('arrival-hammer')!;hammer.visible=true;
 const drop=smooth(age/.8);hammer.position.set(1.12,1.50+(1-drop)*.60,.42+.4*drop);hammer.rotation.set(0,0,Math.PI-.1+drop*.82);hammer.scale.setScalar(2.1);
 const cape=model.getObjectByName('boss-cape');if(cape)cape.rotation.x=-.15*p.fall;
}
