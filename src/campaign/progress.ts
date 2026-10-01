import { victoryStars } from '../simulation/result';
import type { MapId } from '../simulation/maps';
export type CampaignProgress=Partial<Record<MapId,number>>;
export const PLATING_KEY='riverwatch.campaign.plating.v1';
export const PROGRESS_KEY='riverwatch.campaign.v1';
export function readProgress(raw:string|null):CampaignProgress{
  try{const data=JSON.parse(raw??'{}');const result:CampaignProgress={};
    for(const id of ['windford'] as const){const n=data?.[id];if(Number.isInteger(n)&&n>=1&&n<=3)result[id]=n;}
    return result;
  }catch{return {};}
}
export function recordVictory(progress:CampaignProgress,id:MapId,hp:number):CampaignProgress{
  const stars=victoryStars(hp);if(!stars)return {...progress};
  return {...progress,[id]:Math.max(progress[id]??0,stars)};
}

/** Earlier preview builds could award one or two coated stars; those no longer qualify. */
export function readPlating(raw:string|null):CampaignProgress{
 const progress=readProgress(raw);return Object.fromEntries(Object.entries(progress).filter(([,stars])=>stars===3)) as CampaignProgress;
}
