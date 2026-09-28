export type Block={x:number;y:number;z:number;w:number;h:number;d:number;color:string};

/** A unit footprint and abutting layers keep exposed faces from fighting for depth. */
export function terrainColumn(x:number,z:number,height:number,rock:string,surface:string):Block[]{
  const bottom=-2,cap=.36,seam=height-cap;
  return [
    {x,z,y:(bottom+seam)/2,w:1,h:seam-bottom,d:1,color:rock},
    {x,z,y:height-cap/2,w:1,h:cap,d:1,color:surface},
  ];
}
