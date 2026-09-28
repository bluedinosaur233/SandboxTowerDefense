export type DamageType = 'physical' | 'magic';
export interface Defenses { armor:number; resistance:number }
export const DAMAGE_LABELS:Record<DamageType,string>={physical:'物理伤害',magic:'魔法伤害'};
export function damageAfterDefense(amount:number,type:DamageType,defenses:Defenses):number {
  const reduction=Math.max(0,Math.min(100,type==='physical'?defenses.armor:defenses.resistance));
  return Math.max(0,amount)*(1-reduction/100);
}
export function applyDamage(target:Defenses&{hp:number},amount:number,type:DamageType):number {
  const damage=damageAfterDefense(amount,type,target);target.hp=Math.max(0,target.hp-damage);return damage;
}
