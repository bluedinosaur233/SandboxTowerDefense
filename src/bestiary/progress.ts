import { isEnemyKind, type EnemyKind } from '../simulation/enemies';
export const BESTIARY_KEY='riverwatch.bestiary.v1';
export interface EnemyJournal { known:EnemyKind[]; unread:EnemyKind[] }
export function readJournal(raw:string|null):EnemyJournal {
  try{
    const data=JSON.parse(raw??'null');
    const known:EnemyKind[]=Array.isArray(data?.known)?[...new Set<EnemyKind>(data.known.filter(isEnemyKind))]:[];
    const unread:EnemyKind[]=Array.isArray(data?.unread)?[...new Set<EnemyKind>(data.unread.filter(isEnemyKind))].filter(kind=>known.includes(kind)):[];
    return {known,unread};
  }catch{return {known:[],unread:[]};}
}
export function discover(journal:EnemyJournal,kind:EnemyKind):boolean {
  if(journal.known.includes(kind))return false;
  journal.known.push(kind);journal.unread.push(kind);return true;
}
export function readEntry(journal:EnemyJournal,kind:EnemyKind){journal.unread=journal.unread.filter(k=>k!==kind);}
