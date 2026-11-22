# Převod obrázků Aegona z G do aplikace: python tools/aegon_export.py
# Zdroj outputs/aegon-predlohy/{póza}.(png|webp) 1254×1254 → images/dog/{póza}.webp
# - spodní linie všech snímků jedné sady na stejném místě (zepředu podle sit, z boku podle stand)
# - společný výřez sady (zepředu na výšku, z boku na šířku), stejné měřítko u obou sad
# - jednotný vnější obrys: původní obrys z G se odřízne a nakreslí se nový stejně silný; tenké části (špička ocasu) zůstanou původní
# Pak spustit node tools/obrazky.mjs (seznam obrázků) a doplnit nové soubory do ASSETS v sw.js.
import os
from PIL import Image, ImageFilter, ImageChops

SRC, OUT = 'outputs/aegon-predlohy/', 'images/dog/'
FRONT = ['sit', 'lookR', 'yawn1', 'yawn', 'scratch', 'scratch2', 'wag', 'sad', 'think', 'cone', 'pant', 'pant2', 'cold', 'shake', 'shake2', 'night', 'wave', 'trophy', 'search']
SIDE = ['stand', 'walk1', 'walk1b', 'walk2', 'walk2b', 'point', 'sniff', 'sniff2', 'joy', 'joy2', 'jump', 'lie', 'sleep', 'sleep2', 'run1', 'run2', 'offline', 'car1', 'car2']
SCALE = 330 / 840  # px výsledku na px zdroje (stejné pro obě sady → pes je stejně velký)
SETS = {  # base = spodní linie ve zdroji, box = výřez (vlevo, nahoře, vpravo, dole)
    'front': dict(names=FRONT, base=1169, box=(207, 100, 1047, 1180), noshift=[]),
    'side': dict(names=SIDE, base=1154, box=(20, 235, 1234, 1165), noshift=['jump', 'run1']),  # skok je schválně nad zemí
}
COL, R_CUT, R_RING = (62, 26, 12), 10, 9


def uniform_outline(im):
    a = im.getchannel('A')
    hard = a.point(lambda v: 255 if v > 128 else 0)
    core = hard.filter(ImageFilter.MinFilter(2 * R_CUT + 1))
    opened = core.filter(ImageFilter.MaxFilter(2 * R_CUT + 1))
    thin = ImageChops.subtract(hard, opened)  # části tenčí než ořez (ocas, drápky) – ponechat původní i s obrysem
    keep = ImageChops.lighter(core, thin).filter(ImageFilter.GaussianBlur(1))
    ring = core.filter(ImageFilter.MaxFilter(2 * R_RING + 1)).filter(ImageFilter.GaussianBlur(1))
    body = im.copy(); body.putalpha(ImageChops.multiply(a, keep))
    out = Image.new('RGBA', im.size, COL + (0,)); out.putalpha(ring); out.alpha_composite(body)
    return out


def src_path(n):
    for ext in ('.png', '.webp'):
        if os.path.exists(SRC + n + ext): return SRC + n + ext
    return None


for key, s in SETS.items():
    box = s['box']; size = (round((box[2] - box[0]) * SCALE), round((box[3] - box[1]) * SCALE))
    for n in s['names']:
        p = src_path(n)
        if not p: print('chybí', n); continue
        im = Image.open(p).convert('RGBA')
        bottom = im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()[3]
        dy = 0 if n in s['noshift'] else s['base'] - bottom
        im = uniform_outline(im)
        c = Image.new('RGBA', im.size, (0, 0, 0, 0)); c.paste(im, (0, dy), im)
        res = c.crop(box).resize(size, Image.LANCZOS)
        res.save(OUT + n + '.webp', 'WEBP', quality=86, method=6)
        print(key, n.ljust(9), 'posun', dy, size, os.path.getsize(OUT + n + '.webp'), 'B')

# portrét do profilu (kulatý výřez) – bez úprav obrysu, jen zmenšit
im = Image.open(SRC + 'portrait.png').convert('RGBA'); im.thumbnail((256, 256), Image.LANCZOS); im.save(OUT + 'portrait.webp', 'WEBP', quality=88, method=6); print('portrait', im.size)
# ikona aplikace (plné pozadí) – PNG pro plochu telefonu
ic = Image.open(SRC + 'icon.png').convert('RGB')
for name, size in (('icon-192', 192), ('icon-512', 512), ('icon-maskable-512', 512), ('apple-touch-icon', 180)):
    ic.resize((size, size), Image.LANCZOS).save('icons/' + name + '.png', optimize=True); print('ikona', name, size)
# ptáci: images/species/{druh}_{stádium}.webp (1 mládě, 2 dospělý, 3 mistr), čtverec 400 px
import glob, re
for f in sorted(glob.glob('outputs/zvirata-predlohy/*.png')):
    n = os.path.basename(f)[:-4]
    if not re.fullmatch(r'[a-z0-9]+_[1-9]', n): continue
    im = Image.open(f).convert('RGBA').resize((400, 400), Image.LANCZOS); im.save('images/species/' + n + '.webp', 'WEBP', quality=84, method=6)
print('ptáků', len(glob.glob('images/species/*.webp')))
