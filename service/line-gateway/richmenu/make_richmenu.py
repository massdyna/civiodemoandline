from PIL import Image, ImageDraw, ImageFont
W,H=2500,1686
FOREST=(22,59,45); TILE=(33,75,57); LIME=(217,239,121); SOFT=(169,196,179); WHITE=(255,254,250)
f_big=ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma-Bold.otf',104)
f_small=ImageFont.truetype('/usr/share/fonts/opentype/tlwg/Loma.otf',52)
img=Image.new('RGB',(W,H),FOREST); d=ImageDraw.Draw(img)
tiles=[('เช็กประกัน','WARRANTY'),('แจ้งซ่อม','REPAIR'),('ติดตามงาน','TRACK'),('นัดตรวจเช็ก','INSPECTION'),('สินค้า/บริการ','PRODUCTS'),('ติดต่อเรา','CONTACT')]
cw,ch=833,843; gap=14
def icon(i,cx,cy):
    s=LIME; w=18
    if i==0:   # shield + check
        d.polygon([(cx-110,cy-120),(cx,cy-160),(cx+110,cy-120),(cx+110,cy+10),(cx,cy+130),(cx-110,cy+10)],outline=s,width=w)
        d.line([(cx-50,cy-5),(cx-10,cy+40),(cx+60,cy-50)],fill=s,width=w,joint='curve')
    elif i==1: # wrench
        d.line([(cx-100,cy+110),(cx+50,cy-40)],fill=s,width=34)
        d.ellipse([cx+10,cy-150,cx+130,cy-30],outline=s,width=w)
        d.rectangle([cx+60,cy-165,cx+100,cy-110],fill=TILE)
    elif i==2: # clipboard
        d.rounded_rectangle([cx-100,cy-130,cx+100,cy+140],24,outline=s,width=w)
        d.rounded_rectangle([cx-45,cy-160,cx+45,cy-105],14,fill=s)
        for k in range(3): d.line([(cx-55,cy-40+k*55),(cx+55,cy-40+k*55)],fill=s,width=14)
    elif i==3: # calendar
        d.rounded_rectangle([cx-120,cy-110,cx+120,cy+130],24,outline=s,width=w)
        d.rectangle([cx-120,cy-110,cx+120,cy-50],fill=s)
        d.line([(cx-60,cy-140),(cx-60,cy-90)],fill=s,width=w); d.line([(cx+60,cy-140),(cx+60,cy-90)],fill=s,width=w)
        for r in range(2):
            for c in range(3): d.ellipse([cx-75+c*60,cy-10+r*55,cx-45+c*60,cy+20+r*55],fill=s)
    elif i==4: # sprout
        d.line([(cx,cy+140),(cx,cy-20)],fill=s,width=w)
        d.ellipse([cx-130,cy-110,cx-5,cy+10],outline=s,width=w); d.ellipse([cx+5,cy-150,cx+130,cy-30],outline=s,width=w)
        d.line([(cx-70,cy+140),(cx+70,cy+140)],fill=s,width=w)
    else:      # phone
        d.rounded_rectangle([cx-80,cy-150,cx+80,cy+150],30,outline=s,width=w)
        d.line([(cx-25,cy+105),(cx+25,cy+105)],fill=s,width=14); d.line([(cx-25,cy-110),(cx+25,cy-110)],fill=s,width=10)
for i,(th,en) in enumerate(tiles):
    c,r=i%3,i//3
    x0=c*cw+gap; y0=r*ch+gap; x1=(c+1)*cw-gap if c<2 else W-gap; y1=(r+1)*ch-gap
    d.rounded_rectangle([x0,y0,x1,y1],70,fill=TILE)
    cx=(x0+x1)//2
    icon(i,cx,y0+310)
    for txt,font,col,yy in ((th,f_big,WHITE,y0+520),(en,f_small,SOFT,y0+660)):
        bw=d.textlength(txt,font=font); d.text((cx-bw/2,yy),txt,font=font,fill=col)
img.save('richmenu.png',optimize=True)
print(img.size)
