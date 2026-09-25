import * as THREE from 'three';
import { HEIGHT_UNIT, type Tile, type Vec3 } from '../simulation/game';

/** Horizontal slice of a genuine 3D sphere; higher/lower surfaces have different coverage. */
export function sphereSliceRadius(radius: number, centerY: number, surfaceY: number) {
  return Math.sqrt(Math.max(0, radius * radius - (surfaceY - centerY) ** 2));
}
export class RangeDisplay {
  readonly group = new THREE.Group();
  readonly sphere = new THREE.Group();
  private surface: THREE.Mesh | null = null;
  private center = new THREE.Vector3();
  private color = new THREE.Color('#f2c66d');
  private groundMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true,
    polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    uniforms: { center: {value:this.center}, radius: {value:1}, tint:{value:this.color} },
    vertexShader: `varying vec3 positionW; void main(){vec4 p=modelMatrix*vec4(position,1.0);positionW=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform vec3 center;uniform vec3 tint;uniform float radius;varying vec3 positionW;
      void main(){float d=length(positionW-center);if(d>radius)discard;
      float edge=1.0-smoothstep(0.025,0.15,radius-d);
      vec2 grid=abs(fract(positionW.xz+0.5)-0.5);float line=1.0-smoothstep(0.006,0.022,min(grid.x,grid.y));
      float hatch=step(0.96,fract((positionW.x+positionW.z)*1.8));
      gl_FragColor=vec4(mix(tint,vec3(1.0,0.96,0.72),edge*.7),.19+edge*.7+line*.10+hatch*.04);}`,
  });
  private shellMaterial = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.FrontSide,
    uniforms:{tint:{value:this.color},viewDirection:{value:new THREE.Vector3(1,1,1).normalize()}},
    vertexShader:`varying vec3 normalW;void main(){normalW=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 tint;uniform vec3 viewDirection;varying vec3 normalW;void main(){float rim=pow(1.0-abs(dot(normalize(normalW),viewDirection)),3.0);gl_FragColor=vec4(tint,.026+rim*.23);}`,
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
    this.group.add(this.sphere);
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
  show(center:Vec3,radius:number,kind:string){
    this.center.set(center.x,center.y,center.z);this.sphere.position.copy(this.center);this.sphere.scale.setScalar(radius);
    this.groundMaterial.uniforms.radius.value=radius;this.color.set(kind==='mage'?'#bda0ff':kind==='barracks'?'#8ddcbc':'#f5c052');
    this.ringMaterial.color.copy(this.color);this.group.visible=true;
  }
  hide(){this.group.visible=false;}
  updateCamera(camera:THREE.Camera){camera.getWorldDirection(this.shellMaterial.uniforms.viewDirection.value).negate();}
}
