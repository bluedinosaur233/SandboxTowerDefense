import { icon } from './icons';

/** Local art crops; button names and prices remain accessible DOM text. */
export function portrait(kind: string) {
  if (!['archer', 'mage', 'barracks', 'wall'].includes(kind)) return icon(kind);
  return '<img class="tool-portrait" src="/art/ui/' + kind + '.png" width="106" height="106" alt="" aria-hidden="true" draggable="false">';
}
