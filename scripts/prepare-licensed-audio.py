"""Prepare personally downloaded Mixkit/Pixabay assets; never fetch or publish originals.

Usage: python3 scripts/prepare-licensed-audio.py [source-directory]
Requires numpy and soundfile. Source filenames and hashes are in docs/audio/licensed-pack.json.
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
sources_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'work/audio-sources'
recipe = json.loads((ROOT / 'docs/audio/licensed-pack.json').read_text())
output = ROOT / 'public/audio/licensed'
decoded = {}
for key, source in recipe['sources'].items():
    path = sources_dir / source['file']
    if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
        raise SystemExit(f'Source hash mismatch: {path}')
    data, rate = sf.read(path, always_2d=True)
    decoded[key] = (data.mean(axis=1), rate)

def render_fragment(clip):
    data, rate = decoded[clip['source']]
    data = data[round(clip['start'] * rate):round((clip['start'] + clip['duration']) * rate)].copy()
    # Smooth low-pass removes piercing upper harmonics without a ringing cutoff.
    frequencies = np.fft.rfftfreq(len(data), 1 / rate)
    response = 1 / np.sqrt(1 + (frequencies / clip['lowpassHz']) ** 8)
    if clip.get('highpassHz'):
        response *= (frequencies / np.sqrt(frequencies ** 2 + clip['highpassHz'] ** 2)) ** 2
    data = np.fft.irfft(np.fft.rfft(data) * response, n=len(data))
    target_rate = 32000
    frames = round(len(data) / rate / clip['rate'] * target_rate)
    data = np.interp(np.arange(frames) * rate * clip['rate'] / target_rate, np.arange(len(data)), data)
    data -= data.mean()
    peak = float(np.max(np.abs(data)))
    if peak < 1e-5:
        raise SystemExit(f'Empty clip: {clip["id"]}')
    data *= .72 / peak
    return data


output.mkdir(parents=True, exist_ok=True)
manifest = []
target_rate = 32000
for clip in recipe['clips']:
    data = render_fragment(clip)
    for layer in clip.get('layers', []):
        added = render_fragment(layer) * layer['gain']
        offset = round(layer.get('offset', 0) * target_rate)
        data = np.pad(data, (0, max(0, offset + len(added) - len(data))))
        data[offset:offset + len(added)] += added
    if clip.get('layers'):
        data *= .72 / np.max(np.abs(data))
    # A short attack preserves contact timing; longer tail fade avoids hard cuts.
    attack = round(target_rate * clip.get('attackSeconds', .001))
    tail = min(round(target_rate * .06), len(data) // 3)
    data[:attack] *= np.linspace(0, 1, attack)
    data[-tail:] *= np.linspace(1, 0, tail)
    path = output / (clip['id'] + '.wav')
    sf.write(path, data, target_rate, subtype='PCM_16')
    manifest.append({'file': path.name, 'source': clip['source'], 'duration': len(data) / target_rate,
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})

(output / 'pack.json').write_text(json.dumps({'version': 1, 'files': manifest}, indent=2) + '\n')
print(f'Prepared {len(manifest)} local licensed clips in {output}')
