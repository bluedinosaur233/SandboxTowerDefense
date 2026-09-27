import { WIDTH, DEPTH, MAPS, makeTerrain, type MapId, type MapDefinition } from './maps';
export { WIDTH, DEPTH, makeTerrain } from './maps';
export const HEIGHT_UNIT = 0.55;
export type StructureKind = 'wall' | 'archer' | 'mage' | 'barracks';
export type Tool = 'inspect' | StructureKind | 'bridge' | 'dig' | 'raise' | 'remove';
export type EnemyKind = 'goblin' | 'runner' | 'brute';
export interface Point { x: number; z: number }
export interface Vec3 extends Point { y: number }
export interface Tile extends Point { h: number; water: boolean; bridge: boolean; bridgeBed?: number; chasm?: boolean; bridgeDeck?: number; suspension?: boolean; road: boolean; decoration: number; active: boolean }
export interface Resources { gold: number; wood: number; stone: number }
export interface Structure extends Point { id: number; kind: StructureKind; hp: number; maxHp: number; level: number; cooldown: number; recruit: number }
export interface Enemy extends Vec3 { id: number; kind: EnemyKind; hp: number; maxHp: number; speed: number; damage: number; cooldown: number; path: Point[]; revision: number; repath: number; state: 'walking' | 'attacking' | 'wading'; facing: number }
export interface Soldier extends Vec3 { id: number; home: number; hp: number; maxHp: number; cooldown: number; facing: number; state: 'guarding' | 'fighting'; path: Point[]; revision: number; repath: number }
export interface Shot { id: number; kind: 'arrow' | 'magic'; from: Vec3; to: Vec3; time: number; duration: number; target: number; damage: number; splash: number }
export type SoundKind = 'arrow'|'cast'|'impact'|'magic-hit'|'death'|'melee'|'wall-hit'|'collapse'|'castle-hit'|'recruit'|'build'|'dig'|'raise'|'upgrade'|'error'|'wave'|'wave-clear'|'victory'|'defeat'|'splash';
export interface SoundEvent extends Point { kind: SoundKind }
export interface Effect extends Vec3 { id: number; kind: 'build' | 'hit' | 'magic' | 'death'; time: number; duration: number }
export const COSTS: Record<Exclude<Tool, 'inspect' | 'remove'>, Resources> = {
  wall: { gold: 5, wood: 2, stone: 8 }, archer: { gold: 75, wood: 22, stone: 8 },
  mage: { gold: 110, wood: 8, stone: 22 }, barracks: { gold: 95, wood: 28, stone: 12 },
  dig: { gold: 8, wood: 0, stone: 0 }, raise: { gold: 5, wood: 0, stone: 5 },
  bridge: { gold: 12, wood: 12, stone: 0 },
};
export const LABELS: Record<Tool, string> = { inspect: '巡视', wall: '石墙', archer: '箭塔', mage: '法师塔', barracks: '兵营', bridge: '搭木桥', dig: '挖水道', raise: '筑高地', remove: '拆除' };
export const STATS = {
  wall: { hp: 160, range: 0, damage: 0, interval: 0, muzzle: 1.4 },
  archer: { hp: 140, range: 6.4, damage: 18, interval: 0.82, muzzle: 2.25 },
  mage: { hp: 125, range: 5.9, damage: 36, interval: 1.8, muzzle: 2.7 },
  barracks: { hp: 200, range: 4.5, damage: 0, interval: 0, muzzle: 1.2 },
};
export const ENEMIES: Record<EnemyKind, { hp: number; speed: number; damage: number; reward: number; water: number }> = {
  goblin: { hp: 66, speed: 1.15, damage: 12, reward: 9, water: 0.38 },
  runner: { hp: 48, speed: 1.75, damage: 9, reward: 10, water: 0.65 },
  brute: { hp: 230, speed: 0.72, damage: 32, reward: 22, water: 0.3 },
};
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
    const s: Structure = { id: this.nextId++, kind, x, z, hp, maxHp: hp, level: 1, cooldown: 0, recruit: 0 };
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
    const next = unit.path[0];
    const betweenCenters = Math.hypot(unit.x - nearest.x, unit.z - nearest.z) > 0.000001;
    // Finish the current edge before changing route. Rounding a moving unit to
    // the center behind it caused a visible U-turn every three seconds.
    const fromTile = this.tile(nearest.x, nearest.z);
    const nextTile = next && this.tile(next.x, next.z);
    const continueEdge = betweenCenters && next && nextTile && fromTile &&
      Math.hypot(next.x - unit.x, next.z - unit.z) <= 1.000001 &&
      Number.isFinite(this.moveCost(fromTile, nextTile, kind, friendly)) &&
      (!friendly || !this.structureAt(next.x, next.z));
    const origin = continueEdge ? next : nearest;
    const path = this.findPath(origin, destination, kind, friendly);
    if (Math.hypot(unit.x - origin.x, unit.z - origin.z) > 0.000001) path.unshift(origin);
    unit.path = path; unit.revision = this.revision;
  }
  upgrade(id: number): boolean {
    const s = this.structures.find(s => s.id === id);
    if (!s || s.level >= 3) return false;
    const cost = this.upgradeCost(s);
    if (!this.canAfford(cost)) { this.emitSound('error',s); this.say('升级所需资源不足'); return false; }
    this.pay(cost); s.level++; s.maxHp = Math.round(s.maxHp * 1.4); s.hp = s.maxHp; this.revision++;
    this.emitSound('upgrade',s);
    this.say(`${LABELS[s.kind]}升级至 ${s.level} 级`); return true;
  }
  upgradeCost(s: Structure): Resources { return { gold: Math.round(COSTS[s.kind].gold * s.level * 0.7), wood: Math.ceil(COSTS[s.kind].wood * 0.5), stone: Math.ceil(COSTS[s.kind].stone * 0.5) }; }
  towerRange(s: Structure) { return STATS[s.kind].range + (s.level - 1) * 0.6; }
  muzzle(s: Structure): Vec3 { return { x: s.x, z: s.z, y: this.ground(s.x, s.z) + STATS[s.kind].muzzle }; }
  destroyStructure(id: number) { this.structures = this.structures.filter(s => s.id !== id); this.soldiers = this.soldiers.filter(s => s.home !== id); this.revision++; }
  moveCost(from: Tile, to: Tile, kind: EnemyKind, ignoreStructure = false) {
    if (!from.active || !to.active || (from.chasm&&!from.bridge) || (to.chasm&&!to.bridge) || Math.abs(from.h - to.h) > 2) return Infinity;
    const stats = ENEMIES[kind];
    let cost = (1 + Math.abs(from.h - to.h) * 0.35) / stats.speed;
    if (to.water) cost /= stats.water;
    const s = ignoreStructure ? undefined : this.structureAt(to.x, to.z);
    if (s) cost += s.hp / stats.damage * 0.9;
    return cost;
  }
  findPath(start: Point, end = this.goal, kind: EnemyKind = 'goblin', friendly = false): Point[] {
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
    const count = 8 + this.wave * 4;
    this.spawnQueue = Array.from({ length: count }, (_, i): EnemyKind => this.wave >= 3 && i % 5 === 4 ? 'brute' : this.wave >= 2 && i % 3 === 1 ? 'runner' : 'goblin');
    this.totalInWave = count; this.spawnedInWave = 0; this.spawnTimer = 0;
    this.emitSound('wave',this.spawn);
    this.say(`第 ${this.wave} 波 · ${this.map.waveNames[this.wave - 1]}，敌军正在接近！`); return true;
  }
  spawnEnemy(kind: EnemyKind): Enemy {
    const stats = ENEMIES[kind], hp = Math.round(stats.hp * (1 + Math.max(0, this.wave - 1) * 0.12));
    const enemy: Enemy = { id: this.nextId++, kind, x: this.spawn.x, z: this.spawn.z, y: this.ground(this.spawn.x, this.spawn.z) + 0.35, hp, maxHp: hp, speed: stats.speed, damage: stats.damage, cooldown: 0, path: [], revision: -1, repath: 0, state: 'walking', facing: Math.PI / 2 };
    this.enemies.push(enemy); return enemy;
  }
  private guardPositions(home:Structure):Point[]{
    return [{x:home.x-1,z:home.z+1},{x:home.x-1,z:home.z},{x:home.x,z:home.z+1},{x:home.x+1,z:home.z},{x:home.x,z:home.z-1}].filter(p=>{
      const tile=this.tile(p.x,p.z),from=this.tile(home.x,home.z)!;
      return tile&&Number.isFinite(this.moveCost(from,tile,'goblin',true))&&!this.structureAt(p.x,p.z);
    });
  }
  recruitSoldiers() {
    for (const b of this.structures.filter(s => s.kind === 'barracks')) {
      const own = this.soldiers.filter(s => s.home === b.id);
      if (own.length < 2 + (b.level - 1) && b.recruit <= 0) {
        const options = this.guardPositions(b);
        const position = options.find(p => this.tile(p.x,p.z)?.active && !this.structureAt(p.x,p.z) && !own.some(s => Math.hypot(s.x-p.x,s.z-p.z)<0.5));
        if (!position) continue;
        this.soldiers.push({ id: this.nextId++, home: b.id, ...position, y: this.ground(position.x, position.z) + 0.35, hp: 95 + b.level * 15, maxHp: 95 + b.level * 15, cooldown: 0, facing: -Math.PI / 2, state: 'guarding', path: [], revision: -1, repath: 0 });
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
    if (this.phase !== 'battle') { for (const s of this.soldiers) s.hp = Math.min(s.maxHp, s.hp + dt * 8); return; }
    this.spawnTimer -= dt;
    if (this.spawnQueue.length && this.spawnTimer <= 0) { this.spawnEnemy(this.spawnQueue.shift()!); this.spawnedInWave++; this.spawnTimer = Math.max(0.5, 1.0 - this.wave * 0.07); }
    for (const e of this.enemies) this.updateEnemy(e, dt);
    for (const s of this.soldiers) this.updateSoldier(s, dt);
    for(const s of this.soldiers)if(s.hp<=0)this.emitSound('death',s);
    this.soldiers = this.soldiers.filter(s => s.hp > 0 && this.structures.some(b=>b.id===s.home));
    for (const tower of this.structures) {
      if ((tower.kind !== 'archer' && tower.kind !== 'mage') || tower.cooldown > 0) continue;
      const origin = this.muzzle(tower), range = this.towerRange(tower);
      const target = this.enemies.filter(e => e.hp > 0 && inSphere(origin, e, range)).sort((a,b) => Math.hypot(a.x-this.goal.x,a.z-this.goal.z)-Math.hypot(b.x-this.goal.x,b.z-this.goal.z))[0];
      if (!target) continue;
      const stats = STATS[tower.kind];
      this.shots.push({ id: this.nextId++, kind: tower.kind === 'mage' ? 'magic' : 'arrow', from: origin, to: { x: target.x, y: target.y, z: target.z }, time: 0, duration: tower.kind === 'mage' ? 0.45 : 0.25, target: target.id, damage: stats.damage * (1 + (tower.level - 1) * 0.55), splash: tower.kind === 'mage' ? 1.5 : 0 });
      this.emitSound(tower.kind==='mage'?'cast':'arrow',tower);
      tower.cooldown = stats.interval / (1 + (tower.level - 1) * 0.1);
    }
    for (const shot of this.shots) {
      shot.time += dt;
      if (shot.time >= shot.duration) {
        const target = this.enemies.find(e => e.id === shot.target);
        if (target) {
          this.emitSound(shot.splash?'magic-hit':'impact',target);
          if (shot.splash) for (const e of this.enemies) { if (distance3(e, target) <= shot.splash) e.hp -= shot.damage; }
          else target.hp -= shot.damage;
          this.effects.push({ id: this.nextId++, x: target.x, y: target.y, z: target.z, kind: shot.splash ? 'magic' : 'hit', time: 0, duration: shot.splash ? 0.6 : 0.2 });
        }
      }
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
  private updateEnemy(e: Enemy, dt: number) {
    if (e.hp <= 0) return;
    e.cooldown -= dt; e.repath -= dt;
    const defender = this.soldiers.find(s => s.hp > 0 && distance3(s, e) < 0.85);
    if (defender) { e.state = 'attacking'; e.facing = Math.atan2(defender.x-e.x, defender.z-e.z); if (e.cooldown <= 0) { this.emitSound('melee',e); defender.hp -= e.damage; e.cooldown = 0.9; } return; }
    if (Math.hypot(e.x - this.goal.x, e.z - this.goal.z) < 0.5) { this.emitSound('castle-hit',e); this.castleHp -= e.kind === 'brute' ? 18 : 7; this.enemies = this.enemies.filter(x => x.id !== e.id); return; }
    if (e.revision !== this.revision || !e.path.length || e.repath <= 0) {
      this.refreshPath(e, this.goal, e.kind); e.repath = 3;
    }
    const next = e.path[0]; if (!next) return;
    const blocking = this.structureAt(next.x, next.z);
    if (blocking && Math.hypot(next.x - e.x, next.z - e.z) < 1.0) {
      e.state = 'attacking'; e.facing = Math.atan2(next.x - e.x, next.z - e.z);
      if (e.cooldown <= 0) { this.emitSound('wall-hit',blocking); blocking.hp -= e.damage; e.cooldown = 0.9; this.effects.push({ id:this.nextId++, x:blocking.x,z:blocking.z,y:this.ground(blocking.x,blocking.z)+0.7,kind:'hit',time:0,duration:0.2 }); if (blocking.hp <= 0) { this.emitSound('collapse',blocking); this.destroyStructure(blocking.id); this.say('一座防御建筑被摧毁，敌军正在重新选路！'); } } return;
    }
    const tile = this.tile(Math.round(e.x), Math.round(e.z))!, to = this.tile(next.x, next.z)!;
    const dx = next.x - e.x, dz = next.z - e.z, dist = Math.hypot(dx,dz);
    const speed = e.speed * (tile.water ? ENEMIES[e.kind].water : 1) / (1 + Math.abs(tile.h-to.h)*0.35);
    const travel = Math.min(dist, speed * dt);
    if (dist > 0.001) { e.x += dx / dist * travel; e.z += dz / dist * travel; e.facing = Math.atan2(dx,dz); }
    e.y += (this.ground(e.x,e.z) + 0.35 - e.y) * Math.min(1, dt*10);
    if(tile.water && e.state!=='wading')this.emitSound('splash',e);
    e.state = tile.water ? 'wading' : 'walking';
    if (dist <= travel + 0.000001) { e.x = next.x; e.z = next.z; e.path.shift(); }
  }
  private updateSoldier(s: Soldier, dt: number) {
    if (s.hp <= 0) return;
    const home = this.structures.find(b=>b.id===s.home); if(!home) return;
    s.cooldown -= dt; s.repath -= dt;
    const target = this.enemies.filter(e=>e.hp>0 && Math.hypot(e.x-home.x,e.z-home.z)<4.8).sort((a,b)=>distance3(s,a)-distance3(s,b))[0];
    s.state = 'guarding';
    if (target && distance3(s,target)<0.86) { s.state='fighting'; s.facing=Math.atan2(target.x-s.x,target.z-s.z); if(s.cooldown<=0){this.emitSound('melee',s);target.hp-=15*home.level; s.cooldown=0.8;} return; }
    const destination = target ? {x:Math.round(target.x),z:Math.round(target.z)} : (this.guardPositions(home)[0]??{x:s.x,z:s.z});
    if(Math.hypot(s.x-destination.x,s.z-destination.z)<0.2) return;
    const origin = {x:Math.round(s.x),z:Math.round(s.z)};
    if(s.revision!==this.revision || !s.path.length || (s.repath<=0 && Math.hypot(s.x-origin.x,s.z-origin.z)<0.12)){
      this.refreshPath(s,destination,'goblin',true);s.repath=0.8;
    }
    const next = s.path[0];
    if(!next) return;
    const dx=next.x-s.x,dz=next.z-s.z,dist=Math.hypot(dx,dz), travel=Math.min(dist,dt*1.55*(this.tile(origin.x,origin.z)?.water?0.4:1));
    if(dist>0.001){s.x+=dx/dist*travel;s.z+=dz/dist*travel;s.facing=Math.atan2(dx,dz);}
    if(dist<=travel+0.000001){s.x=next.x;s.z=next.z;s.path.shift();}
    s.y += (this.ground(s.x,s.z)+0.35-s.y)*Math.min(1,dt*12);
  }
}
