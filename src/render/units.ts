import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ENEMIES, type EnemyKind } from '../simulation/enemies';
import type { BarracksBranch } from '../simulation/barracks';

// Bake colored blocks per joint, then share prototypes: detail does not cost one draw per voxel.
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,flatShading:true});
const prototypes=new Map<string,THREE.Group>();
const block=new THREE.BoxGeometry(1,1,1);
function box(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:string,rz=0){
  const geo=block.clone(),m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,rz)),new THREE.Vector3(w,h,d));
  geo.applyMatrix4(m);const c=new THREE.Color(color),n=geo.getAttribute('position').count,colors=new Float32Array(n*3);
  for(let i=0;i<n;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));(g.userData.blocks??=[]).push(geo);
}
function part(g:THREE.Group,name:string,x:number,y:number,z:number){const p=new THREE.Group();p.name=name;p.position.set(x,y,z);g.add(p);return p;}
function finish(g:THREE.Group){
  for(const child of [...g.children])if(child instanceof THREE.Group)finish(child);
  const blocks=g.userData.blocks as THREE.BufferGeometry[]|undefined;
  if(blocks?.length){const geo=mergeGeometries(blocks);blocks.forEach(b=>b.dispose());const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);delete g.userData.blocks;}
}
function blade(arm:THREE.Group,color='#d9e1db',length=.55){
  box(arm,0,-.28,.19,.07,.18,.09,'#63452c');box(arm,0,-.18,.19,.26,.05,.11,'#c8ab68');
  box(arm,0,length/2-.15,.19,.1,length,.055,color);box(arm,0,length-.13,.19,.06,.12,.045,color);
  box(arm,.026,length/2-.15,.224,.025,length*.85,.016,'#f4f3df');
}
function shield(arm:THREE.Group,color:string,large=false){
  const w=large?.39:.27,h=large?.52:.36;
  box(arm,0,-.15,.2,w,h,.095,'#9ca8a4');box(arm,0,-.15,.255,w-.055,h-.05,.035,color);
  box(arm,0,-.15,.278,.047,h-.06,.018,'#e2c979');box(arm,0,-.12,.281,w-.04,.045,.02,'#e2c979');
  box(arm,0,-.15-h/2,.2,w*.62,.1,.085,'#9ca8a4');
}
/** Four equipment sets from docs/art/refresh-2026-09/soldiers.png. */
function makeSoldier(level:number,branch?:BarracksBranch){
  const g=new THREE.Group();g.userData={kind:'soldier',level,branch};
  const spell=branch==='spellblade',holy=branch==='paladin',armored=level>=2;
  const cloth=spell?'#334c99':holy?'#f3efdc':'#237c80',capeColor=spell?'#4e348b':cloth;
  const trim=holy?'#d4ae50':armored?'#aabfc9':'#737f86',metal=holy?'#e1e4dc':'#b4c6cf',skin='#e5b98c';
  const body=part(g,'body',0,-.35,0),legH=.38,shoulder=.72;
  for(const sign of [-1,1]){
    const leg=part(body,sign<0?'leg-left':'leg-right',sign*.105,legH,0);
    box(leg,0,-.14,0,.137,.28,.15,armored?'#637786':'#695c47');
    box(leg,0,-.245,.006,.16,.17,.17,armored?metal:'#5c3c28');
    box(leg,0,-.345,.045,.173,.08,.235,armored?trim:'#493021');
    box(leg,0,-.18,.098,.143,.09,.035,armored?metal:'#745031');
    if(armored){box(leg,0,-.29,.1,.065,.1,.025,trim);box(leg,0,-.35,.165,.11,.06,.032,metal);}
  }
  box(body,0,.555,0,.335,.34,.24,cloth);
  box(body,0,.43,.01,.375,.14,.28,cloth);
  for(const sign of [-1,1]){box(body,sign*.15,.405,.032,.1,.18,.24,cloth,sign*.08);if(armored)box(body,sign*.178,.445,.08,.073,.15,.18,metal,sign*.1);}
  box(body,0,.476,.013,.371,.062,.274,'#513b2b');box(body,0,.476,.16,.085,.07,.025,trim);box(body,0,.476,.177,.035,.03,.009,'#523a28');
  if(armored){
    box(body,0,.65,.13,.29,.17,.034,metal);box(body,0,.567,.15,.19,.29,.035,cloth);
    box(body,0,.614,.178,.027,.15,.012,holy?'#d4ae50':'#bbd9da');box(body,0,.636,.18,.11,.027,.013,holy?'#d4ae50':'#bbd9da');
  }else{
    for(const sign of [-1,1])box(body,sign*.032,.6,.139,.035,.29,.025,'#835d37',sign*.76);
  }
  if(armored){
    // Three stepped folds leave room for the walking legs.
    for(let i=-1;i<=1;i++)box(body,i*.103,.47,-.163-Math.abs(i)*.013,.106,.53-Math.abs(i)*.04,.036,capeColor);
    for(const x of [-.17,.17])box(body,x,.47,-.18,.018,.5,.018,trim);
    box(body,0,.7,-.166,.33,.09,.06,capeColor);box(body,0,.52,-.2,.055,.14,.014,holy?'#d4ae50':spell?'#b09be5':'#96c5c9',.7);
  }
  const head=part(body,'head',0,.93,.002);
  box(head,0,0,0,.3,.25,.24,skin);box(head,0,-.131,.025,.23,.045,.204,skin);
  box(head,0,.045,-.076,.322,.22,.12,'#614126');
  for(const sign of [-1,1]){
    box(head,sign*.156,-.047,.005,.045,.082,.055,skin);
    box(head,sign*.086,-.025,.124,.047,.055,.019,'#f7edd7');box(head,sign*.078,-.028,.136,.024,.049,.009,spell?'#474987':'#37362d');
    box(head,sign*.085,.012,.139,.057,.018,.012,'#67462e');
    box(head,sign*.131,.024,.118,.037,.098,.036,'#755134');
  }
  box(head,0,-.062,.139,.03,.035,.033,'#d79c70');box(head,0,-.11,.133,.066,.012,.008,'#92674f');
  // A stepped helmet cap, visible cheek guards and narrow brow retain the face.
  box(head,0,.102,-.007,.348,.075,.288,trim);box(head,0,.164,-.026,.294,.055,.251,metal);
  box(head,0,.205,-.038,.208,.04,.19,metal);box(head,0,.18,-.024,.032,.095,.26,trim);
  if(armored)for(const sign of [-1,1]){box(head,sign*.162,-.033,-.025,.047,.178,.195,metal);box(head,sign*.134,-.105,.086,.055,.09,.057,metal);}
  if(holy){
    box(head,0,-.027,.145,.265,.182,.036,metal);box(head,0,.008,.171,.248,.044,.015,'#23313a');
    box(head,0,-.017,.183,.034,.21,.027,trim);box(head,0,.102,.164,.303,.028,.025,trim);box(head,0,-.12,.156,.245,.026,.025,trim);
    box(head,0,.241,-.03,.048,.12,.14,trim);
  }else if(spell){
    for(const sign of [-1,1]){box(head,sign*.13,.165,-.04,.065,.21,.073,metal,sign*.3);box(head,sign*.16,.14,-.023,.026,.09,.055,'#6b6ca6');}
    box(head,0,.105,.15,.067,.095,.025,'#af8eec',.55);
  }else if(armored){for(let i=0;i<4;i++)box(head,0,.26-i*.028,-.035-i*.05,.085,.09,.08,i%2?'#286f7c':'#36949d');}
  const arms=[part(body,'arm-left',-.25,shoulder,0),part(body,'arm-right',.25,shoulder,0)];
  for(const arm of arms){
    box(arm,0,-.087,0,.129,.2,.155,cloth);box(arm,0,-.23,.012,.106,.13,.12,skin);
    box(arm,0,-.29,.042,.11,.08,.127,armored?'#606d80':skin);
    if(armored){box(arm,0,-.184,0,.14,.11,.153,metal);box(arm,0,.033,0,.215,.08,.231,trim);box(arm,0,.079,-.01,.177,.062,.204,metal);box(arm,0,.117,-.022,.113,.027,.154,metal);}
    else {box(arm,0,-.015,0,.16,.12,.189,cloth);box(arm,0,-.2,0,.116,.05,.135,'#62452d');}
  }
  const sword=part(arms[1],'sword',0,-.27,.08),bladeLength=spell?.64:armored?.55:.45;
  sword.rotation.z=-2.24;sword.rotation.x=.12;
  box(sword,0,0,0,.055,.12,.055,'#5b4030');box(sword,0,.07,0,.2,.039,.08,trim);
  box(sword,0,.08+bladeLength/2,0,.083,bladeLength,.042,spell?'#817bdf':'#c5d3dc');
  box(sword,.025,.08+bladeLength/2,.024,.023,bladeLength,.012,'#eff2df');
  box(sword,0,.09+bladeLength,0,.047,.075,.037,spell?'#bcb4ff':'#dce6e6');
  if(spell){
    box(sword,0,.39,.03,.031,.54,.015,'#b595ff');box(sword,0,.39,.039,.011,.49,.008,'#e0dcff');
    box(arms[0],0,-.25,.16,.116,.049,.17,skin);box(arms[0],0,-.13,.218,.116,.117,.113,'#9072e4',.65);box(arms[0],0,-.125,.28,.055,.06,.018,'#c4efff');
    for(const sign of [-1,1])box(arms[0],sign*.09,-.07+sign*.045,.18,.035,.037,.036,'#798ae2',.3);
    box(body,.195,.4,.13,.104,.154,.055,'#513788');box(body,.195,.4,.16,.068,.123,.014,'#8b68af');box(body,.195,.4,.174,.025,.043,.011,'#d8ba81');
    box(body,0,.65,.2,.08,.08,.028,'#a48de6',.8);
  }else{
    const arm=arms[0],w=holy?.36:armored?.31:.26,h=holy?.49:armored?.46:.36;
    box(arm,0,-.16,.205,w,h,.067,holy?trim:armored?metal:'#634324');
    box(arm,0,-.16,.247,w-.043,h-.035,.025,holy?'#f3ead3':cloth);
    box(arm,0,-.16-h/2,.205,w*.66,.081,.065,holy?trim:metal);
    for(const x of [-w/2,w/2])box(arm,x,-.16,.226,.026,h,.065,holy?trim:metal);
    if(holy){box(arm,0,-.14,.272,.102,.103,.024,trim,.78);for(const sign of [-1,1]){box(arm,sign*.095,-.14,.272,.061,.025,.019,trim);box(arm,0,-.14+sign*.105,.272,.026,.065,.019,trim);}}
    else {box(arm,0,-.14,.272,.03,h*.51,.015,'#d0e1db');box(arm,0,-.1,.273,w*.46,.025,.016,'#d0e1db');}
  }
  finish(g);return g;
}

