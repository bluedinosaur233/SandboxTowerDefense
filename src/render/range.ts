import * as THREE from 'three';
import type { TowerAttack } from '../simulation/towers';
import { HEIGHT_UNIT, type Tile, type Vec3 } from '../simulation/game';

/** Horizontal slice of a genuine 3D sphere; higher/lower surfaces have different coverage. */
export function sphereSliceRadius(radius: number, centerY: number, surfaceY: number) {
  return Math.sqrt(Math.max(0, radius * radius - (surfaceY - centerY) ** 2));
}
export class RangeDisplay {
  readonly group = new THREE.Group();
  readonly sphere = new THREE.Group();
  private cone=new THREE.Group();
  private direction=new THREE.Vector3(1,0,0);
  private surface: THREE.Mesh | null = null;
  private center = new THREE.Vector3();
  private color = new THREE.Color('#f2c66d');
  private groundMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true,
    polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { center: {value:this.center}, radius: {value:1}, minRadius:{value:0}, coneCos:{value:-1}, direction:{value:this.direction}, tint:{value:this.color} },
    vertexShader: `varying vec3 positionW; void main(){vec4 p=modelMatrix*vec4(position,1.0);positionW=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform vec3 center;uniform vec3 tint;uniform float radius;uniform float minRadius;uniform float coneCos;uniform vec3 direction;varying vec3 positionW;
      void main(){float d=length(positionW-center);if(d>radius||d<minRadius)discard;float alignment=dot(normalize(positionW-center),direction);if(alignment<coneCos)discard;
      float edge=1.0-smoothstep(0.025,0.15,min(radius-d,minRadius>0.0?d-minRadius:radius));if(coneCos>0.0)edge=max(edge,1.0-smoothstep(0.0,0.035,alignment-coneCos));
      vec2 grid=abs(fract(positionW.xz+0.5)-0.5);float line=1.0-smoothstep(0.006,0.022,min(grid.x,grid.y));
      float hatch=step(0.96,fract((positionW.x+positionW.z)*1.8));
      gl_FragColor=vec4(mix(tint,vec3(1.0,0.96,0.72),edge*.7),.19+edge*.7+line*.10+hatch*.04);}`,
  });
  private shellMaterial = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.FrontSide,
    uniforms:{tint:{value:this.color},coneCos:{value:-1},direction:{value:this.direction},viewDirection:{value:new THREE.Vector3(1,1,1).normalize()}},
    vertexShader:`varying vec3 normalW;void main(){normalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 tint;uniform vec3 viewDirection;uniform vec3 direction;uniform float coneCos;varying vec3 normalW;void main(){if(dot(normalize(normalW),direction)<coneCos)discard;float rim=pow(1.0-abs(dot(normalize(normalW),viewDirection)),3.0);gl_FragColor=vec4(tint,.026+rim*.23);}`,
  });
  private ringMaterial = new THREE.LineBasicMaterial({color:'#ffdb89',transparent:true,opacity:.35,depthWrite:false});
  constructor() {
    this.group.name='range-display'; this.group.visible=false;
    this.sphere.add(new THREE.Mesh(new THREE.SphereGeometry(1,64,40),this.shellMaterial));
    for(let i=0;i<6;i++){
      const pts=Array.from({length:129},(_,j)=>{const t=j/128*Math.PI*2;return new THREE.Vector3(Math.cos(t)*Math.cos(i*Math.PI/6),Math.sin(t),Math.cos(t)*Math.sin(i*Math.PI/6));});
      this.sphere.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),this.ringMaterial));
    }
    for(const y of [-.5,0,.5]){
      const r=Math.sqrt(1-y*y),pts=Array.from({length:129},(_,j)=>new THREE.Vector3(Math.cos(j/128*Math.PI*2)*r,y,Math.sin(j/128*Math.PI*2)*r));
      this.sphere.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),this.ringMaterial));
    }
    const angle=50*Math.PI/180,r=Math.sin(angle),depth=Math.cos(angle);
    const points=Array.from({length:65},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2)*r,Math.sin(i/64*Math.PI*2)*r,depth));
    this.cone.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),this.ringMaterial));
    for(let i=0;i<8;i++){const a=i*Math.PI/4;this.cone.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,depth)]),this.ringMaterial));}
    this.group.add(this.sphere,this.cone);
  }
  setTerrain(tiles:Tile[]) {
    if(this.surface){this.group.remove(this.surface);this.surface.geometry.dispose();}
    const positions:number[]=[];
    function quad(a:number[],b:number[],c:number[],d:number[]){positions.push(...a,...b,...c,...a,...c,...d);}
    const byPosition=new Map(tiles.filter(t=>t.active).map(t=>[`${t.x},${t.z}`,t]));
    for(const t of tiles){if(!t.active)continue;const x=t.x,z=t.z,y=t.h*HEIGHT_UNIT;
      quad([x-.5,y+.012,z-.5],[x-.5,y+.012,z+.5],[x+.5,y+.012,z+.5],[x+.5,y+.012,z-.5]);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const neighbor=byPosition.get(`${x+dx},${z+dz}`);if(!neighbor || neighbor.h>=t.h)continue;
        const bottom=neighbor.h*HEIGHT_UNIT;
        if(dx)quad([x+dx*.502,bottom,z-.5],[x+dx*.502,y,z-.5],[x+dx*.502,y,z+.5],[x+dx*.502,bottom,z+.5]);
        else quad([x-.5,bottom,z+dz*.502],[x-.5,y,z+dz*.502],[x+.5,y,z+dz*.502],[x+.5,bottom,z+dz*.502]);
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    this.surface=new THREE.Mesh(geometry,this.groundMaterial);this.surface.name='terrain-sphere-intersection';this.surface.renderOrder=3;this.group.add(this.surface);
  }
  show(center:Vec3,radius:number,kind:string,attack?:Pick<TowerAttack,'coneAngle'|'minRange'>,facing=Math.PI/2){
    this.center.set(center.x,center.y,center.z);this.sphere.position.copy(this.center);this.sphere.scale.setScalar(radius);
    const coneCos=attack?.coneAngle?Math.cos(attack.coneAngle/2):-1;
    this.direction.set(Math.sin(facing),0,Math.cos(facing));
    this.groundMaterial.uniforms.coneCos.value=coneCos;this.groundMaterial.uniforms.minRadius.value=attack?.minRange??0;this.shellMaterial.uniforms.coneCos.value=coneCos;
    this.sphere.children.forEach((child,i)=>child.visible=i===0||coneCos<0);
    this.cone.visible=coneCos>0;this.cone.position.copy(this.center);this.cone.scale.setScalar(radius);this.cone.rotation.y=facing;
    this.groundMaterial.uniforms.radius.value=radius;this.color.set(kind==='mage'?'#bda0ff':kind==='frost'?'#a6e5ff':kind==='tesla'?'#bae7a2':kind==='cannon'?'#efa675':kind==='barracks'?'#8ddcbc':'#f5c052');
    this.ringMaterial.color.copy(this.color);this.group.visible=true;
  }
  hide(){this.group.visible=false;}
  updateCamera(camera:THREE.Camera){camera.getWorldDirection(this.shellMaterial.uniforms.viewDirection.value).negate();}
}
