"""Rebuild runtime portraits from the reviewed XEM reference sheets (Pillow)."""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/art/refresh-2026-09'
for sheet, rows in {
    'towers-a': [('archer','archer-2','marksman','ranger'),('mage','mage-2','inferno','arcane'),('barracks','barracks-2','spellblade','paladin')],
    'towers-b': [('cannon','cannon-2','bombard','shrapnel'),('frost','frost-2','blizzard','glacier'),('tesla','tesla-2','tempest','judgment')],
}.items():
    im = Image.open(ART / (sheet+'.png')).convert('RGB')
    for row, names in enumerate(rows):
        for col, name in enumerate(names):
            tile = im.crop((col*384, round(row*1024/3), (col+1)*384, round((row+1)*1024/3)))
            out = Image.new('RGB', (384,384), tile.getpixel((4,4)))
            out.paste(tile, (0,(384-tile.height)//2))
            out.save(ROOT/'public/art/towers'/f'{name}.webp', quality=90)
im = Image.open(ART/'enemies.png').convert('RGB')
for i, name in enumerate(['goblin','runner','brute','ironclad','runeguard','marshling','hexer','gargoyle']):
    x,y=(i%4)*384,(i//4)*512
    # Keep ears, weapons, and full faces; use a portrait aspect ratio across the UI.
    im.crop((x,y,x+384,y+486)).save(ROOT/'public/art/enemies'/f'{name}.webp', quality=90)