function make(kind:string,level:number,branch?:BarracksBranch){
  if(kind==='soldier')return makeSoldier(level,branch);
  const requestedKind=kind,definition=ENEMIES[kind as EnemyKind];kind=definition?.base??kind;
  const elite=definition?.rank==='elite',boss=definition?.rank==='boss';
  const g=new THREE.Group();g.userData.kind=requestedKind;g.userData.level=level;g.userData.branch=branch;
  const friend=kind==='soldier',brute=kind==='brute',dwarf=kind==='ironclad',rune=kind==='runeguard',frog=kind==='marshling',wolf=kind==='runner',hex=kind==='hexer',garg=kind==='gargoyle';
  const height=friend?1.13:brute?1.7:rune?1.52:hex?1.4:wolf?1.17:dwarf?.98:frog?.93:garg?1.15:.85;
  const width=brute?.72:dwarf?.56:rune?.55:frog?.45:garg?.48:friend?.4:.33;
  const skin=requestedKind==='alpha'?'#b7bec2':boss?'#81805a':friend?'#e0bd96':brute?'#819169':dwarf?'#bba09a':rune?'#777484':frog?'#52a994':wolf?'#b69169':hex?'#dccfbb':garg?'#8995a6':'#8dac61';
  const cloth=elite||boss?'#303e4b':friend?(branch==='spellblade'?'#3f427c':branch==='paladin'?'#eee6cf':level===1?'#477c88':'#3b6978'):brute?'#665547':dwarf?'#526572':rune?'#514962':frog?'#42645c':wolf?'#765544':hex?'#5a3e60':garg?'#5a697e':'#725940';
  const metal=friend?(branch==='paladin'?'#d6dcd4':level===1?'#818e8a':'#b7c6c9'):'#8f9a99';
  const legH=height*(dwarf?.26:frog?.28:.34),bodyH=height*.31,shoulder=legH+bodyH*.86;
  const body=part(g,'body',0,-.35,0);
  for(const sign of [-1,1]){
    const leg=part(body,sign<0?'leg-left':'leg-right',sign*width*.24,legH,0);
    box(leg,0,-legH*.42,0,width*.32,legH*.86,width*.36,hex?cloth:friend?metal:cloth);
    box(leg,0,-legH+.08,.055,width*.37,.16,width*.54,friend?'#454b45':skin);
    if(frog)for(const dx of [-.055,0,.055])box(leg,dx,-legH+.035,.19,.055,.065,.19,'#82b99b');
    if(wolf||garg)for(const dx of [-.065,0,.065])box(leg,dx,-legH+.06,.17,.035,.045,.1,'#e2d3ad');
  }
  box(body,0,legH+bodyH*.43,0,width,bodyH,width*.68,cloth);
  box(body,0,legH+.06,.01,width*1.08,.1,width*.74,'#514a3c');box(body,0,legH+.065,width*.4,.11,.085,.045,'#c7a568');
  const arms=[part(body,'arm-left',-width*.65,shoulder,0),part(body,'arm-right',width*.65,shoulder,0)];
  for(const a of arms){box(a,0,-bodyH*.35,0,width*.28,bodyH*.75,width*.32,friend?cloth:skin);box(a,0,-bodyH*.73,.03,width*.29,.12,width*.34,skin);}
  const head=part(body,'head',0,legH+bodyH+height*.14,0),headW=width*(brute?.66:dwarf?.78:1.05),headH=height*.24;
  box(head,0,0,0,headW,headH*.8,headW*.8,skin);box(head,0,-headH*.43,.015,headW*.73,headH*.2,headW*.72,skin);
  for(const sign of [-1,1]){box(head,sign*headW*.25,.01,headW*.405,.075,.05,.025,rune?'#d9a7ff':garg?'#ffd879':'#27392e');box(head,sign*headW*.23,.025,headW*.425,.025,.025,.012,'#fff2be');}
  if(kind==='goblin'){
    for(const sign of [-1,1]){box(head,sign*.25,.015,0,.18,.1,.09,skin,sign*.27);box(head,sign*.18,.035,.02,.08,.075,.065,'#a1bc77');}
    box(head,0,-.035,.18,.12,.09,.12,'#819953');box(head,0,.14,-.02,.25,.1,.22,'#554f39');
    blade(arms[1],'#b3b6a1',.28);shield(arms[0],'#80613d');
    box(body,0,legH+bodyH*.58,.12,.08,.24,.04,'#b99868',-.5);
  }else if(wolf){
    box(head,0,-.03,.19,.2,.12,.2,elite?'#e2e4df':'#d1b18a');box(head,0,-.015,.3,.11,.065,.05,'#354039');
    for(const sign of [-1,1]){box(head,sign*.16,.15,-.025,.12,.2,.12,skin,sign*-.25);box(head,sign*.16,.17,.035,.055,.12,.025,'#775e53');}
    const tail=part(body,'tail',0,legH+.14,-.16);box(tail,0,-.035,-.24,.15,.17,.42,skin);box(tail,0,-.015,-.44,.13,.15,.13,'#e6cfaa');
    if(!elite)for(const a of arms)blade(a,'#c9c9b8',.28);
    box(body,0,shoulder,-.07,width*1.2,.1,.35,'#ceb08a');
  }else if(brute){
    box(body,0,shoulder-.1,.06,.63,.26,.39,skin);
    box(arms[0],0,.02,0,.34,.15,.4,'#727b77');for(const dx of [-.08,.08])box(arms[0],dx,.15,0,.07,.16,.08,'#d5ccb4');
    for(const sign of [-1,1]){box(head,sign*.12,-.17,.22,.065,.17,.075,'#e6dcc0',sign*.12);box(head,sign*.13,.06,.22,.14,.055,.055,'#576341');}
    if(!boss){box(arms[1],0,-.03,.22,.075,.9,.08,'#765234');box(arms[1],0,.43,.22,.51,.32,.33,'#828884');box(arms[1],0,.44,.22,.15,.37,.38,'#b4b7a3');}
    box(body,0,legH+bodyH*.24,.26,.2,.24,.05,'#784439');
  }else if(dwarf){
    box(body,0,legH+bodyH*.52,.08,.57,.33,.37,'#7e929a');
    for(const a of arms)box(a,0,.03,0,.24,.16,.31,'#acb9b9');
    box(head,0,.09,0,.46,.18,.41,'#9caeaf');box(head,0,-.015,.18,.43,.1,.055,'#657781');box(head,0,.01,.211,.27,.035,.015,'#dbb478');
    for(let i=0;i<3;i++)box(head,(i-1)*.08,-.18,.15,.075,.24-Math.abs(i-1)*.06,.1,'#9f674b');
    shield(arms[0],'#4a6474',true);if(!elite)blade(arms[1],'#c1cdcb',.4);
    box(head,0,.21,-.01,.075,.1,.32,'#d1b76f');
  }else if(rune){
    for(const a of arms){box(a,0,-.03,0,.29,.26,.28,'#706a84');box(a,0,-.26,.04,.22,.18,.24,'#9a8bb6');}
    box(body,0,legH+bodyH*.55,.22,.18,.25,.065,'#c695f7',Math.PI/4);box(body,0,legH+bodyH*.54,.268,.06,.15,.02,'#e6c6ff');
    for(const sign of [-1,1])box(head,sign*.19,.17,0,.13,.32,.13,'#b19ace',sign*.35);
    box(head,0,.06,.21,.2,.06,.04,'#e3b1ff');
    if(!elite)box(arms[1],0,.22,.18,.15,.58,.12,'#b3a0d6');
  }else if(frog){
    box(head,0,-.02,.12,.43,.13,.34,'#78b9a0');
    for(const sign of [-1,1]){box(head,sign*.17,.1,.13,.14,.16,.14,skin);box(head,sign*.17,.115,.212,.095,.055,.02,'#e8d37b');box(head,sign*.17,.115,.226,.025,.055,.012,'#283b32');}
    box(head,0,-.06,.298,.31,.025,.02,'#345e4b');
    const tail=part(body,'tail',0,legH,-.17);for(let i=0;i<3;i++)box(tail,0,-i*.05,-.11-i*.16,.19-i*.04,.16-i*.03,.22,skin);
    box(arms[1],0,.03,.17,.045,.85,.045,'#8e7748');for(const dx of [-.09,0,.09])box(arms[1],dx,.47,.17,.04,.21,.045,'#d6dcc0');box(arms[1],0,.38,.17,.24,.045,.045,'#a9bda0');
    for(const a of arms)box(a,0,.035,-.01,.14,.12,.18,'#8cbca5');
  }else if(hex){
    for(let i=0;i<4;i++)box(body,0,.12+i*.13,0,.56-i*.045,.15,.47-i*.035,cloth);
    box(head,0,.07,-.05,.44,.35,.42,cloth);box(head,0,.27,-.07,.3,.12,.27,cloth);
    box(head,0,-.015,.19,.26,.24,.035,'#e7dcbf');for(const sign of [-1,1])box(head,sign*.065,.01,.215,.06,.055,.02,'#593a51');
    box(head,0,-.1,.218,.055,.055,.02,'#79565f');
    box(arms[1],0,.14,.16,.065,1.13,.065,'#785442');box(arms[1],0,.72,.16,.18,.22,.18,'#dc8cba',.65);
    for(const sign of [-1,1])box(head,sign*.22,.2,-.03,.055,.25,.06,'#d8cbb0',sign*.55);
    box(body,0,legH+.18,.23,.06,.45,.022,'#c89465');
  }else if(garg){
    for(const sign of [-1,1]){box(head,sign*.15,.2,-.02,.075,.26,.085,'#a4afbc',sign*.35);box(head,sign*.085,-.1,.2,.045,.13,.04,'#d9dfdd');
      const wing=part(body,sign<0?'wing-left':'wing-right',sign*.2,shoulder,-.12);
      for(let i=0;i<5;i++){box(wing,sign*(.15+i*.16),.12+i*.035,-.04-i*.05,.2,.09,.42-i*.055,'#738096');box(wing,sign*(.16+i*.16),-.04-i*.055,-.04-i*.05,.18,.29-i*.025,.055,i%2?'#55667d':'#677891');}
    }
    const tail=part(body,'tail',0,legH+.07,-.19);box(tail,0,-.1,-.22,.1,.1,.4,'#738096');box(tail,0,-.08,-.43,.18,.15,.1,'#97a1ae',.7);
  }
  // Readable silhouettes and equipment from the generated elite-vanguard reference.
  if(requestedKind==='alpha'){
    box(body,0,shoulder+.015,.05,.49,.13,.38,'#8b302b');
    box(body,.11,shoulder-.12,.22,.19,.29,.045,'#b14836',-.3);
    for(const sign of [-1,1]){
      box(head,sign*.19,-.02,.1,.14,.2,.2,'#d8dedb',sign*.3);
      box(head,sign*.09,.025,.19,.085,.06,.035,'#d6a34e');
      box(arms[sign===-1?0:1],0,.02,0,.23,.14,.24,'#303c47');
      const knife=part(arms[sign===-1?0:1],'hunting blade',0,-bodyH*.73,.06);knife.rotation.z=-sign*2.4;
      box(knife,0,0,0,.055,.14,.065,'#69513a');box(knife,0,.10,0,.20,.035,.075,'#c5a763');box(knife,0,.32,0,.085,.41,.042,'#d7dddf');box(knife,0,.55,0,.045,.08,.04,'#eff3e4');
      box(head,sign*.09,.065,.21,.11,.035,.035,'#69777d',sign*.20);
      box(head,sign*.17,.20,.031,.055,.13,.025,'#bba7a2',-sign*.25);
      box(head,sign*.18,-.10,.13,.10,.095,.11,'#f0eee5',sign*.28);
      box(body,sign*.13,shoulder-.18,.15,.033,.29,.033,'#b19663',sign*.7);
    }
    for(let i=0;i<3;i++)box(body,(i-1)*.10,shoulder-.18,-.2,.105,.42-Math.abs(i-1)*.06,.06,'#8b302b');
  }else if(requestedKind==='bulwark'){
    box(body,0,legH+bodyH*.52,.27,.48,.31,.045,'#283e53');
    for(const a of arms){box(a,0,.10,0,.31,.16,.34,'#bd954f');box(a,0,.13,.018,.25,.14,.31,'#334757');}
    for(let i=0;i<5;i++)box(head,(i-2)*.065,-.19,.24,.07,.29-Math.abs(i-2)*.025,.13,i%2?'#aa612b':'#c67d31');
    box(head,0,.25,0,.09,.29,.21,'#d6ae58');
    box(arms[0],0,-.13,.34,.44,.82,.13,'#bc9655');box(arms[0],0,-.13,.416,.37,.73,.036,'#2c4154');
    for(const x of [-.17,.17])for(const y of [-.42,-.13,.17])box(arms[0],x,y,.45,.05,.05,.028,'#dfbf78');
    const mace=part(arms[1],'mace',0,-bodyH*.73,.06);mace.rotation.z=-2.1;
    box(mace,0,.15,0,.065,.45,.065,'#6d5338');box(mace,0,.38,0,.23,.22,.23,'#8a9da5');
    for(const x of [-.14,.14])box(mace,x,.38,0,.07,.09,.08,'#c8d7d5');
    box(head,0,.085,.208,.45,.045,.05,'#c3a568');
    for(const sign of [-1,1]){box(head,sign*.14,-.015,.21,.055,.105,.045,'#263d49');box(head,sign*.07,-.03,.224,.052,.035,.024,'#e9bd7b');}
    for(const leg of [body.getObjectByName('leg-left'),body.getObjectByName('leg-right')])if(leg instanceof THREE.Group){box(leg,0,-legH*.35,.14,.18,.11,.04,'#c19b59');box(leg,0,-legH+.09,.13,.20,.15,.15,'#354b59');}
    for(const a of arms)for(const x of [-.10,.10])box(a,x,.07,.18,.038,.038,.035,'#e0b967');
    box(body,0,.4,-.26,.46,.58,.065,'#84382f');
  }else if(requestedKind==='runecolossus'){
    for(const sign of [-1,1]){
      const arm=arms[sign===-1?0:1];
      for(let i=0;i<3;i++)box(arm,sign*(.025+i*.09),.16+i*.025,-i*.05,.12,.32-i*.04,.16,i%2?'#b773eb':'#8060c9',-sign*(.12+i*.22));
      box(arm,0,-.12,.19,.29,.085,.045,'#c6a2fb');
      box(head,sign*.095,.015,.24,.082,.055,.028,'#dfb2ff');
    }
    box(body,0,legH+bodyH*.54,.30,.23,.28,.11,'#ac6fe9',.78);
    const crystalHammer=part(arms[1],'crystal hammer',0,-bodyH*.73,.05);crystalHammer.rotation.z=-2.1;
    box(crystalHammer,0,.18,0,.075,.40,.085,'#6e5f8f');box(crystalHammer,0,.42,0,.30,.33,.30,'#8555bf',.3);box(crystalHammer,.08,.43,.16,.14,.24,.06,'#d195ff',.4);
    for(const sign of [-1,1]){box(head,sign*.13,.02,.23,.08,.24,.045,'#514b69');box(head,sign*.10,.13,.23,.13,.06,.035,'#9184a6',sign*.2);}
    for(const leg of [body.getObjectByName('leg-left'),body.getObjectByName('leg-right')])if(leg instanceof THREE.Group){box(leg,0,-legH*.28,.14,.19,.18,.1,'#817292');box(leg,0,-legH+.13,.14,.22,.22,.12,'#6c6282');box(leg,0,-legH*.28,.2,.055,.10,.02,'#b799df');}
    for(const a of arms)for(let i=-1;i<=1;i++)box(a,i*.08,-.115,.22,.025,.055,.025,'#ead0ff');
  }else if(boss){
    box(body,0,shoulder-.14,.24,.68,.30,.17,'#30363a');
    for(const a of arms){box(a,0,.05,0,.44,.20,.46,'#9b7945');box(a,0,.12,.01,.38,.19,.43,'#33383c');for(const x of [-.13,.13])box(a,x,.30,0,.095,.29,.11,'#ba9759',-x*2);}
    box(head,0,.18,.035,.53,.12,.46,'#ad8746');
    for(let i=-2;i<=2;i++)box(head,i*.10,.3+(i===-1?-.08:0),.24,.072,.23+(i===1?.1:0),.074,'#d9b464',i*.08);
    for(const sign of [-1,1]){box(head,sign*.16,-.17,.29,.075,.24,.085,'#eadbb3',sign*.2);box(head,sign*.12,.025,.225,.078,.048,.031,'#f2ad4d');}
    box(body,0,shoulder+.50,-.31,.055,1.18,.065,'#9d794c');box(body,0,shoulder+1.03,-.31,.91,.07,.07,'#bd9a5b');
    for(let i=-2;i<=2;i++)box(body,i*.145,shoulder+.64,-.34,.15,.69-Math.abs(i)*.09,.055,i%2?'#86362c':'#9e402d');
    box(body,0,shoulder+.68,-.378,.12,.22,.018,'#c4a366');
    box(arms[0],0,-.26,.34,.53,.94,.14,'#a08050');box(arms[0],0,-.26,.426,.44,.85,.055,'#303738');
    for(const y of [-.6,-.27,.08])box(arms[0],0,y,.47,.32,.07,.035,'#b39153');
    const hammer=part(arms[1],'siege hammer',0,-bodyH*.73,.07);hammer.rotation.z=-2.05;
    box(hammer,0,.19,0,.09,.70,.09,'#765536');box(hammer,0,.55,0,.59,.43,.43,'#393733');
    box(hammer,0,.55,.23,.35,.31,.055,'#bb6c24');box(hammer,0,.55,.265,.19,.22,.03,'#ffd071',.65);
    for(const sign of [-1,1]){box(hammer,sign*.24,.55,0,.075,.48,.47,'#aa864c');
      box(head,sign*.18,-.035,.13,.09,.31,.20,'#384037');box(head,sign*.12,.085,.25,.14,.055,.04,'#525742',sign*.14);
      box(body,sign*.14,shoulder-.20,.36,.045,.47,.035,'#9f7d49',sign*.65);
      box(body,sign*.26,legH+.12,.19,.18,.26,.12,'#353a3b',sign*.15);
      for(let i=0;i<3;i++)box(arms[sign===-1?0:1],(i-1)*.12,.13,.23,.044,.044,.03,'#d2af6f');}
    box(head,0,-.05,.26,.12,.08,.12,'#7f8159');box(head,0,-.14,.27,.16,.028,.035,'#35382f');
    for(const leg of [body.getObjectByName('leg-left'),body.getObjectByName('leg-right')])if(leg instanceof THREE.Group){box(leg,0,-legH*.24,.15,.25,.21,.15,'#373e3c');box(leg,0,-legH*.24,.24,.14,.12,.04,'#a18452');box(leg,0,-legH+.15,.18,.28,.25,.17,'#3b403b');}
    // Layered forged plate, recessed seams and rivets stay baked into each joint.
    for(let row=0;row<3;row++){
      box(body,0,shoulder-.13-row*.115,.34,.61-row*.05,.095,.055,row%2?'#444c4c':'#384043');
      box(body,0,shoulder-.17-row*.115,.375,.58-row*.05,.018,.025,'#b59a64');
      for(const sign of [-1,1])box(body,sign*(.26-row*.02),shoulder-.12-row*.115,.38,.025,.025,.025,'#ddbb79');
    }
    box(body,0,shoulder-.22,.405,.14,.18,.045,'#cba25b',Math.PI/4);
    box(body,0,shoulder-.22,.438,.065,.10,.02,'#f1bc67',Math.PI/4);
    const cape=part(body,'boss-cape',0,shoulder,-.29);
    for(let i=-3;i<=3;i++){
      box(cape,i*.09,-.34,-.045-Math.abs(i)*.012,.10,.69-Math.abs(i)*.055,.045,i%2?'#6a302c':'#863d32');
      box(cape,i*.09,-.64+Math.abs(i)*.028,-.078,.075,.035,.016,'#b08b51');
    }
    for(const sign of [-1,1]){
      const arm=arms[sign<0?0:1];
      box(arm,sign*.12,.04,.025,.27,.13,.51,'#41494a',sign*.15);
      box(arm,sign*.15,-.03,.045,.24,.055,.52,'#b29259',sign*.15);
      for(let i=0;i<3;i++)box(arm,0,-.17-i*.065,.11,.26,.045,.19,i%2?'#b09361':'#424b4b');
      box(head,sign*.235,.045,-.02,.15,.10,.11,skin,sign*.32);
      box(head,sign*.14,.16,.256,.085,.04,.018,'#f2cf87');
      box(head,sign*.18,.275,.21,.035,.035,.02,'#edbe68');
      for(let i=0;i<4;i++)box(arms[0],sign*.205,-.57+i*.20,.465,.027,.028,.025,'#e2c68b');
      box(hammer,sign*.33,.55,0,.12,.34,.34,'#62665e');
      box(hammer,sign*.4,.55,0,.035,.27,.28,'#b9a377');
      for(let i=0;i<3;i++)box(hammer,sign*.20,.42+i*.12,.274,.027,.058,.02,'#ffce76',sign*.3);
      for(let i=0;i<4;i++)box(hammer,0,-.10+i*.1,.05,.12,.035,.025,'#b79659');
    }
    // Broken crown insignia embossed on the shield.
    box(arms[0],0,-.27,.496,.21,.09,.024,'#c4a163');
    for(let i=-1;i<=1;i++)box(arms[0],i*.078,-.18+(i===1?-.035:0),.496,.04,.14,.024,'#dfbb73',i*.17);
    box(head,-.05,-.025,.252,.018,.12,.02,'#b4a078',-.3);
  }
  body.scale.setScalar(definition?.scale??1);
  finish(g);g.userData.height=new THREE.Box3().setFromObject(g).max.y+.05;
  if(boss){const falling=g.getObjectByName('siege hammer')!.clone(true);falling.name='arrival-hammer';falling.visible=false;g.add(falling);}
  return g;
}
export function unitModel(kind:string,level=1,branch?:BarracksBranch):THREE.Group{
  const key=kind+':'+level+':'+(branch??'');let prototype=prototypes.get(key);
  if(!prototype){prototype=make(kind,level,branch);prototypes.set(key,prototype);}
  return prototype.clone(true);
}
export function animateUnit(model:THREE.Group,time:number,moving:boolean|number,attackAge:number,casting=false,bossWindup=0){
  const phase=time*(model.userData.kind==='runner'?13:8)+(model.userData.unitId??0),swing=Math.sin(phase)*.4*Number(moving);
  for(const [name,sign] of [['leg-left',1],['leg-right',-1]] as const){const p=model.getObjectByName(name);if(p)p.rotation.x=swing*sign;}
  const attack=Math.max(0,1-attackAge/.45),left=model.getObjectByName('arm-left'),right=model.getObjectByName('arm-right');
  if(left)left.rotation.x=casting?-1.25:-swing*.65;
  if(right){right.rotation.x=casting?-1.1:swing*.65-attack*1.35;right.rotation.z=attack*.25;}
  if(bossWindup>0&&right){right.rotation.x=-Math.PI*.85*Math.min(1,bossWindup*3);right.rotation.z=-.15;}
  const tail=model.getObjectByName('tail');if(tail)tail.rotation.y=Math.sin(phase*.5)*.18;
  for(const sign of [-1,1]){const wing=model.getObjectByName(sign<0?'wing-left':'wing-right');if(wing)wing.rotation.z=Math.sin(time*7+(model.userData.unitId??0))*.35*sign;}
}

/** Measure translation, not AI intent: guards, blocked paths and new recruits stay idle. */
export function locomotionAmount(model:THREE.Group,position:{x:number;z:number},time:number):number{
  const previous=model.userData.locomotion as {x:number;z:number;time:number;amount:number}|undefined;
  if(!previous||time<previous.time){model.userData.locomotion={x:position.x,z:position.z,time,amount:0};return 0;}
  const dt=time-previous.time;
  if(dt<=0)return previous.amount; // frozen simulation also freezes the pose
  const distance=Math.hypot(position.x-previous.x,position.z-previous.z);
  const speed=distance/dt;
  const target=distance>2||speed<.08?0:Math.min(1,speed/1.2);
  const amount=previous.amount+(target-previous.amount)*(1-Math.exp(-dt*20));
  model.userData.locomotion={x:position.x,z:position.z,time,amount:amount<.005?0:amount};
  return model.userData.locomotion.amount;
}
