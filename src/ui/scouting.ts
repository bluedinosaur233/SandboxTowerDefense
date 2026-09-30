import type { EnemyKind } from '../simulation/enemies';
export function scoutGroups(plan:{kind:EnemyKind;entrance:number}[],entrance:number,known:(kind:EnemyKind)=>boolean){
  const groups=new Map<string,{kind:EnemyKind|null;count:number}>();
  for(const item of plan){if(item.entrance!==entrance)continue;const visible=known(item.kind),key=visible?item.kind:'unknown';
    const group=groups.get(key)??{kind:visible?item.kind:null,count:0};group.count++;groups.set(key,group);
  }return [...groups.values()];
}
