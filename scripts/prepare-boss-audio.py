"""Prepare the optional Mixkit Grom cries with the same recorded recipe as the full pack."""
from pathlib import Path
import json,hashlib,wave
import numpy as np
root=Path(__file__).resolve().parents[1]
source=root/'work/audio-sources/mixkit-1972.wav'
with wave.open(str(source)) as f:
 rate=f.getframerate();channels=f.getnchannels();assert f.getsampwidth()==2
 data=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').reshape(-1,channels).mean(axis=1)/32768
recipePath=root/'docs/audio/licensed-pack.json';recipe=json.loads(recipePath.read_text())
recipe['sources']['mixkit-1972']={'file':source.name,'title':'Giant monster roar','author':'Mixkit','source':'https://mixkit.co/free-sound-effects/monster/','download':'https://assets.mixkit.co/active_storage/sfx/1972/1972.wav','license':'Mixkit Sound Effects Free License','licenseUrl':'https://mixkit.co/license/#sfxFree','sha256':hashlib.sha256(source.read_bytes()).hexdigest()}
clips=[{'id':'grom-warcry','source':'mixkit-1972','start':.065,'duration':2.35,'rate':.9,'lowpassHz':4200,'highpassHz':65,'attackSeconds':.002},{'id':'grom-rage','source':'mixkit-1972','start':.14,'duration':2.1,'rate':.97,'lowpassHz':5000,'highpassHz':70,'attackSeconds':.002}]
recipe['clips']=[c for c in recipe['clips'] if c['id'] not in [v['id'] for v in clips]]+clips
recipePath.write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n')
packPath=root/'public/audio/licensed/pack.json';pack=json.loads(packPath.read_text())
for clip in clips:
 d=data[round(clip['start']*rate):round((clip['start']+clip['duration'])*rate)].copy()
 freq=np.fft.rfftfreq(len(d),1/rate);response=1/np.sqrt(1+(freq/clip['lowpassHz'])**8);response*=(freq/np.sqrt(freq**2+clip['highpassHz']**2))**2
 d=np.fft.irfft(np.fft.rfft(d)*response,n=len(d));d=np.interp(np.arange(round(len(d)/rate/clip['rate']*32000))*rate*clip['rate']/32000,np.arange(len(d)),d)
 d-=d.mean();d*=.72/abs(d).max();attack=round(32000*clip['attackSeconds']);tail=round(32000*.06);d[:attack]*=np.linspace(0,1,attack);d[-tail:]*=np.linspace(1,0,tail)
 path=packPath.parent/(clip['id']+'.wav')
 with wave.open(str(path),'wb') as f:f.setparams((1,2,32000,0,'NONE','not compressed'));f.writeframes((d*32767).astype('<i2').tobytes())
 pack['files']=[x for x in pack['files'] if x['file']!=path.name]+[{'file':path.name,'source':'mixkit-1972','duration':len(d)/32000,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}]
packPath.write_text(json.dumps(pack,indent=2)+'\n')
print('Prepared two boss war cries')
