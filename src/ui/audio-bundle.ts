export interface AudioBundle {url:string;bytes:number;entries:{file:string;offset:number;length:number}[]}
/** Optional packs can only advertise bounded slices of their own local transport. */
export function licensedBundle(value:unknown,allowed:readonly string[]):AudioBundle|null {
  if(!value||typeof value!=='object')return null;
  const b=value as AudioBundle;
  if(typeof b.url!=='string'||!/^\/audio\/licensed\/stream-[a-f0-9]{12}\.bin$/.test(b.url)||!Number.isSafeInteger(b.bytes)||b.bytes<=0||b.bytes>8_000_000||!Array.isArray(b.entries))return null;
  const files=new Set(allowed),seen=new Set<string>();
  for(const e of b.entries){if(!e||!files.has(e.file)||seen.has(e.file)||!Number.isSafeInteger(e.offset)||!Number.isSafeInteger(e.length)||e.offset<0||e.length<1||e.offset+e.length>b.bytes)return null;seen.add(e.file);}
  return b;
}
