import { TOWER_STATS, BRANCHES, isTower, towerAttack, type TowerKind, type TowerBranch, type TowerAttack, type ProjectileKind } from './towers';
import { ENEMIES, waveEnemies, type EnemyKind } from './enemies';
import { applyDamage, damageAfterDefense, type DamageType, type Defenses } from './combat';
export { ENEMIES, type EnemyKind } from './enemies';
import { WIDTH, DEPTH, MAPS, makeTerrain, type MapId, type MapDefinition } from './maps';
export { WIDTH, DEPTH, makeTerrain } from './maps';
export const HEIGHT_UNIT = 0.55;
export type StructureKind = 'wall' | TowerKind | 'barracks';
export type Tool = 'inspect' | StructureKind | 'bridge' | 'dig' | 'raise' | 'remove';
export interface Point { x: number; z: number }
export interface Vec3 extends Point { y: number }
export interface Tile extends Point { h: number; water: boolean; bridge: boolean; bridgeBed?: number; chasm?: boolean; bridgeDeck?: number; suspension?: boolean; road: boolean; decoration: number; active: boolean }
export interface Resources { gold: number; wood: number; stone: number }
export interface Structure extends Point, Defenses { id: number; kind: StructureKind; hp: number; maxHp: number; level: number; branch?:TowerBranch; cooldown: number; recruit: number }
export interface Enemy extends Vec3, Defenses { id: number; kind: EnemyKind; hp: number; maxHp: number; speed: number; damage: number; damageType: DamageType; cooldown: number; path: Point[]; revision: number; repath: number; state: 'walking' | 'attacking' | 'wading'; facing: number; slow?:number; slowUntil?:number; stunUntil?:number; burn?:number; burnUntil?:number; shred?:number; shredUntil?:number }
export interface Soldier extends Vec3, Defenses { id: number; home: number; hp: number; maxHp: number; cooldown: number; facing: number; state: 'guarding' | 'fighting'; path: Point[]; revision: number; repath: number; guard: Point; engagement?: { target: number; slot: number }; destination?: Point }
export interface Shot { id: number; kind: ProjectileKind; attack:TowerAttack; from: Vec3; to: Vec3; time: number; duration: number; target: number; damage: number; splash: number }
export type SoundKind = 'arrow'|'cast'|'impact'|'magic-hit'|'death'|'melee'|'wall-hit'|'collapse'|'castle-hit'|'recruit'|'build'|'dig'|'raise'|'upgrade'|'error'|'wave'|'wave-clear'|'victory'|'defeat'|'splash'|'cannon'|'explosion'|'frost'|'thunder';
export interface SoundEvent extends Point { kind: SoundKind }
export interface Effect extends Vec3 { id: number; kind: 'build' | 'hit' | 'magic' | 'death' | 'explosion' | 'ice' | 'lightning'; from?:Vec3; radius?:number; time: number; duration: number }
export const COSTS: Record<Exclude<Tool, 'inspect' | 'remove'>, Resources> = {
  wall: { gold: 5, wood: 2, stone: 8 }, archer: { gold: 75, wood: 22, stone: 8 },
  mage: { gold: 110, wood: 8, stone: 22 }, barracks: { gold: 95, wood: 28, stone: 12 },
  cannon:{gold:125,wood:18,stone:28}, frost:{gold:100,wood:12,stone:25}, tesla:{gold:130,wood:18,stone:24},
  dig: { gold: 8, wood: 0, stone: 0 }, raise: { gold: 5, wood: 0, stone: 5 },
  bridge: { gold: 12, wood: 12, stone: 0 },
};
export const LABELS: Record<Tool, string> = { inspect: '巡视', wall: '石墙', archer: '箭塔', mage: '法师塔', cannon:'炮塔', frost:'寒霜塔', tesla:'雷电塔', barracks: '兵营', bridge: '搭木桥', dig: '挖水道', raise: '筑高地', remove: '拆除' };
export const STATS = {
  wall: { hp: 160, range: 0, damage: 0, interval: 0, muzzle: 1.4, armor:20,resistance:0 },
  ...TOWER_STATS,
  barracks: { hp: 200, range: 4.5, damage: 0, interval: 0, muzzle: 1.2, armor:15,resistance:10 },
};
const SOLDIER_SPACING = 0.72;
const MELEE_SLOTS = 6;
const MELEE_RADIUS = 0.79;
export const WAVE_NAMES = ['林间斥候', '涉水来袭', '破墙重兵', '暗潮涌动', '最后的黎明'];
export const key = (x: number, z: number) => z * WIDTH + x;
export const distance3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const inSphere = (a: Vec3, b: Vec3, range: number) => distance3(a, b) <= range;

