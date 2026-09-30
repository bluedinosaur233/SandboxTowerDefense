import { MAPS, makeTerrain, WIDTH, DEPTH, type MapId } from '../simulation/maps';

/** A small relief map made from the same terrain as the playable battlefield. */
export function drawStageThumbnail(canvas:HTMLCanvasElement,id:MapId){
  canvas.width=640;canvas.height=280;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const map=MAPS[id],tiles=makeTerrain(id),scale=3.8;
  const project=(x:number,z:number,h=0)=>({x:320+(x-WIDTH/2-(z-DEPTH/2))*scale,y:148+(x-WIDTH/2+z-DEPTH/2)*scale*.46-h*2.2});
  const poly=(points:{x:number;y:number}[],color:string)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();};
  const bg=ctx.createLinearGradient(0,0,0,280);bg.addColorStop(0,'#375b59');bg.addColorStop(1,'#173b40');ctx.fillStyle=bg;ctx.fillRect(0,0,640,280);
  for(const t of tiles.filter(t=>t.active).sort((a,b)=>a.x+a.z-b.x-b.z)){
    const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>project(t.x+x,t.z+z,t.h));
    const base=project(t.x+.5,t.z+.5,-2);
    poly([corners[1],corners[2],corners[3],{x:corners[3].x,y:base.y},{x:base.x,y:base.y},{x:corners[1].x,y:base.y}],'#737257');
    poly(corners,t.bridge?'#c9a472':t.water?'#62bdc3':t.road?'#dbcc9f':t.h>15?'#d7d8b6':t.h>8?'#9fa474':'#92ac70');
    if(t.decoration>.55&&!t.water&&!t.road){const p=project(t.x,t.z,t.h);ctx.fillStyle='#416947';ctx.fillRect(p.x-1,p.y-4,2.5,4);}
  }
  const landmark=(x:number,z:number,color:string,label:string)=>{const t=tiles[z*WIDTH+x],p=project(x,z,t.h);ctx.fillStyle='#213c35';ctx.fillRect(p.x-5,p.y-10,10,10);ctx.fillStyle=color;ctx.fillRect(p.x-7,p.y-13,14,5);ctx.font='bold 14px "PingFang SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#223f36';ctx.strokeText(label,p.x,p.y-22);ctx.fillStyle='#fff0ca';ctx.fillText(label,p.x,p.y-22);};
  for(const site of map.sites)landmark(site.x,site.z,'#cfab76',site.kind==='farm'?'麦田':'银矿');
  landmark(map.goal.x,map.goal.z,'#6ecec5','要塞');
  ctx.font='bold 15px sans-serif';ctx.textAlign='center';for(const entry of map.approaches){const p=project(entry.x,entry.z,tiles[entry.z*WIDTH+entry.x].h);ctx.fillStyle='#ffe1a2';ctx.fillText('⚑',p.x,p.y-8);}
}
