import type * as THREE from 'three';
import { drawStageThumbnail } from './thumbnail';
import { CampaignScene } from './scene';
import { STAGES, REGIONS, sampleContinent } from './continent';
import { REGION_LIFE, atlasSettlements } from './settlements';
import { MAPS, type MapId } from '../simulation/maps';
import { readProgress, recordVictory, PROGRESS_KEY, type CampaignProgress } from './progress';
import { icon } from '../ui/icons';
import { HeroPanel } from '../heroes/panel';
import { HERO, HERO_LOADOUT_KEY, readHeroLoadouts, equipHero, type HeroLoadouts } from '../heroes/roster';

export class CampaignMenu {
  readonly scene:CampaignScene;
  readonly root:HTMLElement;
  readonly heroPanel:HeroPanel;
  private heroLoadouts:HeroLoadouts={};
  visible=false;
  selected:MapId|null=null;
  departing=false;
  private progress:CampaignProgress={};
  private markers=new Map<MapId,HTMLButtonElement>();
  private labels:HTMLElement[]=[];
  private towns=atlasSettlements().filter(s=>s.capital);
  private townLabels:HTMLElement[]=[];
  private lastWidth=0;private lastHeight=0;
  private exploring:number|null=null;
  constructor(renderer:THREE.WebGLRenderer,private launch:(id:MapId)=>void,private resume:()=>void,private click:()=>void){
    this.scene=new CampaignScene(renderer);
    try{this.progress=readProgress(localStorage.getItem(PROGRESS_KEY));}catch{/* Storage may be disabled. */}
    this.root=document.createElement('section');this.root.id='campaign';this.root.hidden=true;this.root.setAttribute('aria-label','世界地图与战役选择');
    this.root.innerHTML=`
      <div class="atlas-shade"></div><div class="atlas-frame"></div>
      <header class="atlas-title"><span class="atlas-kicker">R I V E R W A T C H</span><h1>暮河守望<span>边境远征</span></h1><p>群山之外，新的故事正等待你的旗帜。</p></header>
      <aside class="atlas-ledger"><span>远征纪事</span><b id="atlas-completed"></b><small id="atlas-stars"></small><button id="atlas-resume" hidden>继续当前战役 ${icon('chevron')}</button></aside>
      <div class="atlas-regions" aria-hidden="true"></div><div class="atlas-markers"></div>
      <section class="atlas-card" hidden aria-labelledby="atlas-level-title"><button id="atlas-card-close" aria-label="关闭关卡信息">${icon('close')}</button><div class="atlas-card-body"><div class="atlas-card-top"><span id="atlas-chapter"></span><span id="atlas-best"></span></div><figure class="atlas-preview"><canvas id="atlas-thumbnail" role="img" aria-label="关卡地形缩略图"></canvas><figcaption>战场鸟瞰 <span>河谷 · 高地 · 三路来袭</span></figcaption></figure><div class="atlas-card-title"><span id="atlas-seal"></span><div><small id="atlas-region"></small><h2 id="atlas-level-title"></h2></div></div><p id="atlas-description"></p><div class="atlas-facts"><span id="atlas-tactic"></span><span id="atlas-waves"></span></div></div><div class="atlas-card-actions"><button id="atlas-deploy">出征 ${icon('flag')}<span>守住这片土地</span></button><small class="atlas-score-guide">守住要塞，赢取至多三枚守望之星</small></div></section>

      <aside class="atlas-explore"><button id="atlas-explore-toggle" aria-expanded="false" aria-controls="atlas-region-drawer">${icon('compass')}<span>探索十二疆域<small>雪山 · 湿地 · 火山 · 群岛</small></span></button></aside>
      <section id="atlas-region-drawer" class="atlas-region-drawer" aria-label="疆域图志" hidden><header><div><small>ATLAS OF THE REALM</small><h2>疆域图志</h2></div><button id="atlas-explore-close" aria-label="关闭疆域图志">${icon('close')}</button></header><p>选择一片疆域，俯瞰它的山川与传说。</p><div class="atlas-region-list">${REGIONS.map((r,i)=>`<button data-region="${i}" aria-pressed="false"><span>${String(i+1).padStart(2,'0')}</span><b>${r.name}</b><small>${r.subtitle}</small></button>`).join('')}</div><article id="atlas-region-detail"><b>一片完整的远征大陆</b><p>河流连接群山与大海。拖动地图，发现各地的聚落、遗迹和自然奇观。</p></article><button id="atlas-explore-overview">全览大陆 ${icon('compass')}</button></section>
      <div class="atlas-navigation"><span class="atlas-compass">N<i>✥</i></span><div><button id="atlas-zoom-in" aria-label="放大世界地图">+</button><button id="atlas-overview" aria-label="全览大陆">${icon('compass')}</button><button id="atlas-zoom-out" aria-label="缩小世界地图">−</button></div><p>拖动探索 · 滚轮缩放<span>触屏：单指拖动 / 双指缩放</span></p></div>`;
    document.querySelector('#app')!.append(this.root);
    const markerRoot=this.root.querySelector('.atlas-markers')!;
    for(const stage of STAGES){const marker=document.createElement('button');marker.className='atlas-pin';marker.setAttribute('aria-label',`选择${MAPS[stage.id].name}`);marker.innerHTML=`<span>${stage.number}</span><b>${MAPS[stage.id].name}</b><small></small>`;marker.onclick=()=>this.select(stage.id);markerRoot.append(marker);this.markers.set(stage.id,marker);}
    const labels=this.root.querySelector('.atlas-regions')!;
    for(const region of REGIONS){const label=document.createElement('div');label.className='atlas-region';label.innerHTML=`${region.name}<small>${region.subtitle}</small>`;labels.append(label);this.labels.push(label);}
    for(const town of this.towns){const label=document.createElement('div');label.className='atlas-town';label.innerHTML=`<span>♜</span> ${town.name}`;label.hidden=true;labels.append(label);this.townLabels.push(label);}
    this.get('atlas-deploy').onclick=()=>{if(this.selected&&!this.departing){this.click();this.launch(this.selected);}};
    this.get('atlas-card-close').onclick=()=>this.clearSelection();
    let down:{x:number;y:number}|null=null;
    renderer.domElement.addEventListener('pointerdown',e=>{down=e.button===0?{x:e.clientX,y:e.clientY}:null;});
    renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5&&this.visible&&!this.departing&&!this.heroPanel.open)this.clearSelection();down=null;});
    renderer.domElement.addEventListener('pointercancel',()=>down=null);
    this.get('atlas-resume').onclick=()=>this.resume();
    this.get('atlas-zoom-in').onclick=()=>this.scene.zoom(1.2);
    this.get('atlas-zoom-out').onclick=()=>this.scene.zoom(1/1.2);
    this.get('atlas-overview').onclick=()=>this.overview();
    this.get('atlas-explore-overview').onclick=()=>this.overview();
    const drawer=this.get('atlas-region-drawer'),toggle=this.get('atlas-explore-toggle');
    const setDrawer=(open:boolean)=>{drawer.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
    toggle.onclick=()=>{setDrawer(drawer.hidden);this.click();};
    this.get('atlas-explore-close').onclick=()=>{setDrawer(false);toggle.focus();};
    drawer.addEventListener('pointerdown',e=>e.stopPropagation());
    drawer.addEventListener('wheel',e=>e.stopPropagation());
    drawer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setDrawer(false);toggle.focus();}});
    this.root.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button=>button.onclick=()=>{
      const index=Number(button.dataset.region),region=REGIONS[index];this.clearSelection();this.exploring=index;this.root.classList.add('exploring');this.scene.explore(index);
      this.root.querySelectorAll<HTMLElement>('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      this.get('atlas-region-detail').innerHTML=`<b>${region.name}</b><p>${region.detail}</p><p>${REGION_LIFE[index]}</p>`;this.click();
      if(window.innerWidth<=580)setDrawer(false);
    });
    try{this.heroLoadouts=readHeroLoadouts(localStorage.getItem(HERO_LOADOUT_KEY));}catch{/* Keep session selection when storage is disabled. */}
    const heroButton=document.createElement('button');heroButton.id='atlas-hero';
    this.get('atlas-deploy').before(heroButton);
    this.heroPanel=new HeroPanel(this.root,(map,id)=>{
      this.heroLoadouts=equipHero(this.heroLoadouts,map,id);
      try{localStorage.setItem(HERO_LOADOUT_KEY,JSON.stringify(this.heroLoadouts));}catch{/* Session-only choice. */}
      this.updateHeroButton();
    },()=>{this.scene.controls.enabled=this.visible;},this.click);
    heroButton.onclick=()=>{if(!this.selected||this.departing)return;this.scene.controls.enabled=false;this.heroPanel.show(this.selected,this.heroLoadouts[this.selected]??null);};
    this.updateCard();
  }
  private get(id:string){return this.root.querySelector<HTMLElement>(`#${id}`)!;}
  private overview(){this.clearSelection();this.exploring=null;this.root.classList.remove('exploring');this.scene.reset();this.root.querySelectorAll<HTMLElement>('[data-region]').forEach(b=>b.setAttribute('aria-pressed','false'));this.get('atlas-region-detail').innerHTML='<b>一片完整的远征大陆</b><p>河流连接群山与大海。拖动地图，发现各地的聚落、遗迹和自然奇观。</p>';}
  select(id:MapId){if(this.departing)return;this.get('atlas-region-drawer').hidden=true;this.get('atlas-explore-toggle').setAttribute('aria-expanded','false');this.exploring=null;this.root.classList.remove('exploring');this.selected=id;this.updateCard();this.scene.focus(id);this.get('atlas-card-close').focus({preventScroll:true});this.click();}
  clearSelection(){if(this.departing)return;this.selected=null;this.updateCard();}
  beginDeparture(){this.departing=true;this.root.classList.add('departing');this.root.inert=true;this.scene.controls.enabled=false;}
  heroFor(map:MapId){return this.heroLoadouts[map]??null;}
  private updateHeroButton(){if(!this.selected)return;const id=this.heroFor(this.selected);this.get('atlas-hero').innerHTML=`<img src="${HERO.hallAvatar}" alt=""><span>${id?'随行英雄 · '+HERO.name:'选择随行英雄'}<small>${id?HERO.title:'英雄殿堂 · 每关一位'}</small></span><b>›</b>`;}
  private updateCard(){
    const card=this.root.querySelector<HTMLElement>('.atlas-card')!;card.hidden=!this.selected;this.root.classList.toggle('has-selection',!!this.selected);
    this.get('atlas-completed').textContent=`${Object.keys(this.progress).length} / ${STAGES.length} 领地守卫`;
    this.get('atlas-stars').textContent=`✦ ${Object.values(this.progress).reduce((a,b)=>a+b,0)} / ${STAGES.length*3} 守望之星`;
    for(const n of STAGES){const stars=this.progress[n.id]??0,marker=this.markers.get(n.id)!;marker.classList.toggle('chosen',n.id===this.selected);marker.classList.toggle('conquered',stars>0);marker.setAttribute('aria-pressed',String(n.id===this.selected));marker.querySelector('small')!.textContent='★'.repeat(stars)+'☆'.repeat(3-stars);}
    if(!this.selected)return;
    this.updateHeroButton();
    const canvas=this.get('atlas-thumbnail') as HTMLCanvasElement;if(canvas.dataset.map!==this.selected){drawStageThumbnail(canvas,this.selected);canvas.dataset.map=this.selected;}canvas.setAttribute('aria-label',`${MAPS[this.selected].name}：河谷、高地、要塞与生产据点缩略图`);
    const map=MAPS[this.selected];
    this.get('atlas-waves').textContent=`${map.waveNames.length} 波攻势`;
    this.get('atlas-chapter').textContent=map.chapter;this.get('atlas-region').textContent=map.eyebrow;
    this.get('atlas-level-title').textContent=map.name;this.get('atlas-description').textContent=map.description;
    this.get('atlas-seal').innerHTML=icon('bridge');
    this.get('atlas-tactic').textContent=map.tactic;this.get('atlas-best').textContent=this.progress[this.selected]?'已守住':'等待出征';
  }
  show(canResume:boolean){this.selected=null;this.exploring=null;this.departing=false;this.root.inert=false;this.root.classList.remove('departing','exploring');this.scene.reset();this.get('atlas-region-drawer').hidden=true;this.get('atlas-explore-toggle').setAttribute('aria-expanded','false');this.visible=true;this.root.hidden=false;document.body.classList.add('campaign-active');this.scene.controls.enabled=true;this.get('atlas-resume').hidden=!canResume;this.updateCard();}
  hide(){this.heroPanel.close();this.departing=false;this.root.inert=false;this.root.classList.remove('departing');this.visible=false;this.root.hidden=true;document.body.classList.remove('campaign-active');this.scene.controls.enabled=false;}
  victory(id:MapId,hp:number){this.progress=recordVictory(this.progress,id,hp);try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(this.progress));}catch{/* Progress remains available for this session. */}this.updateCard();}
  render(time:number){
    if(this.heroPanel.open){return;}
    const width=window.innerWidth,height=window.innerHeight;
    if(width!==this.lastWidth||height!==this.lastHeight){this.scene.resize(width,height);this.lastWidth=width;this.lastHeight=height;}
    this.scene.render(time,this.selected);
    for(const stage of STAGES){const p=this.scene.project(stage.x,stage.z,sampleContinent(stage.x,stage.z).h+10.5);const marker=this.markers.get(stage.id)!;marker.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;marker.hidden=!p.visible;}
    this.towns.forEach((town,i)=>{const p=this.scene.project(town.x,town.z,town.buildings[0].floor+19),label=this.townLabels[i];label.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;label.hidden=this.scene.camera.zoom<1.8||(this.exploring!==null&&town.region!==this.exploring)||!p.visible||p.y<110||p.y>height-95;});
    const occupied:{x:number;y:number}[]=STAGES.map(s=>this.scene.project(s.x,s.z,sampleContinent(s.x,s.z).h+10.5));
    if(this.scene.camera.zoom>=1.6)for(const town of this.towns)occupied.push(this.scene.project(town.x,town.z,town.buildings[0].floor+19));
    const order=REGIONS.map((_,i)=>i).sort((a,b)=>Number(b===this.exploring)-Number(a===this.exploring));
    for(const i of order){const r=REGIONS[i],p=this.scene.project(r.x,r.z,sampleContinent(r.x,r.z).h+.6),label=this.labels[i];
      label.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;label.classList.toggle('explored',i===this.exploring);
      const crowded=occupied.some(q=>Math.abs(p.x-q.x)<95&&p.y>q.y-75&&p.y<q.y+48);
      label.hidden=(i===this.exploring&&this.towns.some(t=>t.region===i)&&this.scene.camera.zoom>=1.8)||!p.visible||p.y<110||p.y>height-95||(crowded&&i!==this.exploring);if(!label.hidden)occupied.push(p);
    }
  }
}
