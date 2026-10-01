import type { Tool } from '../simulation/game';
export const BUILD_GROUPS = {
  towers:['archer','mage','barracks','cannon','frost','tesla'],
  terrain:['wall','dig','raise','bridge','palisade','spikes','road','lower'],
} satisfies Record<string,Tool[]>;
export type BuildGroup=keyof typeof BUILD_GROUPS;
export function buildShortcut(group:BuildGroup,code:string):Tool|undefined {
  if(!/^Digit[0-9]$/.test(code))return;
  return BUILD_GROUPS[group][(Number(code.slice(-1))+9)%10];
}
