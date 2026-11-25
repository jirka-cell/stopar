# Vygeneruje js/species-fixes.js z tabulky outputs/zvirata-prehled.xlsx:
# červené buňky (chyba, „nový  [v aplikaci: starý]“) a zelené (ověřeno s pramenem), které se liší od aplikace.
# Žluté, oranžové, modré a nepodbarvené buňky se nepřenášejí (čekají na odborníka).
import openpyxl, sys, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
MAP = {'Český název': 'name', 'Latinský název': 'lat', 'Zajímavost (karta)': 'fact', 'Třída': 'edu.cls', 'Řád': 'edu.order', 'Čeleď': 'edu.family', 'Rod': 'edu.genus', 'Jiná jména': 'edu.names', 'Délka': 'edu.length', 'Rozpětí': 'edu.span', 'Hmotnost': 'edu.weight', 'Samec': 'edu.male', 'Samice': 'edu.female', 'Mládě': 'edu.young', 'Podobné druhy': 'edu.similar', 'Hlas': 'edu.voice', 'Místo hnízdění / rozmnožování': 'edu.breedPlace', 'Doba rozmnožování': 'edu.breedTime', 'Potomci': 'edu.offspring', 'Vývoj': 'edu.development', 'Péče o mláďata': 'edu.care', 'Potrava podrobně': 'edu.diet', 'Chování': 'edu.behavior', 'Tah / zimování': 'edu.migration', 'Stopy a pobytová znamení': 'edu.signs', 'Ochrana (zákon)': 'edu.protection', 'Červený seznam ČR / IUCN': 'edu.redlist', 'Jak pomoci': 'edu.help', 'Další zajímavosti': 'edu.facts'}
OK = {'C6EFCE': 'overeno', 'FF9999': 'chyba'}
root = sys.argv[1] if len(sys.argv) > 1 else '.'
open(root + '/js/species-fixes.js', 'w', encoding='utf-8').write('export const SPECIES_FIXES = {};' + chr(10))  # porovnávat s daty bez oprav
app = json.loads(subprocess.run(['node', '-e', "import('./js/config.js').then(({DEFAULTS})=>process.stdout.write(JSON.stringify(Object.fromEntries(DEFAULTS.species.map(s=>[s.id,{name:s.name,lat:s.lat,fact:s.fact,edu:s.edu}])))))"], capture_output=True, text=True, encoding='utf-8', cwd=root).stdout)
ws = openpyxl.load_workbook(root + '/outputs/zvirata-prehled.xlsx')['Zvířata']
hdr = [c.value for c in ws[1]]; ix = {h: i for i, h in enumerate(hdr)}
fixes = {}; n = 0
for row in ws.iter_rows(min_row=2):
    sid = row[ix['id v aplikaci']].value
    if not sid or sid not in app: continue
    for h, f in MAP.items():
        c = row[ix[h]]
        if c.value is None or not (c.fill and c.fill.fill_type): continue
        kind = OK.get(str(c.fill.fgColor.rgb)[-6:])
        if not kind: continue
        new = str(c.value).split('  [v aplikaci:')[0].strip()
        cur = app[sid]
        for k in f.split('.'): cur = (cur or {}).get(k, '')
        cur = str(cur or '').strip()
        if new == cur: continue
        if f == 'edu.protection' and not cur and new.startswith('není zvláště chráněný') and ';' not in new: continue  # neuvádět „není chráněný“ tam, kde karta nic neříká
        tgt = fixes.setdefault(sid, {})
        if f.startswith('edu.'): tgt.setdefault('edu', {})[f[4:]] = new
        else: tgt[f] = new
        n += 1
# ruční upřesnění (tabulka se kvůli obrázkům neukládá přes openpyxl)
MANUAL = {'kapr': {'edu': {'redlist': 'ČR 2017: RE – vymizelý, platí jen pro divokou formu (sazana); chovný kapr ohrožený není; IUCN: málo dotčený (LC)'}}}
for sid, f in MANUAL.items():
    t = fixes.setdefault(sid, {}); t.setdefault('edu', {}).update(f.get('edu', {}))
out = '// Opravy údajů o druzích z odborně doložené tabulky outputs/zvirata-prehled.xlsx (vygenerováno: python -I tools/opravy_druhu.py)\n'
out += '// Červené buňky = nalezené chyby, zelené = ověřené pramenem. Ostatní údaje čekají na odborníka.\n'
out += 'export const SPECIES_FIXES = ' + json.dumps(fixes, ensure_ascii=False, indent=1) + ';\n'
open(root + '/js/species-fixes.js', 'w', encoding='utf-8').write(out)
print('druhů', len(fixes), 'oprav', n)
