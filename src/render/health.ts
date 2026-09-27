/** Brief damage feedback, timed by simulation time so pause freezes the display. */
export class DamageVisibility {
  private states=new Map<number,{hp:number;until:number}>();
  clear(){this.states.clear();}
  update(entities:{id:number;hp:number;maxHp:number}[],time:number){
    const alive=new Set<number>();
    for(const entity of entities){
      if(entity.hp<=0)continue;
      alive.add(entity.id);
      const previous=this.states.get(entity.id);
      const damaged=entity.hp<(previous?.hp??entity.maxHp);
      this.states.set(entity.id,{hp:entity.hp,until:damaged?time+3:previous?.until??-Infinity});
    }
    for(const id of this.states.keys())if(!alive.has(id))this.states.delete(id);
  }
  opacity(id:number,time:number){return Math.max(0,Math.min(1,((this.states.get(id)?.until??-Infinity)-time)/.4));}
}
