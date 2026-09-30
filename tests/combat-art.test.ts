import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {portrait} from '../src/ui/portraits';
import {enemyPortrait} from '../src/bestiary/portrait';
import {TOWER_KINDS,BRANCHES} from '../src/simulation/towers';
import {BARRACKS_BRANCHES} from '../src/simulation/barracks';
import {ENEMY_KINDS} from '../src/simulation/enemies';

test('all tower specializations and enemy portraits resolve to packaged raster art',async()=>{
  const markup=[...[...TOWER_KINDS,'barracks',...Object.keys(BRANCHES),...Object.keys(BARRACKS_BRANCHES)].map(portrait),...ENEMY_KINDS.map(enemyPortrait)];
  for(const html of markup){
    assert.ok(html.startsWith('<img '),'missing image mapping: '+html);
    const url=html.match(/src="([^"]+)"/)![1],data=await readFile('public'+url);
    assert.equal(data.subarray(0,4).toString(),'RIFF',url);assert.equal(data.subarray(8,12).toString(),'WEBP',url);
  }
});
