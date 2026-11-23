# Ikony z G: outputs/ikony-predlohy/<název>.png → icons/ui/<název>.webp (oříznout průhledný okraj, čtverec 96 px)
# python -I tools/ikony_export.py [názvy…]   (bez názvů převede všechny; duplikáty se zkopírují podle DUP)
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, DST, SIZE = ROOT / 'outputs' / 'ikony-predlohy', ROOT / 'icons' / 'ui', 96
DUP = {'t_meadow': 'bio_louka', 't_field': 'bio_pole', 't_forest': 'bio_les'}  # stejný obrázek pod dvěma názvy


def convert(src, name):
    im = Image.open(src).convert('RGBA')
    bb = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()  # slabý průsvitný závoj z G nepočítat
    im = im.crop(bb)
    side = max(im.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    sq.resize((SIZE, SIZE), Image.LANCZOS).save(DST / f'{name}.webp', 'WEBP', quality=88, method=6)


DST.mkdir(parents=True, exist_ok=True)
names = sys.argv[1:] or sorted(p.stem for p in SRC.glob('*.png') if not p.stem.startswith('test-'))
for n in names:
    convert(SRC / f'{n}.png', n)
for n, src in DUP.items():
    if (SRC / f'{src}.png').exists() and (not sys.argv[1:] or src in names):
        convert(SRC / f'{src}.png', n)
print('ikon', len(list(DST.glob('*.webp'))))
