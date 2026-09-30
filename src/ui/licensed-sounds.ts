import { SOUND_LIBRARY, type AudioCue, type SoundDefinition } from './sound-library';

const sound = (cue:AudioCue, file:string, gain:number, duration:number, rate=1):SoundDefinition =>
  ({...SOUND_LIBRARY[cue], files:['licensed/'+file+'.wav'], gain, duration, rate});

// Optional local pack. Keep originals out of the source repository; see docs/audio/README.md.
export const LICENSED_SOUNDS:Partial<Record<AudioCue,SoundDefinition>>={
  // Hero release intentionally uses the original bundled swing-2.wav profile.
  'hero-hit':sound('hero-hit','hero-contact-dry',.16,.2),
  'hero-rapier':sound('hero-rapier','rapier-cut',.24,.45),
  'hero-flight':sound('hero-flight','wind-flight',.20,1.4),
  'hero-land':sound('hero-land','wind-land',.13,.6),
  'hero-piercing':sound('hero-piercing','light-burst',.24,.85,1.1),
  'hero-rain':sound('hero-rain','wind-flight',.18,.85,1.2),
  'hero-rain-hit':sound('hero-rain-hit','hero-contact-dry',.12,.2,1.05),
  'hero-gale':sound('hero-gale','wind-gale',.24,1.5),
  'hero-skill-hit':sound('hero-skill-hit','elemental-hit',.23,.58),
  'hero-arrival':sound('hero-arrival','holy-field',.16,1.7,1.08),
  'hero-fall':sound('hero-fall','wind-fall',.19,2),
  arrow:sound('arrow','tower-arrow-release',.46,.29),
  impact:sound('impact','arrow-body',.22,.2,.9),
  'bow-heavy':sound('bow-heavy','elf-bow',.29,.58,.8),
  'bow-volley':sound('bow-volley','tower-arrow-release',.40,.29,1.12),
  cast:sound('cast','elemental-cast',.23,.5),
  'magic-hit':sound('magic-hit','elemental-hit',.21,.55),
  'arcane-cast':sound('arcane-cast','light-burst',.20,.55,1.12),
  'arcane-hit':sound('arcane-hit','elemental-hit',.25,.58,.83),
  'fire-cast':sound('fire-cast','fire-cast',.20,.5),
  'fire-hit':sound('fire-hit','fire-hit',.25,1),
  explosion:sound('explosion','shell-hit',.30,.95),
  'mortar-hit':sound('mortar-hit','mortar-hit',.34,1.45),
  missile:sound('missile','arcane-missile-launch',.35,.68),
  'missile-hit':sound('missile-hit','arcane-missile-hit',.34,.65),
  frost:sound('frost','ice-cast',.23,.63),
  'ice-hit':sound('ice-hit','ice-hit',.19,.6),
  blizzard:sound('blizzard','wind-gale',.18,.8,1.1),
  'blizzard-hit':sound('blizzard-hit','ice-hit',.20,.5,1.1),
  glacier:sound('glacier','ice-cast',.18,.75,.85),
  'glacier-hit':sound('glacier-hit','ice-hit',.26,.7,.78),
  thunder:sound('thunder','electric-cast',.34,.55),
  'lightning-hit':sound('lightning-hit','electric-hit',.31,.45,1.13),
  'chain-lightning':sound('chain-lightning','electric-cast',.35,.55,1.12),
  judgment:sound('judgment','judgment-strike',.58,.54),
  'soldier-sword':sound('soldier-sword','blade-flesh',.21,.46),
  'spellblade-cast':sound('spellblade-cast','elemental-cast',.19,.45,1.16),
  'spellblade-hit':sound('spellblade-hit','elemental-hit',.19,.43,1.15),
  'spellblade-slash':sound('spellblade-slash','enchanted-blade',.23,.58),
  'paladin-sword':sound('paladin-sword','armor-strike',.24,.6,.9),
  'paladin-block':sound('paladin-block','armor-strike',.21,.4,1.14),
  'paladin-sanctuary':sound('paladin-sanctuary','holy-field',.21,1.8),
  'ironclad-attack':sound('ironclad-attack','armor-strike',.22,.5,.83),
  'runeguard-attack':sound('runeguard-attack','light-burst',.17,.6,.85),
  'hexer-attack':sound('hexer-attack','elemental-cast',.16,.55,.76),
  'enemy-magic-hit':sound('enemy-magic-hit','elemental-hit',.17,.5,.9),
};
export const LICENSED_FILES=[...new Set(Object.values(LICENSED_SOUNDS).flatMap(s=>s.files))];

/** Only accept known local assets. A missing/malformed optional pack uses bundled audio. */
export function licensedFiles(value:unknown):string[]{
  if(!value||typeof value!=='object'||!('version' in value)||value.version!==1||!('files' in value)||!Array.isArray(value.files))return [];
  const allowed=new Set(LICENSED_FILES);
  return [...new Set(value.files.flatMap(item=>{
    const file=item&&typeof item==='object'&&typeof item.file==='string'?'licensed/'+item.file:'';
    return allowed.has(file)?[file]:[];
  }))];
}
