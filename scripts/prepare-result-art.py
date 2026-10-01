"""Extract generated result frames and the user's selected crystal star."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
root=Path(__file__).resolve().parents[1];out=root/'public/art/ui/results';out.mkdir(parents=True,exist_ok=True)
im=Image.open(root/'docs/art/results/frames.png').convert('RGBA')
for name,region in [('victory-frame',(0,0,768,980)),('defeat-frame',(768,0,1536,980))]:
 frame=im.crop(region);a=np.array(frame);r,g,b=[a[:,:,i].astype(float) for i in range(3)]
 magenta=(r-g>70)&(b-g>60)&(r>120)&(b>100)
 a[:,:,3]=np.where(magenta,0,255)
 # Suppress chroma spill on antialiased outside edges.
 a[:,:,0]=np.where(magenta,0,a[:,:,0]);a[:,:,2]=np.where(magenta,0,a[:,:,2])
 frame=Image.fromarray(a);bounds=frame.getbbox();frame=frame.crop(bounds)
 frame.save(out/(name+'.webp'),quality=92,method=6)
star=Image.open(root/'docs/art/results/plated-star-reference.png').convert('RGBA')
# Trace the supplied star, retaining its exact facets and color rather than redrawing it.
points=[(59,7),(71,39),(108,48),(81,71),(84,109),(57,89),(26,107),(33,72),(8,46),(44,39)]
mask=Image.new('L',(448,480));ImageDraw.Draw(mask).polygon([(x*4,y*4)for x,y in points],fill=255)
mask=mask.resize(star.size,Image.Resampling.LANCZOS);star.putalpha(mask)
star.crop((5,4,111,113)).save(out/'plated-star.webp',lossless=True,method=6)
