"""Derive pixel-registered reward variants from one generated crystal master."""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
root=Path(__file__).resolve().parents[1];out=root/'public/art/ui/results'
source=Image.open(root/'docs/art/results/star-aligned-source.png').convert('RGB')
a=np.asarray(source,dtype=np.float32);r,g,b=np.moveaxis(a,-1,0)
# Green-screen removal; cyan crystal has blue >= green and remains opaque.
alpha=np.clip(1-(g-np.maximum(r,b))/50,0,1)
rgb=a.copy();rgb[:,:,1]=np.minimum(g,np.maximum(r,b)+5)
rgba=np.dstack((rgb,np.round(alpha*255))).astype(np.uint8)
master=Image.fromarray(rgba);bounds=master.getbbox();master=master.crop(bounds)
master.thumbnail((488,488),Image.Resampling.LANCZOS)
canvas=Image.new('RGBA',(512,512));canvas.paste(master,((512-master.width)//2,(512-master.height)//2))
pixels=np.asarray(canvas).copy();luma=(pixels[:,:,0]*.2126+pixels[:,:,1]*.7152+pixels[:,:,2]*.0722)/255
# Shared lighting, facets and exact alpha. Only pigment changes.
stops=np.array([0,.2,.4,.6,.8,1]);colors=np.array([[91,41,3],[169,91,5],[222,150,14],[255,197,47],[255,227,125],[255,253,230]])
gold=pixels.copy()
for c in range(3):gold[:,:,c]=np.interp(luma,stops,colors[:,c]).astype(np.uint8)
empty=pixels.copy();empty[:,:,:3]=[121,101,71]
for name,data in [('plated-star-v2',pixels),('gold-star-v2',gold),('empty-star-v2',empty)]:
 Image.fromarray(data).save(out/(name+'.webp'),lossless=True,method=6)
# Alignment is an asset invariant, including antialiased boundary pixels.
for name in ['gold-star-v2','empty-star-v2']:
 check=np.asarray(Image.open(out/(name+'.webp')).convert('RGBA'))
 assert np.array_equal(check[:,:,3],pixels[:,:,3]),name
preview=Image.new('RGB',(840,430),'#e9dab9');draw=ImageDraw.Draw(preview)
for i,(name,label) in enumerate([('gold-star-v2','GOLD'),('plated-star-v2','CRYSTAL')]):
 sprite=Image.open(out/(name+'.webp'));sprite.thumbnail((360,360),Image.Resampling.LANCZOS)
 preview.paste(sprite,(30+i*420,25),sprite);draw.text((180+i*420,395),label,fill='#55442b')
preview.save(root/'docs/art/results/stars-aligned-preview.png')
print('512 x 512 variants: identical alpha masks, bounds and facet locations')
