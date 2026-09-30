import type { AudioCue } from './sound-library';

/** Only these samples are attack vocals. Weapon contacts and death cues stay intact. */
export const ATTACK_VOCALS=new Set<AudioCue>(['goblin-attack','runner-attack','brute-attack','marshling-attack','gargoyle-attack']);
export class CombatVoices {
  private lastAny=-Infinity;
  private lastSpecies=new Map<AudioCue,number>();
  private lastAttempt=new Map<AudioCue,number>();
  allow(kind:AudioCue,now:number,random:()=>number=Math.random){
    if(!ATTACK_VOCALS.has(kind))return true;
    // A crowd must not get hundreds of lottery attempts per frame.
    if(now-this.lastAny<1.8||now-(this.lastSpecies.get(kind)??-Infinity)<5||now-(this.lastAttempt.get(kind)??-Infinity)<1.2)return false;
    this.lastAttempt.set(kind,now);
    if(random()>=.28)return false;
    this.lastAny=now;this.lastSpecies.set(kind,now);return true;
  }
}
