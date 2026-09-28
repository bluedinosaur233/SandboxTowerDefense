import type { SoundKind } from '../simulation/game';
export type AudioCue = SoundKind | 'click';
export interface SoundDefinition { files: string[]; gain: number; interval: number; rate?: number; duration?: number }

// Sources, original filenames and licenses are recorded in public/audio/sfx.
export const SOUND_LIBRARY: Record<AudioCue, SoundDefinition> = {
  cannon:{files:['wood-heavy.ogg'],gain:.38,interval:.18,rate:.62,duration:.55},
  explosion:{files:['wood-heavy-2.ogg','mining-2.ogg'],gain:.45,interval:.16,rate:.6,duration:.8},
  frost:{files:['magic.wav'],gain:.15,interval:.15,rate:1.6,duration:.45},
  thunder:{files:['magic.wav','metal-hit.ogg'],gain:.3,interval:.13,rate:.65,duration:.45},
  arrow: { files:['swing-1.wav','swing-2.wav'], gain:.22, interval:.08, rate:1.25 },
  cast: { files:['magic.wav'], gain:.19, interval:.13, rate:1.12, duration:.65 },
  impact: { files:['soft-hit.ogg','light-hit.ogg'], gain:.30, interval:.08 },
  'magic-hit': { files:['magic.wav'], gain:.26, interval:.16, rate:.8, duration:.95 },
  death: { files:['monster.wav'], gain:.17, interval:.23, duration:.8 },
  melee: { files:['sword.wav','metal-hit.ogg'], gain:.24, interval:.09, duration:.65 },
  'wall-hit': { files:['mining.ogg','mining-2.ogg'], gain:.38, interval:.12 },
  collapse: { files:['wood-heavy.ogg','wood-heavy-2.ogg'], gain:.47, interval:.18, rate:.8 },
  'castle-hit': { files:['wood-heavy-2.ogg'], gain:.50, interval:.24, rate:.72 },
  dig: { files:['mining.ogg','mining-2.ogg'], gain:.30, interval:.12 },
  splash: { files:['water.wav'], gain:.17, interval:.25, duration:.6 },
  raise: { files:['mining-2.ogg'], gain:.32, interval:.12 },
  build: { files:['chop.ogg','wood-medium.ogg'], gain:.32, interval:.1 },
  upgrade: { files:['coins.ogg'], gain:.22, interval:.2, duration:.9 },
  error: { files:['latch.ogg'], gain:.22, interval:.2, rate:.8 },
  recruit: { files:['armor.ogg'], gain:.16, interval:.3 },
  wave: { files:['bell.ogg'], gain:.42, interval:.7, rate:.72, duration:2 },
  'wave-clear': { files:['bell-2.ogg'], gain:.28, interval:.7, rate:1.05 },
  victory: { files:['notification.wav'], gain:.34, interval:1, duration:1.4 },
  defeat: { files:['bell.ogg'], gain:.36, interval:1, rate:.55, duration:1.7 },
  click: { files:['click.ogg'], gain:.18, interval:.06 },
};
export const SOUND_FILES = [...new Set(Object.values(SOUND_LIBRARY).flatMap(s=>s.files))];
export const UI_CUES = new Set<AudioCue>(['click','wave','wave-clear','victory','defeat','error','upgrade','build','dig','raise']);
