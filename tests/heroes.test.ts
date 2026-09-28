import test from 'node:test';
import assert from 'node:assert/strict';
import { equipHero, readHeroLoadouts } from '../src/heroes/roster';

test('hero assignments stay independent per map and survive validated storage', () => {
  const first = equipHero({}, 'river', 'aerilia');
  const both = equipHero(first, 'mountain', 'aerilia');
  const removed = equipHero(both, 'river', null);
  assert.deepEqual(first, { river: 'aerilia' });
  assert.deepEqual(removed, { mountain: 'aerilia' });
  assert.deepEqual(readHeroLoadouts(JSON.stringify(both)), both);
  assert.deepEqual(readHeroLoadouts('{"river":"missing-hero","mountain":"aerilia","unknown":"aerilia"}'), { mountain: 'aerilia' });
  for (const bad of ['broken', 'null', '[]', '"aerilia"']) assert.deepEqual(readHeroLoadouts(bad), {});
});
