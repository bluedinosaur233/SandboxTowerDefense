import * as THREE from 'three';

const PALETTE = {
  skin: '#f6d4c0', skinShade: '#e9bbaa', blush: '#edb5a6', white: '#f5f3ed', clothShade: '#dde1df', seam: '#c4cbc8',
  silver: '#b1bac0', silverLight: '#e2e6e6', silverDark: '#828c94', green: '#4b9b86', greenLight: '#79bba3', greenDark: '#2e6d5d',
  hair: '#e6bb68', hairLight: '#f5d28a', hairShade: '#c99b51', hairMid: '#ebc477', leather: '#57524a', leatherLight: '#746d60',
  eye: '#499a7b', eyeLight: '#82c5a3', ink: '#38413c', sole: '#818990', lip: '#b67f71',
};
type Color = keyof typeof PALETTE;
type Section = [y: number, width: number, depth: number, centerX?: number, centerZ?: number];

/** Hand-built geometry matched to aerilia-voxel-final.png. Front is +Z, character's left is +X. */
export function createElfModel() {
  const root = new THREE.Group(); root.name = 'Aerilia · reference sculpture';
  const body = new THREE.Group(); body.name = 'rig'; root.add(body);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const materials = Object.fromEntries(Object.entries(PALETTE).map(([name, color]) => [name, new THREE.MeshStandardMaterial({
    color, roughness: name.startsWith('silver') ? .4 : .85, metalness: name.startsWith('silver') ? .42 : 0,
    flatShading: !['skin','skinShade','white','clothShade'].includes(name),
  })])) as Record<Color, THREE.MeshStandardMaterial>;
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, color: Color) => {
    const mesh = new THREE.Mesh(geo, materials[color]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (p: THREE.Object3D, c: Color, x: number, y: number, z: number, w: number, h: number, d: number, rz = 0) => {
    const m = add(p, cube, c); m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.z = rz; return m;
  };
  const group = (name: string, x=0, y=0, z=0, parent: THREE.Object3D=body) => {
    const g = new THREE.Group(); g.name = name; g.position.set(x,y,z); parent.add(g); return g;
  };
  // Octagonal sections give limbs and armor chamfered edges instead of rectangular sticks.
  const loft = (p: THREE.Object3D, color: Color, rows: Section[], segments=12, pleats=0) => {
    const pos:number[]=[], indices:number[]=[];
    rows.forEach(([y,w,d,cx=0,cz=0],row)=>{
      for(let j=0;j<segments;j++){
        const a=j/segments*Math.PI*2, fold=pleats && j%2 ? 1-pleats : 1;
        pos.push(cx+Math.sin(a)*w/2*fold,y,cz+Math.cos(a)*d/2*fold);
        if(row && j>=0){const a0=(row-1)*segments+j,b0=(row-1)*segments+(j+1)%segments,c0=row*segments+j,d0=row*segments+(j+1)%segments;indices.push(a0,b0,c0,b0,d0,c0);}
      }
    });
    const low=pos.length/3;pos.push(rows[0][3]??0,rows[0][0],rows[0][4]??0);
    const last=rows.at(-1)!;const high=pos.length/3;pos.push(last[3]??0,last[0],last[4]??0);
    for(let j=0;j<segments;j++){indices.push(low,(j+1)%segments,j);const off=(rows.length-1)*segments;indices.push(high,off+j,off+(j+1)%segments);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();return add(p,geo,color);
  };
  const rod=(p:THREE.Object3D,c:Color,from:number[],to:number[],width:number,depth=width)=>{
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),m=add(p,cube,c);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(width,a.distanceTo(b),depth);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m;
  };
  const gem=(p:THREE.Object3D,x:number,y:number,z:number,size:number)=>{
    box(p,'silverLight',x,y,z,size*1.3,size*1.3,.065,Math.PI/4);box(p,'greenDark',x,y,z+.04,size,size,.035,Math.PI/4);box(p,'green',x,y+.012,z+.061,size*.64,size*.64,.018,Math.PI/4);box(p,'white',x-size*.17,y+size*.2,z+.075,size*.18,size*.18,.01);
  };
  // Reference leg silhouette: broad upper stocking, knee inset, calf and short boot.
  for(const s of [-1,1]){
    const leg=group(s<0?'right leg':'left leg',s*.235);
    loft(leg,'skin',[[1.57,.30,.29],[1.82,.35,.32],[1.94,.32,.32]],10);
    loft(leg,'white',[[.62,.23,.24],[.90,.29,.27],[1.08,.245,.25,0,.028],[1.34,.29,.29],[1.64,.335,.31]],12);
    loft(leg,'clothShade',[[1.61,.337,.313],[1.645,.342,.318]],12);
    // Narrow side seam, restrained low-poly knee fold.
    rod(leg,'clothShade',[s*.126,.90,0],[s*.146,1.58,-.015],.009);
    loft(leg,'sole',[[.035,.35,.61,0,.14],[.10,.365,.63,0,.14],[.14,.34,.59,0,.14]],12);
    loft(leg,'white',[[.13,.335,.57,0,.14],[.24,.33,.55,0,.12],[.33,.27,.38,0,.045],[.49,.23,.27,0,0],[.72,.28,.30,0,0]],12);
    loft(leg,'silver',[[.69,.30,.325],[.79,.335,.35],[.83,.32,.34]],8);
    // V-shaped silver front cuff and segmented toe cap.
    rod(leg,'silverLight',[-.14,.795,.153],[0,.69,.205],.052,.025);
    rod(leg,'silverLight',[.14,.795,.153],[0,.69,.205],.052,.025);
    loft(leg,'clothShade',[[.20,.342,.53,0,.15],[.24,.33,.49,0,.15]],10);
    rod(leg,'seam',[-.13,.30,.19],[.10,.35,.15],.014,.012);
    box(leg,'green',s*.177,.66,-.02,.065,.16,.08,s*-.15);
    box(leg,'greenDark',s*.166,.56,-.02,.045,.09,.06,s*.14);
  }
  // Pleats extend down from a narrow waist; each ridge is geometry, not painted stripes.
  const skirt=group('pleated white skirt');
  loft(skirt,'white',[[1.72,1.00,.70],[1.79,.97,.68],[1.96,.85,.60],[2.18,.67,.47],[2.27,.64,.45]],24,.075);
  loft(skirt,'green',[[1.765,1.001,.707],[1.803,.98,.692]],24,.075);
  loft(skirt,'clothShade',[[1.71,1.017,.712],[1.748,1.012,.708]],24,.075);
  // Fitted tunic with broad cloth planes and restrained silver hem tabs.
  loft(body,'white',[[2.23,.62,.43],[2.40,.59,.42],[2.65,.72,.48],[2.85,.76,.44],[2.96,.57,.37]],12);
  for(const s of [-1,1]){
    rod(body,'seam',[s*.16,2.30,.209],[s*.21,2.65,.222],.009,.01);
    const tab=box(body,'silverLight',s*.205,2.22,.23,.20,.22,.045,s*-.23);
    tab.name='silver tunic hem';
    box(body,'white',s*.22,2.25,.263,.13,.19,.025,s*-.23);
  }
  loft(body,'greenDark',[[2.92,.42,.34],[3.07,.40,.32]],8);
  for(const s of [-1,1]) box(body,'green',s*.215,2.96,.092,.11,.19,.21,s*.18);
  gem(body,0,2.885,.264,.10);
  loft(body,'leather',[[2.24,.696,.50],[2.345,.685,.49]],12);
  // Rectangular hollow buckle and keeper loops.
  for(const s of [-1,1]){box(body,'silverLight',s*.075,2.29,.276,.026,.098,.025);box(body,'silverLight',0,2.29+s*.05,.276,.17,.022,.025);box(body,'silver',s*.245,2.29,.237,.031,.113,.031);}
  box(body,'leatherLight',0,2.29,.262,.13,.07,.02);rod(body,'silver',[0,2.29,.299],[.065,2.29,.299],.014);
  // Diagonal quiver harness and secondary sword belt.
  rod(body,'leather',[-.24,2.89,.246],[.24,2.32,.267],.091,.039);
  rod(body,'leatherLight',[-.275,2.86,.269],[.20,2.31,.288],.011,.009);
  for(let i=0;i<4;i++)box(body,'silver',-.14+i*.08,2.76-i*.097,.282,.031,.042,.012,-.68);
  rod(body,'leather',[-.40,2.13,.24],[.23,2.35,.27],.075,.032);
  gem(body,-.31,2.18,.275,.043);
  // Continuous white cape panels with a single green edge, matching the triangular drape.
  const clothPanel=(points:number[][],z:number,color:Color)=>{
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.042,bevelEnabled:false,curveSegments:1});
    const m=add(body,geo,color);m.position.z=z;return m;
  };
  for(const s of [-1,1]){
    clothPanel([[s*.24,2.95],[s*.43,2.89],[s*.70,2.36],[s*.57,2.39],[s*.39,2.53]],.16,'white');
    rod(body,'green',[s*.39,2.53,.207],[s*.57,2.39,.207],.029,.028);
    rod(body,'green',[s*.57,2.39,.207],[s*.70,2.36,.207],.029,.028);
  }
  clothPanel([[-.36,2.91],[.36,2.91],[.52,2.40],[.25,2.36],[0,2.41],[-.25,2.36],[-.52,2.40]],-.40,'white');
  for(const s of [-1,1]){
    rod(body,'green',[0,2.41,-.415],[s*.25,2.36,-.415],.034,.029);
    rod(body,'green',[s*.25,2.36,-.415],[s*.52,2.40,-.415],.034,.029);
  }
  for(const s of [-1,1]){
    const arm=group(s<0?'right arm':'left arm',s*.46,2.77,0);arm.rotation.z=s*.17;
    loft(arm,'white',[[-.58,.205,.23],[-.43,.26,.29],[-.25,.30,.31],[.015,.31,.32]],10);
    // Three overlapping curved pauldron lames.
    for(let i=0;i<3;i++){
      loft(arm,i===2?'silver':'silverLight',[[.13-i*.095,.22+i*.11,.28+i*.08], [.23-i*.095,.20+i*.095,.26+i*.07]],8);
      loft(arm,'silverDark',[[.125-i*.095,.23+i*.11,.29+i*.08],[.14-i*.095,.23+i*.11,.29+i*.08]],8);
    }
    loft(arm,'silver',[[-.76,.22,.255],[-.60,.245,.26],[-.47,.235,.25]],8);
    loft(arm,'silverLight',[[-.80,.25,.28],[-.735,.25,.28]],8);
    rod(arm,'silverLight',[-.05,-.72,.136],[.07,-.49,.126],.023,.018);
    loft(arm,'leather',[[-.98,.21,.21],[-.79,.22,.23]],8);
    box(arm,'skin',0,-1.005,.014,.19,.10,.18);
    for(let finger=0;finger<3;finger++)box(arm,'skin',-.062+finger*.061,-1.045,.078,.046,.077,.088);
    box(arm,'skin',-s*.125,-.936,.052,.067,.135,.10,s*.16);
    box(arm,'silverDark',0,-.846,.13,.18,.036,.017);
  }
  // Rounded/chamfered square face, soft cheeks, short jaw. No giant rectangular chin.
  const head=group('head');head.scale.set(1.18,1.07,1.06);head.position.y=-.21;
  loft(head,'skin',[[2.99,.57,.55,0,.05],[3.06,.74,.65,0,.015],[3.18,.90,.73],[3.53,.94,.77],[3.75,.91,.73],[3.83,.77,.65]],12);
  for(const s of [-1,1]){
    box(head,'skin',s*.34,3.17,.345,.13,.13,.055);
    box(head,'blush',s*.33,3.205,.381,.105,.038,.01);
    // Long horizontal, tapered elf ears in three voxel steps.
    box(head,'skin',s*.535,3.42,-.015,.24,.14,.16,s*.12);
    box(head,'skin',s*.69,3.46,-.04,.13,.10,.13,s*.14);
    box(head,'skin',s*.775,3.48,-.052,.09,.065,.09,s*.12);
    box(head,'blush',s*.55,3.425,.078,.24,.055,.012,s*.12);
    box(head,'blush',s*.706,3.463,.031,.10,.025,.012,s*.12);
    // Large green irises with upper eyelids, small lower highlights, and lashes.
    box(head,'white',s*.222,3.30,.380,.238,.224,.018);
    box(head,'greenDark',s*.215,3.285,.394,.145,.203,.016);
    box(head,'eye',s*.215,3.275,.405,.119,.17,.012);
    box(head,'eyeLight',s*.215,3.218,.413,.116,.044,.012);
    box(head,'ink',s*.215,3.30,.418,.048,.13,.009);
    box(head,'white',s*.19,3.352,.426,.037,.045,.009);
    box(head,'white',s*.25,3.255,.424,.021,.023,.008);
    box(head,'ink',s*.226,3.415,.397,.265,.046,.025,s*-.055);
    box(head,'ink',s*.365,3.427,.393,.058,.040,.023,s*-.19);
    box(head,'hairShade',s*.231,3.507,.372,.235,.025,.026,s*-.04);
  }
  box(head,'skinShade',0,3.213,.393,.038,.047,.026);box(head,'skin',-.008,3.222,.408,.034,.041,.023);
  box(head,'lip',0,3.122,.383,.070,.016,.010);
  // Voxel hair shell: layered crown and side locks, with no stacked helmet bands.
  const hair=group('stepped hair');hair.scale.set(1.18,1.07,1.06);hair.position.y=-.21;
  // Sample a rounded hair mass on a true voxel grid. Only surface cubes are emitted.
  const step=.085;
  const isHair=(ix:number,iy:number,iz:number)=>{
    const x=ix*step,y=3.58+iy*step,z=-.055+iz*step;
    const shell=(x/.56)**2+((y-3.58)/.52)**2+((z+.055)/.49)**2<=1;
    return shell&&(y>3.70||z<-.235||Math.abs(x)>.42&&y>3.13);
  };
  for(let iy=-6;iy<=6;iy++)for(let ix=-7;ix<=7;ix++)for(let iz=-6;iz<=6;iz++){
    if(!isHair(ix,iy,iz))continue;
    if([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].every(([dx,dy,dz])=>isHair(ix+dx,iy+dy,iz+dz)))continue;
    const hash=Math.abs(ix*17+iy*31+iz*13)%11;
    const c:Color=hash===0?'hairLight':hash<4?'hairMid':'hair';
    box(hair,c,ix*step,3.58+iy*step,-.055+iz*step,step,step,step);
  }
  for(const s of [-1,1]){
    for(let i=0;i<12;i++){
      const y=3.75-i*.062,x=s*(.414+(i<4?.04:i>8?-.035:0));
      box(hair,i%4===0?'hairMid':'hairLight',x,y,.357,.115-(i>9?.04:0),.072,.155);
    }
  }
  // Individually stepped bangs follow the asymmetric reference, opening the eyes.
  const fringe=[[-.35,.35],[-.24,.40],[-.12,.28],[0,.49],[.12,.43],[.24,.30],[.34,.32]];
  fringe.forEach(([x,length],n)=>{
    const levels=Math.round(length/.055);
    for(let i=0;i<levels;i++){
      const taper=i>=levels-2?.7:1;
      box(hair,n%3===0?'hairMid':'hairLight',x+(n<3?-.006:n>3?.006:0)*i,3.83-i*.055,.407+i*.008,.135*taper,.065,.135);
    }
  });
  // High ponytail arches over the tie, then drops in a thick curved taper below the shoulders.
  const ponytail=group('high ponytail',0,4.075,-.35);
  for(let i=0;i<6;i++)box(ponytail,i<3?'hair':'hairLight',-.04,i*.055,-.04-i*.026,.42-i*.015,.068,.36);
  const ribbon=group('green ribbon',0,-.16,-.11,ponytail);
  for(const s of [-1,1]){
    box(ribbon,'greenDark',s*.20,.09,.66,.235,.22,.13,s*-.09);
    box(ribbon,'green',s*.21,.125,.725,.20,.155,.045,s*-.09);
    box(ribbon,'greenLight',s*.20,.17,.75,.14,.029,.016);
    box(ribbon,'green',s*.105,-.05,.67,.105,.20,.066,s*.28);
  }
  box(ribbon,'greenLight',0,.09,.75,.13,.125,.07);
  for(let row=0;row<29;row++){
    const t=row/28,y=.21-row*.07,z=-.12-Math.sin(t*Math.PI*.8)*.21,width=.56+Math.sin(t*Math.PI)*.16-t*.21;
    for(let strip=0;strip<5;strip++){
      const xx=(strip-2)*width/5,bulge=1-Math.abs(strip-2)/3;
      box(ponytail,strip===0?'hairShade':strip===2?'hairLight':strip%2?'hairMid':'hair',xx-.56*Math.sin(t*Math.PI*.7),y,z-bulge*.09,width/5+.004,.081,.22+bulge*.14);
    }
  }
  // Quiver and individually fletched arrows, off-centre so the back remains readable.
  const quiver=group('quiver',.42,2.66,-.40);quiver.rotation.z=-.28;
  loft(quiver,'leather',[[-.66,.25,.22],[-.51,.28,.26],[.13,.31,.28]],8);
  for(const y of [-.48,-.04,.13])loft(quiver,'silverDark',[[y,.32,.29],[y+.06,.32,.29]],8);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.085,y=.46+(i%2)*.06;
    rod(quiver,'hairShade',[x,-.04,0],[x,y+.11,0],.023);
    box(quiver,'white',x,y,0,.057,.16,.04,-.08);
    box(quiver,'green',x+.031,y-.025,.009,.034,.12,.043,-.14);
    box(quiver,'silverLight',x,y+.10,0,.031,.05,.03);
  }
  // Bow bends in the frontal plane, so its recurve silhouette is visible from the front.
  const bow=group('silver ash recurve bow',.78,1.83,.07);
  const bowPoints=[[.06,-1.02],[.02,-.88],[.12,-.67],[.19,-.40],[.10,-.16],[0,0],[.10,.19],[.19,.43],[.12,.71],[.02,.91],[.06,1.07]];
  for(let i=0;i<bowPoints.length-1;i++){
    const [x,y]=bowPoints[i],[xx,yy]=bowPoints[i+1];rod(bow,i<2||i>7?'silverDark':i%3===0?'hairShade':'hairMid',[x,y,0],[xx,yy,0],.059,.061);
    if(i===2||i===7)box(bow,'green',x,y,.044,.038,.09,.018,-.3);
  }
  box(bow,'leather',.019,0,.018,.09,.20,.09);
  for(let i=0;i<5;i++)box(bow,'leatherLight',.019,-.08+i*.04,.065,.085,.009,.016);
  rod(bow,'silverDark',[.06,-1.02,-.01],[.06,1.07,-.01],.008);
  for(const y of [-.83,.87])box(bow,'silverLight',.045,y,.034,.11,.06,.07,-.25);
  // Slim sheathed rapier: recognizable swept guard, grip winding, metal scabbard tip.
  const rapier=group('rapier',-.42,2.29,.25);rapier.rotation.z=-.29;
  rod(rapier,'leather',[0,-.02,0],[0,-.86,0],.072,.072);
  for(const y of [-.12,-.52,-.83])box(rapier,'silver',0,y,0,.09,.064,.087);
  loft(rapier,'silverLight',[[-.96,.018,.018],[-.83,.085,.08]],6);
  rod(rapier,'silverLight',[-.16,.005,0],[.16,.005,0],.032);
  rod(rapier,'silver',[-.13,.01,0],[-.13,.18,.04],.022);
  rod(rapier,'silver',[-.13,.18,.04],[-.035,.25,.035],.022);
  box(rapier,'greenDark',0,.14,0,.075,.22,.075);
  for(let i=0;i<5;i++)box(rapier,'silver',0,.05+i*.042,.042,.075,.013,.013,.16);
  box(rapier,'silverLight',0,.282,0,.112,.07,.105);
  // Connected feather ribbons made from adjacent cubes; no detached floating rectangles.
  const wings:THREE.Group[]=[];
  const wingMaterial=new THREE.MeshStandardMaterial({color:'#b6edda',emissive:'#509e85',emissiveIntensity:.16,transparent:true,opacity:.64,depthWrite:false,roughness:.6,side:THREE.DoubleSide});
  for(const s of [-1,1]){
    const wing=group(s<0?'right magic wing':'left magic wing',s*.33,2.79,-.43);wings.push(wing);
    for(let feather=0;feather<4;feather++){
      const count=11-feather;
      for(let step=0;step<count;step++){
        const t=step/(count-1),m=new THREE.Mesh(cube,wingMaterial);
        m.position.set(s*(.05+step*.065),-.18*feather+t*(.40-feather*.025),-.12-feather*.018);
        m.scale.set(.079,.13*(1-t*.30),.039);wing.add(m);
      }
    }
    for(let i=0;i<7;i++){const m=new THREE.Mesh(cube,wingMaterial);m.position.set(s*(.04+i*.032),-.32+i*.065,-.13);m.scale.set(.078,.08,.046);wing.add(m);}
  }
  // Freeze static geometry per articulated group into a handful of draw calls.
  // The source parts remain readable above; batching avoids hundreds of shadow draw calls.
  const batch=(parent:THREE.Group)=>{
    const byMaterial=new Map<THREE.Material,THREE.Mesh[]>();
    for(const child of [...parent.children])if(child instanceof THREE.Mesh){const mat=child.material as THREE.Material;const list=byMaterial.get(mat)??[];list.push(child);byMaterial.set(mat,list);}else if(child instanceof THREE.Group)batch(child);
    for(const [mat,meshes] of byMaterial){
      const cubes=meshes.filter(m=>m.geometry===cube);if(cubes.length<2)continue;
      const inst=new THREE.InstancedMesh(cube,mat,cubes.length);inst.castShadow=!(mat instanceof THREE.MeshStandardMaterial&&mat.transparent);inst.receiveShadow=true;
      cubes.forEach((m,i)=>{m.updateMatrix();inst.setMatrixAt(i,m.matrix);parent.remove(m);});inst.computeBoundingSphere();parent.add(inst);
    }
  };batch(body);
  let flight=0;
  return {root,animate(time:number,flying:boolean,dt:number,reduced=false){
    flight=reduced?Number(flying):THREE.MathUtils.damp(flight,Number(flying),5,dt);
    body.position.y=flight*.35+(reduced?0:Math.sin(time*1.8)*.012);
    ponytail.rotation.x=reduced?0:Math.sin(time*1.7)*.024+flight*.13;
    wings.forEach((wing,i)=>{wing.scale.setScalar(1+flight*.65);wing.rotation.y=(i===0?-1:1)*(flight*(reduced?0:Math.sin(time*3)*.12));});
  }};
}
