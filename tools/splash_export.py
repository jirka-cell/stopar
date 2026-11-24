# Pozadí úvodní obrazovky: python -I tools/splash_export.py [složka se splash-NN-*.png]
# Výstup images/splash/NN.webp (600×900) a js/splash-data.js (období, noc, počasí, drsné, barva písma podle jasu oblohy)
import sys, glob, os, re, json
from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\adm\Documents\Codex\2026-11-22\p-ikl-d-m-dv-p\outputs\splash'
OUT = os.path.join(ROOT, 'images', 'splash')
J, L, P, Z = 'jaro', 'leto', 'podzim', 'zima'
# číslo: (období, noc, počasí, drsné) – podle zadání v outputs/G-zbyva/16-uvodni-obrazovky.txt
TAGS = {
    1: ([J], 0, [], 0), 2: ([L], 0, [], 0), 3: ([P], 0, [], 0), 4: ([Z], 0, [], 0), 5: ([J, L], 0, [], 0),
    6: ([J, L, P], 0, [], 0), 7: ([P], 0, [], 0), 8: ([J, L, P], 1, [], 0), 9: ([L], 0, [], 0), 10: ([L, P], 0, [], 0),
    11: ([J], 0, [], 0), 12: ([J], 0, [], 0), 13: ([P], 0, [], 0), 14: ([Z], 0, [], 0), 15: ([Z], 0, [], 0),
    16: ([Z], 0, [], 0), 17: ([Z], 0, ['cold'], 0), 18: ([J], 1, [], 0), 19: ([L], 1, [], 0), 20: ([P], 1, [], 0), 21: ([Z], 1, [], 0),
    22: ([J, L], 0, ['rain'], 0), 23: ([P], 0, ['rain'], 0), 24: ([L], 0, ['rain'], 0), 25: ([J, L], 0, ['cloudy'], 0),
    26: ([Z], 0, ['snow'], 0), 27: ([J, L, P, Z], 0, ['cloudy'], 0), 28: ([L], 0, ['hot'], 0), 29: ([J, L, P], 0, ['cloudy'], 0),
    30: ([J, L, P], 0, ['rain'], 1), 31: ([Z], 0, ['snow', 'cold'], 1), 32: ([P], 0, ['cloudy'], 1), 33: ([J, L, P], 1, ['rain'], 1),
    34: ([P, Z], 0, ['rain', 'cold'], 1), 35: ([J, P], 0, ['cloudy'], 1),
}
os.makedirs(OUT, exist_ok=True)
items = []
for f in sorted(glob.glob(os.path.join(SRC, 'splash-*.png'))):
    m = re.match(r'splash-(\d+)', os.path.basename(f)); n = int(m.group(1))
    if n not in TAGS: print('bez štítků, přeskočeno:', f); continue
    im = Image.open(f).convert('RGB').resize((600, 900), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{n:02d}.webp'), 'WEBP', quality=78, method=6)
    top = ImageStat.Stat(im.crop((60, 40, 540, 260)).convert('L')).mean[0]  # místo nápisu nahoře
    s, night, w, harsh = TAGS[n]
    items.append({'id': f'{n:02d}', 's': s, 'night': bool(night), 'w': w, 'harsh': bool(harsh), 'dark': top < 140})
assert len(items) == len(TAGS), f'chybí pozadí: {sorted(set(TAGS) - {int(i["id"]) for i in items})}'
with open(os.path.join(ROOT, 'js', 'splash-data.js'), 'w', encoding='utf-8') as fh:
    fh.write('// Vygenerováno: python -I tools/splash_export.py – neupravovat ručně\n// dark = tmavá obloha nahoře → bílé písmo\nexport const SPLASH = ' + json.dumps(items, ensure_ascii=False) + ';\n')
print('pozadí', len(items), 'tmavých', sum(i['dark'] for i in items), 'kB', round(sum(os.path.getsize(os.path.join(OUT, i['id'] + '.webp')) for i in items) / 1024))
