import { HERO, type HeroId } from './roster';
import { MAPS, type MapId } from '../simulation/maps';
import { icon } from '../ui/icons';
import './style.css';

const skillIcons = ['marksman', 'sword', 'ranger', 'blizzard', 'shield', 'tempest'];

export class HeroPanel {
  readonly dialog = document.createElement('dialog');
  private map: MapId = 'windford';
  private equipped: HeroId | null = null;
  private returnFocus: HTMLElement | null = null;
  constructor(parent: HTMLElement, private save: (map: MapId, id: HeroId | null) => void, private onClose: () => void, private sound: () => void) {
    this.dialog.className = 'hero-hall';
    this.dialog.setAttribute('aria-labelledby', 'hero-hall-title');
    this.dialog.innerHTML = `
      <header class="hero-header"><span class="hero-header-ornament" aria-hidden="true">✧ ───</span><div><small>THE WINDWARD COMPANY</small><h2 id="hero-hall-title">英雄殿堂</h2></div><span class="hero-header-ornament" aria-hidden="true">─── ✧</span><button class="hero-close" aria-label="关闭英雄选择">×</button></header>
      <div class="hero-body">
        <section class="hero-gallery" aria-label="英雄外观">
          <div class="hero-wind-sigil" aria-hidden="true"></div><div class="hero-art-label" aria-hidden="true">${icon("compass")}<span>WIND<br>RANGER</span></div>
          <div class="hero-art"><img src="${HERO.splash}" alt="艾莉娅体素 Q 版战斗立绘：左前方四十五度视角，展开翠色光翼腾空，一腿收起一腿前伸，拉弓汇聚风之箭" decoding="async"></div>
          <div class="hero-gallery-caption"><span>THE EMERALD WIND · 逐风者</span><p>${HERO.quote}</p></div>
        </section>
        <section class="hero-dossier" aria-label="角色简介与技能"><div class="hero-dossier-scroll" tabindex="0" aria-label="滚动查看角色资料"><div class="hero-number">${icon("blizzard")}<span>风系 · 游侠</span><small>HERO / 01</small></div><p class="hero-title">${HERO.title}</p><h3>${HERO.name}<span>· ${HERO.surname}</span></h3><small class="hero-english">${HERO.english}</small><div class="hero-tags"><span>${HERO.race}</span><span>${HERO.age} 岁 · ${HERO.height}</span><span>弓箭 / 刺剑</span></div><p class="hero-story">${HERO.story}</p>
          <div class="hero-section-heading"><h4>战斗天赋</h4><span>COMBAT TALENTS</span></div><div class="hero-skills">${HERO.skills.map((s, i) => `<article><div class="hero-skill-glyph">${icon(skillIcons[i])}</div><div><h4>${s.name}<span>${s.type}</span></h4><p>${s.text}</p></div><small>0${i + 1}</small></article>`).join('')}</div>
          </div><div class="hero-assignment"><div class="hero-destination">${icon("flag")}<div><small>本次远征</small><strong id="hero-map-name"></strong></div></div><button id="hero-equip">选择随行 <span>→</span></button><p id="hero-equip-status" role="status" aria-live="polite"></p><button id="hero-unequip">取消携带</button></div>
        </section>
      </div>
      <footer class="hero-roster"><div><small>远征同伴</small><span>01 / 01</span></div><button class="hero-roster-card" aria-label="查看艾莉娅" aria-pressed="true"><img src="${HERO.hallAvatar}" alt=""><span>${HERO.name}<small>${HERO.title}</small></span><b>✧</b></button><p>每关可选择一位英雄<br><span>选择会为该关卡单独保存</span></p></footer>`;
    parent.append(this.dialog);
    this.dialog.querySelector<HTMLButtonElement>('.hero-close')!.onclick = () => this.close();
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', e => e.stopPropagation());
    this.get('hero-equip').onclick = () => { this.equipped = HERO.id; this.save(this.map, HERO.id); this.update(); this.sound(); };
    this.get('hero-unequip').onclick = () => { this.equipped = null; this.save(this.map, null); this.update(); this.sound(); };
    this.dialog.querySelector<HTMLButtonElement>('.hero-roster-card')!.onclick = () => { this.dialog.querySelector<HTMLElement>('.hero-dossier-scroll')!.scrollTop=0; this.sound(); };
  }
  private get<T extends HTMLElement = HTMLElement>(id: string) { return this.dialog.querySelector<T>(`#${id}`)!; }
  get open() { return this.dialog.open; }
  show(map: MapId, equipped: HeroId | null) {
    this.map = map; this.equipped = equipped; this.returnFocus = document.activeElement as HTMLElement;
    this.update(); this.dialog.showModal(); this.dialog.scrollTop=0; this.dialog.querySelector<HTMLElement>('.hero-dossier-scroll')!.scrollTop=0; this.sound();
  }
  close() { if (!this.open) return; this.dialog.close(); this.onClose(); this.returnFocus?.focus(); }
  private update() {
    this.get('hero-map-name').textContent = MAPS[this.map].name;
    this.get('hero-equip-status').textContent = this.equipped ? '艾莉娅已加入这支远征队' : '尚未选择随行英雄';
    const b = this.get<HTMLButtonElement>('hero-equip'); b.disabled = !!this.equipped;
    b.innerHTML = this.equipped ? '已选择 · 艾莉娅 <span>✓</span>' : '选择随行 <span>→</span>';
    this.get('hero-unequip').hidden = !this.equipped;
  }
}
