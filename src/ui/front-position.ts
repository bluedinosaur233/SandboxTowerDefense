export interface ScreenPoint { x:number; y:number }
export interface ScreenBounds { left:number;right:number;top:number;bottom:number }
/** Clamp the marker, then point from its displayed center toward the actual entrance. */
export function frontPosition(target:ScreenPoint,bounds:ScreenBounds,center:ScreenPoint){
  const x=Math.max(bounds.left,Math.min(bounds.right,target.x));
  const y=Math.max(bounds.top,Math.min(bounds.bottom,target.y));
  const detached=Math.hypot(target.x-x,target.y-y)>8;
  const dx=detached?target.x-x:target.x-center.x,dy=detached?target.y-y:target.y-center.y;
  return {x,y,detached,angle:Math.atan2(dy,dx)*180/Math.PI};
}
