import { Game, type Point, type Tool } from '../simulation/game';
import { isTower } from '../simulation/towers';
export class BuildPlacement {
  point:Point|null=null;
  anchor:Point|null=null;
  dragging=false;
  facing=Math.PI/2;
  tool:Tool='inspect';
  begin(tool:Tool){this.tool=tool;this.point=null;this.anchor=null;this.dragging=false;this.facing=Math.PI/2;}
  move(point:Point|null){if(!this.anchor)this.point=point?{x:Math.round(point.x),z:Math.round(point.z)}:null;}
  rotate(delta=Math.PI/4){this.facing=(this.facing+delta+Math.PI*2)%(Math.PI*2);}
  cancel(){this.begin('inspect');}
  neighbors(game:Game){return this.anchor?[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>({x:this.anchor!.x+dx,z:this.anchor!.z+dz})).filter(p=>!game.validate(this.tool,p.x,p.z)):[];}
  error(game:Game){return this.point?game.validate(this.tool,this.point.x,this.point.z):'点击空地建造';}
  click(game:Game,point:Point|null):'built'|'cancelled'|'invalid'{
    if(this.dragging||this.tool==='inspect'||this.tool==='remove')return 'invalid';
    if(this.anchor&&!this.neighbors(game).some(p=>p.x===point?.x&&p.z===point?.z)){this.cancel();return 'cancelled';}
    if(!point)return 'invalid';
    this.point={...point};return this.confirm(game)?'built':'invalid';
  }
  confirm(game:Game){
    if(this.dragging||!this.point||this.tool==='inspect'||this.tool==='remove')return false;
    if(!game.build(this.tool,this.point.x,this.point.z,this.facing))return false;
    if(!isTower(this.tool)&&this.tool!=='barracks')this.anchor={...this.point};
    this.point=null;return true;
  }
}
