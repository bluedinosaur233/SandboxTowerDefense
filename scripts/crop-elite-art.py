"""Crop the four generated elite/boss portraits from their preserved reference sheet."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
image = Image.open(root / 'docs/art/elite-vanguard/reference.png')
for column, kind in enumerate(('alpha', 'bulwark', 'runecolossus', 'grom')):
    icon = image.crop((column * 384 + 6, 571, (column + 1) * 384 - 8, 1024))
    icon.resize((384, 486), Image.Resampling.LANCZOS).save(root / f'public/art/enemies/{kind}.webp', quality=91)
