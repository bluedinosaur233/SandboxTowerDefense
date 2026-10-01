import { BARRACKS_BRANCHES, BARRACKS_RECRUIT_SECONDS, barracksCapacity, soldierProfile } from '../simulation/barracks';
import type { Structure } from '../simulation/game';
import { icon } from './icons';
import { portrait } from './portraits';

export function barracksDetails(s:Structure){
  const p=soldierProfile(s),branch=s.barracksBranch?BARRACKS_BRANCHES[s.barracksBranch]:null;
  return '<p>'+ (branch?.description??'二级训练披甲卫士，三级可选择魔剑士或圣骑士。')+'</p><div class="selection-stat"><span>驻军编制</span><b>'+ barracksCapacity(s)+' 名 '+p.name+'</b></div><div class="selection-stat"><span>战中补员间隔</span><b>'+BARRACKS_RECRUIT_SECONDS+' 秒 / 人</b></div><div class="selection-stat"><span>每名士兵生命</span><b>'+p.hp+'</b></div><div class="selection-stat"><span>近战伤害</span><b>'+p.physical+' 物伤'+(p.magic?' + '+p.magic+' 法伤':'')+'</b></div>'+(branch?'<ul class="tower-traits">'+branch.features.map(x=>'<li>'+x+'</li>').join('')+'</ul>':'');
}
export function barracksBranchDialog(gold:number){
  return '<div class="modal-backdrop"><section class="modal branch-modal" role="dialog" aria-modal="true" aria-labelledby="branch-title"><button class="modal-close" aria-label="关闭专精选择">'+icon('close')+'</button><div class="eyebrow">CHOOSE YOUR GARRISON</div><h2 id="branch-title">兵营 · 三级专精</h2><p class="branch-intro">现役卫士即刻换装，保留生命比例。选择后固定分支。</p><div class="branch-options">'+Object.values(BARRACKS_BRANCHES).map(b=>{
    const p=soldierProfile({level:3,barracksBranch:b.id}),afford=gold>=b.cost.gold;
    return '<article class="branch-card" style="--branch-color:'+b.color+'"><span class="branch-emblem">'+portrait(b.id)+'</span><h3>'+b.name+'</h3><p>'+b.description+'</p><dl><div><dt>编制 / 每人生命</dt><dd>'+barracksCapacity({level:3})+' 人 / '+p.hp+'</dd></div><div><dt>物防 / 法抗</dt><dd>'+p.armor+'% / '+p.resistance+'%</dd></div></dl><ul>'+b.features.map(x=>'<li>'+x+'</li>').join('')+'</ul><button data-branch="'+b.id+'" '+(afford?'':'disabled')+' aria-label="升级为'+b.name+'"><b>'+(afford?'选择 '+b.unit:'金币不足')+'</b><span>'+b.cost.gold+' 金币</span></button></article>';
  }).join('')+'</div><p class="branch-feedback" role="status"></p><button class="text-button branch-back">暂不选择 · 返回战场</button></section></div>';
}
