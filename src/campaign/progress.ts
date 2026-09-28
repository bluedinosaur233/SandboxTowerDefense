import type { MapId } from '../simulation/maps';
export type CampaignProgress=Partial<Record<MapId,number>>;
export const PROGRESS_KEY='riverwatch.campaign.v1';
export function readProgress(raw:string|null):CampaignProgress{
  try{const data=JSON.parse(raw??'{}');const result:CampaignProgress={};
    for(const id of ['river','mountain','canyon'] as const){const n=data?.[id];if(Number.isInteger(n)&&n>=1&&n<=3)result[id]=n;}
    return result;
  }catch{return {};}
}
export function recordVictory(progress:CampaignProgress,id:MapId,hp:number):CampaignProgress{
  const stars=hp>=80?3:hp>=40?2:1;
  return {...progress,[id]:Math.max(progress[id]??0,stars)};
}
