import type { TowerAttack } from './towers';
interface Position {x:number;y:number;z:number}
/** Same 3D envelope used by targeting, danger estimates and the range overlay. */
export function withinCoverage(origin:Position,target:Position,attack:Pick<TowerAttack,'range'|'minRange'|'coneAngle'>,facing=Math.PI/2){
  const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,d=Math.hypot(dx,dy,dz);
  if(d>attack.range||d<attack.minRange)return false;
  return !attack.coneAngle||d<1e-8||(dx*Math.sin(facing)+dz*Math.cos(facing))/d>=Math.cos(attack.coneAngle/2)-1e-9;
}
export function canTarget(origin:Position,target:Position&{airborne?:boolean},attack:TowerAttack,facing=Math.PI/2){
  return (!target.airborne||attack.air)&&withinCoverage(origin,target,attack,facing);
}
