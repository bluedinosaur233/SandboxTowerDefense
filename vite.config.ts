import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Use the same public-art inventory for local development and shared builds.
function images(dir:string,base='/art'):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=join(dir,entry.name),url=base+'/'+entry.name;
    return entry.isDirectory()?images(path,url):/\.(png|webp|jpe?g|svg|gif)$/i.test(entry.name)?[url]:[];
  }).sort();
}
export default defineConfig({plugins:[{
  name:'startup-art-inventory',
  resolveId(id){if(id==='virtual:startup-images')return '\0'+id;},
  load(id){if(id==='\0virtual:startup-images')return 'export default '+JSON.stringify(images(join(process.cwd(),'public/art')));},
}]});
