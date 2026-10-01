import { buildingFootprint, footprintsOverlap } from './footprint';
import { HERO_FX_TIMING, rainImpactTime } from './effect-timing';
import { ECONOMY, deliveryGold, harvestGold } from './economy';
import type { HeroId } from '../heroes/roster';
import { soldierProfile, spellbladeAttack, SANCTUARY, BARRACKS_BRANCHES, BARRACKS_RECRUIT_SECONDS, barracksCapacity, isBarracksBranch, type BarracksBranch } from './barracks';
import { HERO_STATS, HERO_ARROW, HERO_SHOT, HERO_SKILLS, type HeroSkill, type HeroEffect, type BattleHero } from './hero';
import { canTarget } from './coverage';
import { isDirectional } from './towers';
import { PathQueue } from './pathfinding';
import { TOWER_STATS, BRANCHES, isTower, towerAttack, type TowerKind, type TowerBranch, type TowerAttack, type ProjectileKind } from './towers';
import { ENEMIES, BOSS_SLAM, BOSS_ENTRANCE, BOSS_RAGE, waveEnemies, type EnemyKind } from './enemies';
import { applyDamage, damageAfterDefense, type DamageType, type Defenses } from './combat';
export { ENEMIES, type EnemyKind } from './enemies';
import { WIDTH, DEPTH, MAPS, makeTerrain, type MapId, type MapDefinition, type Approach, type ProductionSite } from './maps';
export { WIDTH, DEPTH, makeTerrain } from './maps';
export const HEIGHT_UNIT = 0.55;
export type StructureKind = 'wall' | 'palisade' | TowerKind | 'barracks';
export type Tool = 'inspect' | StructureKind | 'bridge' | 'dig' | 'raise' | 'lower' | 'road' | 'spikes' | 'remove';
export interface Point { x: number; z: number }
export interface Vec3 extends Point { y: number }
export interface Tile extends Point { h: number; water: boolean; bridge: boolean; bridgeBed?: number; chasm?: boolean; bridgeDeck?: number; suspension?: boolean; road: boolean; decoration: number; spikes?:boolean; paved?:boolean; active: boolean }
export interface Outpost extends ProductionSite { hp:number; maxHp:number; owned:boolean; eligible:boolean; level:number; streak:number; deliveries:number; productionTime:number; waveGold:number; lastYield:number; lastYieldAt:number; lostThisWave:boolean }
export interface HarvestReport { wave:number; gold:number;  sites:{id:string;name:string;gold:number;bonus:number;lost:boolean}[] }
export interface Resources { gold: number; }
export interface Structure extends Point, Defenses { ruined?:boolean; id: number; kind: StructureKind; facing?:number; hp: number; maxHp: number; level: number; branch?:TowerBranch; barracksBranch?:BarracksBranch; sanctuaryCooldown?:number; cooldown: number; recruit: number }
export type EnemyObjective={type:'keep'}|{type:'defense';id:number}|{type:'economy';id:string};
export interface Enemy extends Vec3, Defenses { boss?:{cooldown:number;windupUntil:number;center:Vec3|null;enraged:boolean;spawnedAt:number;enragedAt?:number;rageRoared?:boolean}; id: number; kind: EnemyKind; airborne?:boolean; hp: number; maxHp: number; speed: number; damage: number; damageType: DamageType; cooldown: number; path: Point[]; revision: number; repath: number; state: 'walking' | 'attacking' | 'wading'; attackAt?:number; facing: number; objective?:EnemyObjective; decisionIn?:number; slow?:number; slowUntil?:number; stunUntil?:number; burn?:number; burnUntil?:number; shred?:number; shredUntil?:number }
export interface Soldier extends Vec3, Defenses { id: number; home: number; hp: number; maxHp: number; cooldown: number; facing: number; state: 'guarding' | 'fighting' | 'casting'; level?:number; branch?:BarracksBranch; attackAt?:number; castUntil?:number; path: Point[]; revision: number; repath: number; guard: Point; engagement?: { target: number; slot: number }; destination?: Point }
export interface Sanctuary extends Vec3 {id:number;home:number;caster:number;time:number;duration:number;radius:number}
export interface AttackAppearance { level:number; tint?:string; branch?:TowerBranch }
export interface Shot { id: number; kind: ProjectileKind; attack:TowerAttack; appearance?:AttackAppearance; hitSound?:SoundKind; from: Vec3; to: Vec3; time: number; duration: number; target: number; damage: number; splash: number }
export { type SoundKind } from './sound';
import { type SoundKind, towerSound, enemySound } from './sound';
export interface SoundEvent extends Point { kind: SoundKind }
export interface Effect extends Vec3 { id: number; kind: 'build' | 'hit' | 'magic' | 'death' | 'explosion' | 'ice' | 'lightning' | 'enchant' | 'holy'; appearance?:AttackAppearance; from?:Vec3; radius?:number; time: number; duration: number }
export const COSTS: Record<Exclude<Tool, 'inspect' | 'remove'>, Resources> = {
  palisade:{gold:3},spikes:{gold:20},road:{gold:4},lower:{gold:5},
  wall: { gold: 5 }, archer: { gold: 75 },
  mage: { gold: 110 }, barracks: { gold: 95 },
  cannon:{gold:125}, frost:{gold:100}, tesla:{gold:130},
  dig: { gold: 8 }, raise: { gold: 5 },
  bridge: { gold: 12 },
};
export const LABELS: Record<Tool, string> = { palisade:'木栅栏',spikes:'尖刺陷阱',road:'石板路',lower:'平整地形',inspect: '巡视', wall: '石墙', archer: '箭塔', mage: '法师塔', cannon:'炮塔', frost:'寒霜塔', tesla:'雷电塔', barracks: '兵营', bridge: '搭木桥', dig: '挖水道', raise: '筑高地', remove: '拆除' };
export const STATS = {
  palisade:{hp:75,range:0,damage:0,interval:0,muzzle:1.1,armor:0,resistance:0},
  wall: { hp: 160, range: 0, damage: 0, interval: 0, muzzle: 1.4, armor:20,resistance:0 },
  ...TOWER_STATS,
  barracks: { hp: 200, range: 4.5, damage: 0, interval: 0, muzzle: 1.2, armor:15,resistance:10 },
};
const SOLDIER_SPACING = 0.72;
const MELEE_SLOTS = 6;
const MELEE_RADIUS = 0.79;
export const WAVE_NAMES = MAPS.windford.waveNames;
export const key = (x: number, z: number) => z * WIDTH + x;
export const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const inSphere = (a: Vec3, b: Vec3, range: number) => distance3(a, b) <= range;

export class Game {
  tiles: Tile[];
  readonly map: MapDefinition;
  structures: Structure[] = [];
  enemies: Enemy[] = [];
  bossDefeats:{enemy:Enemy;time:number}[]=[];
  heroDeaths=0;
  soldiers: Soldier[] = [];
  hero: BattleHero | null = null;
  heroEffects:HeroEffect[]=[];
  shots: Shot[] = [];
  sanctuaries:Sanctuary[]=[];
  effects: Effect[] = [];
  soundEvents: SoundEvent[] = [];
  emitSound(kind:SoundKind, position:Point = this.goal) { if(this.soundEvents.length<96)this.soundEvents.push({kind,x:position.x,z:position.z}); }
  drainSounds() { return this.soundEvents.splice(0); }
  resources: Resources = { gold: ECONOMY.startingGold };
  harvestReport:HarvestReport|null=null;
  castleHp = 100;
  wave = 0;
  kills = 0;
  phase: 'preparation' | 'battle' | 'victory' | 'defeat' = 'preparation';
  paused = false;
  speed = 1;
  revision = 0;
  time = 0;
  readonly entrances:Approach[];
  readonly outposts:Outpost[];
  readonly spawn: Point;
  readonly goal: Point;
  message = '领主，暮河以东就交给你了。修筑防线，守住城堡。';
  messageSerial = 0;
  private encountered = new Set<EnemyKind>();
  private encounterEvents:EnemyKind[]=[];
  drainEncounters(){return this.encounterEvents.splice(0);}
  private nextId = 1;
  private spawnQueue: {kind:EnemyKind; entrance:number}[] = [];
  private spawnTimer = 0;
  totalInWave = 0;
  spawnedInWave = 0;

