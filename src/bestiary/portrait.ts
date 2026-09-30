import { ENEMIES, type EnemyKind } from '../simulation/enemies';

/** Reviewed XEM portraits; unknown-enemy concealment stays with the caller. */
export function enemyPortrait(kind:EnemyKind):string {
  return `<img class="enemy-portrait" src="/art/enemies/${kind}.webp" width="384" height="486" alt="${ENEMIES[kind].name}体素肖像" draggable="false">`;
}
