import {isTower} from './towers';
/** Reserve the final footprint (including a cannon’s turning clearance) from level one; upgrades never claim new land. */
export function buildingFootprint(kind:string){return kind==='cannon'?2.8:isTower(kind)||kind==='barracks'?2:1;}
export function footprintsOverlap(a:{kind:string;x:number;z:number},b:{kind:string;x:number;z:number}){
  const separation=(buildingFootprint(a.kind)+buildingFootprint(b.kind))/2;
  return Math.abs(a.x-b.x)<separation-.001&&Math.abs(a.z-b.z)<separation-.001;
}
