/** Stable binary min-heap for A*: avoids scanning thousands of frontier tiles. */
export class PathQueue {
  private entries:{id:number;priority:number;order:number}[]=[];
  private serial=0;
  get length(){return this.entries.length;}
  private before(a:{priority:number;order:number},b:{priority:number;order:number}){return a.priority<b.priority||(a.priority===b.priority&&a.order<b.order);}
  push(id:number,priority:number){
    const entry={id,priority,order:this.serial++};let i=this.entries.length;this.entries.push(entry);
    while(i){const p=(i-1)>>1;if(!this.before(entry,this.entries[p]))break;this.entries[i]=this.entries[p];i=p;}this.entries[i]=entry;
  }
  pop(){
    const first=this.entries[0],last=this.entries.pop()!;if(this.entries.length){let i=0;while(i*2+1<this.entries.length){let c=i*2+1;if(c+1<this.entries.length&&this.before(this.entries[c+1],this.entries[c]))c++;if(!this.before(this.entries[c],last))break;this.entries[i]=this.entries[c];i=c;}this.entries[i]=last;}return first.id;
  }
}
