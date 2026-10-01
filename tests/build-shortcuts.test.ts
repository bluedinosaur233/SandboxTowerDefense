import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILD_GROUPS,buildShortcut} from '../src/ui/build-shortcuts';
test('number keys refer only to the visible build page in card order',()=>{
  assert.equal(buildShortcut('towers','Digit1'),'archer');
  assert.equal(buildShortcut('towers','Digit4'),'cannon');
  assert.equal(buildShortcut('terrain','Digit1'),'wall');
  assert.equal(buildShortcut('terrain','Digit8'),'lower');
  assert.equal(buildShortcut('towers','Digit7'),undefined);
  assert.equal(buildShortcut('terrain','Digit0'),undefined);
  for(const group of ['towers','terrain'] as const)BUILD_GROUPS[group].forEach((tool,i)=>assert.equal(buildShortcut(group,'Digit'+(i+1)),tool));
});
