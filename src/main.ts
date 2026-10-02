import { BattleResult } from './ui/result';
import './ui/result.css';
import { ECONOMY, deliveryGold, streakGold } from './simulation/economy';
import { audio } from './ui/runtime-audio';
import { BossHud, bossInPlan } from './ui/boss';
import { BossEntrance } from './render/boss-entrance';
import './ui/boss.css';
import { barracksDetails, barracksBranchDialog } from './ui/barracks';
import { BARRACKS_BRANCHES, BARRACKS_RECRUIT_SECONDS, soldierProfile, type BarracksBranch } from './simulation/barracks';
import { HERO } from './heroes/roster';
import { HERO_STATS, HERO_STATES, HERO_SKILLS, type HeroSkill } from './simulation/hero';
import './heroes/battle.css';
import { isDirectional, TURN_CLOCKWISE, TURN_COUNTERCLOCKWISE } from './simulation/towers';
import { BuildPlacement } from './ui/placement';
import { BUILD_GROUPS, buildShortcut, type BuildGroup } from './ui/build-shortcuts';
import './style.css';
import './campaign/style.css';
import { CampaignTravel } from './campaign/travel';
import { CampaignMenu } from './campaign/menu';
import * as THREE from 'three';
import { Game, COSTS, LABELS, STATS, type Tool, type Point, type Structure } from './simulation/game';
import { WIDTH, DEPTH, type MapId } from './simulation/maps';
import { World } from './render/world';
import { icon } from './ui/icons';
import { portrait } from './ui/portraits';
import { TRACKS } from './ui/audio';
import { ENEMIES, TARGET_LABELS, type EnemyKind } from './simulation/enemies';
import { DAMAGE_LABELS, type Defenses } from './simulation/combat';
import { BestiaryPanel } from './bestiary/panel';
import { isTower, towerAttack, towerFeatures, branchesFor, BRANCHES, type TowerBranch } from './simulation/towers';
import './ui/towers.css';
import { enemyPortrait } from './bestiary/portrait';
import { scoutGroups } from './ui/scouting';
import './ui/scouting.css';
import './ui/battle-hud.css';
import './ui/placement.css';
import './ui/context-actions.css';
import { frontPosition } from './ui/front-position';
import { HudEntry } from './ui/hud-entry';
import { ContextActions, type BuildingAction } from './ui/context-actions';

const app=document.querySelector<HTMLDivElement>('#app')!;
const tools:Tool[]=[...BUILD_GROUPS.towers,...BUILD_GROUPS.terrain];
let buildGroup:BuildGroup='towers';
const descriptions:Record<Tool,string>={palisade:'低造价木栅栏 · 75 耐久 · 阻挡敌军',spikes:'可通行陷阱 · 每秒 12 物伤 · 地面敌军减速 35%',road:'友军在铺设路面上移速 +35% · 不阻挡敌军',lower:'陆地降低一层 · 修整坡道与射界',inspect:'选择建筑查看、升级或拆除',wall:'改变敌军路线 · 敌人可攻击摧毁',dig:'开凿水道 · 普通敌军减速 62%',archer:'物理单体攻击 · 克制高法抗 · 球形射程 6.4 格',mage:'魔法范围伤害 · 克制高物防 · 球形射程 5.9 格',cannon:'仅对地 · 炮口前方 100° 锥形射界 · 射程 6 格',frost:'魔法攻击 · 减速 30% 持续 2 秒 · 球形射程 5.6 格',tesla:'魔法闪电 · 连锁至多 3 人 · 球形射程 5.5 格',barracks:'自动训练 2 名卫兵 · 拦截近处敌军',raise:'抬高地势 · 改变通路与三维射程',bridge:'在水道上逐格搭木桥 · 两军可快速通行',remove:'拆除建筑或木桥 · 返还 50% 基础金币'};
app.innerHTML=`
  <main id="world"></main><div class="vignette"></div><div id="health-bars" aria-hidden="true"></div>
  <header class="identity"><div class="crest">${icon('crown')}</div><div><div class="eyebrow">R I V E R W A T C H</div><h1>暮河守望</h1><div id="chapter-copy" class="chapter"><span></span> 第一章 · 雾林边境</div></div></header>
  <section class="resource-bar" aria-label="金币与城防" title="金币来自击杀敌军、波次补给和生产据点"><div class="resource gold">${icon('coin')}<span id="gold">${ECONOMY.startingGold}</span><small>金币</small></div><i></i><div class="resource castle-health">${icon('heart')}<span id="castle-hp">100</span><small>城防</small></div></section>
  <aside class="objective"><div id="objective-eyebrow" class="eyebrow">THE BORDERLANDS</div><h2 id="objective-title">在暮河，筑起你的防线。</h2><p id="objective-description">地形决定战术。守住城堡，迎接黎明。</p><div class="objective-meta"><span id="phase-dot"></span><span id="phase-label">准备阶段</span><b>／</b><span id="enemy-count">先布防，再吹响号角</span></div></aside>
  <div class="top-actions"><button id="map-select" class="icon-button" title="世界地图" aria-label="世界地图">${icon('mountain')}</button><button id="scout-open" class="icon-button" title="斥候报告" aria-label="斥候报告">${icon('flag')}</button><button id="estate-open" class="icon-button" title="领地经济 · 麦田与银矿" aria-label="领地经济">${icon('coin')}</button><button id="sound" class="icon-button" title="开启 / 关闭音效" aria-label="开启 / 关闭音效" aria-pressed="true">${icon('sound')}</button><button id="music-settings" class="icon-button active" title="音乐与音效设置" aria-label="音乐与音效设置">${icon('music')}</button><button id="bestiary-open" data-bestiary-open class="icon-button" title="敌人图鉴" aria-label="敌人图鉴">${icon('book')}</button><button id="help" class="icon-button" title="玩法与操作" aria-label="玩法与操作">${icon('help')}</button></div>
  <div id="map-labels"><div id="entry-label" class="map-label danger"><span>⚑</span>雾林隘口<small>敌军入口</small></div><div id="keep-label" class="map-label"><span>♜</span>暮河堡<small>最后的防线</small></div></div>
  <div id="battle-sites"></div>
  <aside id="selection" class="selection hidden"></aside><aside id="context-actions" class="context-actions" hidden aria-label="建筑操作"></aside>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <div id="hover-info" class="hover-info hidden"></div>
  <footer class="build-dock"><div class="dock-heading"><div class="build-tabs" role="group" aria-label="建造分类"><button data-build-tab="towers" aria-pressed="true">防御塔</button><button data-build-tab="terrain" aria-pressed="false">地形工事</button></div><small id="tool-hint">选择工事 · 点击地块建造</small></div><div class="tool-tray"><button id="battle-hero" class="battle-hero" aria-label="指挥艾莉娅" aria-pressed="false" title="点击英雄卡，再点击地面移动 · H 选择 · Esc 取消"><kbd>H</kbd><img src="${HERO.hallAvatar}" alt="艾莉娅拉弓战斗立绘近景"><span>艾莉娅</span><i class="hero-card-health"><b id="hero-card-fill"></b></i><small id="hero-card-status">未携带</small><span class="hero-skill-lights" aria-label="自动技能冷却">${Object.entries(HERO_SKILLS).map(([id,skill])=>`<i data-hero-skill="${id}" title="${skill.name} · 自动释放">${skill.mark}</i>`).join('')}</span></button><button class="tool utility selected" data-tool="inspect" title="巡视 · Esc">${icon('inspect')}<span>巡视</span><small>ESC</small></button><div class="tool-divider"></div>${tools.map(t=>`<button class="tool" data-tool="${t}" data-build-group="${isTower(t)||t==='barracks'?'towers':'terrain'}" ${isTower(t)||t==='barracks'?'':'hidden'} title="${LABELS[t]} · ${COSTS[t as keyof typeof COSTS].gold} 金币：${descriptions[t]}" aria-label="建造${LABELS[t]}"><kbd>${(isTower(t)||t==='barracks'?BUILD_GROUPS.towers as Tool[]:BUILD_GROUPS.terrain as Tool[]).indexOf(t)+1}</kbd>${portrait(t)}<span>${LABELS[t]}</span><small>${icon('coin')}${COSTS[t as keyof typeof COSTS].gold} 金币</small></button>`).join('')}<div class="tool-divider"></div><button class="tool utility" data-tool="remove" title="拆除 · X">${icon('remove')}<span>拆除</span><small>X</small></button></div></footer>
  <aside id="placement-bar" class="placement-bar" hidden aria-label="建造预览"><div><b id="placement-title"></b><small id="placement-status"></small></div><div class="placement-actions"><button id="placement-left" aria-label="逆时针旋转" title="逆时针 · Q">Q ↶</button><button id="placement-right" aria-label="顺时针旋转" title="顺时针 · E">E ↷</button><button id="placement-cancel">取消 · Esc</button></div></aside>
  <div class="camera-hint"><button id="camera-reset" title="重置视角 · R" aria-label="重置视角">${icon('compass')}<span>N</span></button><p>左键拖动平移 · 右键旋转 · 滚轮缩放<br><span>WASD 平移 · Shift 加速</span></p></div>
  <section class="wave-panel"><div class="wave-title"><span>来袭波次</span><b><span id="wave-number">01</span><em id="wave-total"></em></b></div><button id="scout-callout" class="scout-callout"></button><p id="wave-briefing" class="wave-briefing"></p><div id="harvest-report" class="harvest-report" hidden></div><div id="front-switches" class="front-switches" aria-label="查看进攻方向"></div><div class="wave-track"></div><button id="start-wave">${icon('flag')}<span>吹响号角</span><kbd>↵</kbd></button><div class="time-controls"><button id="pause" title="暂停 / 继续 · 空格">${icon('pause')}<span>暂停</span></button><span id="wave-name">林间斥候</span><button id="speed" title="切换游戏速度">1×</button></div></section>
  <aside id="audio-panel" class="audio-panel hidden" aria-label="音乐与音效设置"><div class="audio-head"><div><small>FIELD RECORDING</small><h3>暮河的乐声</h3></div><button id="close-audio" aria-label="关闭音乐设置">${icon('close')}</button></div><div class="track-card"><span class="track-ornament">${icon('music')}</span><div class="track-info"><small id="track-subtitle"></small><b id="track-title"></b><span id="music-status"></span></div><button id="next-track" title="切换原声曲目" aria-label="切换原声曲目">${icon('next')}</button></div><label class="audio-slider"><span>${icon('music')}背景音乐</span><input id="music-volume" type="range" min="0" max="100" value="32"><b id="music-volume-label">32%</b></label><label class="audio-slider"><span>${icon('sound')}环境音效</span><input id="sfx-volume" type="range" min="0" max="100" value="65"><b id="sfx-volume-label">65%</b></label><p id="sfx-status" class="sfx-status"></p><div class="audio-footer"><button id="music-toggle" class="sound-toggle">${icon('sound')}<span>音乐已开启</span></button><a href="/audio/music/CREDITS.md" target="_blank" rel="noreferrer">音乐署名 ↗</a><a href="/audio/sfx/CREDITS.md" target="_blank" rel="noreferrer">音效来源 ↗</a></div></aside>
  <div id="modal-root"></div><div class="version">体素战术原型 <span>v0.1</span></div>
`;
let game=new Game(),world:World;
const placement=new BuildPlacement();
let aiming:number|null=null,aimFacing=0;
let heroCommand=false;
let tool:Tool='inspect',selected:number|null=null,hover:Point|null=null,lastMessage=-1,toastTimer=0,modalOpen=false,modalWasPaused=false,lastPhase=game.phase,dirtySelection='';
let selectedPost:string|null=null;
const bossHud=new BossHud(app);
let audioPanelOpen=false;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
try {world=new World(el('world'),game);}catch(error){el('world').innerHTML='<div class="graphics-error"><h2>无法启动 3D 场景</h2><p>请使用支持 WebGL 的浏览器，并开启硬件加速后刷新。</p></div>';throw error;}
const campaign=new CampaignMenu(world.renderer,id=>travel.begin(id),resumeBattle,()=>{audio.unlock();audio.click();});
const hudEntry=new HudEntry(app);
const travel=new CampaignTravel(campaign,world,startMap,revealBattleHud);
const bossEntrance=new BossEntrance(world,app,()=>{
  hudEntry.cancel();keys.clear();closeAudio();selectTool('inspect');selected=null;world.select(null);updateSelection();bossHud.update(game,false);
},()=>{accumulator=0;keys.clear();revealBattleHud();},impact=>audio.effect(impact==='hammer'?'boss-hammer-land':impact==='body'?'boss-body-land':'boss-arrival'));
const battleResult=new BattleResult(el('modal-root'),app,cue=>audio.effect(cue),(finished,plated)=>{if(finished.phase==='victory')campaign.victory(finished.mapId,finished.castleHp,plated);},restart,showMapPicker);
world.onBossDeathImpact=()=>audio.effect('boss-body-land',0,1,true);
let hasBattle=false,campaignWasPaused=false;
const atlasBestiary=document.createElement('button');atlasBestiary.className='atlas-bestiary';atlasBestiary.dataset.bestiaryOpen='';atlasBestiary.innerHTML=`${icon('book')} 敌人图鉴`;
campaign.root.querySelector('.atlas-ledger')!.append(atlasBestiary);
const atlasMusic=document.createElement('button');atlasMusic.className='atlas-bestiary';atlasMusic.id='atlas-music';atlasMusic.innerHTML=`${icon('music')} 暮河的乐声`;campaign.root.querySelector('.atlas-ledger')!.append(atlasMusic);
let bestiaryWasPaused=false;
const bestiary=new BestiaryPanel(()=>{
  selectTool('inspect');bestiaryWasPaused=game.paused;game.paused=true;keys.clear();world.controls.enabled=false;campaign.scene.controls.enabled=false;closeAudio();
},()=>{
  game.paused=bestiaryWasPaused;world.controls.enabled=!campaign.visible&&!modalOpen;campaign.scene.controls.enabled=campaign.visible&&!campaign.heroPanel.open;keys.clear();accumulator=0;
},()=>{audio.unlock();audio.click();});
function showBestiary(kind?:EnemyKind){if(modalOpen||campaign.heroPanel.open)return;bestiary.show(kind);}
el('bestiary-open').onclick=()=>showBestiary();atlasBestiary.onclick=()=>showBestiary();
const defenseHTML=(unit:Defenses)=>`<div class="unit-defenses"><span>物防 ${unit.armor}%</span><span>法抗 ${unit.resistance}%</span></div>`;

