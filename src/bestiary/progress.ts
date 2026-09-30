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

/** Each deployment has its own announcements; the journal remains a permanent collection. */
export class EncounterTracker {
  private seen=new Set<EnemyKind>();
  unread:EnemyKind[]=[];
  record(kind:EnemyKind){if(this.seen.has(kind))return false;this.seen.add(kind);this.unread.push(kind);return true;}
  read(kind:EnemyKind){this.unread=this.unread.filter(k=>k!==kind);}
  reset(){this.seen.clear();this.unread=[];}
}
