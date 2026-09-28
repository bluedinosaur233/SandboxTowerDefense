import * as THREE from 'three';
import { BEDROCK, CONTINENT, TERRAIN_CELL, sampleContinent, type Biome } from './continent';

export const BIOMES:Biome[]=['sea','coast','forest','meadow','mountain','snow','canyon','desert','river','lake','marsh','autumn','volcanic','lava','tropical','chalk'];
export const isWater=(b:Biome)=>b==='sea'||b==='river'||b==='lake';
const palette:Record<Biome,string[]>={
  sea:['#086184'],coast:['#dfce92','#d5c488','#e5d6a4'],
  forest:['#497137','#527d3c','#5e873e'],meadow:['#87a245','#8da947','#799a41'],
  mountain:['#748181','#829190','#929b92'],snow:['#eef3eb','#e0eeec','#cfdfdf'],
  canyon:['#b77544','#c58448','#b87542'],desert:['#e1b462','#e6bc6b','#dbab5b'],
  river:['#219cae'],lake:['#117c9c'],marsh:['#76768e','#737d86','#837a99'],
  autumn:['#9c9146','#aa9847','#909349'],volcanic:['#464752','#514b53','#585057'],
  lava:['#fb7627','#ff9736','#e75a21'],tropical:['#6eaa4c','#7bb54f','#649c41'],chalk:['#829648','#95a451','#8b9e4c'],
};
export type AtlasGrid={width:number;depth:number;cellSize?:number;heights:Float32Array;biomes:Uint8Array;fringes?:Uint8Array;blends?:Uint8Array;landCells:number};
/** A chamfer distance field keeps shelves and foam continuous around every cove. */
export function shoreDistances(width:number,depth:number,water:Uint8Array){
  const d=new Float32Array(width*depth);for(let i=0;i<d.length;i++)d[i]=water[i]?128:0;
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){const i=z*width+x;if(x)d[i]=Math.min(d[i],d[i-1]+1);if(z)d[i]=Math.min(d[i],d[i-width]+1);if(x&&z)d[i]=Math.min(d[i],d[i-width-1]+Math.SQRT2);if(x<width-1&&z)d[i]=Math.min(d[i],d[i-width+1]+Math.SQRT2);}
  for(let z=depth-1;z>=0;z--)for(let x=width-1;x>=0;x--){const i=z*width+x;if(x<width-1)d[i]=Math.min(d[i],d[i+1]+1);if(z<depth-1)d[i]=Math.min(d[i],d[i+width]+1);if(x<width-1&&z<depth-1)d[i]=Math.min(d[i],d[i+width+1]+Math.SQRT2);if(x&&z<depth-1)d[i]=Math.min(d[i],d[i+width-1]+Math.SQRT2);}
  return d;
}
export function buildAtlasGrid():AtlasGrid{
  const cellSize=TERRAIN_CELL,width=CONTINENT.width/cellSize,depth=CONTINENT.depth/cellSize,heights=new Float32Array(width*depth),biomes=new Uint8Array(width*depth),fringes=new Uint8Array(width*depth),blends=new Uint8Array(width*depth);let landCells=0;
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){const t=sampleContinent((x-width/2)*cellSize,(z-depth/2)*cellSize),i=z*width+x;heights[i]=t.h;biomes[i]=BIOMES.indexOf(t.biome);fringes[i]=BIOMES.indexOf(t.fringe??t.biome);blends[i]=Math.round((t.blend??0)*32);if(t.biome!=='sea')landCells++;}
  return {width,depth,cellSize,heights,biomes,fringes,blends,landCells};
}
export function gridTile(grid:AtlasGrid,x:number,z:number){
  const size=grid.cellSize??1,ix=Math.round(x/size+grid.width/2),iz=Math.round(z/size+grid.depth/2);
  if(ix<0||iz<0||ix>=grid.width||iz>=grid.depth)return {h:BEDROCK,biome:'sea' as Biome,fringe:'sea' as Biome,blend:0};
  const i=iz*grid.width+ix;return {h:grid.heights[i],biome:BIOMES[grid.biomes[i]],fringe:BIOMES[grid.fringes?.[i]??grid.biomes[i]],blend:(grid.blends?.[i]??0)/32};
}
class Faces{
  private capacity=4096;
  private count=0;
  private positions=new Float32Array(this.capacity*12);
  private normals=new Int8Array(this.capacity*12);
  private colors=new Uint8Array(this.capacity*12);
  private indices=new Uint32Array(this.capacity*6);
  add(p:number[],n:number[],color:THREE.Color){
    if(this.count===this.capacity){this.capacity*=2;const p2=new Float32Array(this.capacity*12),n2=new Int8Array(this.capacity*12),c2=new Uint8Array(this.capacity*12),i2=new Uint32Array(this.capacity*6);p2.set(this.positions);n2.set(this.normals);c2.set(this.colors);i2.set(this.indices);this.positions=p2;this.normals=n2;this.colors=c2;this.indices=i2;}
    const o=this.count*12,v=this.count*4;this.positions.set(p,o);
    for(let i=0;i<4;i++){const j=o+i*3;for(let k=0;k<3;k++)this.normals[j+k]=n[k]*127;this.colors[j]=Math.round(color.r*255);this.colors[j+1]=Math.round(color.g*255);this.colors[j+2]=Math.round(color.b*255);}
    this.indices.set([v,v+1,v+2,v,v+2,v+3],this.count*6);this.count++;
  }
  geometry(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions.slice(0,this.count*12),3));g.setAttribute('normal',new THREE.BufferAttribute(this.normals.slice(0,this.count*12),3,true));g.setAttribute('color',new THREE.BufferAttribute(this.colors.slice(0,this.count*12),3,true));g.setIndex(new THREE.BufferAttribute(this.indices.slice(0,this.count*6),1));g.computeBoundingSphere();return g;}
}
/** Mesh only visible faces. Equal-height top runs merge; no buried cubes or coplanar caps. */
export function buildAtlasSurface(grid:AtlasGrid){
  const land=new Faces(),water=new Faces(),lava=new Faces(),{width,depth,heights,biomes}=grid,cell=grid.cellSize??1,half=cell/2;
  const colors=Object.fromEntries(BIOMES.map(b=>[b,palette[b].map(c=>new THREE.Color(c))])) as Record<Biome,THREE.Color[]>;
  const colorKeys=new Uint32Array(width*depth),mixed=new THREE.Color();
  const paletteAt=(b:Biome,x:number,z:number)=>colors[b][Math.min(colors[b].length-1,Math.floor((Math.sin(x*.028+z*.02)*Math.cos(z*.036-x*.012)*.5+.5)*colors[b].length))];
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){const i=z*width+x,wx=(x-width/2)*cell,wz=(z-depth/2)*cell,b=BIOMES[biomes[i]];mixed.copy(paletteAt(b,wx,wz));if(grid.blends?.[i]&&!isWater(b)&&b!=='lava')mixed.lerp(paletteAt(BIOMES[grid.fringes![i]],wx,wz),grid.blends[i]/32);colorKeys[i]=(Math.round(mixed.r*255)<<16)|(Math.round(mixed.g*255)<<8)|Math.round(mixed.b*255);}
  const colorFromKey=(key:number)=>mixed.setRGB(((key>>16)&255)/255,((key>>8)&255)/255,(key&255)/255);
  const rocks:Partial<Record<Biome,THREE.Color>>={chalk:new THREE.Color('#e2e3d1'),snow:new THREE.Color('#7b9299'),mountain:new THREE.Color('#73858a'),volcanic:new THREE.Color('#454650'),lava:new THREE.Color('#51434a'),desert:new THREE.Color('#b98950'),canyon:new THREE.Color('#a7613c')};
  const soil=new THREE.Color('#797855'),stratum=new THREE.Color();
  for(let iz=0;iz<depth;iz++)for(let ix=0;ix<width;ix++){
    const i=iz*width+ix,b=BIOMES[biomes[i]];if(b==='sea')continue;
    const x=(ix-width/2)*cell,z=(iz-depth/2)*cell,h=heights[i],c=colorFromKey(colorKeys[i]),target=isWater(b)?water:b==='lava'?lava:land;
    // Merge top faces only; side faces still use exact neighboring elevations.
    if(ix===0||biomes[i-1]!==biomes[i]||heights[i-1]!==h||colorKeys[i-1]!==colorKeys[i]){let end=ix+1;while(end<width&&biomes[iz*width+end]===biomes[i]&&heights[iz*width+end]===h&&colorKeys[iz*width+end]===colorKeys[i])end++;
      target.add([x-half,h,z-half,x-half,h,z+half,(end-width/2)*cell-half,h,z+half,(end-width/2)*cell-half,h,z-half],[0,1,0],c);
    }
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nx=ix+dx,nz=iz+dz,nh=nx<0||nx>=width||nz<0||nz>=depth?BEDROCK:heights[nz*width+nx];if(nh>=h)continue;
      // Thin turf lip over coherent geological strata, split only exposed cliffs.
      let bottom=nh;while(bottom<h){const top=Math.min(h,bottom<h-.7?Math.min(h-.7,(Math.floor(bottom/4)+1)*4):h);if(top<=bottom)break;
        stratum.copy(top>h-.7?c:(rocks[b]??soil)).multiplyScalar(top>h-.7?.89:.86+(Math.floor(top/4)%3)*.055);
        if(dx===1)land.add([x+half,bottom,z+half,x+half,bottom,z-half,x+half,top,z-half,x+half,top,z+half],[1,0,0],stratum);
        if(dx===-1)land.add([x-half,bottom,z-half,x-half,bottom,z+half,x-half,top,z+half,x-half,top,z-half],[-1,0,0],stratum);
        if(dz===1)land.add([x-half,bottom,z+half,x+half,bottom,z+half,x+half,top,z+half,x-half,top,z+half],[0,0,1],stratum);
        if(dz===-1)land.add([x+half,bottom,z-half,x-half,bottom,z-half,x-half,top,z-half,x+half,top,z-half],[0,0,-1],stratum);
        bottom=top;
      }
    }
  }
  return {land:land.geometry(),water:water.geometry(),lava:lava.geometry()};
}
