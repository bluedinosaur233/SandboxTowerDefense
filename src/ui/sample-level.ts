import type { SoundDefinition } from './sound-library';
interface Sample {sampleRate:number;length:number;numberOfChannels:number;getChannelData(channel:number):Float32Array}

/** Active 30 ms windows ignore leading silence/tails, unlike peak normalization.
 * Measure only the segment actually played. Keep each cue's artistic gain and
 * a per-voice peak ceiling; never stretch time or move a combat event. */
export function sampleLevel(buffer:Sample,offset:number,definition:SoundDefinition){
  const start=Math.min(buffer.length,Math.max(0,Math.floor(offset*buffer.sampleRate)));
  const end=Math.min(buffer.length,start+Math.floor((definition.duration??1.8)*buffer.sampleRate));
  const width=Math.max(1,Math.floor(buffer.sampleRate*.03)),energy:number[]=[];
  let peak=0;
  for(let at=start;at<end;at+=width){
    const stop=Math.min(end,at+width);let sum=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++){
      const data=buffer.getChannelData(ch);
      for(let i=at;i<stop;i++){sum+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));}
    }
    energy.push(sum/((stop-at)*buffer.numberOfChannels));
  }
  let highest=0;for(const e of energy)highest=Math.max(highest,e);
  if(highest<1e-10)return {rms:0,peak,correction:1};
  const active=energy.filter(e=>e>=Math.max(1e-10,highest*.01));
  const rms=Math.sqrt(active.reduce((a,e)=>a+e,0)/active.length);
  const correction=Math.min(8,Math.max(.1,.14/rms),.85/Math.max(1e-9,peak*definition.gain));
  return {rms,peak,correction};
}
