"""Crop six generated action icons and remove only connected white background."""
from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]
sheet=Image.open(root/'docs/art/context-actions.png').convert('RGB')
out=root/'public/art/ui/actions';out.mkdir(parents=True,exist_ok=True)
for i,name in enumerate(['upgrade','repair','details','rotate-left','rotate-right','sell']):
 x=(i%3)*sheet.width//3;y=(i//3)*sheet.height//2
 tile=sheet.crop((x,y,x+sheet.width//3,y+sheet.height//2))
 a=np.array(tile);bg=(a.min(2)>222)&((a.max(2).astype(int)-a.min(2))<22)
 h,w=bg.shape;seen=np.zeros((h,w),bool);q=deque([(0,x) for x in range(w)]+[(h-1,x) for x in range(w)]+[(y,0) for y in range(h)]+[(y,w-1) for y in range(h)])
 while q:
  y,x=q.popleft()
  if y<0 or y>=h or x<0 or x>=w or seen[y,x] or not bg[y,x]:continue
  seen[y,x]=True;q.extend([(y-1,x),(y+1,x),(y,x-1),(y,x+1)])
 rgba=Image.fromarray(np.dstack((a,np.where(seen,0,255).astype('uint8'))))
 rgba=rgba.crop(rgba.getbbox());rgba.thumbnail((144,144),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(160,160));canvas.alpha_composite(rgba,((160-rgba.width)//2,(160-rgba.height)//2));canvas.save(out/(name+'.webp'),quality=94)