  constructor(starter = true, readonly mapId: MapId = 'windford', heroId:HeroId|null = null) {
    this.map=MAPS[mapId];
    this.tiles=makeTerrain(mapId);
    this.entrances=this.map.approaches.map(p=>({...p}));this.spawn=this.entrances[0];this.goal={...this.map.goal};
    this.outposts=this.map.sites.map(site=>({...site,hp:0,maxHp:site.kind==='farm'?320:400,owned:false,eligible:false,level:1,streak:0,deliveries:0,productionTime:0,waveGold:0,lastYield:0,lastYieldAt:-100,lostThisWave:false}));
    this.message=this.map.intro;
    if(starter){
      for(const s of this.map.starters)this.addStructure(s.kind,s.x,s.z);
      this.recruitSoldiers();
    }
    if(heroId){
      const p=this.heroSpawn();
      this.hero={id:this.nextId++,heroId,...p,y:this.ground(p.x,p.z)+.35,hp:HERO_STATS.hp,maxHp:HERO_STATS.hp,armor:HERO_STATS.armor,resistance:HERO_STATS.resistance,facing:Math.PI,state:'entering',order:null,engagementTarget:null,flying:false,enteredAt:0,fallenAt:-100,attackStarted:-100,castUntil:0,skill:null,skillCooldowns:{piercing:2,rain:4,gale:6},shieldUntil:0,path:[],revision:this.revision,repath:0,destination:null,rally:{...p},cooldown:0,lastCombat:-100,respawnIn:0,attackUntil:0};
      this.heroEffect('arrival',this.hero,this.hero,1.3,1.5);this.emitSound('hero-arrival',this.hero);
    }
  }
  tile(x: number, z: number): Tile | undefined { return x < 0 || z < 0 || x >= WIDTH || z >= DEPTH ? undefined : this.tiles[key(x, z)]; }
  structureAt(x: number, z: number) { return this.structures.find(s => s.x === x && s.z === z); }
  ground(x: number, z: number) { return (this.tile(Math.round(x), Math.round(z))?.h ?? 1) * HEIGHT_UNIT; }
  say(message: string) { this.message = message; this.messageSerial++; }
  protected(x: number, z: number) { return Math.hypot(x - this.goal.x, z - this.goal.z) < 2.6 || this.entrances.some(p=>Math.hypot(x-p.x,z-p.z)<1.5); }
  canAfford(cost: Resources) { return this.resources.gold >= cost.gold; }
  pay(cost: Resources, multiplier = 1) { this.resources.gold -= Math.ceil(cost.gold * multiplier); }
  addStructure(kind: StructureKind, x: number, z: number) {
    const hp = STATS[kind].hp;
    const s: Structure = { id: this.nextId++, kind, x, z, facing:Math.PI/2,hp, maxHp: hp, armor:STATS[kind].armor,resistance:STATS[kind].resistance, level: 1, cooldown: 0, recruit: 0 };
    this.structures.push(s); this.revision++; return s;
  }
  validate(tool: Tool, x: number, z: number): string | null {
    const tile = this.tile(x, z);
    if (!tile?.active) return '这里是地图边缘';
    if (tool === 'inspect') return null;
    if (this.phase === 'victory' || this.phase === 'defeat') return '本次战役已结束，请重新开始';
    if (this.protected(x, z)) return '请保留城堡与敌军入口的空间';
    if(this.outposts.some(p=>Math.abs(x-p.x)<=1&&Math.abs(z-p.z)<=1))return '这里是生产据点，使用巡视点击据点修复';
    const s = this.structureAt(x, z);
    if (tool === 'remove' && s) return null;
    if (tool === 'remove' && (tile.spikes||tile.paved)) return null;
    if (tool === 'remove' && !tile.bridge) return '选择建筑或木桥拆除，返还一半资源';
    if (s) return '这里已经有建筑了';
    if(tool!=='remove'&&this.structures.some(other=>footprintsOverlap({kind:tool,x,z},other)))return '请留出建筑占地与升级空间';
    if(buildingFootprint(tool)>1){
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
        const ground=this.tile(x+dx,z+dz);
        if(!ground?.active||ground.water||ground.bridge||ground.chasm||Math.abs(ground.h-tile.h)>1)return '防御塔需要两格宽的稳固地基';
        if(ground.spikes||ground.paved)return '请先清理塔基范围内的地面工事';
        if(this.protected(x+dx,z+dz)||this.outposts.some(p=>Math.abs(x+dx-p.x)<=1&&Math.abs(z+dz-p.z)<=1))return '塔基不能侵占城堡、入口或生产据点';
      }
    }
    if(tool!=='remove'&&(tile.spikes||tile.paved))return '请先拆除地面工事';
    if ((this.hero&&this.hero.hp>0&&Math.hypot(this.hero.x-x,this.hero.z-z)<buildingFootprint(tool)/2+.2) || this.enemies.some(e => !e.airborne&&Math.hypot(e.x - x, e.z - z) < buildingFootprint(tool)/2+.2) || this.soldiers.some(e => Math.hypot(e.x - x, e.z - z) < buildingFootprint(tool)/2+.2)) return '单位正占据这个位置';
    if (tool === 'remove') return null;
    if (!this.canAfford(COSTS[tool])) return '金币不足，击退敌军或完成波次可获得补给';
    if (tool === 'bridge') {
      if(tile.chasm&&!tile.bridge){
        const deck=tile.bridgeDeck??7;
        const supported=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>{const n=this.tile(x+dx,z+dz);return n?.active&&(!n.chasm||n.bridge)&&Math.abs(n.h-deck)<=2;});
        return supported?null:'请从崖岸或已有桥端逐格延伸吊桥';
      }
      return tile.water&&!tile.bridge?null:'桥梁只能搭在水道或连接崖岸的深谷上';
    }
    if(tile.chasm)return '深谷只能搭建或拆除吊桥，不能挖河、填高或建塔';
    if (tool === 'lower' && (tile.h<=1||tile.water||tile.bridge)) return '只能削低高于一层的陆地';
    if(tool==='road'&&tile.road)return '这里已经有道路了';
    if (tool === 'raise' && tile.bridge) return '请先拆除木桥，再改造河床';
    if (tool === 'dig' && (tile.water || tile.bridge)) return '这里已经是水道或桥梁';
    if (tool === 'raise' && tile.h >= this.map.maxHeight) return '已达到最高海拔';
    if (tool !== 'dig' && tool !== 'raise' && (tile.water || tile.bridge)) return '建筑需要坚实的陆地';
    return null;
  }
  build(tool: Tool, x: number, z: number, facing=Math.PI/2): boolean {
    const error = this.validate(tool, x, z);
    if (error) { this.emitSound('error',{x,z}); this.say(error); return false; }
    if (tool === 'inspect') return true;
    if (tool === 'remove') {
      const s = this.structureAt(x, z);
      if (!s) {
        const tile = this.tile(x, z)!, original = { ...tile };
        if(tile.spikes||tile.paved){const kind=tile.spikes?'spikes':'road';delete tile.spikes;if(tile.paved){delete tile.paved;tile.road=false;}this.pay(COSTS[kind],-.5);this.revision++;this.emitSound('collapse',{x,z});return true;}
        tile.h = tile.bridgeBed ?? Math.max(0, tile.h - 1);
        tile.bridge = false; tile.water = !tile.chasm; delete tile.bridgeBed; delete tile.suspension;
        if (!this.routesRemainOpen()) { Object.assign(tile, original); this.say('这座桥是唯一通路，拆除会困住单位'); this.emitSound('error', { x, z }); return false; }
        this.pay(COSTS.bridge, -0.5); this.revision++; this.emitSound('collapse', { x, z });
        this.say(tile.chasm?'吊桥已拆除，敌军将改道 · 返还 50% 基础资源':'木桥已拆除，恢复水道 · 返还 50% 基础资源'); return true;
      }
      this.pay(COSTS[s.kind], -0.5); this.destroyStructure(s.id); this.emitSound('collapse',s); this.say('建筑已拆除，返还 50% 基础建造资源'); return true;
    }
    const tile = this.tile(x, z)!;
    if (tool === 'dig' || tool === 'raise' || tool === 'lower' || tool === 'bridge') {
      const original = { ...tile };
      if (tool === 'bridge') { tile.bridgeBed = tile.h; tile.h = tile.chasm ? (tile.bridgeDeck??7) : tile.h+1; tile.water = false; tile.bridge = true; if(tile.chasm)tile.suspension=true; }
      else if (tool === 'dig') { tile.h = Math.max(0, tile.h - 1); tile.water = true; tile.bridge = false; }
      else if(tool==='lower'){tile.h--;}
      else { tile.h++; tile.water = false; tile.bridge = false; }
      if (!this.routesRemainOpen()) {
        delete tile.bridgeBed; delete tile.suspension; Object.assign(tile, original); this.say('地形过于陡峭：需要为敌军保留一条可行路线'); this.emitSound('error', { x, z }); return false;
      }
      tile.decoration = 0;
    } else if(tool==='spikes'){tile.spikes=true;tile.decoration=0;}
    else if(tool==='road'){tile.road=true;tile.paved=true;tile.decoration=0;}
    else { this.addStructure(tool, x, z).facing=facing; tile.decoration = 0;
      if(buildingFootprint(tool)>1)for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const base=this.tile(x+dx,z+dz);if(base)base.decoration=0;}
    }
    this.pay(COSTS[tool]); this.revision++;this.emitSound(tool==='dig'?'dig':tool==='raise'?'raise':'build',{x,z});
    this.effects.push({ id: this.nextId++, kind: 'build', x, z, y: this.ground(x, z), time: 0, duration: 0.7 });
    this.say(tool === 'dig' ? '水道已挖好 · 普通敌军涉水速度降至 38%' : tool === 'raise' ? '地势已抬高 · 高度会影响移动与真实射程' : `${LABELS[tool]}建成 · 敌军路线已重新计算`);
    return true;
  }
  private routesRemainOpen() {
    const reachable = (p: Point, kind: EnemyKind = 'goblin') => (p.x === this.goal.x && p.z === this.goal.z) || this.findPath(p, this.goal, kind).length > 0;
    return this.entrances.every(p=>reachable(p)) && this.enemies.every(e => e.airborne||reachable({ x: Math.round(e.x), z: Math.round(e.z) }, e.kind)) && this.soldiers.every(s=>{
      const home=this.structures.find(b=>b.id===s.home),p={x:Math.round(s.x),z:Math.round(s.z)};
      return !home||(p.x===home.x&&p.z===home.z)||this.findPath(p,home,'goblin',true).length>0;
    });
  }
  private refreshPath(unit: Enemy | Soldier | BattleHero, destination: Point, kind: EnemyKind, friendly = false) {
    const nearest = { x: Math.round(unit.x), z: Math.round(unit.z) };
    const occupied=friendly?new Set(this.soldiers.filter(s=>s.id!==unit.id&&s.hp>0&&
      (s.state==='fighting'||Math.hypot(s.x-s.guard.x,s.z-s.guard.z)<.1))
      .map(s=>key(Math.round(s.x),Math.round(s.z)))):undefined;
    if(unit===this.hero&&occupied)for(const k of this.heroObstacles())occupied.add(k);
    const next = unit.path[0];
    const betweenCenters = Math.hypot(unit.x - nearest.x, unit.z - nearest.z) > 0.000001;
    // Finish the current edge before changing route. Rounding a moving unit to
    // the center behind it caused a visible U-turn every three seconds.
    const fromTile = this.tile(nearest.x, nearest.z);
    const nextTile = next && this.tile(next.x, next.z);
    const continueEdge = betweenCenters && next && nextTile && fromTile &&
      Math.hypot(next.x - unit.x, next.z - unit.z) <= 1.000001 &&
      Number.isFinite(this.moveCost(fromTile, nextTile, kind, friendly)) &&
      (!friendly || (!this.structureAt(next.x, next.z)&&!occupied?.has(key(next.x,next.z))));
    const origin = continueEdge ? next : nearest;
    const path = this.findPath(origin, destination, kind, friendly, occupied, friendly?undefined:unit as Enemy);
    if (Math.hypot(unit.x - origin.x, unit.z - origin.z) > 0.000001) path.unshift(origin);
    unit.path = path; unit.revision = this.revision;
  }
  upgrade(id: number, branch?:TowerBranch|BarracksBranch): boolean {
    const s=this.structures.find(s=>s.id===id);
    if(!s||(!isTower(s.kind)&&s.kind!=='barracks')||s.level>=3||this.phase==='victory'||this.phase==='defeat')return false;
    if(s.kind==='barracks'&&s.level===2){
      if(!isBarracksBranch(branch)){this.say('请选择魔剑士或圣骑士专精');this.emitSound('error',s);return false;}
    }else if(isTower(s.kind)&&s.level===2){
      if(!branch||isBarracksBranch(branch)||!Object.hasOwn(BRANCHES,branch)||BRANCHES[branch].kind!==s.kind){this.say('请选择这座塔的三级专精分支');this.emitSound('error',s);return false;}
    }else if(branch){this.say('防御塔或兵营升至二级后才能选择专精');return false;}
    const cost=this.upgradeCost(s,branch);
    if(!this.canAfford(cost)){this.emitSound('error',s);this.say('升级所需金币不足');return false;}
    this.pay(cost);s.level++;if(isBarracksBranch(branch))s.barracksBranch=branch;else if(branch)s.branch=branch;
    if(s.kind==='barracks')for(const unit of this.soldiers.filter(unit=>unit.home===s.id&&unit.hp>0)){
      const profile=soldierProfile(s),ratio=unit.hp/unit.maxHp;
      Object.assign(unit,{level:s.level,branch:s.barracksBranch,maxHp:profile.hp,hp:profile.hp*ratio,armor:profile.armor,resistance:profile.resistance});
    }
    s.maxHp=Math.round(s.maxHp*1.4);s.hp=s.maxHp;s.ruined=false;this.revision++;
    this.emitSound('upgrade',s);this.say(branch?`专精完成 · ${(isBarracksBranch(branch)?BARRACKS_BRANCHES[branch]:BRANCHES[branch]).name}`:`${LABELS[s.kind]}升级至 ${s.level} 级`);return true;
  }
  upgradeCost(s:Structure,branch?:TowerBranch|BarracksBranch):Resources {
    if(isBarracksBranch(branch)&&s.level===2&&s.kind==='barracks')return {...BARRACKS_BRANCHES[branch].cost};
    if(branch&&!isBarracksBranch(branch)&&Object.hasOwn(BRANCHES,branch)&&s.level===2&&BRANCHES[branch].kind===s.kind)return {...BRANCHES[branch].cost};
    const multiplier=isTower(s.kind)||s.kind==='barracks'?ECONOMY.combatUpgradeMultiplier:.7;
    return {gold:Math.round(COSTS[s.kind].gold*s.level*multiplier)};
  }
  repairCost(s:Structure){return Math.max(1,Math.ceil(COSTS[s.kind].gold*.65*(1-s.hp/s.maxHp)));}
  repairStructure(id:number){
    const s=this.structures.find(s=>s.id===id);if(!s||s.hp>=s.maxHp||this.phase!=='preparation')return false;
    const cost=this.repairCost(s);if(this.resources.gold<cost){this.say('修复所需金币不足');this.emitSound('error',s);return false;}
    this.resources.gold-=cost;s.hp=s.maxHp;s.ruined=false;this.revision++;this.emitSound('build',s);this.say(`${LABELS[s.kind]}已修复 · 可以沿缺口继续布防`);return true;
  }
  orientStructure(id:number,facing:number){const s=this.structures.find(s=>s.id===id);if(!s||!isDirectional(s)||this.phase!=='preparation'||!Number.isFinite(facing))return false;s.facing=((facing%(Math.PI*2))+Math.PI*2)%(Math.PI*2);this.revision++;return true;}
  rotateStructure(id:number,delta=Math.PI/4){const s=this.structures.find(s=>s.id===id);return !!s&&this.orientStructure(id,(s.facing??Math.PI/2)+delta);}
  towerRange(s:Structure){return isTower(s.kind)?towerAttack({...s,kind:s.kind}).range:STATS[s.kind].range+(s.level-1)*.6;}
  enemyArmor(e:Enemy){return Math.max(0,e.armor-((e.shredUntil??0)>this.time?(e.shred??0):0));}
  private hitEnemy(e:Enemy,damage:number,type:DamageType,armorPierce=0,resistPierce=0){
    const reduced=damageAfterDefense(damage,type,{armor:Math.max(0,this.enemyArmor(e)-armorPierce),resistance:Math.max(0,e.resistance-resistPierce)});
    e.hp=Math.max(0,e.hp-reduced);
  }
  private applyTowerHit(e:Enemy,attack:TowerAttack,damage=attack.damage){
    this.hitEnemy(e,damage,attack.damageType,attack.armorPierce,attack.resistPierce);
    // Strongest active effect wins; repeated hits refresh rather than multiply it.
    if(attack.slow&&attack.slow>=((e.slowUntil??0)>this.time?(e.slow??0):0)){e.slow=attack.slow;e.slowUntil=this.time+attack.slowDuration;}
    if(attack.stun)e.stunUntil=Math.max(e.stunUntil??0,this.time+attack.stun*(ENEMIES[e.kind].rank==='boss'?.5:1));
    if(attack.burn&&attack.burn>=((e.burnUntil??0)>this.time?(e.burn??0):0)){e.burn=attack.burn;e.burnUntil=this.time+attack.burnDuration;}
    if(attack.shred&&attack.shred>=((e.shredUntil??0)>this.time?(e.shred??0):0)){e.shred=attack.shred;e.shredUntil=this.time+attack.shredDuration;}
  }
  muzzle(s: Structure): Vec3 { return { x: s.x, z: s.z, y: this.ground(s.x, s.z) + STATS[s.kind].muzzle }; }
  destroyStructure(id: number) { this.structures = this.structures.filter(s => s.id !== id); this.soldiers = this.soldiers.filter(s => s.home !== id); this.revision++; }
  moveCost(from: Tile, to: Tile, kind: EnemyKind, ignoreStructure = false) {
    if (!from.active || !to.active || (from.chasm&&!from.bridge) || (to.chasm&&!to.bridge) || Math.abs(from.h - to.h) > 2) return Infinity;
    const stats = ENEMIES[kind];
    let cost = (1 + Math.abs(from.h - to.h) * 0.35) / stats.speed;
    if (to.water) cost /= stats.water;
    const s = ignoreStructure ? undefined : this.structureAt(to.x, to.z);
    if (s) cost += s.hp / Math.max(1,damageAfterDefense(stats.damage,stats.damageType,s)) * stats.interval;
    return cost;
  }
  findPath(start: Point, end = this.goal, kind: EnemyKind = 'goblin', friendly = false, occupied?:ReadonlySet<number>, agent?:Enemy): Point[] {
    const route=this.searchPath(start,end,kind,friendly,occupied,agent);
    if(friendly||!route.length)return route;
    // Only pay for a second search when the route could exceed the detour budget.
    // Compare with traversable distance, so a necessary mountain pass is never rejected.
    const allowance=(distance:number)=>distance+Math.min(10,Math.max(4,Math.ceil(distance*.4)));
    const lowerBound=Math.abs(start.x-end.x)+Math.abs(start.z-end.z);
    if(route.length<=allowance(lowerBound))return route;
    const direct=this.searchPath(start,end,kind,false,occupied,undefined,true);
    return direct.length&&route.length>allowance(direct.length)?direct:route;
  }
  private searchPath(start:Point,end:Point,kind:EnemyKind,friendly:boolean,occupied?:ReadonlySet<number>,agent?:Enemy,direct=false):Point[]{
    const begin = this.tile(start.x, start.z), goal = this.tile(end.x, end.z);
    if (!begin?.active || !goal?.active || (begin.chasm&&!begin.bridge) || (goal.chasm&&!goal.bridge)) return [];
    const size = WIDTH * DEPTH, dist = new Float64Array(size).fill(Infinity), prev = new Int32Array(size).fill(-1), visited = new Uint8Array(size);
    const sid = key(start.x, start.z), eid = key(end.x, end.z); dist[sid] = 0;
    const blocked=new Map(this.structures.map(s=>[key(s.x,s.z),s]));
    const danger=agent?this.dangerField():undefined;
    const heuristic=(p:Point)=>(Math.abs(p.x-end.x)+Math.abs(p.z-end.z))/(direct?1:ENEMIES[kind].speed*(friendly?1.35:1));
    const open=new PathQueue();open.push(sid,heuristic(start));
    while (open.length) {
      const id=open.pop();
      if (visited[id]) continue;
      if (id === eid) break;
      visited[id] = 1;
      const t = this.tiles[id];
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = this.tile(t.x + dx, t.z + dz); if (!n) continue;
        if(occupied?.has(key(n.x,n.z))&&key(n.x,n.z)!==eid)continue;
        const nid=key(n.x,n.z),building=blocked.get(nid),stats=ENEMIES[kind];
        if (friendly && building && nid!==eid) continue;
        let cost=this.moveCost(t,n,kind,true);
        if(friendly&&n.paved)cost/=1.35;
        if(direct&&Number.isFinite(cost))cost=1;
        if(!direct&&!friendly&&building)cost+=building.hp/Math.max(1,damageAfterDefense(stats.damage,stats.damageType,building))*stats.interval;
        if(agent){
          // Individual stable tie breaks and fire avoidance create alternatives without jitter.
          cost+=((Math.imul(nid+1,1103515245)^Math.imul(agent.id,12345))>>>0)%101/600;
          cost+=(danger?.[nid]??0)*stats.caution;
          if(!n.road&&!n.water)cost+=kind==='runner'?.14:.03;
        }
        const next=dist[id]+cost;
        if (next < dist[nid]) { dist[nid] = next; prev[nid] = id; open.push(nid,next+heuristic(n)); }
      }
    }
    if (!Number.isFinite(dist[eid])) return [];
    const result: Point[] = [];
    let current = eid;
    while (current !== sid && current !== -1) { result.push({ x: this.tiles[current].x, z: this.tiles[current].z }); current = prev[current]; }
    result.reverse(); return result;
  }
  private dangerRevision=-1;
  private danger=new Float32Array(WIDTH*DEPTH);
  private dangerField(){
    if(this.dangerRevision===this.revision)return this.danger;
    this.danger.fill(0);this.dangerRevision=this.revision;
    for(const s of this.structures){if(!isTower(s.kind))continue;const range=this.towerRange(s),origin=this.muzzle(s);
      for(let z=Math.max(0,Math.floor(s.z-range));z<=Math.min(DEPTH-1,Math.ceil(s.z+range));z++)for(let x=Math.max(0,Math.floor(s.x-range));x<=Math.min(WIDTH-1,Math.ceil(s.x+range));x++)
        if(canTarget(origin,{x,z,y:this.ground(x,z)+.35},towerAttack({...s,kind:s.kind}),s.facing))this.danger[key(x,z)]+=1.4;
    }return this.danger;
  }
  enemyTarget(e:Enemy):{point:Point;name:string;objective:EnemyObjective}|null{
    if(!e.objective||e.objective.type==='keep')return {point:this.goal,name:this.map.goalName,objective:{type:'keep'}};
    if(e.objective.type==='defense'){const id=e.objective.id,s=this.structures.find(s=>s.id===id&&s.hp>0);return s?{point:s,name:LABELS[s.kind],objective:e.objective}:null;}
    const id=e.objective.id,p=this.outposts.find(p=>p.id===id&&p.owned&&p.hp>0);return p?{point:p,name:p.name,objective:e.objective}:null;
  }
  private chooseObjective(e:Enemy){
    const preference=ENEMIES[e.kind].preference;
    const candidates:{point:Point;objective:EnemyObjective}[]=preference==='economy'?this.outposts.filter(p=>p.owned&&p.hp>0).map(p=>({point:p,objective:{type:'economy',id:p.id}})):
      preference==='defense'?this.structures.filter(s=>s.hp>0&&s.kind!=='wall'&&s.kind!=='palisade').map(s=>({point:s,objective:{type:'defense',id:s.id}})):[];
    const start={x:Math.round(e.x),z:Math.round(e.z)};
    candidates.sort((a,b)=>Math.hypot(a.point.x-e.x,a.point.z-e.z)-Math.hypot(b.point.x-e.x,b.point.z-e.z));
    const old=e.objective;let best:EnemyObjective={type:'keep'},score=Infinity;
    for(const candidate of candidates.slice(0,4)){
      const path=this.findPath(start,candidate.point,e.kind,false,undefined,e);
      if(!path.length&&(start.x!==candidate.point.x||start.z!==candidate.point.z))continue;
      let cost=0,from=this.tile(start.x,start.z)!;
      for(const point of path){const tile=this.tile(point.x,point.z)!;cost+=this.moveCost(from,tile,e.kind);from=tile;}
      if(JSON.stringify(candidate.objective)===JSON.stringify(old))cost*=.8;
      cost*=1+((e.id*17+key(candidate.point.x,candidate.point.z))%11)/70;
      if(cost<score){score=cost;best=candidate.objective;}
    }
    e.objective=best;e.decisionIn=3+(e.id%7)*.17;
    if(JSON.stringify(old)!==JSON.stringify(best))e.repath=0;
  }
  previewPath(kind: EnemyKind = 'goblin', entrance:Point=this.spawn) { return [entrance, ...this.findPath(entrance, this.goal, kind)]; }
  waveFronts(wave=this.phase==='preparation'?this.wave+1:this.wave){return this.map.waveFronts[Math.max(0,Math.min(this.map.waveFronts.length-1,wave-1))];}
  wavePlan(wave=this.phase==='preparation'?this.wave+1:this.wave){
    const fronts=this.waveFronts(wave);return waveEnemies(wave,this.mapId).map((kind,i)=>({kind,entrance:fronts[i%fronts.length]}));
  }
  outpostHarvest(post:Outpost){return harvestGold(post);}
  outpostUpgradeCost(post:Outpost){return ECONOMY.outpostUpgrade[post.kind];}
  outpostRepairCost(post:Outpost){return post.owned?Math.max(10,Math.ceil(post.cost*.35*(1-post.hp/post.maxHp))):post.cost;}
  restoreOutpost(id:string):boolean{
    const post=this.outposts.find(p=>p.id===id);if(!post)return false;const cost=this.outpostRepairCost(post);
    const error=this.phase!=='preparation'?'只能在准备阶段修复生产据点':post.owned&&post.hp===post.maxHp?'据点已正常运作':this.resources.gold<cost?'金币不足':null;
    if(error){this.say(error);this.emitSound('error',post);return false;}
    this.resources.gold-=cost;post.owned=true;post.hp=post.maxHp;this.revision++;this.emitSound('build',post);
    this.say(`${post.name}恢复生产 · 战中运送金币，守住领取丰收奖金`);return true;
  }
  upgradeOutpost(id:string):boolean{
    const p=this.outposts.find(p=>p.id===id);if(!p||!p.owned||p.level>=2||this.phase!=='preparation')return false;
    const cost=this.outpostUpgradeCost(p);if(this.resources.gold<cost){this.say('扩建所需金币不足');this.emitSound('error',p);return false;}
    this.resources.gold-=cost;p.level++;p.maxHp=Math.round(p.maxHp*ECONOMY.outpostHealthMultiplier);p.hp=p.maxHp;this.revision++;this.emitSound('upgrade',p);
    this.say(`${p.name}已扩建 · 基础丰收翻倍，运输每次 +${ECONOMY.deliveryPerLevel} 金币，耐久 +${Math.round((ECONOMY.outpostHealthMultiplier-1)*100)}%`);return true;
  }
  private destroyOutpost(post:Outpost){
    post.owned=false;post.eligible=false;post.hp=0;post.streak=0;post.level=1;post.maxHp=post.kind==='farm'?320:400;post.lostThisWave=true;
    this.revision++;this.emitSound('collapse',post);this.say(`${post.name}被掠毁！本波丰收取消，连守增收与扩建等级丢失`);
  }
  private produce(dt:number){
    for(const p of this.outposts){if(!p.eligible||!p.owned||p.hp<=0||p.deliveries>=ECONOMY.deliveriesPerWave)continue;
      p.productionTime+=dt;
      while(p.productionTime>=ECONOMY.deliveryInterval&&p.deliveries<ECONOMY.deliveriesPerWave){p.productionTime-=ECONOMY.deliveryInterval;p.deliveries++;const gold=deliveryGold(p);this.resources.gold+=gold;p.waveGold+=gold;p.lastYield=gold;p.lastYieldAt=this.time;this.emitSound('recruit',p);}
    }
  }
  private settleHarvest(){
    const report:HarvestReport={wave:this.wave,gold:0,sites:[]};
    for(const p of this.outposts){let bonus=0;
      if(p.eligible&&p.owned&&p.hp>0){bonus=this.outpostHarvest(p);this.resources.gold+=bonus;p.waveGold+=bonus;p.lastYield=bonus;p.lastYieldAt=this.time;p.streak++;
        this.revision++;
      }
      if(p.waveGold||p.lostThisWave)report.sites.push({id:p.id,name:p.name,gold:p.waveGold,bonus,lost:p.lostThisWave});
      report.gold+=p.waveGold;p.eligible=false;
    }
    this.harvestReport=report;
  }
  get totalWaves(){return this.map.waveNames.length;}
  startWave(): boolean {
    if (this.phase !== 'preparation'||this.wave>=this.totalWaves) return false;
    this.wave++; this.phase = 'battle';
    this.spawnQueue=this.wavePlan(this.wave);this.harvestReport=null;
    for(const p of this.outposts){p.eligible=p.owned&&p.hp>0;p.deliveries=0;p.productionTime=0;p.waveGold=0;p.lostThisWave=false;}
    this.totalInWave = this.spawnQueue.length; this.spawnedInWave = 0; this.spawnTimer = 0;
    this.emitSound('wave',this.spawn);
    this.say(`第 ${this.wave} 波 · ${this.map.waveNames[this.wave - 1]}，敌军正在接近！`); return true;
  }
  spawnEnemy(kind: EnemyKind, entrance:Point=this.spawn): Enemy {
    const stats = ENEMIES[kind], hp = Math.round(stats.hp * (1 + Math.max(0, this.wave - 1) * 0.12));
    const enemy: Enemy = { id: this.nextId++, kind,airborne:!!stats.flying, x: entrance.x, z: entrance.z, y: this.ground(entrance.x, entrance.z) + (stats.flying?3.2:.35), hp, maxHp: hp, speed: stats.speed, damage: stats.damage, damageType:stats.damageType,armor:stats.armor,resistance:stats.resistance, cooldown: 0, path: [], revision: -1, repath: 0, state: 'walking', facing: stats.rank==='boss'?Math.atan2(this.goal.x-entrance.x,this.goal.z-entrance.z):Math.PI / 2 };
    if(stats.rank==='boss'){enemy.boss={cooldown:3,windupUntil:0,center:null,enraged:false,spawnedAt:this.time};this.emitSound('boss-arrival',entrance);this.say('首领现身：碎冠者·格罗姆！留意重锤预警，及时撤离英雄。');}
    this.enemies.push(enemy);
    if(!this.encountered.has(kind)){this.encountered.add(kind);this.encounterEvents.push(kind);}
    return enemy;
  }
  private guardPositions(home:Structure):Point[]{
    return [{x:home.x-1,z:home.z+1},{x:home.x-1,z:home.z},{x:home.x,z:home.z+1},{x:home.x+1,z:home.z},{x:home.x,z:home.z-1},
      {x:home.x+1,z:home.z+1},{x:home.x-1,z:home.z-1},{x:home.x+1,z:home.z-1}].filter(p=>{
      const tile=this.tile(p.x,p.z),from=this.tile(home.x,home.z)!;
      return tile&&Number.isFinite(this.moveCost(from,tile,'goblin',true))&&!this.structureAt(p.x,p.z)&&this.findPath(home,p,'goblin',true).length>0;
    });
  }
  recruitSoldiers() {
    for (const b of this.structures.filter(s => s.kind === 'barracks')) {
      const own = this.soldiers.filter(s => s.home === b.id);
      // A full garrison cannot bank a reinforcement for an instant replacement.
      if(own.length>=barracksCapacity(b)){b.recruit=0;continue;}
      if (b.recruit <= 0) {
        const options = this.guardPositions(b);
        const position = options.find(p => this.tile(p.x,p.z)?.active && !this.structureAt(p.x,p.z) && !this.soldiers.some(s => s.hp>0 && (Math.hypot(s.x-p.x,s.z-p.z)<SOLDIER_SPACING || Math.hypot(s.guard.x-p.x,s.guard.z-p.z)<SOLDIER_SPACING)));
        if (!position) continue;
        const profile=soldierProfile(b);
        this.soldiers.push({level:b.level,branch:b.barracksBranch,attackAt:-100,castUntil:0, id: this.nextId++, home: b.id, guard: {...position}, ...position, y: this.ground(position.x, position.z) + 0.35, hp:profile.hp,maxHp:profile.hp,armor:profile.armor,resistance:profile.resistance, cooldown: 0, facing: -Math.PI / 2, state: 'guarding', path: [], revision: -1, repath: 0 });
        this.emitSound('recruit',b);
        b.recruit = this.phase === 'preparation' ? 0.6 : BARRACKS_RECRUIT_SECONDS;
      }
    }
  }
  step(dt: number) {
    if (this.paused || this.phase === 'victory' || this.phase === 'defeat') return;
    this.time += dt;
    for (const e of this.effects) e.time += dt;
    this.effects = this.effects.filter(e => e.time < e.duration);
    for (const b of this.structures) { b.cooldown -= dt; b.recruit -= dt;b.sanctuaryCooldown=Math.max(0,(b.sanctuaryCooldown??0)-dt); }
    this.recruitSoldiers();
    this.updateSanctuaries(dt);
    this.updateHeroEffects(dt);
    this.updateHero(dt);
    if (this.phase !== 'battle') {
      for (const s of this.soldiers) { s.hp = Math.min(s.maxHp, s.hp + dt * 8); this.updateSoldier(s,dt); }
      this.separateSoldiers();return;
    }
    this.produce(dt);
    this.spawnTimer -= dt;
    if (this.spawnQueue.length && this.spawnTimer <= 0) { const next=this.spawnQueue.shift()!;this.spawnEnemy(next.kind,this.entrances[next.entrance]); this.spawnedInWave++; this.spawnTimer = Math.max(0.5, 1.0 - this.wave * 0.07); }
    for(const e of this.enemies){
      const burnTime=Math.min(dt,Math.max(0,(e.burnUntil??0)-(this.time-dt)));
      if(e.hp>0&&burnTime>0)this.hitEnemy(e,(e.burn??0)*burnTime,'magic');
      this.updateEnemy(e,dt);
    }
    for (const s of this.soldiers) this.updateSoldier(s, dt);
    this.separateSoldiers();
    for(const s of this.soldiers)if(s.hp<=0){
      this.emitSound('soldier-fall',s);
      const home=this.structures.find(b=>b.id===s.home);
      // Multiple casualties share the existing queue; later deaths do not restart it.
      if(home&&home.recruit<=0)home.recruit=BARRACKS_RECRUIT_SECONDS;
    }
    this.soldiers = this.soldiers.filter(s => s.hp > 0 && this.structures.some(b=>b.id===s.home));
    for(const tower of this.structures){
      if(!isTower(tower.kind)||tower.cooldown>0)continue;
      const attack=towerAttack({...tower,kind:tower.kind}),origin=this.muzzle(tower);
      const targets=this.enemies.filter(e=>e.hp>0&&canTarget(origin,e,attack,tower.facing)).sort((a,b)=>Math.hypot(a.x-this.goal.x,a.z-this.goal.z)-Math.hypot(b.x-this.goal.x,b.z-this.goal.z)).slice(0,attack.targets);
      if(!targets.length)continue;
      for(const target of targets)this.shots.push({id:this.nextId++,kind:attack.projectile,attack:{...attack},appearance:{level:tower.level,branch:tower.branch},hitSound:towerSound({...tower,kind:tower.kind},true),from:origin,to:{x:target.x,y:target.y,z:target.z},time:0,duration:attack.projectile==='shell'?.65:attack.projectile==='lightning'?.12:attack.projectile==='arrow'?.25:.45,target:target.id,damage:attack.damage,splash:attack.splash});
      this.emitSound(towerSound({...tower,kind:tower.kind}),tower);
      tower.cooldown=attack.interval;
    }
    for(const shot of this.shots){
      const target=this.enemies.find(e=>e.id===shot.target&&e.hp>0);
      if(target)shot.to={x:target.x,y:target.y,z:target.z};
      shot.time+=dt;if(shot.time<shot.duration)continue;
      const center=target??shot.to,attack=shot.attack;
      if(!target&&!shot.splash)continue;
      if(shot.splash){
        for(const e of this.enemies)if(e.hp>0&&(!e.airborne||attack.air)&&distance3(e,center)<=shot.splash)this.applyTowerHit(e,attack);
      }else if(target){
        this.applyTowerHit(target,attack);
        const hit=new Set([target.id]);let previous=target;
        for(let hop=1;hop<attack.chain;hop++){
          const next=this.enemies.filter(e=>e.hp>0&&(!e.airborne||attack.air)&&!hit.has(e.id)&&distance3(e,previous)<=attack.chainRange).sort((a,b)=>distance3(a,previous)-distance3(b,previous))[0];
          if(!next)break;
          this.effects.push({id:this.nextId++,kind:'lightning',appearance:shot.appearance,from:{x:previous.x,y:previous.y,z:previous.z},x:next.x,y:next.y,z:next.z,time:0,duration:.22});
          this.applyTowerHit(next,attack,attack.damage*attack.chainFalloff**hop);hit.add(next.id);previous=next;
        }
      }
      const kind=shot.kind==='shell'||shot.kind==='missile'?'explosion':shot.kind==='ice'?'ice':shot.kind==='lightning'?'lightning':shot.kind==='arrow'?'hit':'magic';
      this.emitSound(shot.hitSound??(shot.kind==='shell'||shot.kind==='missile'?'explosion':shot.kind==='ice'?'frost':shot.kind==='arrow'?'impact':'magic-hit'),center);
      this.effects.push({id:this.nextId++,x:center.x,y:center.y,z:center.z,from:shot.from,kind,appearance:shot.appearance,radius:shot.splash,time:0,duration:kind==='lightning'?.22:.5});
    }
    this.shots = this.shots.filter(s => s.time < s.duration);
    for (const e of this.enemies.filter(e => e.hp <= 0)) {
      if(e.boss)this.bossDefeats.push({enemy:e,time:this.time});
      this.emitSound(enemySound(e.kind,true),e);
      this.resources.gold += ENEMIES[e.kind].reward; this.kills++;
      this.effects.push({ id: this.nextId++, x: e.x, y: e.y, z: e.z, kind: 'death', time: 0, duration: 0.5 });
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.castleHp <= 0) { this.castleHp = 0; this.phase = 'defeat'; if(this.hero&&this.hero.hp>0){this.hero.fallenAt=this.time;this.hero.state='fallen';this.hero.flying=false;this.hero.destination=null;} this.emitSound('defeat'); this.say('城堡失守了。重新布置防线，再来一次。'); return; }
    if (!this.spawnQueue.length && !this.enemies.length) {
      this.settleHarvest();const income=this.harvestReport!.gold;
      if (this.wave >= this.totalWaves) { this.phase = 'victory'; this.emitSound('victory'); this.say(`你守住了${this.map.name}！边境将在黎明重获宁静。`); }
      else { this.phase = 'preparation'; this.emitSound('wave-clear'); this.resources.gold += ECONOMY.waveSupply; this.say(`第 ${this.wave} 波已击退 · 军需补给 +${ECONOMY.waveSupply} 金币${income?` · 据点收入 +${income} 金币`:""}`); }
    }
  }
  private canMeleeReach(a:Vec3,b:Vec3 & {airborne?:boolean},range:number){
    return !b.airborne&&Math.hypot(a.x-b.x,a.z-b.z)<=range&&Math.abs(a.y-b.y)<=.6&&this.clearAttackLine({...a,y:a.y+.5},{...b,y:b.y+.5});
  }
  private interceptHero(h:BattleHero){
    // Retaliation must not depend on finding an unoccupied formation slot.
    const touching=this.phase==='battle'?this.enemies.filter(e=>e.hp>0&&this.canMeleeReach(h,e,1.25)).sort((a,b)=>distance3(h,a)-distance3(h,b))[0]:undefined;
    if(touching){h.engagementTarget=touching.id;h.destination=null;h.path=[];h.order=null;return;}
    const candidates=this.phase==='battle'?this.enemies.filter(e=>e.hp>0&&!e.airborne&&Math.hypot(e.x-h.rally.x,e.z-h.rally.z)<3.6&&Math.abs(e.y-h.y)<1.1&&
      (e.id===h.engagementTarget||distance3(h,e)<2.8)&&!this.soldiers.some(s=>s.hp>0&&s.engagement?.target===e.id&&distance3(s,e)<.9)):[];
    candidates.sort((a,b)=>Number(b.id===h.engagementTarget)-Number(a.id===h.engagementTarget)||distance3(h,a)-distance3(h,b));
    let point:Point|undefined,enemy:Enemy|undefined;
    for(const target of candidates){
      const angle=Math.atan2(h.x-target.x,h.z-target.z);
      for(const offset of [0,.6,-.6,1.2,-1.2]){
        const p={x:target.x+Math.sin(angle+offset)*1.10,z:target.z+Math.cos(angle+offset)*1.10};
        if(!this.heroCanWalk(h,p)||this.soldiers.some(s=>s.hp>0&&Math.hypot(s.x-p.x,s.z-p.z)<.65))continue;
        point=p;enemy=target;break;
      }
      if(enemy)break;
    }
    if(enemy&&point){
      h.engagementTarget=enemy.id;
      if(this.canMeleeReach(h,enemy,1.25)){h.destination=null;h.path=[];h.order=null;return;}
      if(!h.destination||Math.hypot(h.destination.x-point.x,h.destination.z-point.z)>.15){h.destination=point;h.repath=0;}
      h.order='intercept';return;
    }
    h.engagementTarget=null;
    if(Math.hypot(h.x-h.rally.x,h.z-h.rally.z)>.12){
      if(this.structureAt(Math.round(h.rally.x),Math.round(h.rally.z))){h.rally={x:h.x,z:h.z};h.destination=null;h.order=null;return;}
      if(h.order!=='return'){h.destination={...h.rally};h.order='return';h.repath=0;}
    }else if(h.order!=='player'){h.destination=null;h.order=null;}
  }
  private heroCanWalk(from:Point,to:Point){
    if(!this.soldierCanMove(from,to))return false;
    const steps=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.15);
    for(let i=1;i<=steps;i++){
      const x=from.x+(to.x-from.x)*i/steps,z=from.z+(to.z-from.z)*i/steps;
      if(Math.hypot(x-this.goal.x,z-this.goal.z)<2.35)return false;
      for(const [dx,dz] of [[-.18,-.18],[-.18,.18],[.18,-.18],[.18,.18]]){
        const t=this.tile(Math.round(x+dx),Math.round(z+dz));
        if(!t?.active||t.chasm&&!t.bridge||this.structureAt(t.x,t.z))return false;
      }
    }
    return true;
  }
  private flyHero(h:BattleHero,destination:Point,dt:number){
    const dx=destination.x-h.x,dz=destination.z-h.z,d=Math.hypot(dx,dz),nx=d?dx/d:0,nz=d?dz/d:0;
    const floor=this.ground(h.x,h.z)+.35;
    let clearance=floor;
    // Look ahead before crossing a ridge or roof, so flight never tunnels through it.
    for(let i=0;i<=Math.min(3,d);i+=.25){
      const x=h.x+nx*i,z=h.z+nz*i,s=this.structureAt(Math.round(x),Math.round(z));
      const roof=Math.hypot(x-this.goal.x,z-this.goal.z)<2.7?7:s?STATS[s.kind].muzzle+1.5:0;
      clearance=Math.max(clearance,this.ground(x,z)+.35+roof);
    }
    const altitude=clearance+Math.min(2.6,d*1.4);
    h.y+=(altitude-h.y)*Math.min(1,dt*5);
    const travel=h.y>=clearance+.25||d<.25?Math.min(d,dt*7.5):0;
    if(d>.001){h.x+=nx*travel;h.z+=nz*travel;h.facing=Math.atan2(dx,dz);}
    h.state='flying';
    if(d<.04&&Math.abs(h.y-floor)<.09){
      h.x=destination.x;h.z=destination.z;h.y=this.ground(h.x,h.z)+.35;
      h.flying=false;h.destination=null;h.path=[];h.order=null;h.state='idle';this.heroEffect('arrival',h,h,.7,1);this.emitSound('hero-land',h);
    }
  }
  private heroEffect(kind:HeroEffect['kind'],from:Vec3,to:Vec3,duration:number,radius:number){
    const effect:HeroEffect={id:this.nextId++,kind,from:{x:from.x,y:from.y,z:from.z},to:{x:to.x,y:to.y,z:to.z},time:0,duration,radius,pulses:0};
    this.heroEffects.push(effect);return effect;
  }
  private tryHeroSkill(targets:Enemy[]):boolean{
    const h=this.hero!;const close=targets.filter(e=>distance3(h,e)<3.2);
    let skill:HeroSkill|null=null,target=targets[0];
    if(h.skillCooldowns.gale<=0&&(close.length>=2||close.length&&h.hp<h.maxHp*.55))skill='gale';
    else if(h.skillCooldowns.rain<=0){
      const dense=[...targets].sort((a,b)=>targets.filter(e=>distance3(e,b)<2.8).length-targets.filter(e=>distance3(e,a)<2.8).length)[0];
      if(dense&&targets.filter(e=>distance3(e,dense)<2.8).length>=3){skill='rain';target=dense;}
    }
    if(!skill&&h.skillCooldowns.piercing<=0&&(targets.length>=2||target.hp>=150))skill='piercing';
    if(!skill)return false;
    h.pendingArrow=undefined;h.skill=skill;h.skillCooldowns[skill]=HERO_SKILLS[skill].cooldown;h.castUntil=this.time+.8;h.attackStarted=this.time;h.attackUntil=h.castUntil;h.state='casting';h.lastCombat=this.time;h.cooldown=.7;
    h.facing=Math.atan2(target.x-h.x,target.z-h.z);
    const from={x:h.x,y:h.y+.65,z:h.z};
    if(skill==='piercing'){
      const dir={x:target.x-from.x,y:target.y+.65-from.y,z:target.z-from.z},length=Math.hypot(dir.x,dir.y,dir.z);
      let to={x:from.x+dir.x/length*10,y:from.y+dir.y/length*10,z:from.z+dir.z/length*10};
      // End the beam at terrain or a structure rather than drawing through cover.
      for(let t=.2;t<=10;t+=.2){const p={x:from.x+dir.x/length*t,y:from.y+dir.y/length*t,z:from.z+dir.z/length*t};if(!this.clearAttackLine(from,p)){to=p;break;}}
      this.heroEffect(skill,from,to,.9,.65);this.emitSound('hero-piercing',h);
    }else if(skill==='rain'){this.heroEffect(skill,from,{x:target.x,y:this.ground(target.x,target.z)+.35,z:target.z},2.6,2.8);this.emitSound('hero-rain',h);}
    else {h.shieldUntil=this.time+3;this.heroEffect(skill,from,h,1.2,3.2);this.emitSound('hero-gale',h);}
    return true;
  }
  private updateHeroEffects(dt:number){
    for(const fx of this.heroEffects){
      fx.time+=dt;
      if(this.phase!=='battle')continue;
      if(fx.kind==='rain'){
        while(fx.pulses<HERO_FX_TIMING.rainPulses&&fx.time>=rainImpactTime(fx.pulses)){
          fx.pulses++;
          for(const e of this.enemies)if(e.hp>0&&distance3(e,fx.to)<fx.radius){this.hitEnemy(e,18,'magic');if((e.slowUntil??0)<=this.time||(e.slow??0)<=.4){e.slow=.4;e.slowUntil=this.time+1.2;}}
          this.emitSound('hero-rain-hit',fx.to);
        }
      }else if((fx.kind==='piercing'||fx.kind==='gale')&&!fx.pulses&&fx.time>=HERO_FX_TIMING.strike){
        fx.pulses++;
        for(const e of this.enemies){
          if(e.hp<=0)continue;
          if(fx.kind==='gale'){
            if(distance3(e,fx.to)<=fx.radius){this.hitEnemy(e,65,'magic');e.stunUntil=Math.max(e.stunUntil??0,this.time+.8);}
          }else{
            const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y,dz=fx.to.z-fx.from.z,len2=dx*dx+dy*dy+dz*dz;
            const t=((e.x-fx.from.x)*dx+(e.y+.65-fx.from.y)*dy+(e.z-fx.from.z)*dz)/len2;
            const p={x:fx.from.x+dx*t,y:fx.from.y+dy*t,z:fx.from.z+dz*t};
            if(t>=0&&t<=1&&distance3({...e,y:e.y+.65},p)<=fx.radius&&this.clearAttackLine(fx.from,{...e,y:e.y+.65}))this.hitEnemy(e,90,'physical',35);
          }
        }
        this.emitSound('hero-skill-hit',fx.to);
      }
    }
    this.heroEffects=this.heroEffects.filter(e=>e.time<e.duration);
  }
  private heroObstacles(){
    const occupied=new Set<number>();
    for(let z=this.goal.z-2;z<=this.goal.z+2;z++)for(let x=this.goal.x-2;x<=this.goal.x+2;x++)if(Math.hypot(x-this.goal.x,z-this.goal.z)<2.2)occupied.add(key(x,z));
    return occupied;
  }
  private heroSpawn():Point {
    const candidates=this.tiles.filter(t=>t.active&&!(t.chasm&&!t.bridge)&&!t.water&&!this.structureAt(t.x,t.z)&&Math.hypot(t.x-this.goal.x,t.z-this.goal.z)>=3.2);
    candidates.sort((a,b)=>Math.hypot(a.x-this.goal.x,a.z-this.goal.z-4)-Math.hypot(b.x-this.goal.x,b.z-this.goal.z-4));
    return candidates[0]?{x:candidates[0].x,z:candidates[0].z}:{...this.goal};
  }
  commandHero(point:Point):boolean {
    const h=this.hero;if(!h||h.hp<=0||this.phase==='victory'||this.phase==='defeat')return false;
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return false;
    const p={x:Math.round(point.x),z:Math.round(point.z)},tile=this.tile(p.x,p.z);
    if(!tile?.active||tile.chasm&&!tile.bridge||this.structureAt(p.x,p.z)||Math.hypot(p.x-this.goal.x,p.z-this.goal.z)<2.2){this.say('英雄无法驻守这里，请选择可通行的空地');this.emitSound('error');return false;}
    const origin={x:Math.round(h.x),z:Math.round(h.z)};
    const path=this.findPath(origin,p,'goblin',true,this.heroObstacles());
    const flight=h.flying||Math.hypot(h.x-p.x,h.z-p.z)>=6;
    if(!flight&&(origin.x!==p.x||origin.z!==p.z)&&!path.length){this.say('这里没有可通行的道路');this.emitSound('error');return false;}
    // Cancelling entry must not turn a newly arrived hero into a long-rested one.
    h.lastCombat=Math.max(h.lastCombat,Math.min(this.time,h.enteredAt+1.1));
    h.pendingArrow=undefined;this.refreshPath(h,p,'goblin',true);h.destination=p;h.rally={...p};h.order='player';h.engagementTarget=null;h.repath=1;h.flying=flight;h.state=flight?'flying':'moving';h.attackUntil=0;h.castUntil=0;h.enteredAt=-100;
    if(flight)this.emitSound('hero-flight',h);
    this.say('艾莉娅正在赶往指定位置');return true;
  }
  private fallHero(){
    const h=this.hero;if(!h||h.state==='fallen')return;
    this.heroDeaths++;
    h.pendingArrow=undefined;h.hp=0;h.order=null;h.engagementTarget=null;h.state='fallen';h.fallenAt=this.time;h.flying=false;h.castUntil=0;this.heroEffect('fall',h,h,1.8,1.4);h.respawnIn=HERO_STATS.respawn;h.path=[];h.destination=null;h.attackUntil=0;
    this.emitSound('hero-fall',h);this.effects.push({id:this.nextId++,x:h.x,y:h.y,z:h.z,kind:'magic',time:0,duration:1});
    this.say(`艾莉娅倒下了 · ${HERO_STATS.respawn} 秒后在城堡附近复活`);
  }
  private updateHero(dt:number){
    const h=this.hero;if(!h)return;
    h.blockedBy=undefined;
    if(h.hp<=0){
      this.fallHero();h.respawnIn=Math.max(0,h.respawnIn-dt);
      if(h.respawnIn>0)return;
      const p=this.heroSpawn();Object.assign(h,p,{y:this.ground(p.x,p.z)+.35,hp:h.maxHp,state:'entering',order:null,engagementTarget:null,enteredAt:this.time,flying:false,shieldUntil:0,castUntil:0,skill:null,rally:{...p},cooldown:0,lastCombat:this.time,revision:this.revision});
      this.heroEffect('arrival',h,h,1.3,1.5);this.emitSound('hero-arrival',h);this.effects.push({id:this.nextId++,x:h.x,y:h.y,z:h.z,kind:'build',time:0,duration:.7});this.say('艾莉娅已复活，可以重新部署');
    }
    for(const skill of Object.keys(HERO_SKILLS) as HeroSkill[])h.skillCooldowns[skill]=Math.max(0,h.skillCooldowns[skill]-dt);
    if(this.time-h.enteredAt<1.1){h.state='entering';return;}
    if(h.castUntil>this.time){h.state='casting';return;}
    h.cooldown-=dt;h.repath-=dt;
    if(this.time-h.lastCombat>HERO_STATS.regenDelay)h.hp=Math.min(h.maxHp,h.hp+HERO_STATS.regen*dt);
    if(h.pendingArrow){
      const pending=h.pendingArrow,target=this.enemies.find(e=>e.id===pending.target&&e.hp>0);
      const origin={x:h.x,y:h.y+.8,z:h.z};
      if(this.phase!=='battle'||!target||distance3(origin,target)>HERO_STATS.range||!this.clearAttackLine(origin,target)){
        h.pendingArrow=undefined;h.state='idle';h.attackUntil=this.time;
      }else{
        h.facing=Math.atan2(target.x-h.x,target.z-h.z);h.state='ranged';
        if(this.time>=pending.releaseAt){
          this.shots.push({id:this.nextId++,kind:'arrow',attack:{...HERO_ARROW},hitSound:'hero-hit',from:origin,to:{x:target.x,y:target.y,z:target.z},time:0,duration:.32,target:target.id,damage:HERO_STATS.damage,splash:0});
          this.emitSound('hero-arrow',h);h.pendingArrow=undefined;
        }
        return;
      }
    }
    if(h.order!=='player'&&!h.flying)this.interceptHero(h);
    if(h.destination){
      const destination=h.destination;
      if(this.structureAt(Math.round(destination.x),Math.round(destination.z))){
        if(h.flying){const safe=this.tiles.filter(t=>t.active&&!(t.chasm&&!t.bridge)&&!this.structureAt(t.x,t.z)&&Math.hypot(t.x-this.goal.x,t.z-this.goal.z)>2.7).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z))[0];if(safe){h.destination={x:safe.x,z:safe.z};h.rally={...h.destination};this.say('落点被占用，改在附近空地降落');return;}}
        h.destination=null;h.path=[];h.order=null;h.rally={x:h.x,z:h.z};h.state='idle';this.say('英雄的目的地已被建筑占据，请重新部署');return;
      }
      if(h.flying){this.flyHero(h,destination,dt);return;}
      if(h.revision!==this.revision||h.repath<=0){
        this.refreshPath(h,{x:Math.round(destination.x),z:Math.round(destination.z)},'goblin',true);h.repath=1;
        if(!h.path.length&&!this.heroCanWalk(h,destination)&&Math.hypot(h.x-destination.x,h.z-destination.z)>.1){h.destination=null;h.order=null;h.engagementTarget=null;h.rally={x:h.x,z:h.z};h.state='idle';this.say('英雄的道路被阻断，请重新指定位置');return;}
      }
      // String-pull the grid route: use the furthest safely visible waypoint.
      let next=h.path[0]??destination;
      if(this.heroCanWalk(h,destination)){next=destination;h.path=[];}
      else for(let i=h.path.length-1;i>0;i--)if(this.heroCanWalk(h,h.path[i])){next=h.path[i];h.path.splice(0,i);break;}
      const dx=next.x-h.x,dz=next.z-h.z,d=Math.hypot(dx,dz);
      const tile=this.tile(Math.round(h.x),Math.round(h.z))!;
      const speed=HERO_STATS.speed*(tile.water&&!tile.bridge?.45:tile.paved?1.3:1)/(1+Math.abs(this.ground(next.x,next.z)-this.ground(h.x,h.z))*.6);
      const travel=Math.min(d,speed*dt);
      if(d>.001){h.x+=dx/d*travel;h.z+=dz/d*travel;h.facing=Math.atan2(dx,dz);}
      h.y+=(this.ground(h.x,h.z)+.35-h.y)*Math.min(1,dt*12);h.state='moving';
      if(d<=travel+.00001)h.path.shift();
      if(Math.hypot(h.x-destination.x,h.z-destination.z)<.04){h.destination=null;h.path=[];h.order=null;h.state='idle';}
      if(h.destination)return;
    }
    const origin={x:h.x,y:h.y+.8,z:h.z};
    const targets=this.phase==='battle'?this.enemies.filter(e=>e.hp>0&&(this.canMeleeReach(h,e,1.25)||(distance3(origin,e)<=HERO_STATS.range&&this.clearAttackLine(origin,e)))):[];
    targets.sort((a,b)=>distance3(h,a)-distance3(h,b));const target=targets[0];
    if(!target){if(this.time>=h.attackUntil)h.state='idle';return;}
    const melee=this.canMeleeReach(h,target,1.25);
    if(this.time-Math.max(h.lastCombat,h.enteredAt+1.1)>=HERO_SHOT.stowAfter)h.bowReadyAt=this.time+HERO_SHOT.equip;
    h.lastCombat=this.time;h.facing=Math.atan2(target.x-h.x,target.z-h.z);
    // Retrieval finishes before a ranged attack or bow skill can start.
    if(!melee&&this.time<(h.bowReadyAt??0)){h.state='idle';return;}
    if(this.tryHeroSkill(targets))return;
    if(h.cooldown>0){if(this.time>=h.attackUntil)h.state='idle';return;}
    h.state=melee?'melee':'ranged';
    h.attackStarted=this.time;h.attackUntil=this.time+.55;
    if(melee){this.heroEffect('slash',h,target,.4,1);this.hitEnemy(target,HERO_STATS.meleeDamage,'physical');h.cooldown=HERO_STATS.meleeInterval;this.emitSound('hero-rapier',h);this.effects.push({id:this.nextId++,x:target.x,y:target.y,z:target.z,kind:'hit',time:0,duration:.25});}
    else {h.attackStarted=this.time;h.pendingArrow={target:target.id,releaseAt:h.attackStarted+HERO_SHOT.release};h.attackUntil=h.attackStarted+HERO_SHOT.recovery;h.cooldown=HERO_STATS.interval;}
  }
  private clearAttackLine(from:Vec3,to:Vec3,ignoreTarget=false){
    const steps=Math.ceil(distance3(from,to)/.2);
    for(let i=1;i<steps;i++){
      const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
      const y=from.y+(to.y-from.y)*t+.25;
      if(this.ground(x,z)>y||(this.structureAt(Math.round(x),Math.round(z))&&!(ignoreTarget&&Math.round(x)===Math.round(to.x)&&Math.round(z)===Math.round(to.z))))return false;
    }
    return true;
  }
  private updateBoss(e:Enemy,dt:number):boolean{
    const boss=e.boss;if(!boss)return false;
    if(this.time-boss.spawnedAt<BOSS_ENTRANCE){e.state='attacking';return true;}
    if(!boss.enraged&&e.hp<=e.maxHp*.4){boss.enraged=true;boss.enragedAt=this.time;boss.cooldown=Math.min(boss.cooldown,2);e.speed*=1.3;e.damage*=1.3;boss.center=null;boss.windupUntil=0;this.say('格罗姆进入狂怒 · 重锤更频繁，移速与攻击提升！');}
    if(boss.enragedAt!==undefined&&this.time-boss.enragedAt<BOSS_RAGE.duration){e.state='attacking';return true;}
    boss.cooldown-=dt;
    if(boss.center){
      e.state='attacking';
      if(this.time<boss.windupUntil)return true;
      const center=boss.center;boss.center=null;boss.cooldown=boss.enraged?6.5:BOSS_SLAM.cooldown;e.attackAt=this.time;
      const multiplier=boss.enraged?1.3:1;
      const inside=(p:Vec3)=>Math.hypot(p.x-center.x,p.z-center.z)<=BOSS_SLAM.radius&&Math.abs(p.y-center.y)<2.8;
      for(const defender of [...this.soldiers,...(this.hero&&this.hero.hp>0?[this.hero]:[])])if(defender.hp>0&&inside(defender)){
        applyDamage(defender,BOSS_SLAM.unitDamage*multiplier*(1-this.sanctuaryProtection(defender))*(defender===this.hero&&this.hero.shieldUntil>this.time?.5:1),'physical');
        if(defender===this.hero){this.hero.lastCombat=this.time;if(this.hero.hp<=0)this.fallHero();}
      }
      for(const building of [...this.structures])if(inside({...building,y:this.ground(building.x,building.z)+.35})){
        applyDamage(building,BOSS_SLAM.structureDamage*multiplier*((building.kind==='wall'||building.kind==='palisade')?BOSS_SLAM.wallMultiplier:1),'physical');
        if(building.hp<=0){this.emitSound('collapse',building);this.destroyStructure(building.id);}
      }
      for(const post of this.outposts)if(post.owned&&inside({...post,y:this.ground(post.x,post.z)+.35})){
        post.hp=Math.max(0,post.hp-BOSS_SLAM.structureDamage*multiplier);if(post.hp<=0)this.destroyOutpost(post);
      }
      this.emitSound('boss-slam',center);this.effects.push({id:this.nextId++,kind:'explosion',...center,radius:BOSS_SLAM.radius,time:0,duration:.65,appearance:{level:3,tint:'#ef9b46'}});return true;
    }
    const nearby=[...this.soldiers.filter(s=>s.hp>0),...(this.hero&&this.hero.hp>0?[this.hero]:[]),...this.structures.map(s=>({...s,y:this.ground(s.x,s.z)+.35})),...this.outposts.filter(p=>p.owned).map(p=>({...p,y:this.ground(p.x,p.z)+.35}))];
    if(boss.cooldown<=0&&nearby.some(p=>distance3(e,p)<BOSS_SLAM.radius-.3)){
      boss.center={x:e.x,y:e.y,z:e.z};boss.windupUntil=this.time+BOSS_SLAM.windup;e.state='attacking';this.emitSound('boss-windup',e);return true;
    }
    return false;
  }
  private enemyAttack(enemy:Enemy,target:Soldier|BattleHero){
    enemy.attackAt=this.time;
    applyDamage(target,enemy.damage*(1-this.sanctuaryProtection(target))*(target===this.hero&&this.hero.shieldUntil>this.time?.5:1),enemy.damageType);
    if(target===this.hero){this.hero.lastCombat=this.time;if(this.hero.hp<=0)this.fallHero();}
    this.emitSound(enemySound(enemy.kind),enemy);
    if('home' in target&&target.branch==='paladin'&&enemy.damageType==='physical')this.emitSound('paladin-block',target);
    if(enemy.damageType==='magic'){
      this.emitSound('enemy-magic-hit',target);
      this.effects.push({id:this.nextId++,x:target.x,y:target.y,z:target.z,kind:'magic',time:0,duration:.45});
    }
  }
  private attackStructure(e:Enemy,s:Structure){
    e.state='attacking';e.facing=Math.atan2(s.x-e.x,s.z-e.z);if(e.cooldown>0)return;
    e.attackAt=this.time;this.emitSound(enemySound(e.kind),s);applyDamage(s,e.damage,e.damageType);e.cooldown=ENEMIES[e.kind].interval;
    this.effects.push({id:this.nextId++,x:s.x,z:s.z,y:this.ground(s.x,s.z)+.7,kind:'hit',time:0,duration:.2});
    if(s.hp<=0){this.emitSound('collapse',s);this.destroyStructure(s.id);e.decisionIn=0;this.say('防御建筑被摧毁，敌军正在寻找新的目标！');}
  }
  private updateEnemy(e: Enemy, dt: number) {
    if (e.hp <= 0) return;
    e.cooldown -= dt; e.repath -= dt;e.decisionIn=(e.decisionIn??0)-dt;
    const standing=this.tile(Math.round(e.x),Math.round(e.z));
    if(standing?.spikes&&!e.airborne){this.hitEnemy(e,12*dt,'physical');if(e.hp<=0)return;}
    if(e.boss?.enragedAt!==undefined&&!e.boss.rageRoared&&this.time-e.boss.enragedAt>=BOSS_RAGE.warcry){e.boss.rageRoared=true;this.emitSound('boss-rage',e);}
    if((e.stunUntil??0)>this.time){if(e.boss?.center){e.boss.center=null;e.boss.windupUntil=0;e.boss.cooldown=4;}return;}
    if(this.updateBoss(e,dt))return;
    const stats=ENEMIES[e.kind];
    if(e.airborne){
      e.objective={type:'keep'};e.state='walking';const dx=this.goal.x-e.x,dz=this.goal.z-e.z,d=Math.hypot(dx,dz);
      if(d<.5){this.castleHp-=stats.castleDamage;this.emitSound('castle-hit',e);this.enemies=this.enemies.filter(unit=>unit.id!==e.id);return;}
      const travel=Math.min(d,e.speed*dt*((e.slowUntil??0)>this.time?1-(e.slow??0):1));e.x+=dx/d*travel;e.z+=dz/d*travel;e.facing=Math.atan2(dx,dz);
      // Maintain clearance over the next slope as well as the current tile.
      const floor=Math.max(this.ground(e.x,e.z),this.ground(e.x+dx/d,e.z+dz/d))+3.2;e.y=Math.max(this.ground(e.x,e.z)+2.4,e.y+(floor-e.y)*Math.min(1,dt*5));return;
    }
    const hero=this.hero;
    const defenders: (Soldier|BattleHero)[]=[...this.soldiers];
    if(hero&&hero.hp>0&&(!hero.flying||stats.attackRange>=1)&&(stats.attackRange>=1||hero.blockedBy===undefined||hero.blockedBy===e.id))defenders.push(hero);
    const defender = defenders.filter(s => s.hp > 0 && (stats.attackRange<1?this.canMeleeReach(e,s,s===hero?1.25:stats.attackRange):distance3(s,e)<stats.attackRange&&this.clearAttackLine(e,s))).sort((a,b)=>distance3(e,a)-distance3(e,b))[0];
    if (defender) { if(defender===hero&&stats.attackRange<1)hero.blockedBy=e.id; e.state = 'attacking'; e.facing = Math.atan2(defender.x-e.x, defender.z-e.z); if (e.cooldown <= 0) { this.enemyAttack(e,defender); e.cooldown = stats.interval; } return; }
    if((e.decisionIn??0)<=0||!this.enemyTarget(e)||e.revision!==this.revision)this.chooseObjective(e);
    const target=this.enemyTarget(e)!;
    if(target.objective.type==='economy'){
      const post=target.point as Outpost,to={...post,y:this.ground(post.x,post.z)+.5};
      if(distance3(e,to)<2.2&&this.clearAttackLine(e,to)){
        e.state='attacking';e.facing=Math.atan2(post.x-e.x,post.z-e.z);
        if(e.cooldown<=0){e.attackAt=this.time;post.hp=Math.max(0,post.hp-e.damage);e.cooldown=stats.interval;this.emitSound(enemySound(e.kind),post);if(!post.hp)this.destroyOutpost(post);}return;
      }
    }
    if(target.objective.type==='defense'){
      const building=target.point as Structure,to={...building,y:this.ground(building.x,building.z)+.35};
      if(distance3(e,to)<Math.max(1,stats.attackRange)&&this.clearAttackLine(e,to,true)){this.attackStructure(e,building);return;}
    }
    if (Math.hypot(e.x-this.goal.x,e.z-this.goal.z)<.5&&target.objective.type==='keep') { this.emitSound('castle-hit',e);this.castleHp-=stats.castleDamage;this.enemies=this.enemies.filter(x=>x.id!==e.id);return; }
    if(e.revision!==this.revision||!e.path.length||e.repath<=0){this.refreshPath(e,target.point,e.kind);e.repath=3+(e.id%5)*.1;}
    const next = e.path[0]; if (!next) return;
    const blocking = this.structureAt(next.x, next.z);
    if (blocking && Math.hypot(next.x - e.x, next.z - e.z) < 1.0) {
      this.attackStructure(e,blocking);return;
    }
    const tile = this.tile(Math.round(e.x), Math.round(e.z))!, to = this.tile(next.x, next.z)!;
    const dx = next.x - e.x, dz = next.z - e.z, dist = Math.hypot(dx,dz);
    const slow=(e.slowUntil??0)>this.time?1-(e.slow??0):1;
    const speed = e.speed * slow * (tile.spikes?.65:1) * (tile.water ? ENEMIES[e.kind].water : 1) / (1 + Math.abs(tile.h-to.h)*0.35);
    const travel = Math.min(dist, speed * dt);
    if (dist > 0.001) { e.x += dx / dist * travel; e.z += dz / dist * travel; e.facing = Math.atan2(dx,dz); }
    e.y += (this.ground(e.x,e.z) + 0.35 - e.y) * Math.min(1, dt*10);
    if(tile.water && e.state!=='wading')this.emitSound('splash',e);
    e.state = tile.water ? 'wading' : 'walking';
    if (dist <= travel + 0.000001) { e.x = next.x; e.z = next.z; e.path.shift(); }
  }
  // Sample local motion so avoidance cannot cut a corner through a wall or cliff.
  private soldierCanMove(from: Point, to: Point): boolean {
    let tile=this.tile(Math.round(from.x),Math.round(from.z));
    if(!tile)return false;
    const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.12));
    for(let i=1;i<=steps;i++){
      const x=Math.round(from.x+(to.x-from.x)*i/steps),z=Math.round(from.z+(to.z-from.z)*i/steps);
      const next=this.tile(x,z);
      if(!next||this.structureAt(x,z)||!Number.isFinite(this.moveCost(tile,next,'goblin',true)))return false;
      if(x!==tile.x&&z!==tile.z){
        for(const [cx,cz] of [[x,tile.z],[tile.x,z]]){
          const corner=this.tile(cx,cz);
          if(!corner||this.structureAt(cx,cz)||!Number.isFinite(this.moveCost(tile,corner,'goblin',true))||!Number.isFinite(this.moveCost(corner,next,'goblin',true)))return false;
        }
      }
      tile=next;
    }
    return true;
  }
  private meleePosition(enemy:Enemy,slot:number):Point {
    const angle=slot*Math.PI*2/MELEE_SLOTS;
    return {x:enemy.x+Math.cos(angle)*MELEE_RADIUS,z:enemy.z+Math.sin(angle)*MELEE_RADIUS};
  }
  private engage(s:Soldier,enemy:Enemy):Point|undefined {
    const origin={x:Math.round(s.x),z:Math.round(s.z)};
    const slots=Array.from({length:MELEE_SLOTS},(_,slot)=>({slot,p:this.meleePosition(enemy,slot)}));
    // Retain a reserved slot while the enemy moves; do not reshuffle every frame.
    slots.sort((a,b)=>Number(b.slot===s.engagement?.slot&&enemy.id===s.engagement.target)-Number(a.slot===s.engagement?.slot&&enemy.id===s.engagement.target)||Math.hypot(a.p.x-s.x,a.p.z-s.z)-Math.hypot(b.p.x-s.x,b.p.z-s.z));
    for(const {slot,p} of slots){
      const end={x:Math.round(p.x),z:Math.round(p.z)},tile=this.tile(end.x,end.z);
      if(!tile?.active||tile.chasm&&!tile.bridge||this.structureAt(end.x,end.z)||Math.hypot(MELEE_RADIUS,this.ground(p.x,p.z)+.35-enemy.y)>1.05)continue;
      if(this.soldiers.some(other=>{
        if(other===s||other.hp<=0)return false;
        const otherEnemy=this.enemies.find(e=>e.id===other.engagement?.target&&e.hp>0);
        const reserved=otherEnemy&&other.engagement?this.meleePosition(otherEnemy,other.engagement.slot):other.guard;
        return Math.hypot(reserved.x-p.x,reserved.z-p.z)<SOLDIER_SPACING;
      }))continue;
      if((origin.x!==end.x||origin.z!==end.z)&&!(s.engagement?.target===enemy.id&&s.engagement.slot===slot&&s.revision===this.revision)&&!this.findPath(origin,end,'goblin',true).length)continue;
      s.engagement={target:enemy.id,slot};return p;
    }
  }
  sanctuaryProtection(unit:Vec3):number {
    return this.sanctuaries.some(a=>a.time<a.duration&&distance3(a,unit)<=a.radius&&this.soldiers.some(s=>s.id===a.caster&&s.hp>0)&&this.structures.some(s=>s.id===a.home))?SANCTUARY.reduction:0;
  }
  private updateSanctuaries(dt:number){
    const fields=this.sanctuaries.filter(a=>a.time<a.duration&&this.soldiers.some(s=>s.id===a.caster&&s.hp>0)&&this.structures.some(s=>s.id===a.home));
    for(const unit of [...this.soldiers,...(this.hero?[this.hero]:[])]){
      if(unit.hp<=0)continue;
      // Union of fields: overlapping support never multiplies healing.
      let duration=0;
      for(const field of fields)if(distance3(field,unit)<=field.radius)duration=Math.max(duration,Math.min(dt,field.duration-field.time));
      unit.hp=Math.min(unit.maxHp,unit.hp+SANCTUARY.heal*duration);
    }
    for(const field of fields)field.time+=dt;
    this.sanctuaries=fields.filter(a=>a.time<a.duration);
  }
  private updateSoldier(s: Soldier, dt: number) {
    if (s.hp <= 0) return;
    const home = this.structures.find(b=>b.id===s.home); if(!home) return;
    const profile=soldierProfile(home);
    s.cooldown -= dt; s.repath -= dt;
    if(s.revision!==this.revision){
      const options=this.guardPositions(home);
      if(!options.some(p=>p.x===s.guard.x&&p.z===s.guard.z)){
        const free=options.find(p=>!this.soldiers.some(other=>other!==s&&other.hp>0&&Math.hypot(other.guard.x-p.x,other.guard.z-p.z)<SOLDIER_SPACING));
        if(free)s.guard={...free};
      }
    }
    if(this.phase==='battle'&&home.barracksBranch==='paladin'&&(home.sanctuaryCooldown??0)<=0){
      const hurt=[...this.soldiers,...(this.hero?[this.hero]:[])].some(u=>u.hp>0&&u.hp<u.maxHp*.85&&distance3(s,u)<=SANCTUARY.radius);
      if(hurt&&this.enemies.some(e=>e.hp>0&&distance3(s,e)<4)){
        this.sanctuaries.push({id:this.nextId++,home:home.id,caster:s.id,x:s.x,y:s.y,z:s.z,time:0,duration:SANCTUARY.duration,radius:SANCTUARY.radius});
        home.sanctuaryCooldown=SANCTUARY.cooldown;s.castUntil=this.time+.65;s.state='casting';
        this.emitSound('paladin-sanctuary',s);
      }
    }
    if((s.castUntil??0)>this.time){s.state='casting';return;}
    const nearby=this.phase==='battle'?this.enemies.filter(e=>e.hp>0&&(Math.hypot(e.x-home.x,e.z-home.z)<4.8||this.canMeleeReach(s,e,.84))):[];
    const targets=nearby.filter(e=>!e.airborne);
    targets.sort((a,b)=>Number(b.id===s.engagement?.target)-Number(a.id===s.engagement?.target)||distance3(s,a)-distance3(s,b));
    // A crowded ring, slope or stale reserved slot must never prevent retaliation.
    let target=targets.find(e=>this.canMeleeReach(s,e,.84));
    let destination:Point|undefined=target?{x:s.x,z:s.z}:undefined;
    if(!target)for(const enemy of targets){destination=this.engage(s,enemy);if(destination){target=enemy;break;}}
    if(!target){s.engagement=undefined;destination=s.guard;}
    s.state='guarding';
    if(target&&this.canMeleeReach(s,target,.84)){
      s.state='fighting';s.facing=Math.atan2(target.x-s.x,target.z-s.z);
      if(s.cooldown<=0){
        s.attackAt=this.time;this.emitSound(home.barracksBranch==='spellblade'?'spellblade-slash':home.barracksBranch==='paladin'?'paladin-sword':'soldier-sword',s);
        this.hitEnemy(target,profile.physical,'physical');
        if(profile.magic)this.hitEnemy(target,profile.magic,'magic');
        if(home.barracksBranch)this.effects.push({id:this.nextId++,kind:home.barracksBranch==='spellblade'?'enchant':'holy',x:target.x,y:target.y+.2,z:target.z,from:{x:s.x,y:s.y+.3,z:s.z},time:0,duration:.4});
        s.cooldown=profile.interval;
      }
      s.path=[];return;
    }else if(profile.rangedDamage&&s.cooldown<=0){
      const origin={x:s.x,y:s.y+.5,z:s.z};
      const ranged=nearby.filter(e=>distance3(origin,e)<=profile.range&&this.clearAttackLine(origin,e)).sort((a,b)=>distance3(s,a)-distance3(s,b))[0];
      if(ranged){
        const attack=spellbladeAttack();s.attackAt=this.time;s.castUntil=this.time+.35;s.state='casting';s.facing=Math.atan2(ranged.x-s.x,ranged.z-s.z);
        this.shots.push({id:this.nextId++,kind:'magic',attack,appearance:{level:2,tint:'#9d9aff'},hitSound:'spellblade-hit',from:origin,to:{x:ranged.x,y:ranged.y,z:ranged.z},time:0,duration:.3,target:ranged.id,damage:attack.damage,splash:0});
        this.emitSound('spellblade-cast',s);s.cooldown=profile.rangedInterval;return;
      }
    }
    this.moveSoldier(s,destination!,dt);
  }
  private moveSoldier(s:Soldier,destination:Point,dt:number){
    const origin={x:Math.round(s.x),z:Math.round(s.z)},end={x:Math.round(destination.x),z:Math.round(destination.z)};
    const changed=!s.destination||Math.hypot(destination.x-s.destination.x,destination.z-s.destination.z)>.25;
    if(changed||s.revision!==this.revision||s.repath<=0){
      this.refreshPath(s,end,'goblin',true);s.repath=.8;s.destination={...destination};
    }
    if(Math.hypot(s.x-destination.x,s.z-destination.z)<.04){s.path=[];return;}
    // Once a corner is clear, head toward the following waypoint instead of
    // making several soldiers squeeze through exactly the same tile center.
    for(let i=Math.min(2,s.path.length-1);i>0;i--){
      const waypoint=s.path[i];
      if(Math.hypot(s.x-waypoint.x,s.z-waypoint.z)<1.6&&this.soldierCanMove(s,waypoint)){s.path.splice(0,i);break;}
    }
    const near=Math.hypot(s.x-destination.x,s.z-destination.z)<2;
    const next=(origin.x===end.x&&origin.z===end.z)||(near&&this.soldierCanMove(s,destination))?destination:s.path[0];
    if(!next)return;
    const dx=next.x-s.x,dz=next.z-s.z,dist=Math.hypot(dx,dz);
    if(dist<.001){s.path.shift();return;}
    const travel=Math.min(dist,dt*1.55*(this.tile(origin.x,origin.z)?.water ? .4 : this.tile(origin.x,origin.z)?.paved?1.35:1));
    // Try a small detour when another soldier occupies the shared path center.
    const candidates=[0,.65,-.65,1.25,-1.25].map(angle=>({
      x:s.x+(dx*Math.cos(angle)-dz*Math.sin(angle))/dist*travel,
      z:s.z+(dx*Math.sin(angle)+dz*Math.cos(angle))/dist*travel,
    }));
    candidates.sort((a,b)=>Math.hypot(a.x-next.x,a.z-next.z)-Math.hypot(b.x-next.x,b.z-next.z)||Math.hypot(a.x-destination.x,a.z-destination.z)-Math.hypot(b.x-destination.x,b.z-destination.z));
    for(const {x,z} of candidates){
      if(!this.soldierCanMove(s,{x,z}))continue;
      if(this.soldiers.some(other=>other!==s&&other.hp>0&&Math.abs(other.y-s.y)<.6&&Math.hypot(x-other.x,z-other.z)<Math.min(SOLDIER_SPACING,Math.hypot(s.x-other.x,s.z-other.z))-.00001))continue;
      if(this.enemies.some(e=>e.hp>0&&Math.abs(e.y-s.y)<.6&&Math.hypot(x-e.x,z-e.z)<Math.min(.62,Math.hypot(s.x-e.x,s.z-e.z))-.00001))continue;
      if(s.state!=='fighting')s.facing=Math.atan2(x-s.x,z-s.z);
      s.x=x;s.z=z;break;
    }
    if(Math.hypot(s.x-next.x,s.z-next.z)<.04&&next!==destination)s.path.shift();
    s.y+=(this.ground(s.x,s.z)+.35-s.y)*Math.min(1,dt*12);
  }
  private separateSoldiers(){
    // Resolve existing overlaps as well as crowded reinforcements, without
    // ever pushing a unit into a building, off a bridge or over a steep edge.
    for(let pass=0;pass<4;pass++)for(let i=0;i<this.soldiers.length;i++)for(let j=i+1;j<this.soldiers.length;j++){
      const a=this.soldiers[i],b=this.soldiers[j];
      if(a.hp<=0||b.hp<=0||Math.abs(a.y-b.y)>.6)continue;
      const dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz);
      if(distance>=SOLDIER_SPACING)continue;
      const nx=distance>.0001?dx/distance:Math.cos((a.id+b.id)*2.4),nz=distance>.0001?dz/distance:Math.sin((a.id+b.id)*2.4);
      const push=(SOLDIER_SPACING-distance)/2+.00001;
      for(const [unit,sign] of [[a,-1],[b,1]] as const){
        const p={x:unit.x+nx*push*sign,z:unit.z+nz*push*sign};
        if(this.soldierCanMove(unit,p)){unit.x=p.x;unit.z=p.z;unit.y=this.ground(p.x,p.z)+.35;}
      }
    }
  }
}
