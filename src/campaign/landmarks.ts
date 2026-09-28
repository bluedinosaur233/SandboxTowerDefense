import { sampleContinent, sampleGeography, random, worldPoint, canyonX } from './continent';
import { atlasSettlements } from './settlements';
import type { Block } from './terrain-geometry';

/** Buildings keep their human scale as the surrounding regions grow. */
export function continentLandmarks():Block[]{
  const blocks:Block[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>blocks.push({x,y,z,w,h,d,color});
  const ground=(x:number,z:number)=>sampleContinent(x,z).h;
  const tower=(x:number,z:number,h=10)=>{const y=ground(x,z);box(x,y+h/2,z,2.5,h,2.5,'#dcd2b4');box(x,y+h,z,3.6,.7,3.6,'#426873');for(const dx of [-1.4,1.4])for(const dz of [-1.4,1.4])box(x+dx,y+h+.7,z+dz,.75,1,.75,'#ded7bc');box(x,y+h+1.8,z,1.1,1.4,1.1,'#e7bf6d');};
  const house=(x:number,z:number,color='#a96040',w=3.5)=>{const y=ground(x,z);box(x,y+1.4,z,w,2.8,w*.8,'#d9cda9');for(let i=0;i<4;i++)box(x,y+2.9+i*.35,z,w+.7-i*.8,.4,w*.9+.4,color);box(x,y+.85,z+w*.41,.7,1.7,.08,'#594433');box(x-w*.22,y+2,z+w*.42,.55,.65,.08,'#826b49');box(x+w*.28,y+4,z-.6,.55,1.8,.55,'#bfba9f');};
  // The elder tree is a landmark, with a broad crown, exposed roots and stone circle.
  {const {x,z}=worldPoint(-80,-6),y=ground(x,z);box(x,y+12,z,4,24,4,'#624934');
    for(const [dx,dz] of [[-11,0],[11,3],[0,-10],[3,10]]){box(x+dx/2,y+12,z+dz/2,Math.abs(dx)+2,2.6,Math.abs(dz)+2,'#705738');box(x+dx,y+1,z+dz,4,2,3,'#67563b');}
    for(const [dx,dz,h,w] of [[0,0,31,24],[-13,0,25,19],[12,3,26,20],[0,-12,28,18],[1,12,24,19]])for(let lx=-w/2;lx<=w/2;lx+=2)for(let lz=-w/2;lz<=w/2;lz+=2){const radius=Math.hypot(lx/(w*.5),lz/(w*.44));if(radius>1)continue;const thickness=3+Math.sqrt(1-radius*radius)*6+random(lx+dx,lz+dz);box(x+dx+lx,y+h+thickness/2,z+dz+lz,2,thickness,2,radius>.75?'#4e873e':random(lx,lz)>.7?'#83ac50':'#6b9b42');}
    for(let i=0;i<12;i++){const a=i*Math.PI/6,px=x+Math.cos(a)*28,pz=z+Math.sin(a)*24;box(px,ground(px,pz)+2,pz,1.6,4,1.4,'#a8b7a0');}
  }
  // Glaciers follow the sampled slope, never hover across mountain steps.
  for(let i=0;i<110;i++){const {x,z}=worldPoint(-37+Math.sin(i*.035)*2,-62+i*.12);for(let dx=-2;dx<=2;dx++){const px=Math.round(x)+dx,pz=Math.round(z);box(px,ground(px,pz)+.035,pz,1,.065,1,i%9===0?'#91cbd7':'#c5e3e5');}}
  for(const [ax,az] of [[-103,-43],[-98,-74],[-112,-30]]){const {x,z}=worldPoint(ax,az);if(ground(x,z)>0)tower(x,z,12);}
  for(const [ax,az] of [[-80,43],[-67,57],[-90,32],[-89,50],[-61,42]]){const {x,z}=worldPoint(ax,az),y=ground(x,z);if(atlasSettlements().some(s=>Math.hypot(x-s.x,z-s.z)<s.radius+12))continue;for(const dx of [-5,5])for(const dz of [-3,3])box(x+dx,y+3,z+dz,1.5,6,1.5,'#939992');box(x,y+5.6,z-3,11,1.2,1.5,'#aaa99c');box(x,y+.3,z,10,.5,6,'#747f76');for(let i=0;i<12;i++)box(x+i-5,y+.65,z+6,.8,.22,2.2,'#776345');}
  {const {x,z}=worldPoint(-5,49);house(x-3,z,'#518590',4);tower(x+2,z,9);}
  for(const [ax,az] of [[-15,57],[6,45],[1,58],[-12,42]]){const {x,z}=worldPoint(ax,az);box(x,1.4,z,1.6,.6,4,'#77513a');box(x,3.4,z,.12,4,.12,'#bba078');box(x+.9,4.2,z,1.8,1.8,.1,'#efdfb1');}
  // Aqueduct and coastal falls read clearly from the overview.
  // Pale stone viaduct, with stepped arch shoulders between the piers.
  {const {x,z}=worldPoint(17,73),top=ground(x,z)+12;for(let i=0;i<12;i++){const px=x+i*4.5,y=ground(px,z);box(px,(y+top)/2,z,1.3,Math.max(.5,top-y),2,'#d9dcc9');box(px+2,top,z,4.5,1,2.4,'#ebe8d2');for(const dx of [-1,1])box(px+dx,top-1,z,1,1,2,'#d9dcc9');}}
  for(const ax of [6,18,28]){let az=76;while(az<104&&sampleGeography(ax,az+1).biome==='chalk')az++;const {x,z}=worldPoint(ax,az-.5),y=ground(x,z);if(y>3){for(let i=-2;i<=2;i++)box(x+i,ground(x+i,z)+.08,z,1,.15,4,'#83cdd3');box(x,y/2,z+2,4,y+.7,.5,'#acdee1');for(let i=0;i<9;i++)box(x+(i-4)*.8,.22,z+2.5+random(i,x)*3,1.2,.4,1.6,'#d8eee5');}}
  for(const [ax,az,size] of [[79,48,25],[66,53,17],[91,43,12]]){const {x,z}=worldPoint(ax,az),y=ground(x,z);for(let i=0;i<10;i++)box(x,y+.8+i*1.3,z,size-i*size*.085,1.35,size-i*size*.085,i%2?'#d7ad63':'#e2be77');box(x,y+1.8,z+size/2+.05,2.4,3.6,.12,'#65513a');}
  for(const ax of [69,88]){const {x,z}=worldPoint(ax,57),y=ground(x,z);box(x,y+5,z,1.7,10,1.7,'#c9a266');box(x,y+10.4,z,1,.7,1,'#ead092');}
  for(let i=0;i<26;i++){const a=i*Math.PI*2/26,{x,z}=worldPoint(82+Math.cos(a)*18,-49+Math.sin(a)*17),y=ground(x,z),h=5+random(i,z)*7;box(x,y+h/2,z,2,h,2,'#454651');}
  {const {x,z}=worldPoint(61,-34);for(let i=0;i<8;i++){const px=x+i*3;box(px,ground(px,z)+2,z,2,4+random(i,z)*3,2,'#65636b');}}
  // Two long suspended crossings run across the reference's north–south canyon.
  for(const az of [-14,2]){const cx=canyonX(az),left=worldPoint(cx-11,az),right=worldPoint(cx+11,az),span=right.x-left.x,y=Math.max(ground(left.x,left.z),ground(right.x,right.z))+2;
    for(let x=left.x;x<=right.x;x+=.75){const u=(x-left.x)/span,deck=y-Math.sin(u*Math.PI)*3;box(x,deck,left.z,.64,.4,3.7,'#99764c');for(const side of [-1,1]){box(x,deck+2.2,left.z+side*1.9,.9,.13,.13,'#cebb88');if(Math.round((x-left.x)/.75)%3===0)box(x,deck+1.1,left.z+side*1.9,.12,2.2,.12,'#b2a27c');}}
    for(const end of [left,right])for(const side of [-1,1]){const z=end.z+side*3,h=y-ground(end.x,z)+8;box(end.x,ground(end.x,z)+h/2,z,2.4,h,2.5,'#c2b9a0');box(end.x,y+8.4,z,3.4,1.1,3.4,'#d5c8a9');box(end.x,y+9.3,z,1.6,.8,1.6,'#786c59');}
  }
  return blocks;
}
