import { icon } from './icons';

/** Local art crops; button names and prices remain accessible DOM text. */
export function portrait(kind: string) {
  if (['archer','mage','barracks','cannon','frost','tesla','marksman','ranger','inferno','arcane','spellblade','paladin','bombard','shrapnel','blizzard','glacier','tempest','judgment'].includes(kind)) {
    return '<img class="tool-portrait" src="/art/towers/'+kind+'.webp" width="384" height="384" alt="" aria-hidden="true" draggable="false">';
  }
  if (!['wall', 'palisade', 'spikes', 'road', 'dig', 'raise', 'bridge', 'lower'].includes(kind)) return icon(kind);
  return '<img class="tool-portrait" src="/art/ui/' + kind + '.png" width="106" height="106" alt="" aria-hidden="true" draggable="false">';
}
