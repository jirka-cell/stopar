# Převod obrázků zvířat z G do aplikace: python tools/zvirata_export.py, pak node tools/obrazky.mjs
# outputs/zvirata-predlohy/{druh}_{stádium}.png → images/species/{druh}_{stádium}.webp, čtverec 400 px
# Malé zvíře (pulec, plůdek) se zvětší, aby delší strana zabrala aspoň 60 % obrázku – jinak by v atlasu a na mapě skoro nebylo vidět
import glob, os, re
from PIL import Image
MIN = 0.6
n = 0
for f in sorted(glob.glob('outputs/zvirata-predlohy/*.png')):
    name = os.path.basename(f)[:-4]
    if not re.fullmatch(r'[a-z0-9]+_[1-9]', name): continue
    im = Image.open(f).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
    if bb:
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        if max(w, h) < MIN * im.width:
            k = MIN * im.width / max(w, h)
            obj = im.crop(bb).resize((round(w * k), round(h * k)), Image.LANCZOS)
            cx, base = (bb[0] + bb[2]) / 2, bb[3]  # zůstane na stejném místě dole uprostřed
            out = Image.new('RGBA', im.size, (0, 0, 0, 0))
            x = round(min(max(cx - obj.width / 2, 0), im.width - obj.width)); y = round(min(base, im.height) - obj.height)
            out.paste(obj, (x, max(0, y)), obj); im = out
    im.resize((400, 400), Image.LANCZOS).save('images/species/' + name + '.webp', 'WEBP', quality=84, method=6); n += 1
print('zvířat', n)
