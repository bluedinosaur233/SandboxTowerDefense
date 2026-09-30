import type { TowerKind, TowerBranch } from './towers';
import { ENEMIES, type EnemyKind } from './enemies';

export type SoundKind = 'boss-arrival'|'boss-windup'|'boss-slam'|'boss-rage'|'boss-death'|'arrow'|'cast'|'impact'|'magic-hit'|'death'|'melee'|'wall-hit'|'collapse'|'castle-hit'|'recruit'|'build'|'dig'|'raise'|'upgrade'|'error'|'wave'|'wave-clear'|'victory'|'defeat'|'splash'|'cannon'|'explosion'|'frost'|'thunder'|'bow-heavy'|'bow-volley'|'fire-cast'|'fire-hit'|'arcane-cast'|'arcane-hit'|'mortar'|'mortar-hit'|'missile'|'missile-hit'|'blizzard'|'blizzard-hit'|'glacier'|'glacier-hit'|'ice-hit'|'lightning-hit'|'chain-lightning'|'judgment'|'hero-arrow'|'hero-hit'|'hero-rapier'|'hero-flight'|'hero-land'|'hero-piercing'|'hero-rain'|'hero-rain-hit'|'hero-gale'|'hero-skill-hit'|'hero-fall'|'hero-arrival'|'soldier-fall'|'soldier-sword'|'spellblade-cast'|'spellblade-hit'|'spellblade-slash'|'paladin-sword'|'paladin-block'|'paladin-sanctuary'|'goblin-attack'|'goblin-death'|'runner-attack'|'runner-death'|'brute-attack'|'brute-death'|'ironclad-attack'|'ironclad-death'|'runeguard-attack'|'runeguard-death'|'marshling-attack'|'marshling-death'|'hexer-attack'|'hexer-death'|'gargoyle-attack'|'gargoyle-death'|'enemy-magic-hit';

// Semantic cues stay with the shot, so its impact keeps the firing unit's identity.
const towerCues:Record<TowerKind|TowerBranch,readonly [SoundKind,SoundKind]>={
  archer:['arrow','impact'],mage:['cast','magic-hit'],cannon:['cannon','explosion'],frost:['frost','ice-hit'],tesla:['thunder','lightning-hit'],
  marksman:['bow-heavy','impact'],ranger:['bow-volley','impact'],inferno:['fire-cast','fire-hit'],arcane:['arcane-cast','arcane-hit'],
  bombard:['mortar','mortar-hit'],shrapnel:['missile','missile-hit'],blizzard:['blizzard','blizzard-hit'],glacier:['glacier','glacier-hit'],tempest:['chain-lightning','lightning-hit'],judgment:['judgment','lightning-hit'],
};
export function towerSound(tower:{kind:TowerKind;branch?:TowerBranch},hit=false):SoundKind{return towerCues[tower.branch??tower.kind][hit?1:0];}
export function enemySound(kind:EnemyKind,death=false):SoundKind{if(kind==='grom'&&death)return 'boss-death';const base=ENEMIES[kind].base??kind;return `${base}-${death?'death':'attack'}` as SoundKind;}
