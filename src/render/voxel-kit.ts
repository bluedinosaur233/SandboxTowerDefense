import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cube=new THREE.BoxGeometry(1,1,1);
const stone=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.83,flatShading:true});
const light=new THREE.MeshStandardMaterial({vertexColors:true,emissive:0xffffff,emissiveIntensity:.32,roughness:.35,flatShading:true});
light.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor.rgb;');};
/** Bake color and transform into geometry; each joint uses at most two draw calls. */
export function voxel(g:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,color:string,rotation:THREE.Euler=new THREE.Euler(),glow=false,shape:THREE.BufferGeometry=cube){
  const geo=shape.index?shape.toNonIndexed():shape.clone();geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(w,h,d)));
  const c=new THREE.Color(color),n=geo.getAttribute('position').count,colors=new Float32Array(n*3);
  for(let i=0;i<n;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const key=glow?'litBlocks':'solidBlocks';(g.userData[key]??=[]).push(geo);
}
export function bakeVoxels(g:THREE.Group){
  const buckets:{solidBlocks:THREE.BufferGeometry[];litBlocks:THREE.BufferGeometry[]}={solidBlocks:[],litBlocks:[]};
  function collect(node:THREE.Group,matrix:THREE.Matrix4){
    for(const key of ['solidBlocks','litBlocks'] as const){
      for(const geo of (node.userData[key]??[]) as THREE.BufferGeometry[])buckets[key].push(geo.applyMatrix4(matrix));
      delete node.userData[key];
    }
    for(const child of [...node.children])if(child instanceof THREE.Group){
      if(child.name==='crystal'){bakeVoxels(child);continue;}
      child.updateMatrix();collect(child,matrix.clone().multiply(child.matrix));node.remove(child);
    }
  }
  collect(g,new THREE.Matrix4());
  for(const [key,material] of [['solidBlocks',stone],['litBlocks',light]] as const){
    const blocks=buckets[key];if(!blocks.length)continue;
    const geometry=mergeGeometries(blocks);blocks.forEach(b=>b.dispose());
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
}
