import { HERO, type HeroId } from './roster';
import { MAPS, type MapId } from '../simulation/maps';
import { HeroPreview } from './preview';
import './style.css';

type View = 'portrait' | 'poster' | 'model' | 'reference';
export class HeroPanel {
  readonly dialog = document.createElement('dialog');
  private map: MapId = 'river';
  private equipped: HeroId | null = null;
  private preview?: HeroPreview;
  private view: View = 'portrait';
  private returnFocus: HTMLElement | null = null;
  constructor(parent: HTMLElement, private save: (map: MapId, id: HeroId | null) => void, private onClose: () => void, private sound: () => void) {
    this.dialog.className = 'hero-hall';
    this.dialog.setAttribute('aria-labelledby', 'hero-hall-title');
    this.dialog.innerHTML = `
      <header class="hero-header"><div><small>THE WINDWARD COMPANY</small><h2 id="hero-hall-title">英雄殿堂</h2></div><p>一位同伴，一段新的远征。</p><button class="hero-close" aria-label="关闭英雄选择">×</button></header>
      <div class="hero-body">
        <section class="hero-gallery" aria-label="英雄外观">
          <div class="hero-art"><img src="${HERO.portrait}" alt="艾莉娅全身立绘：金发高马尾精灵，白银轻甲与短裙，手持长弓，佩戴刺剑和翠色魔法羽翼"></div>
          <div class="hero-model" hidden aria-label="可旋转的艾莉娅体素模型"></div>
          <div class="hero-reference" hidden><img src="${HERO.turnaround}" alt="艾莉娅体素 Q 版正面、侧面与背面三视图"></div>
          <div class="hero-gallery-caption"><span>THE EMERALD WIND</span><p>${HERO.quote}</p></div>
          <div class="hero-view-tabs" role="group" aria-label="外观展示方式"><button data-view="portrait" aria-pressed="true">角色立绘</button><button data-view="poster" aria-pressed="false">拉弓海报</button><button data-view="model" aria-pressed="false">体素模型</button><button data-view="reference" aria-pressed="false">三视图</button></div>
          <div class="hero-model-controls" hidden><span>拖动旋转 · 滚轮缩放</span><div><button data-angle="0">正面</button><button data-angle="1.5708">侧面</button><button data-angle="3.14159">背面</button><button id="hero-enlarge" aria-pressed="false">放大查看</button><button id="hero-wings" aria-pressed="false">展开光翼</button></div></div>
        </section>
        <section class="hero-dossier"><div class="hero-number">HERO / 01 <span>风系 · 游侠</span></div><p class="hero-title">${HERO.title}</p><h3>${HERO.name}<span>· ${HERO.surname}</span></h3><small class="hero-english">${HERO.english}</small><div class="hero-tags"><span>${HERO.race}</span><span>${HERO.age} 岁 · ${HERO.height}</span><span>弓箭 / 刺剑</span></div><p class="hero-story">${HERO.story}</p>
          <div class="hero-skills">${HERO.skills.map((s, i) => `<article><div class="hero-skill-glyph">${s.mark}</div><div><h4>${s.name}<span>${s.type}</span></h4><p>${s.text}</p></div><small>0${i + 1}</small></article>`).join('')}</div>
          <div class="hero-assignment"><small>本次远征 · <span id="hero-map-name"></span></small><p id="hero-equip-status" role="status" aria-live="polite"></p><button id="hero-equip">选择这位英雄 <span>→</span></button><button id="hero-unequip">取消携带</button><p class="hero-development">英雄预览 · 战斗与技能将在后续开放</p></div>
        </section>
      </div>
      <footer class="hero-roster"><div><small>你的英雄</small><span>01 / 01</span></div><button class="hero-roster-card" aria-label="查看艾莉娅" aria-pressed="true"><img src="${HERO.avatar}" alt=""><span>${HERO.name}<small>${HERO.title}</small></span><b>✧</b></button><p>每关可选择一位英雄<br><span>选择会为该关卡单独保存</span></p></footer>`;
    parent.append(this.dialog);
    this.dialog.querySelector<HTMLButtonElement>('.hero-close')!.onclick = () => this.close();
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('keydown', e => e.stopPropagation());
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => this.setView(b.dataset.view as View));
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-angle]').forEach(b => b.onclick = () => { this.preview?.face(Number(b.dataset.angle)); this.sound(); });
    this.get('hero-enlarge').onclick=()=>{const expanded=this.dialog.classList.toggle('hero-inspect');this.get('hero-enlarge').textContent=expanded?'返回资料':'放大查看';this.get('hero-enlarge').setAttribute('aria-pressed',String(expanded));};
    this.get<HTMLButtonElement>('hero-wings').onclick = () => {
      if (!this.preview) return;
      const on = this.preview.toggleFlight();
      const button = this.get<HTMLButtonElement>('hero-wings'); button.setAttribute('aria-pressed', String(on)); button.textContent = on ? '收起光翼' : '展开光翼'; this.sound();
    };
    this.get('hero-equip').onclick = () => { this.equipped = HERO.id; this.save(this.map, HERO.id); this.update(); this.sound(); };
    this.get('hero-unequip').onclick = () => { this.equipped = null; this.save(this.map, null); this.update(); this.sound(); };
    this.dialog.querySelector<HTMLButtonElement>('.hero-roster-card')!.onclick = () => this.setView('portrait');
  }
  private get<T extends HTMLElement = HTMLElement>(id: string) { return this.dialog.querySelector<T>(`#${id}`)!; }
  get open() { return this.dialog.open; }
  show(map: MapId, equipped: HeroId | null) {
    this.map = map; this.equipped = equipped; this.returnFocus = document.activeElement as HTMLElement;
    this.update(); this.dialog.showModal(); this.dialog.scrollTop=0; this.dialog.querySelector<HTMLElement>('.hero-dossier')!.scrollTop=0; this.setView('portrait');
  }
  close() { if (!this.open) return; this.dialog.close(); this.onClose(); this.returnFocus?.focus(); }
  private update() {
    this.get('hero-map-name').textContent = MAPS[this.map].name;
    this.get('hero-equip-status').textContent = this.equipped ? '艾莉娅已加入这支远征队' : '尚未选择随行英雄';
    const b = this.get<HTMLButtonElement>('hero-equip'); b.disabled = !!this.equipped;
    b.innerHTML = this.equipped ? '已选择 · 艾莉娅 <span>✓</span>' : '选择这位英雄 <span>→</span>';
    this.get('hero-unequip').hidden = !this.equipped;
  }
  private setView(view: View) {
    this.view = view;
    if(view!=='model'){this.dialog.classList.remove('hero-inspect');this.get('hero-enlarge').textContent='放大查看';this.get('hero-enlarge').setAttribute('aria-pressed','false');}
    this.dialog.querySelector<HTMLElement>('.hero-art')!.classList.toggle('is-poster',view==='poster');
    this.dialog.querySelector<HTMLElement>('.hero-art')!.hidden = view !== 'portrait' && view !== 'poster';
    const art=this.dialog.querySelector<HTMLImageElement>('.hero-art img')!;
    art.src=view==='poster'?HERO.poster:HERO.portrait;
    art.alt=view==='poster'?'艾莉娅拉弓瞄准的近景海报，肩后展开翠色魔法光翼':'艾莉娅正常站姿全身立绘，白银短裙、白色过膝袜和小腿短靴';
    this.dialog.querySelector<HTMLElement>('.hero-model')!.hidden = view !== 'model';
    this.dialog.querySelector<HTMLElement>('.hero-reference')!.hidden = view !== 'reference';
    this.dialog.querySelector<HTMLElement>('.hero-gallery-caption')!.hidden = view !== 'portrait';
    this.dialog.querySelector<HTMLElement>('.hero-model-controls')!.hidden = view !== 'model';
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (view === 'model' && !this.preview) {
      const host = this.dialog.querySelector<HTMLElement>('.hero-model')!;
      try { this.preview = new HeroPreview(host); }
      catch { host.innerHTML = '<p class="hero-preview-error">3D 预览暂不可用，请查看角色立绘与三视图。</p>'; }
    }
    this.sound();
  }
  render(time: number) { if (this.open && this.view === 'model') this.preview?.render(time); }
}
