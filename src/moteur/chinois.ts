// Horoscope chinois du jour : même règle que le site (assets/js/chinois_jour.js) — pilier du jour (tige + branche, cycle de
// soixante), rapport entre l'animal du jour et l'animal de naissance, entre l'élément du jour et l'élément fixe de l'animal.
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
/** élément fixe de chaque animal : Bois 0, Feu 1, Terre 2, Métal 3, Eau 4 */
export const ELEM_ANIMAL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

export function jdn(dt: Date): number {
  const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export type Pilier = { idx: number; tige: number; branche: number; element: number; yang: boolean };
export function pilier(dt: Date): Pilier {
  const idx = ((jdn(dt) + 49) % 60 + 60) % 60;
  return { idx, tige: idx % 10, branche: idx % 12, element: Math.floor((idx % 10) / 2), yang: idx % 2 === 0 };
}
export type Relation = 'meme' | 'chong' | 'liuhe' | 'sanhe' | 'hai' | 'xing' | 'neutre';
export function relation(jour: number, natal: number): Relation {
  if (jour === natal) return 'meme';
  const d = ((jour - natal) % 12 + 12) % 12, s = (jour + natal) % 12;
  if (d === 6) return 'chong';
  if (s === 1) return 'liuhe';
  if (d === 4 || d === 8) return 'sanhe';
  if (s === 7) return 'hai';
  const xing = [[0, 3], [2, 5], [2, 8], [5, 8], [1, 7], [1, 10], [7, 10]];
  for (const [a, b] of xing) if ((a === jour && b === natal) || (b === jour && a === natal)) return 'xing';
  return 'neutre';
}
export type RelElem = 'meme' | 'nourrit' | 'depense' | 'pression' | 'maitrise';
export function elemRel(jour: number, natal: number): RelElem {
  if (jour === natal) return 'meme';
  if ((jour + 1) % 5 === natal) return 'nourrit';
  if ((natal + 1) % 5 === jour) return 'depense';
  if ((jour + 2) % 5 === natal) return 'pression';
  return 'maitrise';
}
export function annees(animal: number, ref: number): number[] {
  const out: number[] = [];
  for (let y = ref - 90; y <= ref; y++) if (((y - 4) % 12 + 12) % 12 === animal) out.push(y);
  return out.slice(-7);
}

export type TextesChinois = {
  entete: string; animaux: string[]; elements: string[]; yang: string; yin: string; annees: string;
  rel: Record<Relation, string>; elem: Record<RelElem, string>; conseils: string[];
} & Record<string, unknown>;

/** L'en-tête du jour et, pour un animal, le texte du jour et le conseil. */
export function chinoisDuJour(T: TextesChinois, animal: number, quand: Date = new Date()) {
  const p = pilier(quand);
  const entete = T.entete.replace('%1', T.animaux[p.branche]).replace('%2', T.elements[p.element])
    .replace('%3', (p.yang ? T.yang : T.yin) + ', ' + STEMS[p.tige] + BRANCHES[p.branche]).replace('%4', String(p.idx + 1));
  const texte = [T.rel[relation(p.branche, animal)], T.elem[elemRel(p.element, ELEM_ANIMAL[animal])]].join(' ');
  const conseil = T.conseils[(p.idx + animal * 5) % T.conseils.length];
  return { pilier: p, entete, texte, conseil, annees: annees(animal, quand.getFullYear()) };
}