const costHTML=(cost:{gold:number})=>`<span>${icon('coin')}${cost.gold} 金币</span>`;
function selectBuildGroup(group:BuildGroup){buildGroup=group;document.querySelectorAll<HTMLElement>('[data-build-group]').forEach(b=>b.hidden=b.dataset.buildGroup!==group);document.querySelectorAll<HTMLElement>('[data-build-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.buildTab===group)));}
document.querySelectorAll<HTMLButtonElement>('[data-build-tab]').forEach(b=>b.onclick=()=>{selectBuildGroup(b.dataset.buildTab as BuildGroup);selectTool('inspect');});
function selectTool(next:Tool){
  heroCommand=false;world.setHeroCommand(false);
  aiming=null;world.setAim(null);placement.begin(next);world.setExtensions(null);world.setPlacement(null);selectedPost=null;
  if(next!=='inspect'&&next!=='remove')selectBuildGroup(isTower(next)||next==='barracks'?'towers':'terrain');
  tool=next;world.setTool(next);if(next!=='inspect'){selected=null;world.select(null);}
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>{const active=b.dataset.tool===next;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  el('tool-hint').textContent=(next!=='inspect'&&next!=='remove'?`造价 ${COSTS[next].gold} 金币 · `:'')+descriptions[next];
  syncPlacement();updateSelection();audio.click();
}
function selectHero(showDetails=false){
  if(!game.hero||game.hero.hp<=0||modalOpen||bestiary.open||campaign.visible)return;
  const wasSelected=heroCommand;selectTool('inspect');selected=null;world.select(null);
  heroCommand=!wasSelected;world.setHeroCommand(heroCommand);
  if(showDetails)selected=game.hero.id;
  el('tool-hint').textContent=heroCommand?'点击地面部署艾莉娅 · 自动战斗 · Esc 取消':descriptions.inspect;
  updateSelection();audio.unlock();
}
el('battle-hero').onclick=()=>selectHero();
function updateHeroCard(){
  const h=game.hero,card=el<HTMLButtonElement>('battle-hero');
  if((!h||h.hp<=0)&&heroCommand){heroCommand=false;world.setHeroCommand(false);el('tool-hint').textContent=descriptions.inspect;}
  card.disabled=!h||h.hp<=0||game.phase==='victory'||game.phase==='defeat';
  card.classList.toggle('commanding',heroCommand);card.classList.toggle('fallen',!!h&&h.hp<=0);
  card.setAttribute('aria-pressed',String(heroCommand));
  card.setAttribute('aria-label',h?`艾莉娅，生命 ${Math.ceil(h.hp)} / ${h.maxHp}，${HERO_STATES[h.state]}。点击后选择目的地`:'未携带英雄，请在出征前选择随行英雄');
  el('hero-card-fill').style.width=`${h?h.hp/h.maxHp*100:0}%`;
  document.querySelectorAll<HTMLElement>('[data-hero-skill]').forEach(node=>{const id=node.dataset.heroSkill as HeroSkill,cd=h?.skillCooldowns[id]??0;node.classList.toggle('ready',!!h&&cd<=0&&h.hp>0);node.title=`${HERO_SKILLS[id].name} · ${!h?'未携带':cd>0?Math.ceil(cd)+' 秒':'就绪'} · 自动释放`;});
  el('hero-card-status').textContent=!h?'未携带':game.phase==='defeat'?'战败':game.phase==='victory'?'远征胜利':h.hp<=0?`复活 ${Math.ceil(h.respawnIn)} 秒`:heroCommand?'选择目的地':h.state==='casting'&&h.skill?HERO_SKILLS[h.skill].name:HERO_STATES[h.state];
}
function syncPlacement(){
  if(aiming!==null){
    const s=game.structures.find(s=>s.id===aiming);
    if(!s||!isDirectional(s)||game.phase!=='preparation'){aiming=null;world.setAim(null);}
    else{el('placement-bar').hidden=false;el('placement-title').textContent='调整朝向 · 免费';el('placement-status').textContent='点击确认';el('placement-left').hidden=el('placement-right').hidden=false;world.setAim(aiming,aimFacing);return;}
  }
  const active=tool!=='inspect'&&tool!=='remove';el('placement-bar').hidden=!active;
  world.setExtensions(placement.anchor?placement.neighbors(game):null);world.setPlacement(placement.point,placement.facing);
  if(!active)return;
  el('placement-title').textContent=`${LABELS[tool]} · ${COSTS[tool as keyof typeof COSTS].gold} 金币`;
  el('placement-status').textContent=placement.anchor?'点击虚影延伸':placement.error(game)??'';
  el('placement-left').hidden=el('placement-right').hidden=!isDirectional({kind:tool});
}
function clickPlacement(p:Point|null){
  const result=placement.click(game,p);
  if(result==='cancelled'||result==='built'&&!placement.anchor)selectTool('inspect');
  syncPlacement();updateSelection();
}
function selectedDirectional(){const s=game.structures.find(s=>s.id===selected);return s&&game.phase==='preparation'&&isDirectional(s)?s:null;}
function rotatePreview(delta:number){const s=selectedDirectional();if(aiming!==null)aimFacing+=delta;else if(s){game.orientStructure(s.id,(s.facing??Math.PI/2)+delta);dirtySelection='';updateSelection();}else placement.rotate(delta);syncPlacement();}
el('placement-cancel').onclick=()=>selectTool('inspect');
el('placement-left').onclick=()=>rotatePreview(TURN_COUNTERCLOCKWISE);
el('placement-right').onclick=()=>rotatePreview(TURN_CLOCKWISE);
let selectionDetails=false,selectionKey='';
const contextActions=new ContextActions(el('context-actions'),()=>{selected=null;selectedPost=null;world.select(null);updateSelection();});
function updateSelection(){
  const post=game.outposts.find(p=>p.id===selectedPost),s=game.structures.find(s=>s.id===selected);
  const key=post?'post:'+post.id:'unit:'+selected;
  if(key!==selectionKey){selectionKey=key;selectionDetails=false;dirtySelection='';}
  const pane=el('selection');pane.classList.toggle('context-detail',!!post||!!s);
  if(post||s){
    const actions:BuildingAction[]=[];
    const add=(id:string,icon:string,label:string,hint:string,disabled:boolean,run:()=>void)=>actions.push({id,icon,label,hint,disabled,run:()=>{run();dirtySelection='';updateSelection();audio.click();}});
    if(post){
      const prep=game.phase==='preparation',cost=game.outpostRepairCost(post),upgrade=game.outpostUpgradeCost(post);
      if(!post.owned||post.hp<post.maxHp)add('repair','repair',post.owned?'修复':'重建',cost+' 金币',!prep||game.resources.gold<cost,()=>{game.restoreOutpost(post.id);});
      if(post.owned&&post.level<2)add('upgrade','upgrade','扩建',upgrade+' 金币',!prep||game.resources.gold<upgrade,()=>{game.upgradeOutpost(post.id);});
    }else if(s){
      if(s.level<3&&(isTower(s.kind)||s.kind==='barracks')){const branch=s.level===2&&(isTower(s.kind)||s.kind==='barracks'),cost=game.upgradeCost(s);
        add('upgrade','upgrade',branch?'进阶':'升级',branch?'选择分支':cost.gold+' 金币',!branch&&!game.canAfford(cost),()=>{if(branch)showBranches(s);else game.upgrade(s.id);});}
      if(s.hp<s.maxHp)add('repair','repair','修复',game.repairCost(s)+' 金币',game.phase!=='preparation'||game.resources.gold<game.repairCost(s),()=>{game.repairStructure(s.id);});
      if(isDirectional(s)){
        add('rotate-left','rotate-left','Q 旋转','',game.phase!=='preparation',()=>rotatePreview(TURN_COUNTERCLOCKWISE));
        add('rotate-right','rotate-right','E 旋转','',game.phase!=='preparation',()=>rotatePreview(TURN_CLOCKWISE));
      }
      add('sell','sell','拆除','+'+Math.floor(COSTS[s.kind].gold*.5)+' 金币',false,()=>{game.build('remove',s.x,s.z);selected=null;world.select(null);});
    }
    add('details','details',selectionDetails?'收起':'详情','',false,()=>{selectionDetails=!selectionDetails;});
    contextActions.show(post?post.name:(s!.barracksBranch?BARRACKS_BRANCHES[s!.barracksBranch].name:s!.branch?BRANCHES[s!.branch].name:LABELS[s!.kind])+(isTower(s!.kind)||s!.kind==='barracks'?' · '+s!.level+'级':''),actions);
    if(!selectionDetails){pane.classList.add('hidden');dirtySelection='';positionContextActions();return;}
  }else contextActions.hide();
  renderSelectionDetails();
  if((post||s)&&!pane.classList.contains('hidden'))el('close-selection').onclick=()=>{selectionDetails=false;dirtySelection='';updateSelection();};
  positionContextActions();
}
function positionContextActions(){
  const post=game.outposts.find(p=>p.id===selectedPost),s=game.structures.find(s=>s.id===selected),point=post??s;
  if(!point||modalOpen||bestiary.open||campaign.visible){contextActions.root.style.visibility='hidden';return;}
  const pos=world.project(point.x,point.z,game.ground(point.x,point.z)+(s?STATS[s.kind].muzzle+1.1:2.5));
  contextActions.root.style.visibility=pos.x<0||pos.x>innerWidth||pos.y<0||pos.y>innerHeight?'hidden':'visible';
  contextActions.position(pos.x,pos.y,innerWidth,innerHeight,document.querySelector<HTMLElement>('.build-dock')!.offsetTop,world.camera.zoom);
}
function renderSelectionDetails(){
  const post=game.outposts.find(p=>p.id===selectedPost);
  if(post){
    const pane=el('selection');pane.classList.remove('hidden');
    const serial=`post:${post.id}:${post.hp}:${post.level}:${post.streak}:${post.waveGold}:${game.resources.gold}:${game.phase}`;if(dirtySelection===serial)return;
    const scroll=dirtySelection.startsWith(`post:${post.id}:`)?pane.querySelector('.selection-details')?.scrollTop??0:0;dirtySelection=serial;
    const intact=post.owned&&post.hp===post.maxHp,cost=game.outpostRepairCost(post),upgrade=game.outpostUpgradeCost(post),prep=game.phase==='preparation';
    pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭据点信息">${icon('close')}</button><nav class="estate-tabs" aria-label="选择生产据点">${game.outposts.map(p=>`<button data-estate="${p.id}" aria-pressed="${p.id===post.id}">${p.name}</button>`).join('')}</nav><div class="selection-details"><div class="selection-title">${icon('coin')}<div><small>${post.owned?'生产中':'待重建'} · ${post.level===2?'扩建据点':'基础据点'}</small><h3>${post.name}</h3></div></div><div class="hp-track"><i style="width:${post.hp/post.maxHp*100}%"></i></div><div class="selection-stat"><span>耐久</span><b>${post.hp} / ${post.maxHp}</b></div><div class="selection-stat"><span>战中运输（每波 ${ECONOMY.deliveriesPerWave} 次）</span><b>+${deliveryGold(post)} 金币 / 次</b></div><div class="selection-stat"><span>守住后的丰收</span><b>+${game.outpostHarvest(post)} 金币</b></div><div class="selection-stat"><span>连续守住 ${post.streak} 波</span><b>增收 +${streakGold(post)}</b></div><div class="selection-stat"><span>完整守住一波最多</span><b>+${game.outpostHarvest(post)+deliveryGold(post)*ECONOMY.deliveriesPerWave} 金币</b></div><p>${post.description}</p><p class="post-stakes">失守会取消本波丰收，并失去连守增收和扩建等级。已运回的金币保留。</p>${post.waveGold?`<div class="post-earned">本波已入库 ${post.waveGold} 金币</div>`:''}</div><div class="selection-actions"><button id="restore-outpost" class="upgrade ${intact?'post-ready':''}" ${prep&&!intact&&game.resources.gold>=cost?'':'disabled'}>${intact?'生产已就绪':prep?post.owned?'修缮据点':'重建据点':'战后可重建'}<span>${intact?'守住领地，积累丰收':cost+' 金币'}</span></button>${post.owned?`<button id="upgrade-outpost" class="upgrade ${post.level>=2?'post-complete':''}" ${prep&&post.level<2&&game.resources.gold>=upgrade?'':'disabled'}>${post.level>=2?'已完成扩建':`扩建 · 基础丰收 +${ECONOMY.harvestPerLevel*100}% · 耐久 +${Math.round((ECONOMY.outpostHealthMultiplier-1)*100)}%`}<span>${post.level>=2?`运输每次 +${ECONOMY.deliveryPerLevel} 金币`:upgrade+' 金币'}</span></button>`:''}</div>`;
    pane.scrollTop=0;pane.querySelector('.selection-details')!.scrollTop=scroll;
    el('close-selection').onclick=()=>{selectedPost=null;updateSelection();};el('restore-outpost').onclick=()=>{game.restoreOutpost(post.id);dirtySelection='';updateSelection();};
    pane.querySelectorAll<HTMLButtonElement>('[data-estate]').forEach(b=>b.onclick=()=>{selectedPost=b.dataset.estate!;dirtySelection='';updateSelection();});
    if(post.owned)el('upgrade-outpost').onclick=()=>{game.upgradeOutpost(post.id);dirtySelection='';updateSelection();};return;
  }
  const hero=game.hero;
  if(hero&&selected===hero.id){
    const pane=el('selection');pane.classList.remove('hidden');
    const serial=`hero:${hero.state}:${Math.ceil(hero.hp)}:${Math.ceil(hero.respawnIn)}:${Object.values(hero.skillCooldowns).map(Math.ceil).join(',')}`;if(serial===dirtySelection)return;dirtySelection=serial;
    const heroScroll=pane.scrollTop;
    pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭英雄信息">${icon('close')}</button><div class="selection-title"><img class="hero-detail-avatar" src="${HERO.hallAvatar}" alt=""><div><small>随行英雄 · ${game.phase==='defeat'?'战败':HERO_STATES[hero.state]}</small><h3>艾莉娅 · 风翎</h3></div></div><div class="hp-track"><i style="width:${hero.hp/hero.maxHp*100}%"></i></div><div class="selection-stat"><span>生命</span><b>${Math.ceil(hero.hp)} / ${hero.maxHp}</b></div>${defenseHTML(hero)}<div class="selection-stat"><span>弓箭 / 刺剑 · 物伤</span><b>${HERO_STATS.damage} / ${HERO_STATS.meleeDamage}</b></div><p>弓箭对地对空 · 球形射程 ${HERO_STATS.range} 格<br>近敌进入 2.8 格警戒范围后主动接战，保持约 1.1 格间距；结束后归位。<br>脱战 ${HERO_STATS.regenDelay} 秒后回血；阵亡 ${HERO_STATS.respawn} 秒后复活。<br>远距离（6 格起）自动展翼飞行，越过河流和障碍。${hero.hp<=0?`<br>复活倒计时：${Math.ceil(hero.respawnIn)} 秒`:''}</p><div class="hero-battle-skills">${(Object.entries(HERO_SKILLS) as [HeroSkill,typeof HERO_SKILLS[HeroSkill]][]).map(([id,skill])=>`<article><b>${skill.mark} ${skill.name}<small>${hero.skillCooldowns[id]>0?Math.ceil(hero.skillCooldowns[id])+' 秒':'就绪'}</small></b><p>${skill.description}</p></article>`).join('')}<small>自动施放 · 贯风箭打群敌或精英，箭雨打密集敌群，风暴在被包围或残血遇近敌时释放。</small></div>`;
    pane.scrollTop=heroScroll;
    el('close-selection').onclick=()=>{selected=null;updateSelection();};return;
  }
  const unit=[...game.enemies,...game.soldiers].find(u=>u.id===selected);
  if(unit){
    const enemy='kind' in unit;
    const home=!enemy?game.structures.find(s=>s.id===unit.home):undefined;
    const target=enemy?game.enemyTarget(unit):null;
    const states={walking:'行进中',attacking:'攻击中',wading:'涉水中',guarding:'守卫中',fighting:'近战中',casting:'施法中'};
    const troop=home?soldierProfile(home):null;
    const title=enemy?ENEMIES[unit.kind].name:troop?.name??'领地卫兵';
    const pane=el('selection');pane.classList.remove('hidden');
    const status=enemy?[(unit.slowUntil??0)>game.time?'减速 '+Math.round((unit.slow??0)*100)+'%':'',(unit.stunUntil??0)>game.time?'无法行动':'',(unit.burnUntil??0)>game.time?'灼烧':'',(unit.shredUntil??0)>game.time?'破甲':''].filter(Boolean).join(' · '):'';
    const serial=`unit:${unit.id}:${Math.ceil(unit.hp)}:${unit.state}:${home?.level}:${status}:${target?.name}`;if(serial===dirtySelection)return;dirtySelection=serial;
    pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭单位信息">${icon('close')}</button><div class="selection-title">${icon(enemy?'flag':'barracks')}<div><small>${enemy?'敌军':'友军'} · ${states[unit.state]}</small><h3>${title}</h3></div></div><div class="hp-track"><i style="width:${Math.max(0,unit.hp/unit.maxHp)*100}%"></i></div><div class="selection-stat"><span>生命值</span><b>${Math.max(0,Math.ceil(unit.hp))} / ${unit.maxHp}</b></div>${defenseHTML(enemy?{armor:game.enemyArmor(unit),resistance:unit.resistance}:unit)}${status?`<div class="unit-status">${status}</div>`:''}${enemy?`<div class="selection-stat"><span>偏好</span><b>${TARGET_LABELS[ENEMIES[unit.kind].preference]}</b></div><div class="selection-stat"><span>当前目标</span><b>${target?.name??'正在重新判断'}</b></div>`:''}<p>${enemy?ENEMIES[unit.kind].trait:home?.barracksBranch?BARRACKS_BRANCHES[home.barracksBranch].description:'独立驻守，自动拦截附近敌军；准备阶段恢复生命。'}</p><div class="selection-stat"><span>${enemy?DAMAGE_LABELS[unit.damageType]:'近战伤害'}</span><b>${enemy?unit.damage:(troop?.physical??15)+(troop?.magic?' + '+troop.magic+' 法伤':'')}</b></div>${enemy?`<div class="selection-stat"><span>基础移速</span><b>${unit.speed.toFixed(2)} 格 / 秒</b></div><button id="selection-bestiary" class="enemy-entry-link">查看图鉴与应对建议 →</button>`:''}`;
    if(enemy)el('selection-bestiary').onclick=()=>showBestiary(unit.kind);
    el('close-selection').onclick=()=>{selected=null;world.select(null);updateSelection();};return;
  }
const s=game.structures.find(s=>s.id===selected);const pane=el('selection');if(!s){pane.classList.add('hidden');dirtySelection='';return;}pane.classList.remove('hidden');const serial=`${s.id}:${s.facing}:${s.level}:${s.branch??s.barracksBranch??''}:${Math.ceil(s.hp)}:${game.resources.gold}:${game.phase}`;if(serial===dirtySelection)return;const scrollTop=dirtySelection.startsWith(`${s.id}:`)?pane.querySelector('.selection-details')?.scrollTop??0:0;dirtySelection=serial;
  const attack=isTower(s.kind)?towerAttack({...s,kind:s.kind}):null;
  const title=s.barracksBranch?BARRACKS_BRANCHES[s.barracksBranch].name:s.branch?BRANCHES[s.branch].name:LABELS[s.kind];
  pane.innerHTML=`<button id="close-selection" class="small-close" aria-label="关闭建筑信息">${icon('close')}</button><div class="selection-details"><div class="selection-title">${portrait(s.kind)}<div><small>领地工事${isTower(s.kind)||s.kind==='barracks'?' · 等级 '+s.level:''}${s.branch||s.barracksBranch?' · 专精':''}</small><h3>${title}</h3></div></div><div class="hp-track"><i style="width:${Math.max(0,s.hp/s.maxHp)*100}%"></i></div><div class="selection-stat"><span>耐久</span><b>${Math.ceil(s.hp)} / ${s.maxHp}</b></div>${defenseHTML(s)}${s.kind==='barracks'?'':`<p>${s.branch?BRANCHES[s.branch].description:descriptions[s.kind].replace(/ · 球形射程.*$/,'')}</p>`}${attack?`<div class="selection-stat"><span>${attack.coneAngle?'锥形射程':'球形射程'}</span><b>${attack.range.toFixed(1)} 格</b></div><div class="selection-stat"><span>${DAMAGE_LABELS[attack.damageType]}</span><b>${Number(attack.damage.toFixed(1))}</b></div><div class="selection-stat"><span>攻击间隔</span><b>${attack.interval.toFixed(2)} 秒</b></div><ul class="tower-traits">${towerFeatures(attack).map(line=>`<li>${line}</li>`).join('')}</ul>`:''}</div><div class="selection-actions">${isTower(s.kind)||s.kind==='barracks'?`<button id="upgrade" class="upgrade" ${s.level>=3?'disabled':''}>${s.level>=3?'已达最高等级':attack&&s.level===2?'选择三级专精':'升级工事'}<span>${s.level>=3?'III':attack&&s.level===2?'两种分支 →':costHTML(game.upgradeCost(s))}</span></button>`:''}${isDirectional(s)?`<button id="rotate-tower" class="text-button" ${game.phase==='preparation'?'':'disabled'}>${game.phase==='preparation'?'调整朝向 · 自由瞄准':'战斗中朝向锁定'}</button>`:''}<button id="sell" class="text-button">拆除 · 返还 50% 基础金币</button></div>`;
  el('close-selection').onclick=()=>{selected=null;world.select(null);updateSelection();};
  pane.querySelector('.selection-details')!.scrollTop=scrollTop;
  if(s.kind==='barracks'){pane.querySelector('.selection-details')!.insertAdjacentHTML('beforeend',barracksDetails(s));if(s.level===2)el('upgrade').innerHTML='选择兵营专精<span>魔剑士 / 圣骑士 →</span>';}
  if(s.hp<s.maxHp){
    const repair=document.createElement('button');repair.className='text-button';repair.id='repair-structure';repair.disabled=game.phase!=='preparation';repair.textContent=game.phase==='preparation'?`修复${s.ruined?'旧防线':'工事'} · ${game.repairCost(s)} 金币`:'战斗中无法修复';
    repair.onclick=()=>{game.repairStructure(s.id);dirtySelection='';updateSelection();};pane.querySelector('.selection-actions')!.prepend(repair);
  }
  if(el('upgrade'))el('upgrade').onclick=()=>{if(s.kind==='barracks'&&s.level===2)showBranches(s);else if(isTower(s.kind)&&s.level===2)showBranches(s);else{game.upgrade(s.id);dirtySelection='';updateSelection();}};
  if(el('rotate-tower'))el('rotate-tower').onclick=()=>{if(game.phase!=='preparation')return;aiming=s.id;aimFacing=s.facing??Math.PI/2;syncPlacement();};
  el('sell').onclick=()=>{game.build('remove',s.x,s.z);selected=null;world.select(null);updateSelection();};
}
function showBranches(s:Structure){
  if(modalOpen||bestiary.open||(!isTower(s.kind)&&s.kind!=='barracks')||s.level!==2)return;
  selectTool('inspect');modalWasPaused=game.paused;game.paused=true;modalOpen=true;world.controls.enabled=false;keys.clear();
  if(s.kind==='barracks'){el('modal-root').innerHTML=barracksBranchDialog(game.resources.gold);}else{
  const current=towerAttack({...s,kind:s.kind as import('./simulation/towers').TowerKind});
  el('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal branch-modal" role="dialog" aria-modal="true" aria-labelledby="branch-title"><button class="modal-close" aria-label="关闭专精选择">${icon('close')}</button><div class="eyebrow">CHOOSE YOUR SPECIALIZATION</div><h2 id="branch-title">${LABELS[s.kind]} · 三级专精</h2><p class="branch-intro">选择一种战术，重塑这座防御塔。专精后固定分支；拆除仍只返还一半基础建造金币。</p><div class="branch-current">当前二级：${Number(current.damage.toFixed(1))} ${DAMAGE_LABELS[current.damageType]} · ${current.interval.toFixed(2)} 秒 / 次 · 射程 ${current.range.toFixed(1)} 格</div><div class="branch-options">${branchesFor(s.kind).map(b=>{
    const attack=towerAttack({kind:b.kind,level:3,branch:b.id}),cost=game.upgradeCost(s,b.id),afford=game.canAfford(cost);
    return `<article class="branch-card" style="--branch-color:${b.color}"><span class="branch-emblem">${portrait(b.id)}</span><h3>${b.name}</h3><p>${b.description}</p><dl><div><dt>${DAMAGE_LABELS[attack.damageType]}</dt><dd>${attack.damage}</dd></div><div><dt>攻击间隔</dt><dd>${attack.interval.toFixed(2)} 秒</dd></div><div><dt>${attack.coneAngle?'锥形射程':'球形射程'}</dt><dd>${attack.range.toFixed(1)} 格</dd></div></dl><ul>${towerFeatures(attack).map(line=>`<li>${line}</li>`).join('')}</ul><button data-branch="${b.id}" ${afford?'':'disabled'} aria-label="升级为${b.name}"><b>${afford?'选择 '+b.name:'金币不足'}</b><span>${costHTML(cost)}</span></button></article>`;
  }).join('')}</div><p class="branch-feedback" role="status"></p><button class="text-button branch-back">暂不选择 · 返回战场</button></section></div>`;
  }
  const close=()=>{closeModal();el('upgrade')?.focus();};
  document.querySelector<HTMLButtonElement>('.branch-modal .modal-close')!.onclick=close;
  document.querySelector<HTMLButtonElement>('.branch-back')!.onclick=close;
  document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(b=>b.onclick=()=>{
    if(game.upgrade(s.id,b.dataset.branch as TowerBranch|BarracksBranch)){closeModal();dirtySelection='';updateSelection();el('context-actions').querySelector<HTMLButtonElement>('[data-action=details]')?.focus();}
    else document.querySelector('.branch-feedback')!.textContent=game.message;
  });
  document.querySelector<HTMLButtonElement>('.branch-modal .modal-close')!.focus();

}
world.onHover=p=>{hover=p;if(!modalOpen&&!bestiary.open&&!campaign.visible){if(aiming!==null&&world.aimPoint){const p=world.aimPoint;const s=game.structures.find(s=>s.id===aiming);if(s&&(s.x!==p.x||s.z!==p.z))aimFacing=Math.atan2(p.x-s.x,p.z-s.z);}else if(p&&tool!=='inspect'&&tool!=='remove')placement.move(p);syncPlacement();}const info=el('hover-info');if(!p){info.classList.add('hidden');return;}const tile=game.tile(p.x,p.z)!;info.classList.remove('hidden');const err=tool==='inspect'?null:game.validate(tool,p.x,p.z);info.innerHTML=`<span>${p.x}, ${p.z}</span><b>海拔 ${tile.h}</b><span>${tile.water?'水道':tile.bridge?'木桥':tile.road?'古道':'草地'}</span>${err?`<em>${err}</em>`:tool!=='inspect'&&tool!=='remove'?`<div class="hover-cost">${costHTML(COSTS[tool])}</div>`:''}`;};
world.onUnitClick=id=>{if(modalOpen||bestiary.open||campaign.visible)return;if(id===game.hero?.id){selectHero(true);return;}selectedPost=null;selected=id;world.select(null);updateSelection();audio.click();};
world.onClick=p=>{
  if(modalOpen||bestiary.open||campaign.visible)return;
  if(heroCommand){if(p&&game.commandHero(p)){heroCommand=false;world.setHeroCommand(false);el('tool-hint').textContent=descriptions.inspect;audio.click();}return;}
  if(aiming!==null){const s=game.structures.find(s=>s.id===aiming);if(p&&s&&(p.x!==s.x||p.z!==s.z))game.orientStructure(s.id,Math.atan2(p.x-s.x,p.z-s.z));aiming=null;world.setAim(null);dirtySelection='';syncPlacement();updateSelection();return;}
  if(tool!=='inspect'&&tool!=='remove'){clickPlacement(p);return;}if(!p)return;
  if(tool==='inspect'){selectedPost=game.outposts.find(s=>Math.abs(s.x-p.x)<=1&&Math.abs(s.z-p.z)<=1)?.id??null;selected=game.structureAt(p.x,p.z)?.id??null;world.select(selected);updateSelection();}
  else if(game.build(tool,p.x,p.z))updateSelection();
};
// Listen on document so a release outside the card always ends the drag.
let cardDrag:{button:HTMLButtonElement;tool:Tool;id:number;x:number;y:number;started:boolean}|null=null;
const draggedCards=new WeakSet<HTMLButtonElement>();
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(b=>{
  const next=b.dataset.tool as Tool;
  b.onpointerdown=e=>{draggedCards.delete(b);if(e.button!==0||next==='inspect'||next==='remove')return;cardDrag={button:b,tool:next,id:e.pointerId,x:e.clientX,y:e.clientY,started:false};b.setPointerCapture(e.pointerId);};
  b.onclick=()=>{if(draggedCards.has(b)){draggedCards.delete(b);return;}selectTool(next);};
});
document.addEventListener('pointermove',e=>{
  const d=cardDrag;if(!d||d.id!==e.pointerId)return;
  if(d.started&&tool!==d.tool){cardDrag=null;return;}
  if(!d.started&&Math.hypot(e.clientX-d.x,e.clientY-d.y)>6){selectTool(d.tool);placement.dragging=true;d.started=true;}
  if(d.started){placement.move(document.elementFromPoint(e.clientX,e.clientY)===world.renderer.domElement?world.pick(e.clientX,e.clientY):null);syncPlacement();}
},true);
document.addEventListener('pointerup',e=>{
  const d=cardDrag;if(!d||d.id!==e.pointerId)return;
  if(d.started){draggedCards.add(d.button);e.stopPropagation();}
  placement.dragging=false;cardDrag=null;if(d.button.hasPointerCapture(e.pointerId))d.button.releasePointerCapture(e.pointerId);syncPlacement();
},true);
document.addEventListener('pointercancel',()=>{if(cardDrag?.started)selectTool('inspect');cardDrag=null;placement.dragging=false;},true);
window.addEventListener('blur',()=>{if(cardDrag)selectTool('inspect');cardDrag=null;keys.clear();});
// A non-ghost click ends a terrain chain; controls may then handle that click normally.
document.addEventListener('pointerdown',e=>{if(placement.anchor&&e.target!==world.renderer.domElement)selectTool('inspect');},true);
function startWave(){if(modalOpen||bestiary.open)return;audio.unlock();selectTool('inspect');game.startWave();}
el('start-wave').onclick=startWave;
function togglePause(){if(bestiary.open||modalOpen||game.phase==='victory'||game.phase==='defeat')return;audio.unlock();game.paused=!game.paused;audio.click();}
el('pause').onclick=togglePause;
el('speed').onclick=()=>{game.speed=game.speed===1?2:game.speed===2?3:1;};
function showScouts(front?:number){
  if(modalOpen||bestiary.open||campaign.visible)return;
  selectTool('inspect');modalWasPaused=game.paused;game.paused=true;modalOpen=true;world.controls.enabled=false;keys.clear();
  const wave=game.phase==='preparation'?Math.min(game.totalWaves,game.wave+1):Math.max(1,game.wave),plan=game.wavePlan(wave);
  const fronts=front===undefined?game.waveFronts(wave):[front],bossReport=bossInPlan(plan);
  const bossAlert=bossReport?`<div class="boss-scout-alert">♛ 首领警报 · ${game.entrances[bossReport.entrance].name}<br>${bestiary.known(bossReport.kind)?ENEMIES[bossReport.kind].title+' · '+ENEMIES[bossReport.kind].name:'？？？ · 未知巨型攻城目标'}<br>斥候听见沉重战鼓，沿途工事遭到摧毁。请分散布防，并为英雄留出撤退空间。</div>`:'';
  el('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal scout-modal ${bossReport?'boss-warning':''}" role="dialog" aria-modal="true" aria-labelledby="scout-title"><button class="modal-close" aria-label="关闭斥候报告">${icon('close')}</button><div class="eyebrow">SCOUTS AT THE FRONTIER</div><h2 id="scout-title">第 ${wave} 波 · ${game.map.waveNames[wave-1]}</h2><p class="modal-lead">${game.phase==='preparation'?'下一波':'当前攻势'} · ${plan.length} 名敌军 · ${game.waveFronts(wave).length} 个来袭方向</p>${bossAlert}<div class="scout-fronts">${fronts.map(i=>{
    const entry=game.entrances[i],groups=scoutGroups(plan,i,k=>bestiary.known(k));
    return `<article class="scout-front" style="--front-color:${entry.color}"><h3>${icon('flag')}${entry.name}<span>${plan.filter(p=>p.entrance===i).length} 名</span></h3>${groups.length?groups.map(g=>`<div class="scout-enemy">${g.kind?enemyPortrait(g.kind):'<span class="scout-unknown">?</span>'}<div><b>${g.kind?ENEMIES[g.kind].name:'？？？'}</b><small>${g.kind?TARGET_LABELS[ENEMIES[g.kind].preference]:'尚未遭遇 · 接敌后识别'}</small></div><strong>× ${g.count}</strong></div>`).join(''):'<p>本波暂未发现敌情</p>'}</article>`;
  }).join('')}</div><p class="scout-footnote">敌人会根据偏好寻找目标、绕开火力或破坏工事。入口表示来袭方向，具体路线会随战局变化。</p><button id="scout-back" class="primary-button">返回布防 ${icon('shield')}</button></section></div>`;
  const close=()=>{closeModal();el('scout-callout').focus();};document.querySelector<HTMLButtonElement>('.scout-modal .modal-close')!.onclick=close;el('scout-back').onclick=close;
  document.querySelector<HTMLButtonElement>('.scout-modal .modal-close')!.focus();audio.click();
}
el('estate-open').onclick=()=>{if(modalOpen||bestiary.open||campaign.visible)return;selectTool('inspect');selected=null;world.select(null);selectedPost=game.outposts[0].id;dirtySelection='';updateSelection();audio.click();};
el('scout-open').onclick=()=>showScouts();el('scout-callout').onclick=()=>showScouts();
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
atlasMusic.onclick=()=>el('music-settings').click();
el('next-track').onclick=()=>{audio.unlock();audio.nextTrack();audio.effect('upgrade');updateAudioPanel();};
el('music-toggle').onclick=()=>{audio.toggleMusic();audio.effect('upgrade');updateAudioPanel();};
el('music-volume').addEventListener('input',e=>{const n=Number((e.target as HTMLInputElement).value);audio.setVolume('music',n/100);el('music-volume-label').textContent=`${n}%`;audio.unlock();});
el('sfx-volume').addEventListener('input',e=>{const n=Number((e.target as HTMLInputElement).value);audio.setVolume('sfx',n/100);el('sfx-volume-label').textContent=`${n}%`;el('sound').classList.toggle('muted',n===0);audio.unlock();});
el('camera-reset').onclick=()=>world.resetCamera();
function updateMapChrome(){
  el('wave-total').textContent=` / ${game.totalWaves}`;
  document.querySelector('.wave-track')!.innerHTML=Array.from({length:game.totalWaves},(_,i)=>`<i data-wave="${i+1}"></i>`).join('');
  el('chapter-copy').innerHTML=`<span></span> ${game.map.chapter}`;el('objective-eyebrow').textContent=game.map.eyebrow;el('objective-title').textContent=game.map.objective;el('objective-description').textContent=game.map.description;
  el('map-labels').innerHTML=game.entrances.map((p,i)=>`<button id="entry-${i}" data-scout-front="${i}" class="map-label danger front-marker" aria-label="查看${p.name}来袭情报"><i class="front-direction" aria-hidden="true">➜</i><span style="color:${p.color}">⚑</span>${p.name}<small>来袭情报</small></button>`).join('')+`<div id="keep-label" class="map-label"><span>♜</span>${game.map.goalName}<small>守住中央要塞</small></div>`;
  document.querySelectorAll<HTMLButtonElement>('[data-scout-front]').forEach(b=>b.onclick=()=>showScouts(Number(b.dataset.scoutFront)));
  el('front-switches').innerHTML=game.entrances.map((p,i)=>`<button data-front="${i}" title="查看${p.name}" aria-label="查看${p.name}">${['西岸','北坡','东南'][i]}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-front]').forEach(b=>b.onclick=()=>{if(modalOpen||bestiary.open)return;world.focusFront(Number(b.dataset.front));audio.click();});
  el('battle-sites').innerHTML=game.outposts.map(p=>`<button data-outpost="${p.id}" class="site-marker" aria-label="查看${p.name}"><span>${p.kind==='farm'?'♧':'⚒'}</span><b>${p.name}</b><small></small><em></em></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-outpost]').forEach(b=>b.onclick=()=>{if(modalOpen||bestiary.open||campaign.visible)return;selectTool('inspect');selected=null;world.select(null);selectedPost=b.dataset.outpost!;dirtySelection='';updateSelection();audio.click();});
}

function closeModal(){el('modal-root').innerHTML='';modalOpen=false;game.paused=modalWasPaused;world.controls.enabled=true;audio.unlock();}
function revealBattleHud(){updateUI(performance.now());updateHealthBars();hudEntry.play();}
function startMap(mapId:MapId){battleResult.cancel();bossEntrance.finish();hudEntry.cancel();closeAudio();campaign.hide();hasBattle=true;keys.clear();accumulator=0;game=new Game(true,mapId,campaign.heroFor(mapId));bestiary.beginBattle();world.setGame(game);world.resetCamera();lastPhase=game.phase;selected=null;modalWasPaused=false;closeModal();updateMapChrome();selectTool('inspect');lastMessage=-1;audio.click();if(!travel.active)revealBattleHud();}
function showMapPicker(){
  if(campaign.visible)return;
  battleResult.cancel();hudEntry.cancel();
  selectTool('inspect');campaignWasPaused=game.paused;game.paused=true;world.controls.enabled=false;keys.clear();
  el('modal-root').innerHTML='';modalOpen=false;closeAudio();
  campaign.show(hasBattle&&game.phase!=='victory'&&game.phase!=='defeat');
  audio.setScene('campaign');audio.setSuspended(true);
}
function resumeBattle(){
  if(!hasBattle)return;
  closeAudio();campaign.hide();audio.setScene('battle');game.paused=campaignWasPaused;world.controls.enabled=true;keys.clear();accumulator=0;audio.click();revealBattleHud();
}
function showHelp(){if(modalOpen)return;selectTool('inspect');modalWasPaused=game.paused;game.paused=true;modalOpen=true;world.controls.enabled=false;
  el('modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="modal-close" aria-label="关闭玩法说明">${icon('close')}</button><div class="eyebrow">A FIELD GUIDE</div><h2 id="help-title">领主的战地手册</h2><p class="modal-lead">不要只在路边造塔。把整片山谷变成你的防线。</p><div class="guide-grid"><article>${icon('wall')}<h3>让敌人做选择</h3><p>敌军独立选择要塞、防御建筑或生产据点。筑墙迫使绕路或破墙；疾行兵寻找火力薄弱处，潜行者偏爱掠夺经济。</p></article><article>${icon('dig')}<h3>改造土地</h3><p>挖河、搭桥、筑高与平整地形；木栅栏便宜但易破，尖刺伤害并减速地面敌军，石板路使卫兵移速提高 35%。</p></article><article>${icon('mage')}<h3>射界与对空</h3><p>普通炮塔只有前方 100° 锥形射界且不能对空；迫击炮全向抛射但有近身盲区，魔力导弹井可全向对空。其余塔为球形射程，距离计算包含高差。</p></article><article>${icon('barracks')}<h3>用士兵守住缺口</h3><p>兵营自动派出卫兵拦截附近敌军。战斗中阵亡后每 ${BARRACKS_RECRUIT_SECONDS} 秒补员一人；一级 2 人，二级和三级专精均为 3 人。</p></article><article>${icon('shield')}<h3>用对伤害类型</h3><p>箭塔、普通炮塔、迫击炮与卫兵造成物伤；魔力导弹、法师、寒霜与雷电塔造成法伤。攻击塔二级后可选择三级专精。物防只减物伤，法抗只减法伤；60% 物防意味着只承受 40% 物伤。</p></article><article>${icon('book')}<h3>留意斥候情报</h3><p>点击斥候来报或入口旗帜，查看各方向的兵种与数量；未知敌人显示？？？。每次进关各兵种首次登场都会提示，重玩也会弹出；阅读自动暂停。</p></article><article>${icon('coin')}<h3>赚取金币，保护收入</h3><p>建造与升级只消耗金币。击杀敌军、波次补给和据点生产都能赚取金币。非最终波结束后获得 ${ECONOMY.waveSupply} 金币补给。准备阶段重建或扩建麦田、银矿。战中每 ${ECONOMY.deliveryInterval} 秒运回金币，每波 ${ECONOMY.deliveriesPerWave} 次；守住获得丰收金币，连续守住还会增收。失守丢失本波丰收、连守加成与扩建等级。</p></article></div><p class="modal-lead">从卡牌栏拖出工事，松手后预览跟随鼠标，再点击建造。地形工事建好后点击四邻虚影延伸，点别处结束。备战期选中指向型建筑可自由瞄准；Q / E 逆时针 / 顺时针，Esc 取消。</p><div class="controls-guide"><span><kbd>H</kbd>选择英雄，再点击地面部署</span><span><kbd>1–9 / 0</kbd> 选择当前分页的工事</span><span><kbd>X</kbd> 拆除建筑或木桥</span><span><kbd>ESC</kbd> 巡视 / 关闭</span><span><kbd>空格</kbd> 暂停</span><span><kbd>↵</kbd> 确认建造 / 开始波次</span><span><kbd>左键拖拽</kbd> 平移，单击建造 / 选择</span><span><kbd>右键拖拽</kbd> 旋转</span><span><kbd>滚轮</kbd> 缩放</span><span><kbd>WASD / Shift</kbd> 平移 / 加速</span></div><p class="music-credit">原声曲目：Kevin MacLeod · CC BY 4.0 · <a href="/audio/music/CREDITS.md" target="_blank" rel="noreferrer">查看完整署名与授权</a></p><button id="back-to-game" class="primary-button">回到暮河 ${icon('chevron')}</button><button id="restart-help" class="text-button">重新开始战役</button></section></div>`;
  el('back-to-game').innerHTML=`回到${game.map.name} ${icon('chevron')}`;el('back-to-game').onclick=closeModal;document.querySelector<HTMLButtonElement>('.modal-close')!.onclick=closeModal;el('restart-help').onclick=restart;
}
el('help').onclick=showHelp;el('map-select').onclick=showMapPicker;
function restart(){startMap(game.mapId);}
function showResult(){
  if(battleResult.active)return;hudEntry.cancel();bestiary.close();closeAudio();keys.clear();cardDrag=null;
  selectTool('inspect');selected=null;selectedPost=null;world.select(null);updateSelection();
  modalOpen=true;world.controls.enabled=false;game.paused=false;battleResult.begin(game,world.terminalTime);
}

const keys=new Set<string>();
window.addEventListener('keydown',e=>{if(document.body.classList.contains('startup-pending'))return;if(battleResult.presenting){e.preventDefault();return;}if(bossEntrance.active){e.preventDefault();if(e.code==='Escape')bossEntrance.finish();else if(e.code==='Space')game.paused=!game.paused;return;}if(travel.active){e.preventDefault();return;}if(bestiary.open)return;if(e.target instanceof HTMLInputElement)return;if(campaign.visible){if(campaign.heroPanel.open)return;if(e.code==='Escape'&&campaign.selected){campaign.clearSelection();return;}if(e.code==='Escape'&&hasBattle&&game.phase!=='victory'&&game.phase!=='defeat')resumeBattle();return;}if(['Space','Enter','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.repeat){if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))keys.add(e.code);return;}if(e.code==='Escape'){if(modalOpen&&game.phase!=='victory'&&game.phase!=='defeat')closeModal();else{selected=null;selectedPost=null;world.select(null);selectTool('inspect');}return;}if(modalOpen){if(e.code==='Tab'){const dialog=document.querySelector('#modal-root [role=dialog]');if(dialog){const buttons=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}return;}keys.add(e.code);audio.unlock();if(e.code==='Space')togglePause();else if(e.code==='Enter'){if(aiming!==null){game.orientStructure(aiming,aimFacing);aiming=null;world.setAim(null);syncPlacement();}else if(placement.point)clickPlacement(placement.point);else if(tool==='inspect')startWave();}else if((e.code==='KeyQ'||e.code==='KeyE')&&(aiming!==null||isDirectional({kind:tool})||selectedDirectional())){rotatePreview(e.code==='KeyQ'?TURN_COUNTERCLOCKWISE:TURN_CLOCKWISE);}else if(/^Digit[0-9]$/.test(e.code)){const next=buildShortcut(buildGroup,e.code);if(next)selectTool(next);}else if(e.code==='KeyH')selectHero();else if(e.code==='KeyX')selectTool('remove');else if(e.code==='KeyR')world.resetCamera();});
// Touch browsers may grant activation only on release; retries also recover
// interrupted audio and samples that timed out on a slow public connection.
for(const event of ['pointerdown','touchend','click','keydown'])
  window.addEventListener(event,()=>audio.retryFromGesture(),{capture:true,passive:true});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(game.phase==='battle'){game.paused=true;game.say('已自动暂停 · 点击继续以恢复战斗');}});
function updateUI(now:number){
  el('gold').textContent=String(Math.floor(game.resources.gold));
  el('castle-hp').textContent=String(game.castleHp);el('castle-hp').parentElement!.classList.toggle('critical',game.castleHp<35);
  el('phase-label').textContent=game.paused?'已暂停':game.phase==='preparation'?'准备阶段':game.phase==='battle'?'交战中':game.phase==='victory'?'已守住':'已失守';el('phase-dot').classList.toggle('battle',game.phase==='battle');
  el('enemy-count').textContent=game.phase==='battle'?`${game.enemies.length} 名敌军在战场 · ${game.spawnedInWave} / ${game.totalInWave} 已抵达`:'修筑工事 · 迎接下一次来袭';
  el('wave-number').textContent=String(Math.min(game.totalWaves,game.phase==='preparation'?game.wave+1:game.wave)).padStart(2,'0');
  el('wave-name').textContent=game.map.waveNames[Math.min(game.totalWaves-1,game.phase==='preparation'?game.wave:game.wave-1)]??game.map.waveNames[0];
  document.querySelectorAll<HTMLElement>('[data-wave]').forEach(e=>{e.classList.toggle('done',Number(e.dataset.wave)<=game.wave);e.classList.toggle('current',Number(e.dataset.wave)===game.wave&&game.phase==='battle');});
  const waveButton=el<HTMLButtonElement>('start-wave');waveButton.disabled=game.phase!=='preparation';waveButton.querySelector('span')!.textContent=game.phase==='battle'?'抵御来袭':game.wave===0?'吹响号角':'迎接下一波';
  el('pause').innerHTML=`${icon(game.paused?'play':'pause')}<span>${game.paused?'继续':'暂停'}</span>`;el('speed').textContent=`${game.speed}×`;
  if(game.messageSerial!==lastMessage){lastMessage=game.messageSerial;el('toast').textContent=game.message;el('toast').classList.add('visible');toastTimer=now+4800;}
  if(now>toastTimer)el('toast').classList.remove('visible');
  updateHeroCard();updateSelection();bestiary.setNoticeVisible(!campaign.visible&&!modalOpen&&!bestiary.open&&el('selection').classList.contains('hidden'));if(audioPanelOpen)updateAudioPanel();
  bossHud.update(game,!campaign.visible&&!travel.active&&!bossEntrance.active&&!modalOpen&&!bestiary.open,game.time+world.terminalTime);
  const fronts=game.waveFronts(),bossReport=bossInPlan(game.wavePlan());
  el('scout-callout').classList.toggle('boss-warning',!!bossReport);
  el('scout-callout').innerHTML=`${icon('flag')}<span>${bossReport?'♛ 首领警报':'斥候来报'} · ${game.phase==='preparation'?'下一波':'当前攻势'}<small>${game.wavePlan().length} 名敌军 · ${fronts.length} 路来袭 · 点击查看</small></span>`;el('scout-callout').classList.toggle('ready',game.phase==='preparation');
  for(const [i] of game.entrances.entries()){const label=el(`entry-${i}`);
    label.classList.toggle('boss-warning',bossReport?.entrance===i);
    label.querySelector('small')!.textContent=bossReport?.entrance===i?'首领来袭':game.phase==='battle'?'正在来袭':'下一波来袭';
    label.classList.add('incoming');
  }
  const report=game.harvestReport;el('harvest-report').hidden=!report||!report.sites.length;
  if(report)el('harvest-report').innerHTML=`<b>领地收获 · +${report.gold} 金币</b>${report.sites.map(p=>`<small class="${p.lost?'lost':''}">${p.name} ${p.lost?'失守 · 丰收取消':'守住 · 丰收 +'+p.bonus}</small>`).join('')}`;
  document.querySelectorAll<HTMLElement>('[data-front]').forEach(b=>{const active=fronts.includes(Number(b.dataset.front));b.classList.toggle('incoming',active);b.setAttribute('aria-label',`查看${game.entrances[Number(b.dataset.front)].name}${active?'，本波来袭':''}`);});
  el('wave-briefing').textContent=game.map.waveBriefings[Math.min(game.totalWaves-1,game.phase==='preparation'?game.wave:Math.max(0,game.wave-1))];
  if(lastPhase!==game.phase){lastPhase=game.phase;if(game.phase==='victory'||game.phase==='defeat')showResult();}
}
function updateWorldUI(){
  // Camera-dependent projection runs every rendered frame, independently of text updates.
  const fronts=game.waveFronts();
  const actions=document.querySelector<HTMLElement>('.top-actions')!;
  const actionsBottom=Math.max(actions.offsetTop+actions.offsetHeight,bossHud.root.hidden?0:bossHud.root.offsetTop+bossHud.root.offsetHeight);
  const dockTop=document.querySelector<HTMLElement>('.build-dock')!.offsetTop;
  app.style.setProperty('--dock-clear',`${innerHeight-dockTop}px`);
  const wavePanel=document.querySelector<HTMLElement>('.wave-panel')!;
  const waveRect={top:wavePanel.offsetTop,left:wavePanel.offsetLeft},selectionRect=el('selection').getBoundingClientRect();
  for(const [i,p]of game.entrances.entries()){
    const pos=world.project(p.x,p.z,game.ground(p.x,p.z)+3.5),label=el(`entry-${i}`);
    label.hidden=!fronts.includes(i);if(label.hidden)continue;
    const half=label.offsetWidth/2,h=label.offsetHeight/2;
    const bounds={left:half+26,right:innerWidth-half-26,top:actionsBottom+h+24,bottom:Math.max(actionsBottom+h+24,dockTop-h-22)};
    bounds.right=Math.min(bounds.right,waveRect.left-half-20);
    if(innerWidth>540&&!el('selection').classList.contains('hidden'))bounds.left=Math.max(bounds.left,selectionRect.right+half+20);
    const marker=frontPosition(pos,bounds,{x:innerWidth/2,y:innerHeight/2});
    label.style.left='0';label.style.top='0';label.style.transform=`translate3d(${marker.x}px,${marker.y}px,0) translate(-50%,-50%)`;
    label.classList.toggle('detached',marker.detached);
    label.style.setProperty('--front-angle',`${marker.angle}deg`);
    label.querySelector('.front-direction')!.setAttribute('title',marker.detached?'箭头指向屏幕外入口':'入口方位');
  }
  const keep=world.project(game.goal.x,game.goal.z,game.ground(game.goal.x,game.goal.z)+5.6);el('keep-label').style.left=`${keep.x}px`;el('keep-label').style.top=`${keep.y}px`;
  for(const p of game.outposts){const b=document.querySelector<HTMLButtonElement>(`[data-outpost="${p.id}"]`)!;const pos=world.project(p.x,p.z,game.ground(p.x,p.z)+1);b.style.left=`${pos.x}px`;b.style.top=`${pos.y}px`;b.classList.toggle('working',p.owned);b.querySelector('small')!.textContent=p.owned?`${p.level===2?'扩建 · ':''}连守 ${p.streak} 波 · 丰收 +${game.outpostHarvest(p)}`:`重建 ${p.cost} 金币`;const income=b.querySelector('em')!;income.textContent=`+${p.lastYield} 金币 已入库`;income.classList.toggle('visible',p.lastYield>0&&game.time-p.lastYieldAt<4);const expanded=selectedPost===p.id||(hover!==null&&Math.hypot(hover.x-p.x,hover.z-p.z)<2.5);const earning=p.lastYield>0&&game.time-p.lastYieldAt<2.5;b.classList.toggle('expanded',expanded);b.hidden=selectedPost===p.id||!earning||pos.x<45||pos.x>innerWidth-45||pos.y<100||pos.y>innerHeight-140;}
  positionContextActions();
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
function frame(now:number){const dt=Math.min((now-previous)/1000,0.08);previous=now;audio.update(dt);if(audioPanelOpen&&now-lastUI>100){updateAudioPanel();lastUI=now;}if(travel.active){travel.render(now/1000);audio.setSuspended(true);accumulator=0;requestAnimationFrame(frame);return;}if(campaign.visible){campaign.render(now/1000);audio.setSuspended(true);requestAnimationFrame(frame);return;}audio.setScene('battle');audio.setSuspended(game.paused||modalOpen);
  if(battleResult.active){audio.setSuspended(true);battleResult.update(dt);world.render(now/1000);bossHud.update(game,true,game.time+world.terminalTime);accumulator=0;requestAnimationFrame(frame);return;}
  if(bossEntrance.active){bossEntrance.update(dt);world.render(now/1000);requestAnimationFrame(frame);return;}
  accumulator+=dt*game.speed;
  while(accumulator>=1/30){game.step(1/30);accumulator-=1/30;if(bossEntrance.begin(game)){accumulator=0;break;}}
  if(!bossEntrance.active&&game.phase!=='victory'&&game.phase!=='defeat')bestiary.record(game.drainEncounters());
  const direction=world.camera.getWorldDirection(new THREE.Vector3());const side={x:-direction.z,z:direction.x};const l=Math.hypot(side.x,side.z)||1;side.x/=l;side.z/=l;
  audio.consume(game.drainSounds().filter(event=>(!bossEntrance.active||event.kind!=='boss-arrival')&&event.kind!=='victory'&&event.kind!=='defeat'),{x:world.controls.target.x,z:world.controls.target.z},side);audio.setSuspended(game.paused||modalOpen);
  if(!bossEntrance.active&&!modalOpen&&!bestiary.open&&keys.size){const x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),z=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);if(x||z)world.moveCamera(x,-z,dt*(keys.has('ShiftLeft')||keys.has('ShiftRight')?1.7:1));}
  world.render(now/1000);if(bossEntrance.active){requestAnimationFrame(frame);return;}updateHealthBars();bestiary.update(dt);updateWorldUI();if(now-lastUI>80){updateUI(now);if(tool!=='inspect'||aiming!==null)syncPlacement();lastUI=now;}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
updateMapChrome();showMapPicker();Object.assign(window,{__riverwatch:{get game(){return game;},world,placement,audio,campaign,travel,bestiary,selectTool,restart,startMap,showMapPicker,resumeBattle,snapshot:()=>({screen:campaign.visible?'campaign':'battle',phase:game.phase,wave:game.wave,castleHp:game.castleHp,resources:game.resources,enemies:game.enemies.length,soldiers:game.soldiers.length,structures:game.structures.length,revision:game.revision,tiles:game.tiles.length,map:[WIDTH,DEPTH],mapId:game.mapId,audio:audio.diagnostics()}),advance:(seconds:number)=>{for(let t=0;t<seconds;t+=1/30)game.step(1/30);}}});
