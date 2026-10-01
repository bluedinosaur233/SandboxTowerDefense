export interface BuildingAction {id:string;icon:string;label:string;hint?:string;disabled?:boolean;run:()=>void}
/** Buttons are rebuilt only when their content changes, not when the camera moves. */
export class ContextActions {
  private signature='';
  private actions:BuildingAction[]=[];
  constructor(readonly root:HTMLElement,private close:()=>void){
    root.addEventListener('click',event=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if(!button||button.disabled)return;
      if(button.dataset.action==='close')this.close();
      else this.actions.find(a=>a.id===button.dataset.action)?.run();
    });
  }
  show(title:string,actions:BuildingAction[]){
    this.root.hidden=false;this.actions=actions;
    const signature=JSON.stringify([title,actions.map(({run,...a})=>a)]);
    if(signature===this.signature)return;this.signature=signature;
    const focus=(document.activeElement as HTMLElement)?.dataset.action;
    this.root.innerHTML=`<header><b>${title}</b><button data-action="close" aria-label="取消建筑选择">×</button></header><div class="context-action-row">${actions.map(a=>`<button data-action="${a.id}" ${a.disabled?'disabled':''} aria-label="${a.label}${a.hint?' · '+a.hint:''}" title="${a.label}${a.hint?' · '+a.hint:''}"><img src="/art/ui/actions/${a.icon}.webp" alt=""><span>${a.label}</span>${a.hint?`<small>${a.hint}</small>`:''}</button>`).join('')}</div>`;
    if(focus)this.root.querySelector<HTMLButtonElement>(`[data-action="${focus}"]`)?.focus({preventScroll:true});
  }
  hide(){this.root.hidden=true;}
  position(x:number,y:number,width:number,height:number,dockTop:number,zoom:number){
    if(this.root.hidden)return;
    // Far-away buildings get a smaller menu; close views keep readable full-size controls.
    const scale=Math.max(.62,Math.min(1,Math.sqrt(zoom/1.45)));
    const w=this.root.offsetWidth*scale,h=this.root.offsetHeight*scale;
    const top=Math.max(100,Math.min(y-h-12*scale,dockTop-h-12,height-h-8));
    const left=Math.max(8,Math.min(x-w/2,width-w-8));
    this.root.style.transform=`translate3d(${left}px,${top}px,0) scale(${scale})`;
    this.root.style.setProperty('--anchor-x',`${Math.max(18,Math.min(w-18,x-left))/scale}px`);
  }
}
