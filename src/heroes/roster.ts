import type { MapId } from '../simulation/maps';

export const HERO = {
  id: 'aerilia', name: '艾莉娅', surname: '风翎', title: '逐风的游侠',
  english: 'AERILIA WINDFEATHER', age: 17, height: '160 cm', race: '森之精灵',
  portrait: '/art/heroes/aerilia-standing-final.webp', turnaround: '/art/heroes/aerilia-voxel-final.webp',
  avatar: '/art/heroes/aerilia-avatar.webp',
  splash: '/art/heroes/aerilia-windborne.webp', hallAvatar: '/art/heroes/aerilia-windborne-avatar.webp',
  poster: '/art/heroes/aerilia-poster.webp',
  quote: '「风会告诉我，下一支箭该飞向哪里。」',
  story: '来自翡翠密林的年轻游侠。以长弓守望远方，以刺剑回应近敌；当翠色光翼在肩后展开，连山谷间的风也会为她让路。',
  skills: [
    { mark: '➶', name: '林风之弦', type: '弓箭 · 远程', text: '以精准弓术迎击远处的敌人。' },
    { mark: '⚔', name: '叶影刺剑', type: '刺剑 · 近战', text: '敌人逼近时，切换轻巧的刺剑迎战。' },
    { mark: '➶', name: '贯风箭', type: '自动技能 · 穿透', text: '凝聚贯穿敌阵的风之箭，削穿重甲。' },
    { mark: '✧', name: '翠羽箭雨', type: '自动技能 · 范围', text: '向密集敌群降下六轮魔法箭雨，伤害并减速。' },
    { mark: '↻', name: '护身风暴', type: '自动技能 · 防御', text: '被近敌包围时展开风暴，眩晕敌军并获得减伤。' },
    { mark: '✧', name: '风灵之翼', type: '魔法 · 机动', text: '凝聚魔法羽翼飞行，借风加速赶往防线。' },
  ],
} as const;
export type HeroId = typeof HERO.id;
export type HeroLoadouts = Partial<Record<MapId, HeroId>>;
export const HERO_LOADOUT_KEY = 'riverwatch.hero-loadouts.v1';
export function readHeroLoadouts(raw: string | null): HeroLoadouts {
  try {
    const value: unknown = JSON.parse(raw ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: HeroLoadouts = {};
    for (const map of ['windford'] as const)
      if ((value as Record<string, unknown>)[map] === HERO.id) result[map] = HERO.id;
    return result;
  } catch { return {}; }
}
export function equipHero(loadouts: HeroLoadouts, map: MapId, hero: HeroId | null): HeroLoadouts {
  const next = { ...loadouts };
  if (hero) next[map] = hero; else delete next[map];
  return next;
}
