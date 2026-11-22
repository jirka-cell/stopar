// Stádia zvířat v přírodě: v jakém stádiu se zvíře objeví (podle ročního období) a co v kterém stádiu jí.
// Mistr se v přírodě neobjeví – toho jde jen vypiplat. Kukla nejí (chytá se jen opatrným vyfocením).
import { stageNames } from './economy.js';

export const adultStage = (cfg, group) => (stageNames(cfg, group).length >= 4 ? 2 : 1);

// r = náhodné číslo 0–1 (stejné pro všechny hráče u stejného zvířete), month 1–12
export function wildStage(cfg, group, r, month) {
  const adult = adultStage(cfg, group);
  const season = month >= 4 && month <= 8 ? 1 : month === 3 || month === 9 || month === 10 ? 0.5 : 0.15; // mláďata hlavně na jaře a v létě
  if (r < 0.30 * season) return 0;
  if (adult === 2 && r < 0.50 * season) return 1;
  return adult;
}

export const isPupa = (cfg, sp, stage) => stage === 1 && stageNames(cfg, sp.group)[1] === 'kukla';

// Potrava podle stádia (stejný zápis jako sp.food: „hmyz:1, zrni:0.5“); '' = nejí
const GROUP_FOOD = {
  'Ptáci': ['hmyz:1, zizaly:0.5'],
  'Obojživelníci': ['rasy:1, rostliny:0.5', 'hmyz:1, drobotina:0.5'],
  'Ryby': ['drobotina:1, rasy:0.5', 'drobotina:1, hmyz:0.5'],
  'Hmyz': ['listi:1'],
  'Pavoukovci': ['hmyz:1'],
  'Ostatní': ['drobotina:1']
};
const STAGE_FOOD = { // výjimky od skupiny (index = stádium)
  holub: ['mleko:1'], datel: ['larvy:1, hmyz:0.5'], strakapoud: ['larvy:1, hmyz:0.5'],
  kachna: ['drobotina:1, hmyz:0.5'], labut: ['rostliny:1, drobotina:0.5'], lyska: ['drobotina:1, rostliny:0.5'], potapka: ['drobotina:1, ryba:0.5'], kormoran: ['ryba:1'],
  volavka: ['ryba:1, zaby:0.5'], cap: ['zaby:1, zizaly:0.5'], lednacek: ['ryba:1'],
  kane: ['hlodavec:1, maso:0.5'], postolka: ['hlodavec:1, hmyz:0.5'], krahujec: ['maso:1'], jestrab: ['maso:1'],
  pustik: ['hlodavec:1'], vyr: ['hlodavec:1, maso:0.5'], sycek: ['hmyz:1, hlodavec:0.5'],
  zvonek: ['zrni:1, hmyz:0.5'], stehlik: ['zrni:1, hmyz:0.5'], hyl: ['zrni:1, hmyz:0.5'], bazant: ['hmyz:1, zrni:0.5'],
  colek: ['drobotina:1'], mlok: ['drobotina:1'],
  stika: [null, 'ryba:1, drobotina:0.5'], sumec: [null, 'ryba:1, drobotina:0.5'], pstruh: [null, 'hmyz:1, drobotina:0.5'],
  babocka: ['listi:1'], otakarek: ['listi:1'], cmelak: ['nektar:1'], rohac: ['drevo:1'], chroust: ['korinky:1'], slunecko: ['hmyz:1'], vazka: ['drobotina:1'], mravenec: ['hmyz:1']
};
export function foodFor(cfg, sp, stage = adultStage(cfg, sp.group)) {
  if (stage >= adultStage(cfg, sp.group)) return sp.food;
  if (isPupa(cfg, sp, stage)) return '';
  const own = STAGE_FOOD[sp.id];
  if (own && own[stage] != null) return own[stage];
  const g = GROUP_FOOD[sp.group];
  return g && g[stage] != null ? g[stage] : sp.food; // savci, plazi, hlemýžď: mláďata jedí jako dospělí
}

// Stádia druhu, která hráč už zná: zaznamenaná v atlasu + prošlá u jeho zvířat (od chycení po dnešek)
export function knownStages(caught, animals, spId) {
  const s = new Set((caught && caught.stages) || []);
  for (const a of animals) if (a.sp === spId) for (let i = a.from || 0; i <= (a.stage || 0); i++) s.add(i);
  return s;
}
