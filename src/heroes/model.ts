import * as THREE from 'three';
import { aimArm } from './archery';
import { HERO_SHOT } from '../simulation/hero';

export type HeroPose = 'idle' | 'walk' | 'shoot' | 'melee' | 'cast' | 'enter' | 'defeat';
const COLORS = {
  skin: '#f4d5bf', skinShade: '#dfac93', white: '#f3f0e5', shade: '#cbd6d0',
  silver: '#9eafb6', silverLight: '#dde8e8', silverDark: '#637983',
  green: '#387a65', greenLight: '#8fc6a1', greenDark: '#224e45',
  hair: '#e4bf73', hairLight: '#f5d994', hairShade: '#b38a49', hairMid: '#cfa65e',
  leather: '#5a4b3c', leatherLight: '#947952', ink: '#354c43',
};
type Color = keyof typeof COLORS;

/** Original cuboid character. +Z is forward; every articulated part has a joint-local pivot. */
export function createElfModel() {
  const root = new THREE.Group(); root.name = 'Aerilia · cuboid ranger';
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const materials = Object.fromEntries(Object.entries(COLORS).map(([name, color]) => [name,
    new THREE.MeshStandardMaterial({ color, roughness: .88, metalness: name.startsWith('silver') ? .12 : 0, flatShading: true }),
  ])) as Record<Color, THREE.MeshStandardMaterial>;
  const joint = (name: string, parent: THREE.Object3D, x=0, y=0, z=0) => {
    const g = new THREE.Group(); g.name = name; g.position.set(x,y,z); parent.add(g); return g;
  };
  const box = (p: THREE.Object3D, c: Color, x:number,y:number,z:number,w:number,h:number,d:number, rz=0) => {
    const m = new THREE.Mesh(cube,materials[c]);m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.z=rz;m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
  };
  const rod = (p:THREE.Object3D,c:Color,a:number[],b:number[],w:number,d=w) => {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=box(p,c,0,0,0,w,start.distanceTo(end),d);
    m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;
  };
  const body=joint('rig',root),hips=joint('hips',body,0,1.83),torso=joint('torso',hips,0,.30);
  box(hips,'shade',0,-.01,0,.58,.36,.38);
  box(torso,'white',0,.29,0,.62,.64,.40);
  box(torso,'shade',0,.27,-.212,.57,.53,.028);
  box(torso,'white',0,.61,0,.73,.20,.44);
  box(torso,'greenDark',0,.735,0,.32,.12,.30);
  for(const s of [-1,1]) {
    box(torso,'green',s*.12,.68,.239,.17,.21,.025,s*-.24);
    box(torso,'silverLight',s*.25,.34,.227,.08,.42,.035,s*-.1);
  }
  box(torso,'silverLight',0,.63,.275,.15,.18,.04,Math.PI/4);
  box(torso,'green',0,.63,.306,.105,.13,.025,Math.PI/4);
  box(torso,'greenLight',-.022,.66,.324,.025,.042,.009);
  box(hips,'leather',0,.28,0,.67,.13,.455);
  box(hips,'silverLight',0,.28,.245,.18,.15,.04);
  box(hips,'leatherLight',0,.28,.27,.11,.085,.025);
  rod(torso,'leather',[-.26,.68,.26],[.24,-.02,.255],.065,.027);

  // Four broad flared panels retain a clear skirt silhouette at tactical camera distances.
  const skirt=joint('skirt',hips,0,.17);
  for(const s of [-1,1]){
    const pleat=joint(s>0?'front center pleat':'back center pleat',skirt,0,0,s*.25);pleat.rotation.x=-s*.24;
    box(pleat,'white',0,-.25,0,.23,.55,.065);
    box(pleat,'green',0,-.478,0,.23,.052,.073);
    box(pleat,'silverLight',0,-.527,0,.23,.033,.077);
  }
  for(const s of [-1,1]) {
    const front=joint(`skirt ${s} front`,skirt,s*.18,0,.23);front.rotation.x=-.24;front.rotation.z=s*.16;
    const back=joint(`skirt ${s} back`,skirt,s*.18,0,-.23);back.rotation.x=.24;back.rotation.z=s*.16;
    for(const panel of [front,back]) {
      box(panel,'white',0,-.25,0,.37,.55,.065);
      box(panel,'green',0,-.478,.002,.37,.052,.073);
      box(panel,'silverLight',0,-.527,.003,.37,.033,.077);
    }
    const side=joint(`skirt ${s} side`,skirt,s*.31,0);side.rotation.z=s*.3;
    box(side,'shade',0,-.24,0,.06,.53,.46);
    box(side,'green',0,-.465,0,.071,.05,.47);
  }
  const legs=[-1,1].map(s=>{
    const thigh=joint(s<0?'right thigh':'left thigh',hips,s*.185,-.08);
    box(thigh,'skin',0,-.20,0,.265,.45,.28);
    box(thigh,'white',0,-.49,0,.274,.29,.291);
    box(thigh,'shade',0,-.354,.153,.274,.025,.014);
    const shin=joint(s<0?'right shin':'left shin',thigh,0,-.63);
    box(shin,'white',0,-.24,0,.245,.48,.265);
    box(shin,'shade',s*.10,-.22,-.136,.034,.36,.015);
    const foot=joint(s<0?'right foot':'left foot',shin,0,-.71);
    box(foot,'silverDark',0,-.32,.09,.31,.075,.47);
    box(foot,'white',0,-.23,.075,.30,.14,.445);
    box(foot,'white',0,-.03,-.015,.275,.39,.29);
    box(foot,'silver',0,.17,-.012,.30,.075,.32);
    box(foot,'silverLight',0,-.195,.237,.30,.085,.035);
    box(foot,'green',s*.16,.09,.012,.035,.15,.11);
    return {thigh,shin,foot};
  });

  // Two shoulder joints, elbows and palm sockets for the weapon grips.
  const arms=[-1,1].map(s=>{
    const shoulder=joint(s<0?'right shoulder':'left shoulder',torso,s*.46,.58);
    box(shoulder,'white',0,-.19,0,.25,.44,.30);
    box(shoulder,'silverDark',0,.012,0,.32,.13,.35);
    box(shoulder,'silverLight',s*.02,.08,0,.37,.095,.40,s*.12);
    box(shoulder,'silver',s*.035,-.055,0,.34,.10,.36,s*.16);
    const elbow=joint(s<0?'right elbow':'left elbow',shoulder,0,-.42);
    box(elbow,'white',0,-.115,0,.22,.25,.255);
    box(elbow,'silver',0,-.285,0,.25,.20,.285);
    box(elbow,'silverLight',0,-.285,.153,.13,.17,.025);
    box(elbow,'green',0,-.23,.172,.06,.06,.015,Math.PI/4);
    const hand=joint(s<0?'right hand':'left hand',elbow,0,-.43);
    box(hand,'leather',0,.018,0,.235,.09,.25);
    box(hand,'skin',0,-.09,.025,.215,.17,.235);
    box(hand,'skinShade',-s*.122,-.06,.076,.045,.10,.115);
    return {shoulder,elbow,hand};
  });

  const head=joint('head',torso,0,.78);
  // Keep broad voxel planes, but cut the lower corners into cheeks and a short chin.
  const silhouette=new THREE.Shape();
  silhouette.moveTo(-.445,.86);silhouette.lineTo(.445,.86);silhouette.lineTo(.445,.34);
  silhouette.lineTo(.355,.15);silhouette.lineTo(.13,.065);silhouette.lineTo(0,.04);
  silhouette.lineTo(-.13,.065);silhouette.lineTo(-.355,.15);silhouette.lineTo(-.445,.34);silhouette.closePath();
  const faceVolume=new THREE.Mesh(new THREE.ExtrudeGeometry(silhouette,{depth:.71,bevelEnabled:false,curveSegments:1}),materials.skin.clone());
  faceVolume.position.z=-.355;faceVolume.castShadow=true;faceVolume.receiveShadow=true;head.add(faceVolume);
  for(const s of [-1,1]) {
    box(head,'skin',s*.55,.43,-.025,.23,.16,.15,s*.22);
    box(head,'skin',s*.69,.48,-.035,.14,.10,.10,s*.27);
    box(head,'skinShade',s*.55,.44,.057,.19,.054,.016,s*.22);
    box(head,'silverLight',s*.59,.34,.04,.035,.08,.038);
  }
  // Pixel facial art is a single nearest-filtered texture, not protruding eye cubes.
  const pixels=new Uint8Array(64*64*4);
  const paint=(x:number,y:number,w:number,h:number,hex:string)=>{
    const value=Number.parseInt(hex.slice(1),16);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
      const i=((63-yy)*64+xx)*4;pixels[i]=value>>16;pixels[i+1]=(value>>8)&255;pixels[i+2]=value&255;pixels[i+3]=255;
    }
  };
  for(const x of [10,38]) {
    paint(x,35,16,13,'#fff8e7');paint(x+4,35,10,13,'#254c40');
    paint(x+5,38,8,9,'#448969');paint(x+5,44,8,3,'#8bcc9a');paint(x+7,36,3,8,'#263d35');
    paint(x+4,36,4,3,'#ffffff');paint(x+10,43,2,2,'#e5f7ce');
    paint(x-1,33,18,2,'#4c4135');paint(x+1,32,14,1,'#4c4135');
    paint(x+2,29,12,1,'#b88d50');paint(x+4,48,9,1,'#a87d69');
  }
  for(const x of [8,48]){
    paint(x,51,8,2,'#e8b4a4');
    for(let i=0;i<3;i++)paint(x+i*3,51-i%2,1,2,'#d89888');
  }
  paint(31,50,2,1,'#dfb09a');paint(30,55,5,1,'#b47e6e');
  const faceTexture=new THREE.DataTexture(pixels,64,64);faceTexture.colorSpace=THREE.SRGBColorSpace;
  faceTexture.magFilter=faceTexture.minFilter=THREE.NearestFilter;faceTexture.generateMipmaps=false;faceTexture.needsUpdate=true;
  const faceMaterial=new THREE.MeshStandardMaterial({map:faceTexture,transparent:true,alphaTest:.5,roughness:1});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.91,.83),faceMaterial);face.position.set(0,.43,.357);face.name='pixel face';head.add(face);

  const hair=joint('layered hair',head);
  const hairShell=(outline:number[][],depth:number,z:number,color:Color)=>{
    const shape=new THREE.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1}),materials[color].clone());
    mesh.position.z=z;mesh.castShadow=true;mesh.receiveShadow=true;hair.add(mesh);
  };
  // Sloping temple and crown planes replace the old rectangular helmet corners.
  hairShell([[-.51,.67],[-.48,.83],[-.34,.96],[0,1.005],[.34,.96],[.48,.83],[.51,.67]],.82,-.44,'hair');
  hairShell([[-.43,.16],[-.49,.35],[-.48,.78],[-.31,.94],[.31,.94],[.48,.78],[.49,.35],[.43,.16]],.18,-.495,'hairMid');
  for(const s of [-1,1])rod(hair,'hairLight',[0,.993,-.02],[s*.33,.95,-.02],.038,.66);
  for(const s of [-1,1]) {
    box(hair,'hair',s*.447,.56,-.09,.145,.46,.62,s*-.10);
    const lock=joint(`side lock ${s}`,hair,s*.437,.71,.33);lock.rotation.z=s*.09;
    box(lock,'hair',0,-.25,0,.18,.57,.17);
    box(lock,'hairLight',-s*.045,-.26,.093,.045,.47,.018);
    box(lock,'hairMid',-s*.025,-.59,-.008,.13,.17,.14,s*-.27);
  }
  // Fuller fringe with tapered angular tips, leaving the lowered eyes readable.
  for(const [x,top,w,length,lean] of [[-.35,.82,.22,.38,-.04],[-.18,.91,.25,.46,.04],[.035,.95,.25,.64,-.035],[.24,.89,.24,.44,-.035],[.40,.79,.14,.37,.025]]) {
    const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);
    shape.lineTo(w/2+lean,-length*.78);shape.lineTo(lean,-length);shape.lineTo(-w/2+lean,-length*.87);shape.closePath();
    const lock=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:false,curveSegments:1}),materials.hair.clone());
    lock.position.set(x,top,.37);lock.castShadow=true;lock.receiveShadow=true;hair.add(lock);
    box(hair,'hairLight',x-.04,top-length*.30,.517,w*.20,length*.36,.014,lean);
  }
  const ponytail=joint('high ponytail',head,0,.92,-.43);
  box(ponytail,'hairLight',0,.14,-.06,.39,.29,.34,-.18);
  box(ponytail,'hair',-.02,-.09,-.23,.46,.40,.32,-.16);
  const tail=joint('ponytail lower',ponytail,-.07,-.28,-.24);tail.rotation.z=-.20;
  box(tail,'hair',0,-.34,0,.46,.73,.30);
  box(tail,'hairLight',-.095,-.31,.159,.12,.68,.025);
  box(tail,'hairMid',.19,-.37,-.02,.07,.70,.28);
  box(tail,'hair',-.07,-.85,.03,.34,.37,.27,-.25);
  box(tail,'hairLight',-.13,-1.08,.04,.20,.20,.22,-.3);
  const ribbon=joint('green ribbon',ponytail,0,.045,.13);
  box(ribbon,'greenDark',0,0,0,.17,.15,.18);
  for(const s of [-1,1]){
    box(ribbon,'green',s*.19,.025,0,.24,.18,.09,s*-.24);
    box(ribbon,'greenLight',s*.19,.078,.056,.18,.035,.013,s*-.24);
    box(ribbon,'green',s*.10,-.16,-.015,.095,.25,.055,s*.22);
  }
  const cape=joint('cape',torso,0,.66,-.26);cape.rotation.x=.10;
  box(cape,'white',0,-.27,0,.83,.60,.065);
  box(cape,'shade',0,-.33,-.04,.17,.51,.025);
  box(cape,'green',0,-.57,-.042,.83,.045,.024);
  for(const s of [-1,1])box(cape,'silverLight',s*.40,-.25,-.04,.035,.56,.025);
  const quiver=joint('quiver',torso,.31,.41,-.42);quiver.rotation.z=-.25;
  box(quiver,'leather',0,-.18,0,.24,.68,.23);
  for(const y of [-.47,.10])box(quiver,'silver',0,y,0,.27,.07,.26);
  for(let i=0;i<3;i++){
    const x=(i-1)*.08,y=.40+(i%2)*.10;rod(quiver,'leatherLight',[x,-.10,0],[x,y+.13,0],.024);
    box(quiver,'white',x,y,0,.065,.18,.028);box(quiver,'green',x+.03,y-.02,.022,.025,.13,.025);
  }
  const bow=joint('bow socket',torso,0,0,0);
  bow.rotation.z=Math.PI/2;
  const points=[[.06,-.91],[.14,-.78],[.25,-.52],[.22,-.25],[0,0],[.22,.25],[.25,.52],[.14,.78],[.06,.91]];
  for(let i=0;i<points.length-1;i++)rod(bow,i%3===0?'silverLight':'hairMid',[...points[i],0],[...points[i+1],0],.068,.08);
  box(bow,'greenDark',.018,0,0,.11,.20,.115);
  for(const y of [-.78,.78])box(bow,'green',.145,y,.05,.11,.10,.03);
  const string=joint('bowstring',bow);
  const stringArms=[-1,1].map(side=>{const arm=joint('bowstring segment',string,.06,side*.91,0);box(arm,'shade',0,.5,0,.012,1,.012);return arm;});
  const nock=joint('string nock',bow,.06,0,0);
  const arrow=joint('nocked arrow',bow);
  rod(arrow,'leatherLight',[0,0,0],[0,0,.96],.022);
  box(arrow,'silverLight',0,0,1,.07,.035,.14);
  box(arrow,'white',0,0,.12,.10,.025,.16);arrow.visible=false;
  const rapier=joint('rapier sheath',hips,-.40,.26,.08);rapier.rotation.z=-.22;
  box(rapier,'greenDark',0,-.48,0,.07,.99,.075);
  box(rapier,'silverLight',0,-.98,0,.08,.11,.08);
  box(rapier,'silver',0,.025,0,.33,.04,.06);
  box(rapier,'green',0,.16,0,.075,.23,.08);
  box(rapier,'silverLight',0,.30,0,.115,.075,.105);
  rod(rapier,'silverLight',[-.15,.02,0],[-.12,.25,0],.027);
  rod(rapier,'silverLight',[-.12,.25,0],[0,.30,0],.027);

  const blade=joint('drawn rapier',arms[0].hand,0,-.06,.08);
  rod(blade,'silverLight',[0,0,0],[0,0,1.15],.038);
  box(blade,'silver',0,0,0,.30,.06,.06);
  box(blade,'green',0,0,-.13,.07,.07,.24);blade.rotation.x=.95;blade.visible=false;

  const wingMaterial=new THREE.MeshStandardMaterial({color:'#a3e8c9',emissive:'#469c83',emissiveIntensity:.75,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide});
  const wings=[-1,1].map(s=>{
    const wing=joint(s<0?'right magic wing':'left magic wing',torso,s*.29,.55,-.38);
    for(let i=0;i<5;i++){
      const x=1.18-i*.095,y=.92-i*.33;
      const shape=new THREE.Shape();shape.moveTo(s*.02,-.10);shape.lineTo(s*x*.53,y*.52+.12);
      shape.lineTo(s*x,y);shape.lineTo(s*x*.78,y*.52-.07);shape.lineTo(s*.15,-.23);shape.closePath();
      const feather=new THREE.Mesh(new THREE.ShapeGeometry(shape),wingMaterial);feather.position.z=-i*.025;wing.add(feather);
    }
    wing.visible=false;return wing;
  });
  // Batch rigid cubes by joint; vertex colors preserve the palette in one draw call per joint.
  const rigidMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.86,flatShading:true});
  const batch=(parent:THREE.Object3D)=>{
    const meshes=parent.children.filter((m):m is THREE.Mesh=>m instanceof THREE.Mesh&&m.geometry===cube&&m.material!==wingMaterial);
    if(meshes.length){
      const inst=new THREE.InstancedMesh(cube,rigidMaterial,meshes.length);inst.castShadow=true;inst.receiveShadow=true;
      meshes.forEach((m,i)=>{m.updateMatrix();inst.setMatrixAt(i,m.matrix);inst.setColorAt(i,(m.material as THREE.MeshStandardMaterial).color);parent.remove(m);});inst.computeBoundingSphere();parent.add(inst);
    }
    for(const child of parent.children)if(child instanceof THREE.Group)batch(child);
  };batch(body);Object.values(materials).forEach(m=>m.dispose());
  let flight=0,stow=0;
  const animated=[body,hips,torso,head,...arms.flatMap(a=>[a.shoulder,a.elbow]),...legs.flatMap(l=>[l.thigh,l.shin]),ponytail,tail,cape];
  let initialized=false;
  const wristTargets=[new THREE.Vector3(-.50,-.1,.1),new THREE.Vector3(.54,-.02,.25)];
  const up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,1);
  const readyFrame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    forward,new THREE.Vector3(-.98,.20,0).normalize(),new THREE.Vector3(-.20,-.98,0).normalize()));
  const backFrame=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,-.46));
  const bowLocal=new THREE.Vector3(),bowRotation=new THREE.Quaternion();
  let bowInitialized=false;

  return {root, joints:{body,hips,torso,head,arms,legs,ponytail,tail,wings,bow,blade,nock,arrow},
    animate(time:number,flying:boolean,dt:number,reduced=false,pose:HeroPose='idle',actionTime=time,restTime=0){
      const previous=animated.map(j=>({rotation:j.rotation.clone(),y:j.position.y}));
      body.rotation.set(0,0,0);hips.rotation.set(0,0,0);torso.rotation.set(0,0,0);head.rotation.set(0,0,0);
      flight=reduced?Number(flying):THREE.MathUtils.damp(flight,Number(flying),7,dt);
      const attack=Math.max(0,Math.min(1,actionTime/.55));
      const walk=pose==='walk'&&!flying&&!reduced?1:0,cycle=time*6;
      body.rotation.x=flight*.32;
      body.position.y=flight*.08+(reduced?0:Math.sin(time*1.8)*.012)+walk*Math.abs(Math.sin(cycle))*.035;
      torso.rotation.y=walk*Math.sin(cycle)*.055;head.rotation.y=-torso.rotation.y*.5;
      for(let i=0;i<2;i++){
        const s=i===0?-1:1,step=Math.sin(cycle+i*Math.PI)*walk;
        legs[i].thigh.rotation.y=0;
        legs[i].thigh.rotation.x=step*.40+flight*.25;
        legs[i].shin.rotation.x=Math.max(0,-step)*.48+flight*.40;
        arms[i].shoulder.rotation.set(-step*.25,0,s*(.10+flight*.15));
        arms[i].elbow.rotation.x=-.10;
      }

      bow.visible=pose!=='melee';blade.visible=pose==='melee';rapier.visible=pose!=='melee';
      if(pose==='shoot'){
        hips.rotation.y=-1.25;torso.rotation.y=-.52;head.rotation.y=1.77;
        legs[0].thigh.rotation.y=-.22;legs[1].thigh.rotation.y=.12;
      }else if(pose==='melee'){
        arms[0].shoulder.rotation.set(-.55-Math.sin(attack*Math.PI)*.95,0,-.12);
        torso.rotation.y=Math.sin(attack*Math.PI)*.25;legs[1].thigh.rotation.x=-.17;legs[0].shin.rotation.x=.22;
      }
      if(pose==='cast'){
        arms[0].shoulder.rotation.set(-1.9,0,-.6);arms[1].shoulder.rotation.set(-1.2,0,.55);
        torso.rotation.x=-.12;head.rotation.x=-.16;
      }
      if(pose==='enter'){
        const t=Math.min(1,Math.max(0,actionTime/1.1)),land=Math.sin(Math.max(0,(t-.65)/.35)*Math.PI);
        body.position.y+=(1-t)*(1-t)*3-land*.16;
        legs[0].thigh.rotation.x=-land*.5;legs[1].thigh.rotation.x=-land*.5;
        legs.forEach(l=>l.shin.rotation.x=land*.7);arms.forEach((a,i)=>a.shoulder.rotation.z=(i?1:-1)*(.4*(1-t)+.1));
      }
      if(pose==='defeat'){
        const t=Math.min(1,Math.max(0,actionTime/1.1));
        body.position.y=-.85*t;body.rotation.x=.4*t;torso.rotation.x=.48*t;head.rotation.x=.42*t;
        legs[0].thigh.rotation.x=-1.25*t;legs[0].shin.rotation.x=1.8*t;
        legs[1].thigh.rotation.x=-.4*t;legs[1].shin.rotation.x=1.2*t;
        arms[0].shoulder.rotation.x=-.6*t;arms[1].shoulder.rotation.x=-.2*t;
      }
      ponytail.rotation.x=(reduced?0:Math.sin(time*1.8)*.045)+flight*.22+walk*.08;
      tail.rotation.z=-.20+(reduced?0:Math.sin(time*2.2)*.04)+walk*Math.sin(cycle)*.10;
      cape.rotation.x=.10+flight*.25+walk*.12;
      if(initialized&&!reduced){
        const alpha=1-Math.exp(-dt*(pose==='shoot'?28:14));
        animated.forEach((j,i)=>{const old=previous[i];j.rotation.set(old.rotation.x+(j.rotation.x-old.rotation.x)*alpha,old.rotation.y+(j.rotation.y-old.rotation.y)*alpha,old.rotation.z+(j.rotation.z-old.rotation.z)*alpha);j.position.y=old.y+(j.position.y-old.y)*alpha;});
      }
      const archery=pose==='idle'||pose==='walk'||pose==='shoot';
      const stowWanted=(pose==='idle'||pose==='walk')&&restTime>=HERO_SHOT.stowAfter;
      stow=reduced?Number(stowWanted):stowWanted?Math.min(1,stow+dt/.8):Math.max(0,stow-dt/HERO_SHOT.equip);
      const shooting=pose==='shoot'&&actionTime<HERO_SHOT.recovery;
      const drawing=shooting&&actionTime>=.14&&actionTime<HERO_SHOT.release;
      const draw=THREE.MathUtils.smoothstep(actionTime,.06,HERO_SHOT.release*.90);
      const follow=THREE.MathUtils.smoothstep(actionTime,HERO_SHOT.release,HERO_SHOT.release+.12);
      if(archery){
        // Side-on stance: the left arm points along the shoulder line; the right elbow opens back.
        const targets=shooting
          ?[new THREE.Vector3(THREE.MathUtils.lerp(.35,-.13,draw)-follow*.12,1.01,.57+follow*.04),new THREE.Vector3(1.10,1.00,.24)]
          :[new THREE.Vector3(-.31,.34,.36),new THREE.Vector3(.21,-.06,.42+walk*Math.sin(cycle)*.04)];
        // Resting hands hang below the hips; bent elbows here read as hands-on-hips.
        const relaxed=[new THREE.Vector3(-.53,-.255,.055),new THREE.Vector3(.53,-.255,.055)];
        if(!shooting){
          targets[0].lerp(relaxed[0],flight);
          targets[1].lerp(new THREE.Vector3(.58,-.19,.32),flight);
        }
        // Reach behind the shoulder during the middle of putting away / retrieving the bow.
        const reach=Math.sin(stow*Math.PI);
        targets[1].lerp(new THREE.Vector3(.65,.91,-.42),reach*.88).lerp(relaxed[1],stow*stow);
        targets[0].lerp(relaxed[0],stow);
        for(let i=0;i<2;i++){
          if(!initialized||reduced)wristTargets[i].copy(targets[i]);else wristTargets[i].lerp(targets[i],1-Math.exp(-dt*24));
          aimArm(arms[i].shoulder,arms[i].elbow,wristTargets[i],shooting?new THREE.Vector3(i===0?-1.25:.85,1.0,i===0?-.08:-.35):new THREE.Vector3(i===0?-1.1:1.1,.08,0));
        }
      }
      root.updateMatrixWorld(true);
      const palm=arms[1].hand.localToWorld(new THREE.Vector3(0,-.04,0));
      const grip=torso.worldToLocal(palm.clone());
      const desiredPosition=grip.clone().lerp(new THREE.Vector3(-.10,.35,-.76),stow);
      desiredPosition.x+=Math.sin(stow*Math.PI)*.70;
      let desiredRotation=readyFrame.clone();
      if(shooting){
        // Upright bow. The shooting plane stays beside the face.
        const axis=new THREE.Vector3(1,0,-.20).normalize();
        const vertical=up;
        const normal=new THREE.Vector3().crossVectors(axis,vertical).normalize();
        desiredRotation.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis,new THREE.Vector3().crossVectors(normal,axis),normal));
      }
      desiredRotation.slerp(backFrame,stow);
      // Both sockets are torso-local, so putting the bow on the back never teleports it.
      if(!bowInitialized||reduced){bowLocal.copy(desiredPosition);bowRotation.copy(desiredRotation);}
      else {bowLocal.copy(desiredPosition);bowRotation.slerp(desiredRotation,1-Math.exp(-dt*23));}
      bow.position.copy(bowLocal);bow.quaternion.copy(bowRotation);bowInitialized=true;
      root.updateMatrixWorld(true);
      const contact=drawing?bow.worldToLocal(arms[0].hand.localToWorld(new THREE.Vector3(0,-.04,0))):new THREE.Vector3(.06,0,0);
      nock.position.copy(contact);
      stringArms.forEach(arm=>{const direction=contact.clone().sub(arm.position);arm.quaternion.setFromUnitVectors(up,direction.clone().normalize());arm.scale.y=direction.length();});
      arrow.visible=drawing&&stow<.05;arrow.position.copy(contact);
      const arrowDirection=new THREE.Vector3().sub(contact).normalize();
      arrow.quaternion.setFromUnitVectors(forward,arrowDirection);
      bow.userData.stowed=stow>.98;bow.userData.stowProgress=stow;
      initialized=true;
      wings.forEach((wing,i)=>{wing.visible=flight>.01;wing.scale.setScalar(Math.max(.01,flight*1.55));wing.rotation.y=(i===0?-1:1)*(.2+(reduced?0:Math.sin(time*3)*.12));});
    },
    dispose(){
      const geometries=new Set<THREE.BufferGeometry>(),mats=new Set<THREE.Material>();
      root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);if(o instanceof THREE.InstancedMesh)o.dispose();}});
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());faceTexture.dispose();
    },
  };
}
