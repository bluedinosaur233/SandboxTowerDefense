/** Locate audible onset in 2 ms windows, leaving a tiny lead-in to avoid cutting transients. */
export function sampleOnset(buffer:{sampleRate:number;length:number;numberOfChannels:number;getChannelData(channel:number):Float32Array}):number{
  const window=Math.max(1,Math.floor(buffer.sampleRate*.002));
  const envelope=new Float32Array(Math.ceil(buffer.length/window));
  for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const data=buffer.getChannelData(channel);
    for(let i=0;i<data.length;i++)envelope[Math.floor(i/window)]=Math.max(envelope[Math.floor(i/window)],Math.abs(data[i]));
  }
  let peak=0;for(const value of envelope)peak=Math.max(peak,value);
  if(peak<.0001)return 0;
  const threshold=Math.max(.0001,peak*.035);
  const first=envelope.findIndex(value=>value>=threshold);
  return Math.max(0,(first-1)*window/buffer.sampleRate);
}
