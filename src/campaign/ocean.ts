import * as THREE from 'three';
import { shoreDistances, BIOMES, isWater, type AtlasGrid } from './surface';

/** The ocean shelf extends beyond the land grid, including the outermost islands. */
export function oceanShore(grid:AtlasGrid){
  const cell=grid.cellSize??1,padding=Math.ceil(64/cell),width=grid.width+padding*2,depth=grid.depth+padding*2,water=new Uint8Array(width*depth).fill(1);
  for(let z=0;z<grid.depth;z++)for(let x=0;x<grid.width;x++)water[(z+padding)*width+x+padding]=Number(isWater(BIOMES[grid.biomes[z*grid.width+x]]));
  const distance=shoreDistances(width,depth,water);for(let i=0;i<distance.length;i++)distance[i]*=cell;
  return {width,depth,cell,distance};
}

export function createAtlasWater(grid:AtlasGrid){
  const shore=oceanShore(grid),data=new Uint8Array(shore.width*shore.depth*4);
  for(let i=0;i<shore.distance.length;i++){data[i*4]=Math.round(Math.min(1,shore.distance[i]/64)*255);data[i*4+3]=255;}
  const field=new THREE.DataTexture(data,shore.width,shore.depth,THREE.RGBAFormat);field.minFilter=field.magFilter=THREE.LinearFilter;field.generateMipmaps=false;field.needsUpdate=true;
  const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},cellSize:{value:shore.cell},shoreField:{value:field},mapSize:{value:new THREE.Vector2(shore.width*shore.cell,shore.depth*shore.cell)},deep:{value:new THREE.Color('#086086')},shelf:{value:new THREE.Color('#36b9b5')},foam:{value:new THREE.Color('#c9ebe1')}},vertexShader:`
    varying vec3 world;
    void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}
  `,fragmentShader:`
    uniform float time;uniform float cellSize;uniform sampler2D shoreField;uniform vec2 mapSize;uniform vec3 deep;uniform vec3 shelf;uniform vec3 foam;varying vec3 world;
    void main(){
      vec2 uv=(world.xz+mapSize*.5+cellSize*.5)/mapSize;
      float within=step(0.,uv.x)*step(0.,uv.y)*step(uv.x,1.)*step(uv.y,1.);
      vec2 field=texture2D(shoreField,uv).rg;
      float distance=mix(64.,field.r*64.,within);
      float depth=smoothstep(0.,22.,distance);
      vec3 water=mix(shelf,deep,depth);
      float swell=sin(world.x*.083+world.z*.064+time*.26)*sin(world.z*.071-world.x*.019-time*.17);
      water*=.97+swell*.055;
      float footprint=max(length(fwidth(world.xz)),.1);
      float detail=1.-smoothstep(1.,5.,footprint);
      float wave=sin(world.x*.47+world.z*.27+sin(world.z*.12)*2.+time*.8);
      float crossWave=sin(world.x*.19-world.z*.53+sin(world.x*.07)*3.-time*.6);
      float glint=pow(max(0.,wave*crossWave),12.)*detail;
      water+=vec3(.007,.014,.015)*glint;
      float breaker=1.-smoothstep(.7+sin(time*1.1+world.x*.08+world.z*.13)*.35,2.4,distance);
      float ribbon=(1.-smoothstep(.2,.75,abs(distance-4.-sin(time*.7)*.5)))*.19;
      float foamAmount=(breaker*.75+ribbon)*(.78+.22*sin(world.x*.81+world.z*.53+time));
      water=mix(water,foam,foamAmount);
      gl_FragColor=vec4(water,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `});
  return {material,field};
}
