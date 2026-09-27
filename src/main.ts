import './style.css';
import * as THREE from 'three';
import { Game, COSTS, LABELS, STATS, type Tool, type Point, type Structure } from './simulation/game';
import { MAP_LIST, type MapId } from './simulation/maps';
import { World } from './render/world';
import { icon } from './ui/icons';
import { portrait } from './ui/portraits';
import { Audio, TRACKS } from './ui/audio';

const app=document.querySelector<HTMLDivElement>('#app')!;
const tools:Tool[]=['wall','dig','archer','mage','barracks','raise','bridge'];
const descriptions:Record<Tool,string>={inspect:'选择建筑查看、升级或拆除',wall:'改变敌军路线 · 敌人可攻击摧毁',dig:'开凿水道 · 普通敌军减速 62%',archer:'快速单体攻击 · 球形射程 6.4 格',mage:'魔法范围伤害 · 球形射程 5.9 格',barracks:'自动训练 2 名卫兵 · 拦截近处敌军',raise:'抬高地势 · 改变通路与三维射程',bridge:'在水道上逐格搭木桥 · 两军可快速通行',remove:'拆除建筑或木桥 · 返还 50% 基础资源'};
app.innerHTML=`
  <main id="world"></main><div class="vignette"></div><div id="health-bars" aria-hidden="true"></div>
  <header class="identity"><div class="crest">${icon('crown')}</div><div><div class="eyebrow">R I V E R W A T C H</div><h1>暮河守望</h1><div id="chapter-copy" class="chapter"><span></span> 第一章 · 雾林边境</div></div></header>
  <section class="resource-bar" aria-label="领地资源"><div class="resource gold">${icon('coin')}<span id="gold">380</span><small>金币</small></div><div class="resource">${icon('wood')}<span id="wood">180</span><small>木材</small></div><div class="resource">${icon('stone')}<span id="stone">160</span><small>石料</small></div><i></i><div class="resource castle-health">${icon('heart')}<span id="castle-hp">100</span><small>城防</small></div></section>
  <aside class="objective"><div id="objective-eyebrow" class="eyebrow">THE BORDERLANDS</div><h2 id="objective-title">在暮河，筑起你的防线。</h2><p id="objective-description">地形决定战术。守住城堡，迎接黎明。</p><div class="objective-meta"><span id="phase-dot"></span><span id="phase-label">准备阶段</span><b>／</b><span id="enemy-count">先布防，再吹响号角</span></div></aside>
  <div class="top-actions"><button id="map-select" class="icon-button" title="选择地图" aria-label="选择地图">${icon('mountain')}</button><button id="paths" class="icon-button active" title="显示敌军预计路线" aria-label="显示敌军预计路线" aria-pressed="true">${icon('route')}</button><button id="sound" class="icon-button" title="开启 / 关闭音效" aria-label="开启 / 关闭音效" aria-pressed="true">${icon('sound')}</button><button id="music-settings" class="icon-button active" title="音乐与音效设置" aria-label="音乐与音效设置">${icon('music')}</button><button id="help" class="icon-button" title="玩法与操作" aria-label="玩法与操作">${icon('help')}</button></div>
  <div id="map-labels" aria-hidden="true"><div id="entry-label" class="map-label danger"><span>⚑</span>雾林隘口<small>敌军入口</small></div><div id="keep-label" class="map-label"><span>♜</span>暮河堡<small>最后的防线</small></div></div>
  <aside id="selection" class="selection hidden"></aside>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div id="hover-info" class="hover-info hidden"></div>
  <footer class="build-dock"><div class="dock-heading"><span>修 筑 防 线</span><small id="tool-hint">选择工事 · 点击地块建造</small></div><div class="tool-tray"><button class="tool utility selected" data-tool="inspect" title="巡视 · Esc">${icon('inspect')}<span>巡视</span><small>ESC</small></button><div class="tool-divider"></div>${tools.map((t,i)=>`<button class="tool" data-tool="${t}" title="${LABELS[t]}：${descriptions[t]}" aria-label="建造${LABELS[t]}"><kbd>${i+1}</kbd>${portrait(t)}<span>${LABELS[t]}</span><small>${icon('coin')}${COSTS[t as keyof typeof COSTS].gold}</small></button>`).join('')}<div class="tool-divider"></div><button class="tool utility" data-tool="remove" title="拆除 · X">${icon('remove')}<span>拆除</span><small>X</small></button></div></footer>
  <div class="camera-hint"><button id="camera-reset" title="重置视角 · R" aria-label="重置视角">${icon('compass')}<span>N</span></button><p>右键旋转 · 滚轮缩放<br><span>WASD / 中键平移</span></p></div>
  <section class="wave-panel"><div class="wave-title"><span>来袭波次</span><b><span id="wave-number">01</span><em> / 05</em></b></div><div class="wave-track">${Array.from({length:5},(_,i)=>`<i data-wave="${i+1}"></i>`).join('')}</div><button id="start-wave">${icon('flag')}<span>吹响号角</span><kbd>↵</kbd></button><div class="time-controls"><button id="pause" title="暂停 / 继续 · 空格">${icon('pause')}<span>暂停</span></button><span id="wave-name">林间斥候</span><button id="speed" title="切换游戏速度">1×</button></div></section>
  <aside id="audio-panel" class="audio-panel hidden" aria-label="音乐与音效设置"><div class="audio-head"><div><small>FIELD RECORDING</small><h3>暮河的乐声</h3></div><button id="close-audio" aria-label="关闭音乐设置">${icon('close')}</button></div><div class="track-card"><span class="track-ornament">${icon('music')}</span><div class="track-info"><small id="track-subtitle"></small><b id="track-title"></b><span id="music-status"></span></div><button id="next-track" title="切换原声曲目" aria-label="切换原声曲目">${icon('next')}</button></div><label class="audio-slider"><span>${icon('music')}背景音乐</span><input id="music-volume" type="range" min="0" max="100" value="32"><b id="music-volume-label">32%</b></label><label class="audio-slider"><span>${icon('sound')}环境音效</span><input id="sfx-volume" type="range" min="0" max="100" value="65"><b id="sfx-volume-label">65%</b></label><p id="sfx-status" class="sfx-status"></p><div class="audio-footer"><button id="music-toggle" class="sound-toggle">${icon('sound')}<span>音乐已开启</span></button><a href="/audio/music/CREDITS.md" target="_blank" rel="noreferrer">音乐署名 ↗</a><a href="/audio/sfx/CREDITS.md" target="_blank" rel="noreferrer">音效来源 ↗</a></div></aside>
  <div id="modal-root"></div><div class="version">体素战术原型 <span>v0.1</span></div>
`;
let game=new Game(),world:World;
let tool:Tool='inspect',selected:number|null=null,hover:Point|null=null,lastMessage=-1,toastTimer=0,modalOpen=false,modalWasPaused=false,lastPhase=game.phase,dirtySelection='';
const audio=new Audio();
let audioPanelOpen=false;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
try {world=new World(el('world'),game);}catch(error){el('world').innerHTML='<div class="graphics-error"><h2>无法启动 3D 场景</h2><p>请使用支持 WebGL 的浏览器，并开启硬件加速后刷新。</p></div>';throw error;}
const costHTML=(cost:{gold:number;wood:number;stone:number})=>Object.entries(cost).filter(([,n])=>n>0).map(([key,n])=>`<span>${icon(key==='gold'?'coin':key)}${n}</span>`).join('');
function selectTool(next:Tool){tool=next;world.setTool(next);if(next!=='inspect'){selected=null;world.select(null);}document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>{const active=b.dataset.tool===next;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});el('tool-hint').textContent=descriptions[next];updateSelection();audio.click();}
function updateSelection(){
  const unit=[...game.enemies,...game.soldiers].find(u=>u.id===selected);
  if(unit){
    const enemy='kind' in unit;
    const names={goblin:'地精',runner:'疾行兵',brute:'破墙重兵'};
    const states={walking:'行进中',attacking:'攻击中',wading:'涉水中',guarding:'守卫中',fighting:'近战中'};
    const title=enemy?names[unit.kind]:'领地卫兵';
    const pane=el('selection');pane.classList.remove('hidden');
    const serial=`unit:${unit.id}:${Math.ceil(unit.hp)}:${unit.state}`;if(serial===dirtySelection)return;dirtySelection=serial;
    pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭单位信息">${icon('close')}</button><div class="selection-title">${icon(enemy?'flag':'barracks')}<div><small>${enemy?'敌军':'友军'} · ${states[unit.state]}</small><h3>${title}</h3></div></div><div class="hp-track"><i style="width:${Math.max(0,unit.hp/unit.maxHp)*100}%"></i></div><div class="selection-stat"><span>生命值</span><b>${Math.max(0,Math.ceil(unit.hp))} / ${unit.maxHp}</b></div><p>${enemy?(unit.kind==='brute'?'重型近战敌军，擅长破坏防御工事。':unit.kind==='runner'?'移动迅速，涉水速度保留 65%。':'普通近战敌军，涉水速度保留 38%。'):'由兵营训练，自动拦截附近敌军；脱离战斗后在准备阶段恢复生命。'}</p>${enemy?`<div class="selection-stat"><span>攻击伤害</span><b>${unit.damage}</b></div><div class="selection-stat"><span>基础移速</span><b>${unit.speed.toFixed(2)} 格 / 秒</b></div>`:''}`;
    el('close-selection').onclick=()=>{selected=null;world.select(null);updateSelection();};return;
  }
const s=game.structures.find(s=>s.id===selected);const pane=el('selection');if(!s){pane.classList.add('hidden');dirtySelection='';return;}pane.classList.remove('hidden');const serial=`${s.id}:${s.level}:${Math.ceil(s.hp)}:${game.resources.gold}:${game.resources.wood}:${game.resources.stone}`;if(serial===dirtySelection)return;dirtySelection=serial;
  pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭建筑信息">${icon('close')}</button><div class="selection-title">${portrait(s.kind)}<div><small>领地工事 · 等级 ${s.level}</small><h3>${LABELS[s.kind]}</h3></div></div><div class="hp-track"><i style="width:${Math.max(0,s.hp/s.maxHp)*100}%"></i></div><div class="selection-stat"><span>耐久</span><b>${Math.ceil(s.hp)} / ${s.maxHp}</b></div><p>${s.kind==='archer'?'快速单体攻击 · 升级可提高伤害与射程':s.kind==='mage'?'魔法范围攻击 · 对聚集敌军造成溅射伤害':descriptions[s.kind]}</p>${s.kind==='archer'||s.kind==='mage'?`<div class="selection-stat"><span>真实球形射程</span><b>${game.towerRange(s).toFixed(1)} 格</b></div><div class="selection-stat"><span>单次伤害</span><b>${Math.round(STATS[s.kind].damage*(1+(s.level-1)*0.55))}</b></div>`:''}<button id="upgrade" class="upgrade" ${s.level>=3?'disabled':''}>${s.level>=3?'已达最高等级':'升级工事'}<span>${s.level>=3?'III':costHTML(game.upgradeCost(s))}</span></button><button id="sell" class="text-button">拆除 · 返还 50% 资源</button>`;
  el('close-selection').onclick=()=>{selected=null;world.select(null);updateSelection();};el('upgrade').onclick=()=>{game.upgrade(s.id);dirtySelection='';updateSelection();};el('sell').onclick=()=>{game.build('remove',s.x,s.z);selected=null;world.select(null);updateSelection();};
}
world.onHover=p=>{hover=p;const info=el('hover-info');if(!p){info.classList.add('hidden');return;}const tile=game.tile(p.x,p.z)!;info.classList.remove('hidden');const err=tool==='inspect'?null:game.validate(tool,p.x,p.z);info.innerHTML=`<span>${p.x}, ${p.z}</span><b>海拔 ${tile.h}</b><span>${tile.water?'水道':tile.bridge?'木桥':tile.road?'古道':'草地'}</span>${err?`<em>${err}</em>`:tool!=='inspect'&&tool!=='remove'?`<div class="hover-cost">${costHTML(COSTS[tool])}</div>`:''}`;};
world.onUnitClick=id=>{if(modalOpen)return;selected=id;world.select(null);updateSelection();audio.click();};
world.onClick=p=>{if(modalOpen)return;if(tool==='inspect'){selected=game.structureAt(p.x,p.z)?.id??null;world.select(selected);updateSelection();}else if(game.build(tool,p.x,p.z)){updateSelection();}};
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>b.onclick=()=>selectTool(b.dataset.tool as Tool));
function startWave(){if(modalOpen)return;audio.unlock();game.startWave();}
el('start-wave').onclick=startWave;
function togglePause(){if(modalOpen||game.phase==='victory'||game.phase==='defeat')return;audio.unlock();game.paused=!game.paused;audio.click();}
el('pause').onclick=togglePause;
el('speed').onclick=()=>{game.speed=game.speed===1?2:game.speed===2?3:1;};
el('paths').onclick=()=>{world.showPaths=!world.showPaths;el('paths').classList.toggle('active',world.showPaths);el('paths').setAttribute('aria-pressed',String(world.showPaths));};
el('sound').classList.toggle('muted',!audio.enabled);el('sound').setAttribute('aria-pressed',String(audio.enabled));
el('sound').onclick=()=>{audio.unlock();const on=audio.toggle();el('sound').classList.toggle('muted',!on);el('sound').setAttribute('aria-pressed',String(on));el('sound').setAttribute('aria-label',on?'关闭音效':'开启音效');if(el('sfx-volume') instanceof HTMLInputElement)el<HTMLInputElement>('sfx-volume').value=String(Math.round(audio.sfxVolume*100));};
function updateAudioPanel(){
  el('sfx-status').textContent=audio.sampleStatus;
  el<HTMLInputElement>('music-volume').value=String(Math.round(audio.musicVolume*100));el('music-volume-label').textContent=`${Math.round(audio.musicVolume*100)}%`;el<HTMLInputElement>('sfx-volume').value=String(Math.round(audio.sfxVolume*100));el('sfx-volume-label').textContent=`${Math.round(audio.sfxVolume*100)}%`;
  el('track-title').textContent=TRACKS[audio.track].title;el('track-subtitle').textContent=TRACKS[audio.track].subtitle;el('music-status').textContent=audio.musicStatus;
  el('music-toggle').innerHTML=`${icon(audio.musicEnabled?'sound':'close')}<span>${audio.musicEnabled?'音乐已开启':'音乐已静音'}</span>`;
  el('music-settings').classList.toggle('active',audioPanelOpen);el('music-settings').classList.toggle('muted',!audio.musicEnabled);
}
function closeAudio(){audioPanelOpen=false;el('audio-panel').classList.add('hidden');updateAudioPanel();}
el('music-settings').onclick=()=>{audio.unlock();audioPanelOpen=!audioPanelOpen;el('audio-panel').classList.toggle('hidden',!audioPanelOpen);updateAudioPanel();};el('close-audio').onclick=closeAudio;
el('next-track').onclick=()=>{audio.selectTrack((audio.track+1)%TRACKS.length);audio.effect('upgrade');updateAudioPanel();};
el('music-toggle').onclick=()=>{audio.toggleMusic();audio.effect('upgrade');updateAudioPanel();};
el('music-volume').addEventListener('input',e=>{const n=Number((e.target as HTMLInputElement).value);audio.setVolume('music',n/100);el('music-volume-label').textContent=`${n}%`;audio.unlock();});
el('sfx-volume').addEventListener('input',e=>{const n=Number((e.target as HTMLInputElement).value);audio.setVolume('sfx',n/100);el('sfx-volume-label').textContent=`${n}%`;el('sound').classList.toggle('muted',n===0);audio.unlock();});
el('camera-reset').onclick=()=>world.resetCamera();
function updateMapChrome(){el('chapter-copy').innerHTML=`<span></span> ${game.map.chapter}`;el('objective-eyebrow').textContent=game.map.eyebrow;el('objective-title').textContent=game.map.objective;el('objective-description').textContent=game.map.description;el('entry-label').innerHTML=`<span>⚑</span>${game.map.spawnName}<small>敌军入口</small>`;el('keep-label').innerHTML=`<span>♜</span>${game.map.goalName}<small>最后的防线</small>`;}
function closeModal(){el('modal-root').innerHTML='';modalOpen=false;game.paused=modalWasPaused;world.controls.enabled=true;audio.unlock();}
function startMap(mapId:MapId){game=new Game(true,mapId);world.setGame(game);world.resetCamera();lastPhase=game.phase;selected=null;modalWasPaused=false;closeModal();updateMapChrome();selectTool('inspect');lastMessage=-1;audio.click();}
function showMapPicker(){if(modalOpen)return;modalWasPaused=game.paused;game.paused=true;modalOpen=true;world.controls.enabled=false;el('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal map-modal" role="dialog" aria-modal="true" aria-labelledby="map-title"><button class="modal-close" aria-label="关闭地图选择">${icon('close')}</button><div class="eyebrow">CHOOSE YOUR FRONTIER</div><h2 id="map-title">选择战场</h2><p class="modal-lead">每张地图都有一条不同的路，先读懂地形，再布置守望。</p><div class="map-list">${MAP_LIST.map(map=>`<button class="map-choice ${map.id===game.mapId?'current':''}" data-map="${map.id}"><span class="map-choice-icon">${icon(map.id==='mountain'?'mountain':map.id==='canyon'?'bridge':'route')}</span><span><b>${map.name}</b><small>${map.chapter}</small><em>${map.tactic}</em><i>${map.description}</i></span></button>`).join('')}</div></section></div>`;document.querySelector<HTMLButtonElement>('.modal-close')!.onclick=closeModal;document.querySelectorAll<HTMLButtonElement>('[data-map]').forEach(button=>button.onclick=()=>startMap(button.dataset.map as MapId));}
function showHelp(){if(modalOpen)return;modalWasPaused=game.paused;game.paused=true;modalOpen=true;world.controls.enabled=false;
  el('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" aria-label="关闭玩法说明">${icon('close')}</button><div class="eyebrow">A FIELD GUIDE</div><h2 id="help-title">领主的战地手册</h2><p class="modal-lead">不要只在路边造塔。把整片山谷变成你的防线。</p><div class="guide-grid"><article>${icon('wall')}<h3>让敌人做选择</h3><p>筑墙迫使绕路，但敌人也会衡量破墙成本。重兵擅长拆墙，疾行兵更愿意涉水。</p></article><article>${icon('dig')}<h3>改造土地</h3><p>挖水道减速，筑高地改变坡度；在水面逐格搭桥，也可用拆除工具恢复水道。</p></article><article>${icon('mage')}<h3>射程是一个球</h3><p>选中塔可查看三维射程。高台不等于无条件加射程：垂直距离也占用攻击范围。</p></article><article>${icon('barracks')}<h3>用士兵守住缺口</h3><p>兵营自动派出卫兵拦截附近敌军。战斗中阵亡后每 9 秒补员；升级可扩大队伍。</p></article></div><div class="controls-guide"><span><kbd>1–7</kbd> 选择工事</span><span><kbd>X</kbd> 拆除建筑或木桥</span><span><kbd>ESC</kbd> 巡视 / 关闭</span><span><kbd>空格</kbd> 暂停</span><span><kbd>↵</kbd> 开始波次</span><span><kbd>右键拖拽</kbd> 旋转</span><span><kbd>滚轮</kbd> 缩放</span><span><kbd>WASD</kbd> 平移</span></div><p class="music-credit">原声曲目：Kevin MacLeod · CC BY 4.0 · <a href="/audio/music/CREDITS.md" target="_blank" rel="noreferrer">查看完整署名与授权</a></p><button id="back-to-game" class="primary-button">回到暮河 ${icon('chevron')}</button><button id="restart-help" class="text-button">重新开始战役</button></section></div>`;
  el('back-to-game').textContent=`回到${game.map.name} `;el('back-to-game').append(icon('chevron'));el('back-to-game').onclick=closeModal;document.querySelector<HTMLButtonElement>('.modal-close')!.onclick=closeModal;el('restart-help').onclick=restart;
}
el('help').onclick=showHelp;el('map-select').onclick=showMapPicker;
function restart(){startMap(game.mapId);}
function showResult(){modalOpen=true;world.controls.enabled=false;const win=game.phase==='victory';el('modal-root').innerHTML=`<div class="modal-backdrop result-backdrop"><section class="modal result-modal" role="dialog" aria-modal="true"><div class="result-crest">${icon(win?'crown':'flag')}</div><div class="eyebrow">${win?'THE DAWN IS OURS':'THE BORDER HAS FALLEN'}</div><h2>${win?'黎明属于'+game.map.name:game.map.name+'，仍在等待守望者'}</h2><p>${win?'你守住了五波来袭。城堡的旗帜，依然迎风飘扬。':'城堡已经失守。改变地形，重新思考你的防线。'}</p><div class="result-stats"><div><b>${game.wave}<small>/ 5</small></b><span>迎战波次</span></div><div><b>${game.kills}</b><span>击退敌军</span></div><div><b>${game.castleHp}</b><span>剩余城防</span></div></div><button id="restart" class="primary-button">再守一次${game.map.name} ${icon('reset')}</button></section></div>`;el('restart').onclick=restart;}
const keys=new Set<string>();
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.repeat){if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))keys.add(e.code);return;}if(e.code==='Escape'){if(modalOpen&&game.phase!=='victory'&&game.phase!=='defeat')closeModal();else{selected=null;world.select(null);selectTool('inspect');}return;}if(modalOpen)return;keys.add(e.code);audio.unlock();if(e.code==='Space')togglePause();else if(e.code==='Enter')startWave();else if(/^Digit[1-7]$/.test(e.code))selectTool(tools[Number(e.code.slice(-1))-1]);else if(e.code==='KeyX')selectTool('remove');else if(e.code==='KeyR')world.resetCamera();});
window.addEventListener('pointerdown',()=>audio.unlock(),{once:true});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(game.phase==='battle'){game.paused=true;game.say('已自动暂停 · 点击继续以恢复战斗');}});
function updateUI(now:number){
  for(const k of ['gold','wood','stone'] as const)el(k).textContent=String(Math.floor(game.resources[k]));
  el('castle-hp').textContent=String(game.castleHp);el('castle-hp').parentElement!.classList.toggle('critical',game.castleHp<35);
  el('phase-label').textContent=game.paused?'已暂停':game.phase==='preparation'?'准备阶段':game.phase==='battle'?'交战中':game.phase==='victory'?'已守住':'已失守';el('phase-dot').classList.toggle('battle',game.phase==='battle');
  el('enemy-count').textContent=game.phase==='battle'?`${game.enemies.length} 名敌军在战场 · ${game.spawnedInWave} / ${game.totalInWave} 已抵达`:'修筑工事 · 迎接下一次来袭';
  el('wave-number').textContent=String(Math.min(5,game.phase==='preparation'?game.wave+1:game.wave)).padStart(2,'0');
  el('wave-name').textContent=game.map.waveNames[Math.min(4,game.phase==='preparation'?game.wave:game.wave-1)]??game.map.waveNames[0];
  document.querySelectorAll<HTMLElement>('[data-wave]').forEach(e=>{e.classList.toggle('done',Number(e.dataset.wave)<=game.wave);e.classList.toggle('current',Number(e.dataset.wave)===game.wave&&game.phase==='battle');});
  const waveButton=el<HTMLButtonElement>('start-wave');waveButton.disabled=game.phase!=='preparation';waveButton.querySelector('span')!.textContent=game.phase==='battle'?'抵御来袭':game.wave===0?'吹响号角':'迎接下一波';
  el('pause').innerHTML=`${icon(game.paused?'play':'pause')}<span>${game.paused?'继续':'暂停'}</span>`;el('speed').textContent=`${game.speed}×`;
  if(game.messageSerial!==lastMessage){lastMessage=game.messageSerial;el('toast').textContent=game.message;el('toast').classList.add('visible');toastTimer=now+4800;}
  if(now>toastTimer)el('toast').classList.remove('visible');
  updateSelection();if(audioPanelOpen)updateAudioPanel();
  for(const [id,p]of [['entry-label',game.spawn],['keep-label',game.goal]]as const){const pos=world.project(p.x,p.z,game.ground(p.x,p.z)+(id==='keep-label'?5.6:3.5));const label=el(id);label.style.left=`${pos.x}px`;label.style.top=`${pos.y}px`;label.style.opacity=world.camera.zoom>1.7?'0':'1';}
  if(lastPhase!==game.phase){lastPhase=game.phase;if(game.phase==='victory'||game.phase==='defeat')showResult();}
}
const healthElements=new Map<number,HTMLElement>();
function updateHealthBars(){
  const visible=new Set<number>();
  for(const bar of world.healthBars()){
    visible.add(bar.id);let element=healthElements.get(bar.id);
    if(!element){element=document.createElement('i');element.dataset.entity=String(bar.id);element.append(document.createElement('span'));healthElements.set(bar.id,element);el('health-bars').append(element);}
    element.className=`unit-health ${bar.friendly?'friendly':''} ${bar.structure?'structure':''}`;
    element.style.transform=`translate3d(${bar.x}px,${bar.y}px,0)`;
    element.style.opacity=String(bar.opacity);
    (element.firstElementChild as HTMLElement).style.width=`${bar.ratio*100}%`;
  }
  for(const [id,element] of healthElements)if(!visible.has(id)){element.remove();healthElements.delete(id);}
}
let previous=performance.now(),accumulator=0,lastUI=0;
function frame(now:number){const dt=Math.min((now-previous)/1000,0.08);previous=now;accumulator+=dt*game.speed;while(accumulator>=1/30){game.step(1/30);accumulator-=1/30;}
  const direction=world.camera.getWorldDirection(new THREE.Vector3());const side={x:-direction.z,z:direction.x};const l=Math.hypot(side.x,side.z)||1;side.x/=l;side.z/=l;
  audio.consume(game.drainSounds(),{x:world.controls.target.x,z:world.controls.target.z},side);audio.setSuspended(game.paused||modalOpen);
  if(!modalOpen&&keys.size){const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);if(x||z)world.moveCamera(x,-z,dt);}
  world.render(now/1000);updateHealthBars();if(now-lastUI>80){updateUI(now);lastUI=now;}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
updateMapChrome();Object.assign(window,{__riverwatch:{get game(){return game;},world,audio,selectTool,restart,startMap,showMapPicker,snapshot:()=>({phase:game.phase,wave:game.wave,castleHp:game.castleHp,resources:game.resources,enemies:game.enemies.length,soldiers:game.soldiers.length,structures:game.structures.length,revision:game.revision,tiles:game.tiles.length,map:[42,32],mapId:game.mapId,audio:audio.diagnostics()}),advance:(seconds:number)=>{for(let t=0;t<seconds;t+=1/30)game.step(1/30);}}});
