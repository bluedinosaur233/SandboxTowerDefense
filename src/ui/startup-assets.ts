/** Retain successful work across retries, bound concurrency and report every failure. */
export class StartupAssets {
  readonly images=new Map<string,HTMLImageElement>();
  async load(urls:readonly string[],progress:(done:number,total:number)=>void){
    const pending=urls.filter(url=>!this.images.has(url)),failures:string[]=[];
    progress(this.images.size,urls.length);
    await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{
      while(pending.length){
        const url=pending.shift()!;
        const img=new Image();
        try{
          await new Promise<void>((resolve,reject)=>{
            const timeout=setTimeout(()=>{img.src='';reject(new Error('图片加载超时'));},60000);
            img.onload=()=>{clearTimeout(timeout);resolve();};
            img.onerror=()=>{clearTimeout(timeout);reject(new Error('图片加载失败'));};
            img.src=url;
          });
          await img.decode();this.images.set(url,img);
        }catch{failures.push(url);}
        progress(this.images.size,urls.length);
      }
    }));
    if(failures.length)throw new Error(`${failures.length} 张图片未能加载，请检查网络后重试。`);
  }
}
