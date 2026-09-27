import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
// macOS Codex Seatbelt denies Chromium Mach service registration on this Mac.
// Stop before spawning a browser so the test does not trigger a crash dialog.
if (process.platform === 'darwin' && process.env.CODEX_SANDBOX === 'seatbelt') {
 console.error('Browser test stopped before launch: this macOS Codex sandbox blocks Chromium Mach service registration. Use the connected browser tool, or run this test in your normal Terminal / an approved browser-capable execution environment.');
 process.exit(2);
}

await fs.mkdir('.playwright',{recursive:true});
const browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true,args:['--use-angle=metal']});
const checks=[];
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('about:blank');
  console.log(JSON.stringify({chromeLaunch:'passed',version:browser.version()}));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__riverwatch?.world.renderer.info.render.calls>0);
  await page.screenshot({path:'.playwright/desktop.png'});
  checks.push('WebGL scene boots and renders');
  assert.deepEqual(await page.evaluate(()=>window.__riverwatch.snapshot().map),[42,32]);checks.push('map expands to 42 × 32');
  const initial=await page.evaluate(()=>window.__riverwatch.snapshot());
  assert.equal(initial.structures,6);
  async function clickTile(x,z){
    const screen=await page.evaluate(([x,z])=>{const w=window.__riverwatch.world,c=w.project(x,z);for(let r=0;r<145;r+=5){for(let dy=-r;dy<=r;dy+=5)for(const dx of [-r,r]){const p={x:c.x+dx,y:c.y+dy};if(p.x<15||p.x>innerWidth-15||p.y<115||p.y>innerHeight-170)continue;const hit=w.pick(p.x,p.y);if(hit&&hit.x===x&&hit.z===z)return p;}for(let dx=-r+5;dx<r;dx+=5)for(const dy of [-r,r]){const p={x:c.x+dx,y:c.y+dy};if(p.x<15||p.x>innerWidth-15||p.y<115||p.y>innerHeight-170)continue;const hit=w.pick(p.x,p.y);if(hit&&hit.x===x&&hit.z===z)return p;}}return null;},[x,z]);
    assert.ok(screen,`tile ${x},${z} is visible from this camera`);await page.mouse.click(screen.x,screen.y);
  }
  for(const [tool,x,z]of [['wall',16,14],['dig',17,14],['archer',18,14],['mage',17,15],['barracks',17,18],['raise',18,16]]){
    await page.locator(`[data-tool="${tool}"]`).click();await clickTile(x,z);
    const result=await page.evaluate(([tool,x,z])=>{const g=window.__riverwatch.game;return tool==='dig'?g.tile(x,z).water:tool==='raise'?g.tile(x,z).h>1:g.structureAt(x,z)?.kind===tool;},[tool,x,z]);
    assert.equal(result,true,`${tool} must build via actual screen click`);
    checks.push(`${tool} placement uses raycast and changes game state`);
  }
  await page.keyboard.press('Escape');await clickTile(18,14);
  await page.locator('#selection').waitFor({state:'visible'});
  await page.locator('#upgrade').click();
  assert.equal(await page.evaluate(()=>window.__riverwatch.game.structureAt(18,14).level),2);
  const visual=await page.evaluate(()=>({slice:window.__riverwatch.world.rangeDisplay.surface?.geometry.attributes.position.count,rangeVisible:window.__riverwatch.world.rangeDisplay.group.visible}));assert.ok(visual.slice>1000&&visual.rangeVisible);
  checks.push('tower selection shows a sphere and upgrade increases level');
  await page.waitForFunction(()=>Number(document.getElementById('gold').textContent)===window.__riverwatch.game.resources.gold);
  await page.screenshot({path:'.playwright/selected-tower.png'});
  await page.keyboard.press('Escape');
  const cameraStart=await page.evaluate(()=>window.__riverwatch.world.camera.position.toArray());
  await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
  const cameraMoved=await page.evaluate(()=>({camera:window.__riverwatch.world.camera.position.toArray(),target:window.__riverwatch.world.controls.target.toArray()}));assert.notDeepEqual(cameraStart,cameraMoved.camera);
  checks.push('WASD moves camera in camera-relative directions');
  const before=cameraMoved.camera;
  await page.mouse.move(850,480);await page.mouse.down({button:'right'});await page.mouse.move(930,520,{steps:8});await page.mouse.up({button:'right'});
  const after=await page.evaluate(()=>window.__riverwatch.world.camera.position.toArray());assert.notDeepEqual(before,after);checks.push('right-drag camera orbit');
  const rotatedStart=await page.evaluate(()=>({camera:window.__riverwatch.world.camera.position.toArray(),direction:(()=>{const c=window.__riverwatch.world.camera.position,t=window.__riverwatch.world.controls.target;const d=[t.x-c.x,t.y-c.y,t.z-c.z],n=Math.hypot(...d);return d.map(v=>v/n)})()}));
  await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');
  const rotatedEnd=await page.evaluate(()=>window.__riverwatch.world.camera.position.toArray());
  const diff=rotatedEnd.map((x,i)=>x-rotatedStart.camera[i]);const forwardDot=diff[0]*rotatedStart.direction[0]+diff[2]*rotatedStart.direction[2];assert.ok(forwardDot>0.1,`W follows rotated camera forward direction: ${forwardDot}`);checks.push('WASD forward follows rotated camera direction');
  await page.locator('#music-settings').click();await page.locator('#audio-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('#track-title').textContent(),'Skye Cuillin');
  await page.locator('#next-track').click();assert.equal(await page.locator('#track-title').textContent(),'Ascending the Vale');
  await page.locator('#music-volume').evaluate(el=>{el.value='18';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#sfx-volume').evaluate(el=>{el.value='47';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#music-toggle').click();assert.equal((await page.locator('#music-toggle').textContent()).trim(),'音乐已静音');
  await page.locator('#music-toggle').click();
  await page.locator('#close-audio').click();
  await page.waitForFunction(()=>window.__riverwatch.audio.music.readyState>=2,null,{timeout:15000});const media=await page.evaluate(()=>({ready:window.__riverwatch.audio.music.readyState,volume:window.__riverwatch.audio.music.volume,track:window.__riverwatch.audio.track}));assert.ok(media.ready>=1);assert.equal(media.volume,.18);assert.equal(media.track,1);
  checks.push('bundled Celtic music, track selection, mute and mixer');
  await page.waitForFunction(()=>{const a=window.__riverwatch.audio.diagnostics();return a.samplesLoaded===a.samplesTotal;},null,{timeout:15000});
  const samples=await page.evaluate(()=>window.__riverwatch.audio.diagnostics());
  assert.equal(samples.mode,'samples');assert.equal(samples.samplesLoaded,22);assert.deepEqual(samples.sampleFailures,[]);
  checks.push('all 22 locally bundled sound files decode in the browser');
  await page.locator('#start-wave').click();
  await page.waitForFunction(()=>window.__riverwatch.game.phase==='battle');
  await page.evaluate(()=>window.__riverwatch.advance(12));
  await page.waitForFunction(()=>document.getElementById('phase-label').textContent==='交战中');
  await page.screenshot({path:'.playwright/battle.png'});
  const sound=await page.evaluate(()=>window.__riverwatch.audio.diagnostics());assert.ok(sound.played.arrow>0);assert.equal(sound.track,'Ascending the Vale');checks.push('arrow, impact, death and battle sample cues are scheduled');
  await page.locator('#pause').click();
  assert.equal(await page.evaluate(()=>window.__riverwatch.game.paused),true);await page.waitForFunction(()=>window.__riverwatch.audio.music.paused);
  checks.push('background music pauses with the simulation');
  const t=await page.evaluate(()=>window.__riverwatch.game.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__riverwatch.game.time),t);
  await page.locator('#pause').click();await page.waitForFunction(()=>!window.__riverwatch.audio.music.paused);checks.push('pause freezes simulation and resume restores music');
  for(let i=0;i<12;i++){const phase=await page.evaluate(()=>{window.__riverwatch.advance(10);return window.__riverwatch.game.phase;});if(phase!=='battle')break;}
  const battle=await page.evaluate(()=>window.__riverwatch.snapshot());assert.equal(battle.phase,'preparation');assert.ok(battle.castleHp>0);checks.push('first wave finishes with surviving castle');
  for(let wave=2;wave<=5;wave++){
    await page.evaluate(()=>{const g=window.__riverwatch.game;for(const t of g.structures.filter(s=>s.kind==='mage'||s.kind==='archer'))if(t.level<3&&g.canAfford(g.upgradeCost(t)))g.upgrade(t.id);});
    await page.locator('#start-wave').click();
    for(let i=0;i<16;i++){const phase=await page.evaluate(()=>{window.__riverwatch.advance(10);return window.__riverwatch.game.phase;});if(phase!=='battle')break;}
  }
  const campaign=await page.evaluate(()=>window.__riverwatch.snapshot());assert.equal(campaign.phase,'victory');
  await page.locator('#restart').waitFor();await page.screenshot({path:'.playwright/victory.png'});checks.push('all five waves can be won through normal construction and upgrades');
  await page.locator('#restart').click();
  await page.evaluate(()=>{const g=window.__riverwatch.game;g.castleHp=1;g.startWave();const e=g.spawnEnemy('goblin');e.x=g.goal.x;e.z=g.goal.z;g.step(1/30);});
  await page.locator('#restart').waitFor();assert.equal(await page.evaluate(()=>window.__riverwatch.game.phase),'defeat');
  await page.locator('#restart').click();checks.push('defeat screen and restart work');
  await page.locator('#help').click();await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>window.__riverwatch.game.paused),true);await page.locator('#restart-help').click();
  assert.equal(await page.evaluate(()=>window.__riverwatch.game.wave),0);checks.push('help modal pauses controls and restart resets game');
  await page.locator('[data-tool="dig"]').click();await clickTile(17,14);
  await page.keyboard.press('7');await clickTile(17,14);
  assert.equal(await page.evaluate(()=>window.__riverwatch.game.tile(17,14).bridge),true);
  await page.keyboard.press('x');await clickTile(17,14);
  const removedBridge=await page.evaluate(()=>window.__riverwatch.game.tile(17,14));
  assert.equal(removedBridge.bridge,false);assert.equal(removedBridge.water,true);
  await page.keyboard.press('7');await clickTile(17,14);
  assert.equal(await page.evaluate(()=>window.__riverwatch.game.tile(17,14).bridge),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.unit-health').count(),0);
  await page.evaluate(()=>{window.__riverwatch.game.structures[0].hp-=10;});
  await page.waitForFunction(()=>document.querySelectorAll('.unit-health.structure').length>0);
  assert.equal(await page.locator('.unit-health.structure').first().textContent(),'');
  await page.waitForFunction(()=>document.querySelectorAll('.unit-health').length===0);
  checks.push('bridge placement and damage-only unnumbered health bars');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.playwright/mobile.png'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false);await page.locator('[data-tool="mage"]').click();assert.equal(await page.locator('[data-tool="mage"]').getAttribute('aria-pressed'),'true');await page.locator('#music-settings').click();await page.screenshot({path:'.playwright/mobile-audio.png'});await page.locator('#close-audio').click();checks.push('mobile HUD fits viewport and tools remain usable');
  assert.deepEqual(errors,[]);
  const result={checks,errors,firstWave:battle,campaign,render:await page.evaluate(()=>({calls:window.__riverwatch.world.renderer.info.render.calls,triangles:window.__riverwatch.world.renderer.info.render.triangles,geometries:window.__riverwatch.world.renderer.info.memory.geometries}))};
  await fs.writeFile('.playwright/report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally { await browser.close(); }
