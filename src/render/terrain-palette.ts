import * as THREE from 'three';
import type { Tile } from '../simulation/game';
import { windfordRiverX } from '../simulation/maps';
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
/** Broad color fields and gentle local variation avoid periodic checkerboard patterns. */
export function terrainPalette(t:Tile,nearRoad:boolean){
  const field=(Math.sin(t.x*.073+t.z*.041)+Math.cos(t.z*.091-t.x*.026)+2)/4;
  const noise=Math.sin(t.x*127.1+t.z*311.7)*43758.5453,grain=(noise-Math.floor(noise)-.5)*.035;
  const rock=new THREE.Color('#817e6a').lerp(new THREE.Color('#a4a48e'),smooth(5,22,t.h));
  const top=new THREE.Color('#6d8d55').lerp(new THREE.Color('#a4ae71'),field);
  const bank=1-smooth(2,7,Math.abs(t.x-windfordRiverX(t.z)));
  top.lerp(new THREE.Color('#759471'),bank*.45);
  top.lerp(new THREE.Color('#b3a57b'),t.road?.75:nearRoad?.2:0);
  top.lerp(rock,smooth(8,21,t.h)*.9);
  top.lerp(new THREE.Color('#deded0'),smooth(18,23,t.h)*.7);
  if(t.water||t.bridge)top.set('#388d94').lerp(new THREE.Color('#68a69e'),field*.6);
  top.offsetHSL(0,0,grain);rock.offsetHSL(0,0,grain*.4);
  return {top:'#'+top.getHexString(),rock:'#'+rock.getHexString()};
}