export class Game {
  tiles: Tile[];
  readonly map: MapDefinition;
  structures: Structure[] = [];
  enemies: Enemy[] = [];
  soldiers: Soldier[] = [];
  shots: Shot[] = [];
  effects: Effect[] = [];
  soundEvents: SoundEvent[] = [];
  emitSound(kind:SoundKind, position:Point = this.goal) { if(this.soundEvents.length<96)this.soundEvents.push({kind,x:position.x,z:position.z}); }
  drainSounds() { return this.soundEvents.splice(0); }
  resources: Resources = { gold: 380, wood: 180, stone: 160 };
  castleHp = 100;
  wave = 0;
  kills = 0;
  phase: 'preparation' | 'battle' | 'victory' | 'defeat' = 'preparation';
  paused = false;
  speed = 1;
  revision = 0;
  time = 0;
  readonly spawn: Point;
  readonly goal: Point;
  message = '领主，暮河以东就交给你了。修筑防线，守住城堡。';
  messageSerial = 0;
  private encountered = new Set<EnemyKind>();
  private encounterEvents:EnemyKind[]=[];
  drainEncounters(){return this.encounterEvents.splice(0);}
  private nextId = 1;
  private spawnQueue: EnemyKind[] = [];
  private spawnTimer = 0;
  totalInWave = 0;
  spawnedInWave = 0;

