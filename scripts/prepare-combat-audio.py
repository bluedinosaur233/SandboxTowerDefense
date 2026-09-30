"""Rebuild combat samples from the three credited archives (requires numpy, soundfile).
Usage: python prepare-combat-audio.py RPG_DIRECTORY BANG_DIRECTORY SPELL_DIRECTORY
Archives and source URLs are recorded in public/audio/sfx/CREDITS.md.
"""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import soundfile as sf

root = Path(__file__).resolve().parents[1] / 'public/audio/sfx'
packs = {
    'rpg': (Path(sys.argv[1]), 'rubberduck', '80 CC0 RPG SFX', 'CC0-1.0', 'https://opengameart.org/content/80-cc0-rpg-sfx'),
    'bang': (Path(sys.argv[2]), 'rubberduck', '25 CC0 bang / firework SFX', 'CC0-1.0', 'https://opengameart.org/content/25-cc0-bang-firework-sfx'),
    'spell': (Path(sys.argv[3]), "Iwan 'qubodup' Gabovitch", 'Ice and Electricity Magic', 'CC-BY-3.0', 'https://opengameart.org/content/ice-electricity-magic'),
}
# Explicit cuts are editorial: the electrical hit starts at the crack, not the charging swell.
clips = [
    ('rpg', 'spell_01.ogg', 'energy-cast', 0, .65),
    ('rpg', 'spell_02.ogg', 'energy-impact', 0, .6),
    ('rpg', 'spell_fire_06.ogg', 'flame-cast', 0, 1),
    ('rpg', 'spell_fire_04.ogg', 'flame-impact', .20, 1.1),
    ('rpg', 'spell_fire_07.ogg', 'energy-surge', .18, .48),
    ('rpg', 'spell_fire_05.ogg', 'flame-roar', 0, 1.2),
    ('rpg', 'blade_01.ogg', 'blade-cut', 0, .8),
    ('rpg', 'blade_02.ogg', 'blade-enchanted', 0, .8),
    ('rpg', 'metal_01.ogg', 'shield-block', 0, .8),
    ('bang', 'cannon_01.ogg', 'mortar-impact', 0, 1.2),
    ('bang', 'cannon_02.ogg', 'siege-impact', 0, 1.6),
    ('bang', 'cannon_04.ogg', 'shell-impact', 0, .95),
    ('bang', 'cannon_05.ogg', 'missile-impact', 0, .95),
    ('spell', 'qubodupElectricityDamage01.flac', 'electric-cast', 0, .7),
    ('spell', 'qubodupElectricityDamage02.flac', 'electric-crack', .30, .4),
    ('spell', 'qubodupIceDamage01.flac', 'ice-crack', 0, .85),
    ('spell', 'qubodupIceDamage02.flac', 'ice-crush', .07, .45),
    ('spell', 'qubodupIceDamage03c.flac', 'ice-wind', 0, .9),
    ('spell', 'qubodupIceDamage03d.flac', 'holy-breath', 0, 1.3),
]
manifest = json.loads((root / 'manifest.json').read_text())
for pack, original, name, offset, duration in clips:
    folder, author, title, license_id, source = packs[pack]
    path = folder / original
    data, rate = sf.read(path, always_2d=True)
    data = data.mean(axis=1)[round(offset*rate):]
    # Short FIR smooths harsh top-end without adding a long attack or musical overtones.
    data = np.convolve(data, np.array([1, 2, 3, 2, 1])/9, mode='same')
    w = max(1, round(rate*.002))
    envelope = np.array([np.max(np.abs(data[i:i+w])) for i in range(0,len(data),w)])
    onset = max(0, int(np.flatnonzero(envelope >= envelope.max()*.08)[0])*w-round(rate*.002))
    data = data[onset:onset+round(duration*rate)]
    data *= .72/max(.001, float(np.max(np.abs(data))))
    fade = min(round(rate*.025), len(data)//4)
    data[-fade:] *= np.linspace(1, 0, fade)
    data[:max(1,round(rate*.001))] *= np.linspace(0,1,max(1,round(rate*.001)))
    filename = name+'.wav'
    sf.write(root / filename, data, rate, subtype='PCM_16')
    entry = dict(file=filename, author=author, pack=title, original=original, license=license_id, source=source,
                 sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                 sha256=hashlib.sha256((root/filename).read_bytes()).hexdigest(),
                 processing=dict(mono=True, smoothing='5-tap FIR [1,2,3,2,1]/9', startSeconds=round(offset+onset/rate,6), durationSeconds=round(len(data)/rate,6), peak=.72, fadeOutSeconds=.025))
    manifest = [m for m in manifest if m['file'] != filename]+[entry]
    print(filename, entry['processing']['startSeconds'], entry['processing']['durationSeconds'])
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
