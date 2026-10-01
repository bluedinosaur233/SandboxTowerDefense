/** Rating is awarded only to a completed run. A hero must actually accompany it. */
export function victoryStars(hp:number):number{return hp>=100?3:hp>=50?2:hp>=1?1:0;}
export function battleRating(game:{phase:string;castleHp:number;hero:unknown;heroDeaths:number}){
 const stars=game.phase==='victory'?victoryStars(game.castleHp):0;
 return {stars,plated:stars===3&&!!game.hero&&game.heroDeaths===0};
}
export const BOSS_FALL={impact:1.5,duration:2.4};
/** Separate beats let the boss banner leave before the rest of the HUD. */
export function resultTimeline(bossFallRemaining=0,reduced=false){
 const hudAt=Math.max(0,bossFallRemaining)+.7;
 const flourishAt=hudAt+(reduced?.16:.65),panelAt=flourishAt+(reduced?.25:1.55);
 return {hudAt,flourishAt,panelAt,starAt:(i:number)=>panelAt+.35+i*(reduced?.15:.48),plateAt:(stars:number)=>panelAt+.35+stars*(reduced?.15:.48)+.45};
}