  constructor(starter = true, readonly mapId: MapId = 'river') {
    this.map=MAPS[mapId];
    this.tiles=makeTerrain(mapId);
    this.spawn={...this.map.spawn};this.goal={...this.map.goal};
    this.message=this.map.intro;
    if(starter){
      for(const s of this.map.starters)this.addStructure(s.kind,s.x,s.z);
      this.recruitSoldiers();
    }
  }
  tile(x: number, z: number): Tile | undefined { return x < 0 || z < 0 || x >= WIDTH || z >= DEPTH ? undefined : this.tiles[key(x, z)]; }
  structureAt(x: number, z: number) { return this.structures.find(s => s.x === x && s.z === z); }
  ground(x: number, z: number) { return (this.tile(Math.round(x), Math.round(z))?.h ?? 1) * HEIGHT_UNIT; }
  say(message: string) { this.message = message; this.messageSerial++; }
  protected(x: number, z: number) { return Math.hypot(x - this.goal.x, z - this.goal.z) < 2.6 || Math.hypot(x - this.spawn.x, z - this.spawn.z) < 1.5; }
  canAfford(cost: Resources) { return (Object.keys(cost) as (keyof Resources)[]).every(k => this.resources[k] >= cost[k]); }
  pay(cost: Resources, multiplier = 1) { for (const k of ['gold', 'wood', 'stone'] as const) this.resources[k] -= Math.ceil(cost[k] * multiplier); }
  addStructure(kind: StructureKind, x: number, z: number) {
    const hp = STATS[kind].hp;
    const s: Structure = { id: this.nextId++, kind, x, z, hp, maxHp: hp, armor:STATS[kind].armor,resistance:STATS[kind].resistance, level: 1, cooldown: 0, recruit: 0 };
    this.structures.push(s); this.revision++; return s;
  }
  validate(tool: Tool, x: number, z: number): string | null {
    const tile = this.tile(x, z);
    if (!tile?.active) return '这里是地图边缘';
    if (tool === 'inspect') return null;
    if (this.phase === 'victory' || this.phase === 'defeat') return '本次战役已结束，请重新开始';
    if (this.protected(x, z)) return '请保留城堡与敌军入口的空间';
    const s = this.structureAt(x, z);
    if (tool === 'remove' && s) return null;
    if (tool === 'remove' && !tile.bridge) return '选择建筑或木桥拆除，返还一半资源';
    if (s) return '这里已经有建筑了';
    if (this.enemies.some(e => Math.hypot(e.x - x, e.z - z) < 0.7) || this.soldiers.some(e => Math.hypot(e.x - x, e.z - z) < 0.7)) return '单位正占据这个位置';
    if (tool === 'remove') return null;
    if (!this.canAfford(COSTS[tool])) return '资源不足，击退敌军或完成波次可获得补给';
    if (tool === 'bridge') {
      if(tile.chasm&&!tile.bridge){
        const deck=tile.bridgeDeck??7;
        const supported=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>{const n=this.tile(x+dx,z+dz);return n?.active&&(!n.chasm||n.bridge)&&Math.abs(n.h-deck)<=2;});
        return supported?null:'请从崖岸或已有桥端逐格延伸吊桥';
      }
      return tile.water&&!tile.bridge?null:'桥梁只能搭在水道或连接崖岸的深谷上';
    }
    if(tile.chasm)return '深谷只能搭建或拆除吊桥，不能挖河、填高或建塔';
    if (tool === 'raise' && tile.bridge) return '请先拆除木桥，再改造河床';
    if (tool === 'dig' && (tile.water || tile.bridge)) return '这里已经是水道或桥梁';
    if (tool === 'raise' && tile.h >= this.map.maxHeight) return '已达到最高海拔';
    if (tool !== 'dig' && tool !== 'raise' && (tile.water || tile.bridge)) return '建筑需要坚实的陆地';
    return null;
  }
  build(tool: Tool, x: number, z: number): boolean {
    const error = this.validate(tool, x, z);
    if (error) { this.emitSound('error',{x,z}); this.say(error); return false; }
    if (tool === 'inspect') return true;
    if (tool === 'remove') {
      const s = this.structureAt(x, z);
      if (!s) {
        const tile = this.tile(x, z)!, original = { ...tile };
        tile.h = tile.bridgeBed ?? Math.max(0, tile.h - 1);
        tile.bridge = false; tile.water = !tile.chasm; delete tile.bridgeBed; delete tile.suspension;
        if (!this.routesRemainOpen()) { Object.assign(tile, original); this.say('这座桥是唯一通路，拆除会困住单位'); this.emitSound('error', { x, z }); return false; }
        this.pay(COSTS.bridge, -0.5); this.revision++; this.emitSound('collapse', { x, z });
        this.say(tile.chasm?'吊桥已拆除，敌军将改道 · 返还 50% 基础资源':'木桥已拆除，恢复水道 · 返还 50% 基础资源'); return true;
      }
      this.pay(COSTS[s.kind], -0.5); this.destroyStructure(s.id); this.emitSound('collapse',s); this.say('建筑已拆除，返还 50% 基础建造资源'); return true;
    }
    const tile = this.tile(x, z)!;
    if (tool === 'dig' || tool === 'raise' || tool === 'bridge') {
      const original = { ...tile };
      if (tool === 'bridge') { tile.bridgeBed = tile.h; tile.h = tile.chasm ? (tile.bridgeDeck??7) : tile.h+1; tile.water = false; tile.bridge = true; if(tile.chasm)tile.suspension=true; }
      else if (tool === 'dig') { tile.h = Math.max(0, tile.h - 1); tile.water = true; tile.bridge = false; }
      else { tile.h++; tile.water = false; tile.bridge = false; }
      if (!this.routesRemainOpen()) {
        delete tile.bridgeBed; delete tile.suspension; Object.assign(tile, original); this.say('地形过于陡峭：需要为敌军保留一条可行路线'); this.emitSound('error', { x, z }); return false;
      }
      tile.decoration = 0;
    } else { this.addStructure(tool, x, z); tile.decoration = 0; }
    this.pay(COSTS[tool]); this.revision++;this.emitSound(tool==='dig'?'dig':tool==='raise'?'raise':'build',{x,z});
    this.effects.push({ id: this.nextId++, kind: 'build', x, z, y: this.ground(x, z), time: 0, duration: 0.7 });
    this.say(tool === 'dig' ? '水道已挖好 · 普通敌军涉水速度降至 38%' : tool === 'raise' ? '地势已抬高 · 高度会影响移动与真实射程' : `${LABELS[tool]}建成 · 敌军路线已重新计算`);
    return true;
  }
  private routesRemainOpen() {
    const reachable = (p: Point, kind: EnemyKind = 'goblin') => (p.x === this.goal.x && p.z === this.goal.z) || this.findPath(p, this.goal, kind).length > 0;
    return reachable(this.spawn) && this.enemies.every(e => reachable({ x: Math.round(e.x), z: Math.round(e.z) }, e.kind)) && this.soldiers.every(s=>{
      const home=this.structures.find(b=>b.id===s.home),p={x:Math.round(s.x),z:Math.round(s.z)};
      return !home||(p.x===home.x&&p.z===home.z)||this.findPath(p,home,'goblin',true).length>0;
    });
  }
  private refreshPath(unit: Enemy | Soldier, destination: Point, kind: EnemyKind, friendly = false) {
    const nearest = { x: Math.round(unit.x), z: Math.round(unit.z) };
    const occupied=friendly?new Set(this.soldiers.filter(s=>s.id!==unit.id&&s.hp>0&&
      (s.state==='fighting'||Math.hypot(s.x-s.guard.x,s.z-s.guard.z)<.1))
      .map(s=>key(Math.round(s.x),Math.round(s.z)))):undefined;
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
    const path = this.findPath(origin, destination, kind, friendly, occupied);
    if (Math.hypot(unit.x - origin.x, unit.z - origin.z) > 0.000001) path.unshift(origin);
    unit.path = path; unit.revision = this.revision;
  }
  upgrade(id: number, branch?:TowerBranch): boolean {
    const s=this.structures.find(s=>s.id===id);
    if(!s||s.level>=3||this.phase==='victory'||this.phase==='defeat')return false;
    if(isTower(s.kind)&&s.level===2){
      if(!branch||!Object.hasOwn(BRANCHES,branch)||BRANCHES[branch].kind!==s.kind){this.say('请选择这座塔的三级专精分支');this.emitSound('error',s);return false;}
    }else if(branch){this.say('攻击塔升至二级后才能选择专精');return false;}
    const cost=this.upgradeCost(s,branch);
    if(!this.canAfford(cost)){this.emitSound('error',s);this.say('升级所需资源不足');return false;}
    this.pay(cost);s.level++;if(branch)s.branch=branch;
    s.maxHp=Math.round(s.maxHp*1.4);s.hp=s.maxHp;this.revision++;
    this.emitSound('upgrade',s);this.say(branch?`专精完成 · ${BRANCHES[branch].name}`:`${LABELS[s.kind]}升级至 ${s.level} 级`);return true;
  }
  upgradeCost(s:Structure,branch?:TowerBranch):Resources {
    if(branch&&Object.hasOwn(BRANCHES,branch)&&s.level===2&&BRANCHES[branch].kind===s.kind)return {...BRANCHES[branch].cost};
    return {gold:Math.round(COSTS[s.kind].gold*s.level*.7),wood:Math.ceil(COSTS[s.kind].wood*.5),stone:Math.ceil(COSTS[s.kind].stone*.5)};
  }
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
    if(attack.stun)e.stunUntil=Math.max(e.stunUntil??0,this.time+attack.stun);
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
  findPath(start: Point, end = this.goal, kind: EnemyKind = 'goblin', friendly = false, occupied?:ReadonlySet<number>): Point[] {
    const begin = this.tile(start.x, start.z), goal = this.tile(end.x, end.z);
    if (!begin?.active || !goal?.active || (begin.chasm&&!begin.bridge) || (goal.chasm&&!goal.bridge)) return [];
    const size = WIDTH * DEPTH, dist = new Float64Array(size).fill(Infinity), prev = new Int32Array(size).fill(-1), visited = new Uint8Array(size);
    const sid = key(start.x, start.z), eid = key(end.x, end.z); dist[sid] = 0;
    const open: number[] = [sid];
    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[best]]) best = i;
      const id = open[best]; open.splice(best, 1);
      if (visited[id]) continue;
      if (id === eid) break;
      visited[id] = 1;
      const t = this.tiles[id];
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const n = this.tile(t.x + dx, t.z + dz); if (!n) continue;
        if(occupied?.has(key(n.x,n.z))&&key(n.x,n.z)!==eid)continue;
        if (friendly && this.structureAt(n.x, n.z) && key(n.x,n.z) !== eid) continue;
        const nid = key(n.x, n.z), next = dist[id] + this.moveCost(t, n, kind, friendly);
        if (next < dist[nid]) { dist[nid] = next; prev[nid] = id; open.push(nid); }
      }
    }
    if (!Number.isFinite(dist[eid])) return [];
    const result: Point[] = [];
    let current = eid;
    while (current !== sid && current !== -1) { result.push({ x: this.tiles[current].x, z: this.tiles[current].z }); current = prev[current]; }
    result.reverse(); return result;
  }
  previewPath(kind: EnemyKind = 'goblin') { return [this.spawn, ...this.findPath(this.spawn, this.goal, kind)]; }
  startWave(): boolean {
    if (this.phase !== 'preparation') return false;
    this.wave++; this.phase = 'battle';
    this.spawnQueue = waveEnemies(this.wave,this.mapId);
    this.totalInWave = this.spawnQueue.length; this.spawnedInWave = 0; this.spawnTimer = 0;
    this.emitSound('wave',this.spawn);
    this.say(`第 ${this.wave} 波 · ${this.map.waveNames[this.wave - 1]}，敌军正在接近！`); return true;
  }
  spawnEnemy(kind: EnemyKind): Enemy {
    const stats = ENEMIES[kind], hp = Math.round(stats.hp * (1 + Math.max(0, this.wave - 1) * 0.12));
    const enemy: Enemy = { id: this.nextId++, kind, x: this.spawn.x, z: this.spawn.z, y: this.ground(this.spawn.x, this.spawn.z) + 0.35, hp, maxHp: hp, speed: stats.speed, damage: stats.damage, damageType:stats.damageType,armor:stats.armor,resistance:stats.resistance, cooldown: 0, path: [], revision: -1, repath: 0, state: 'walking', facing: Math.PI / 2 };
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
      if (own.length < 2 + (b.level - 1) && b.recruit <= 0) {
        const options = this.guardPositions(b);
        const position = options.find(p => this.tile(p.x,p.z)?.active && !this.structureAt(p.x,p.z) && !this.soldiers.some(s => s.hp>0 && (Math.hypot(s.x-p.x,s.z-p.z)<SOLDIER_SPACING || Math.hypot(s.guard.x-p.x,s.guard.z-p.z)<SOLDIER_SPACING)));
        if (!position) continue;
        this.soldiers.push({ id: this.nextId++, home: b.id, guard: {...position}, ...position, y: this.ground(position.x, position.z) + 0.35, hp: 95 + b.level * 15, maxHp: 95 + b.level * 15, armor:20+(b.level-1)*5,resistance:10, cooldown: 0, facing: -Math.PI / 2, state: 'guarding', path: [], revision: -1, repath: 0 });
        this.emitSound('recruit',b);
        b.recruit = this.phase === 'preparation' ? 0.6 : 9;
      }
    }
  }
  step(dt: number) {
    if (this.paused || this.phase === 'victory' || this.phase === 'defeat') return;
    this.time += dt;
    for (const e of this.effects) e.time += dt;
    this.effects = this.effects.filter(e => e.time < e.duration);
    for (const b of this.structures) { b.cooldown -= dt; b.recruit -= dt; }
    this.recruitSoldiers();
    if (this.phase !== 'battle') {
      for (const s of this.soldiers) { s.hp = Math.min(s.maxHp, s.hp + dt * 8); this.updateSoldier(s,dt); }
      this.separateSoldiers();return;
    }
    this.spawnTimer -= dt;
    if (this.spawnQueue.length && this.spawnTimer <= 0) { this.spawnEnemy(this.spawnQueue.shift()!); this.spawnedInWave++; this.spawnTimer = Math.max(0.5, 1.0 - this.wave * 0.07); }
    for(const e of this.enemies){
      const burnTime=Math.min(dt,Math.max(0,(e.burnUntil??0)-(this.time-dt)));
      if(e.hp>0&&burnTime>0)this.hitEnemy(e,(e.burn??0)*burnTime,'magic');
      this.updateEnemy(e,dt);
    }
    for (const s of this.soldiers) this.updateSoldier(s, dt);
    this.separateSoldiers();
    for(const s of this.soldiers)if(s.hp<=0)this.emitSound('death',s);
    this.soldiers = this.soldiers.filter(s => s.hp > 0 && this.structures.some(b=>b.id===s.home));
    for(const tower of this.structures){
      if(!isTower(tower.kind)||tower.cooldown>0)continue;
      const attack=towerAttack({...tower,kind:tower.kind}),origin=this.muzzle(tower);
      const targets=this.enemies.filter(e=>e.hp>0&&inSphere(origin,e,attack.range)).sort((a,b)=>Math.hypot(a.x-this.goal.x,a.z-this.goal.z)-Math.hypot(b.x-this.goal.x,b.z-this.goal.z)).slice(0,attack.targets);
      if(!targets.length)continue;
      for(const target of targets)this.shots.push({id:this.nextId++,kind:attack.projectile,attack:{...attack},from:origin,to:{x:target.x,y:target.y,z:target.z},time:0,duration:attack.projectile==='shell'?.65:attack.projectile==='lightning'?.12:attack.projectile==='arrow'?.25:.45,target:target.id,damage:attack.damage,splash:attack.splash});
      this.emitSound(attack.projectile==='arrow'?'arrow':attack.projectile==='shell'?'cannon':attack.projectile==='ice'?'frost':attack.projectile==='lightning'?'thunder':'cast',tower);
      tower.cooldown=attack.interval;
    }
    for(const shot of this.shots){
      const target=this.enemies.find(e=>e.id===shot.target&&e.hp>0);
      if(target)shot.to={x:target.x,y:target.y,z:target.z};
      shot.time+=dt;if(shot.time<shot.duration)continue;
      const center=target??shot.to,attack=shot.attack;
      if(!target&&!shot.splash)continue;
      if(shot.splash){
        for(const e of this.enemies)if(e.hp>0&&distance3(e,center)<=shot.splash)this.applyTowerHit(e,attack);
      }else if(target){
        this.applyTowerHit(target,attack);
        const hit=new Set([target.id]);let previous=target;
        for(let hop=1;hop<attack.chain;hop++){
          const next=this.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&distance3(e,previous)<=attack.chainRange).sort((a,b)=>distance3(a,previous)-distance3(b,previous))[0];
          if(!next)break;
          this.effects.push({id:this.nextId++,kind:'lightning',from:{x:previous.x,y:previous.y,z:previous.z},x:next.x,y:next.y,z:next.z,time:0,duration:.22});
          this.applyTowerHit(next,attack,attack.damage*attack.chainFalloff**hop);hit.add(next.id);previous=next;
        }
      }
      const kind=shot.kind==='shell'?'explosion':shot.kind==='ice'?'ice':shot.kind==='lightning'?'lightning':shot.kind==='arrow'?'hit':'magic';
      this.emitSound(shot.kind==='shell'?'explosion':shot.kind==='ice'?'frost':shot.kind==='arrow'?'impact':'magic-hit',center);
      this.effects.push({id:this.nextId++,x:center.x,y:center.y,z:center.z,from:shot.from,kind,radius:shot.splash,time:0,duration:kind==='lightning'?.22:.5});
    }
    this.shots = this.shots.filter(s => s.time < s.duration);
    for (const e of this.enemies.filter(e => e.hp <= 0)) {
      this.emitSound('death',e);
      this.resources.gold += ENEMIES[e.kind].reward; this.kills++;
      this.effects.push({ id: this.nextId++, x: e.x, y: e.y, z: e.z, kind: 'death', time: 0, duration: 0.5 });
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.castleHp <= 0) { this.castleHp = 0; this.phase = 'defeat'; this.emitSound('defeat'); this.say('城堡失守了。重新布置防线，再来一次。'); return; }
    if (!this.spawnQueue.length && !this.enemies.length) {
      if (this.wave === 5) { this.phase = 'victory'; this.emitSound('victory'); this.say(`你守住了${this.map.name}！边境将在黎明重获宁静。`); }
      else { this.phase = 'preparation'; this.emitSound('wave-clear'); this.resources.gold += 80 + this.wave * 15; this.resources.wood += 40; this.resources.stone += 45; this.say(`第 ${this.wave} 波已击退 · 获得金币、木材与石料补给`); }
    }
  }
  private clearAttackLine(from:Vec3,to:Vec3){
    const steps=Math.ceil(distance3(from,to)/.2);
    for(let i=1;i<steps;i++){
      const t=i/steps,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
      const y=from.y+(to.y-from.y)*t+.25;
      if(this.ground(x,z)>y||this.structureAt(Math.round(x),Math.round(z)))return false;
    }
    return true;
  }
  private enemyAttack(enemy:Enemy,target:Soldier){
    applyDamage(target,enemy.damage,enemy.damageType);
    this.emitSound(enemy.damageType==='magic'?'cast':'melee',enemy);
    if(enemy.damageType==='magic'){
      this.emitSound('magic-hit',target);
      this.effects.push({id:this.nextId++,x:target.x,y:target.y,z:target.z,kind:'magic',time:0,duration:.45});
    }
  }
  private updateEnemy(e: Enemy, dt: number) {
    if (e.hp <= 0) return;
    e.cooldown -= dt; e.repath -= dt;
    if((e.stunUntil??0)>this.time)return;
    const stats=ENEMIES[e.kind];
    const defender = this.soldiers.filter(s => s.hp > 0 && distance3(s,e)<stats.attackRange && (stats.attackRange<1||this.clearAttackLine(e,s))).sort((a,b)=>distance3(e,a)-distance3(e,b))[0];
    if (defender) { e.state = 'attacking'; e.facing = Math.atan2(defender.x-e.x, defender.z-e.z); if (e.cooldown <= 0) { this.enemyAttack(e,defender); e.cooldown = stats.interval; } return; }
    if (Math.hypot(e.x - this.goal.x, e.z - this.goal.z) < 0.5) { this.emitSound('castle-hit',e); this.castleHp -= stats.castleDamage; this.enemies = this.enemies.filter(x => x.id !== e.id); return; }
    if (e.revision !== this.revision || !e.path.length || e.repath <= 0) {
      this.refreshPath(e, this.goal, e.kind); e.repath = 3;
    }
    const next = e.path[0]; if (!next) return;
    const blocking = this.structureAt(next.x, next.z);
    if (blocking && Math.hypot(next.x - e.x, next.z - e.z) < 1.0) {
      e.state = 'attacking'; e.facing = Math.atan2(next.x - e.x, next.z - e.z);
      if (e.cooldown <= 0) { this.emitSound('wall-hit',blocking); applyDamage(blocking,e.damage,e.damageType); e.cooldown = stats.interval; this.effects.push({ id:this.nextId++, x:blocking.x,z:blocking.z,y:this.ground(blocking.x,blocking.z)+0.7,kind:'hit',time:0,duration:0.2 }); if (blocking.hp <= 0) { this.emitSound('collapse',blocking); this.destroyStructure(blocking.id); this.say('一座防御建筑被摧毁，敌军正在重新选路！'); } } return;
    }
    const tile = this.tile(Math.round(e.x), Math.round(e.z))!, to = this.tile(next.x, next.z)!;
    const dx = next.x - e.x, dz = next.z - e.z, dist = Math.hypot(dx,dz);
    const slow=(e.slowUntil??0)>this.time?1-(e.slow??0):1;
    const speed = e.speed * slow * (tile.water ? ENEMIES[e.kind].water : 1) / (1 + Math.abs(tile.h-to.h)*0.35);
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
      if(!tile?.active||tile.chasm&&!tile.bridge||this.structureAt(end.x,end.z)||Math.hypot(MELEE_RADIUS,this.ground(p.x,p.z)+.35-enemy.y)>.86)continue;
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
  private updateSoldier(s: Soldier, dt: number) {
    if (s.hp <= 0) return;
    const home = this.structures.find(b=>b.id===s.home); if(!home) return;
    s.cooldown -= dt; s.repath -= dt;
    if(s.revision!==this.revision){
      const options=this.guardPositions(home);
      if(!options.some(p=>p.x===s.guard.x&&p.z===s.guard.z)){
        const free=options.find(p=>!this.soldiers.some(other=>other!==s&&other.hp>0&&Math.hypot(other.guard.x-p.x,other.guard.z-p.z)<SOLDIER_SPACING));
        if(free)s.guard={...free};
      }
    }
    const targets=this.phase==='battle'?this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-home.x,e.z-home.z)<4.8):[];
    targets.sort((a,b)=>Number(b.id===s.engagement?.target)-Number(a.id===s.engagement?.target)||distance3(s,a)-distance3(s,b));
    let destination:Point|undefined,target:Enemy|undefined;
    for(const enemy of targets){destination=this.engage(s,enemy);if(destination){target=enemy;break;}}
    if(!target){s.engagement=undefined;destination=s.guard;}
    s.state='guarding';
    if(target&&distance3(s,target)<.86){
      s.state='fighting';s.facing=Math.atan2(target.x-s.x,target.z-s.z);
      if(s.cooldown<=0){this.emitSound('melee',s);this.hitEnemy(target,15*home.level,'physical');s.cooldown=.8;}
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
    const travel=Math.min(dist,dt*1.55*(this.tile(origin.x,origin.z)?.water ? .4 : 1));
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
