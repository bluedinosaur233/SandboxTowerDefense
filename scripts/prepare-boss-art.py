"""Extract the generated Grom frame; protect interior metal and tusk highlights."""
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
image=Image.open(root/'docs/art/boss-hud/grom-reference.png').convert('RGB')
a=np.array(image); low=a.min(2); spread=a.max(2).astype(int)-low
background=(low>200)&(spread<27)
h,w=background.shape; seen=np.zeros((h,w),bool); queue=deque()
for x in range(w):queue.extend([(0,x),(h-1,x)])
for y in range(h):queue.extend([(y,0),(y,w-1)])
while queue:
 y,x=queue.popleft()
 if y<0 or y>=h or x<0 or x>=w or seen[y,x] or not background[y,x]:continue
 seen[y,x]=True;queue.extend([(y-1,x),(y+1,x),(y,x-1),(y,x+1)])
alpha=np.where(seen,0,255).astype('uint8')
rgba=Image.fromarray(np.dstack((a,alpha))).crop((0,152,1536,792))
rgba=rgba.resize((1200,360),Image.Resampling.LANCZOS)
# Remove the central crown while keeping the horizontal frame rail intact.
rgba.paste((0,0,0,0),(488,0,712,137))
# Trim the empty top margin. HUD slots use this fixed 1200 x 282 canvas.
rgba=rgba.crop((0,78,1200,360))
out=root/'public/art/ui/boss';out.mkdir(parents=True,exist_ok=True)
rgba.save(out/'grom-frame.webp',quality=92,method=6)
print(out/'grom-frame.webp')

# Ignore invisible color/glow when finding the actual lettering bounds.
title=Image.open(root/'docs/art/boss-hud/grom-title-readable.png').convert('RGBA')
ink=np.asarray(title)[:,:,3]>200
bounds=Image.fromarray(ink.astype('uint8')*255).getbbox()
if bounds:
 x0,y0,x1,y1=bounds
 title=title.crop((max(0,x0-4),max(0,y0-4),min(title.width,x1+4),min(title.height,y1+4)))
 title.thumbnail((900,200),Image.Resampling.LANCZOS)
 title.save(out/'grom-title-readable.webp',quality=95,method=6)
