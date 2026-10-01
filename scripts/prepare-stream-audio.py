"""Build small AAC transport bundles without changing cue names, gain or timing.
Requires ffmpeg (FFMPEG env or PATH). Sources and their licenses stay untouched.
Run node --import tsx scripts/audio-stream-sources.ts first.
"""
from pathlib import Path
import os,json,subprocess,hashlib,shutil,sys
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parents[1]
ffmpeg=os.environ.get('FFMPEG') or shutil.which('ffmpeg')
if not ffmpeg: raise SystemExit('Set FFMPEG to an installed ffmpeg executable')
source=json.loads((root/'work/audio-stream/sources.json').read_text())
cache=root/'work/audio-stream/encoded';cache.mkdir(parents=True,exist_ok=True)
def encode(file):
 original=root/'public/audio'/ (file if file.startswith('licensed/') else 'sfx/'+file)
 if not original.exists():return None
 out=cache/(file.replace('/','-')+'.m4a')
 subprocess.run([ffmpeg,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(original),'-vn','-ac','1','-ar','32000','-c:a','aac','-b:a','64000','-movflags','+faststart',str(out)],check=True)
 return file,out.read_bytes()
with ThreadPoolExecutor(max_workers=4) as pool: encoded=dict(x for x in pool.map(encode,source['files']+source['licensed']) if x)
def bundle(files,folder,name):
 entries=[];data=bytearray()
 for file in files:
  if file not in encoded:continue
  clip=encoded[file];entries.append({'file':file,'offset':len(data),'length':len(clip)});data.extend(clip)
 digest=hashlib.sha256(data).hexdigest()[:12]
 folder.mkdir(parents=True,exist_ok=True);path=folder/(name+'-'+digest+'.bin');path.write_bytes(data)
 return {'url':'/'+str(path.relative_to(root/'public')),'bytes':len(data),'entries':entries}
ui=source['ui'];rest=[f for f in source['files'] if f not in ui]
# Common combat is delivered before voices and advanced branch effects.
common=['swing-1.wav','swing-2.wav','energy-cast.wav','energy-impact.wav','soft-hit.ogg','light-hit.ogg','sword.wav','cannon-fire.ogg','shell-impact.wav','ice-wind.wav','ice-crack.wav','electric-cast.wav','electric-crack.wav']
groups=[ui,[f for f in rest if f in common],[f for f in rest if f not in common]]
bundles=[bundle(files,root/'public/audio/stream',name) for files,name in zip(groups,['ui','combat','extra'])]
(root/'src/ui/audio-bundles.json').write_text(json.dumps({'version':1,'bundles':bundles},indent=2)+'\n')
packpath=root/'public/audio/licensed/pack.json'
if packpath.exists():
 pack=json.loads(packpath.read_text());pack['streamBundle']=bundle(source['licensed'],packpath.parent,'stream');packpath.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
original=sum((root/'public/audio/sfx'/f).stat().st_size for f in source['files'])
print(json.dumps({'originalSfxBytes':original,'bundledSfxBytes':sum(b['bytes'] for b in bundles),'groups':[{k:b[k] for k in ['url','bytes']}for b in bundles],'licensedBytes':pack.get('streamBundle',{}).get('bytes') if packpath.exists() else 0},indent=2))

# Optional rebuild from preserved source MP3s, never from already-lossy runtime copies.
if '--music' in sys.argv:
 manifest_path=root/'public/audio/music/manifest.json'
 manifest=json.loads(manifest_path.read_text())
 for track in manifest:
  original=root/'work/music-streaming/originals'/track['originalFile']
  if hashlib.sha256(original.read_bytes()).hexdigest()!=track['originalSha256']:
   raise SystemExit('Music source hash mismatch: '+str(original))
  out=root/'public/audio/music'/track['file']
  subprocess.run([ffmpeg,'-nostdin','-hide_banner','-loglevel','error','-y','-i',str(original),'-vn','-ac','2','-ar','32000','-c:a','aac','-b:a','64000','-movflags','+faststart',str(out)],check=True)
  track['sha256']=hashlib.sha256(out.read_bytes()).hexdigest()
  track['processing']='AAC-LC stereo, 64 kbps / 32 kHz, fast-start M4A for progressive public playback'
 manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
