/** Shared by simulation and UI so production previews match the actual payouts. */
export const ECONOMY = {
  startingGold: 380,
  waveSupply: 160,
  combatUpgradeMultiplier: .85,
  deliveryInterval: 15,
  deliveriesPerWave: 2,
  deliveryGold: 12,
  deliveryPerLevel: 6,
  harvestPerLevel: 1,
  outpostHealthMultiplier: 1.6,
  streakGold: 4,
  streakCap: 3,
  outpostUpgrade: { farm: 120, mine: 160 },
} as const;

export function deliveryGold(post: {level:number}) {
  return ECONOMY.deliveryGold + (post.level - 1) * ECONOMY.deliveryPerLevel;
}
export function streakGold(post: {streak:number}) {
  return Math.min(post.streak, ECONOMY.streakCap) * ECONOMY.streakGold;
}
export function harvestGold(post: {income:number;level:number;streak:number}) {
  return Math.round(post.income * (1 + (post.level - 1) * ECONOMY.harvestPerLevel)) + streakGold(post);
}
