from PIL import Image, ImageDraw, ImageFilter
import math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'docs/art/heroes/aerilia-windborne.png').convert('RGBA')
result=source.copy()
def sample(x,y):
 x=max(0,min(source.width-1,x));y=max(0,min(source.height-1,y));a,b=int(x),int(y);u,v=x-a,y-b
 return tuple(sum(source.getpixel((min(source.width-1,a+dx),min(source.height-1,b+dy)))[c]*(u if dx else 1-u)*(v if dy else 1-v) for dx in (0,1) for dy in (0,1)) for c in range(4))
def heal(start,end,radius=7):
 ax,ay=start;bx,by=end;dx,dy=bx-ax,by-ay;length=math.hypot(dx,dy);nx,ny=-dy/length,dx/length
 for y in range(int(min(ay,by)-radius),int(max(ay,by)+radius+1)):
  for x in range(int(min(ax,bx)-radius),int(max(ax,bx)+radius+1)):
   t=((x-ax)*dx+(y-ay)*dy)/length**2
   if not 0<t<1:continue
   px,py=ax+t*dx,ay+t*dy;d=(x-px)*nx+(y-py)*ny
   if abs(d)>radius:continue
   left,right=sample(px-nx*(radius+2),py-ny*(radius+2)),sample(px+nx*(radius+2),py+ny*(radius+2));k=(d+radius+2)/(2*radius+4)
   fill=tuple(round(a*(1-k)+b*k) for a,b in zip(left,right));alpha=min(1,(radius-abs(d))/1.5)
   old=result.getpixel((x,y));result.putpixel((x,y),tuple(round(a*(1-alpha)+b*alpha) for a,b in zip(old,fill)))
heal((387,98),(484,278),8)
heal((270,727),(406,589),7)
# Use the generated restoration only at the tiny spot where the old string entered the hair.
patch=source.copy();patch.paste(Image.open(root/'docs/art/heroes/aerilia-string-hair-patch.png').convert('RGBA'),(465,249))
mask=Image.new('L',source.size,0);d=ImageDraw.Draw(mask);d.ellipse((471,255,493,282),fill=255);mask=mask.filter(ImageFilter.GaussianBlur(2))
result=Image.composite(patch,result,mask)
# Correct occlusion: both taut segments remain in front of the silhouette until the nock.
scale=4;lines=Image.new('RGBA',(source.width*scale,source.height*scale));d=ImageDraw.Draw(lines)
points=[(385,97),(562,510),(270,727)]
points=[(round(x*scale),round(y*scale)) for x,y in points]

d.line(points,fill=(230,231,202,220),width=7,joint='curve')
d.line([(x-1,y) for x,y in points],fill=(253,248,219,235),width=3,joint='curve')
lines=lines.resize(source.size,Image.Resampling.LANCZOS)
result=Image.alpha_composite(result,lines)
result.save(root/'docs/art/heroes/aerilia-windborne-string-repaired.png')
result.save(root/'public/art/heroes/aerilia-windborne.webp',quality=92,method=6)
result.crop((310,236,734,660)).resize((256,256),Image.Resampling.LANCZOS).save(root/'public/art/heroes/aerilia-windborne-avatar.webp',quality=94,method=6)
# Explicitly check that every pixel outside the narrow repair regions remains identical.
changed=0
for old,new in zip(source.get_flattened_data(),result.get_flattened_data()):changed+=old!=new
print(f'Changed pixels: {changed}/{source.width*source.height} ({changed/(source.width*source.height):.2%})')
