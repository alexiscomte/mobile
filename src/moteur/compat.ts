// Test de compatibilité amoureuse : même règle et mêmes textes que le site (assets/js/compat.js, blocs #compat-txt / #compat-ny),
// sept lectures : zodiaque, signes chinois, (védique si textes), biorythmes, prénoms, chemin de vie, différence d'âge, FLAMES.
// Chaque lecture rend une section structurée (titre, intro, lignes, verdict, jauge, caveat) ; l'écran les affiche.
import type { Langue } from '../i18n';
import { ASTRO } from './astro';
import compatTxt from './compat_txt.json';
import ui from './ui.json';

type Verdict3 = [string, string, number];
export type Textes = {
  zod: { titre: string; intro: string; aspects: Record<string, Verdict3>; elem_rel: Record<string, string>; elements: string[]; elements_art: string[]; modes: string[]; noms: string[]; profils: string[]; signe_de: string; caveat: string; lien: string };
  chin: { titre: string; intro: string; verdicts: Record<string, Verdict3>; elem_rel: Record<string, string>; elements: string[]; elements_art: string[]; animaux: string[]; profils: string[]; signe_de: string; caveat: string; lien: string };
  bio: { titre: string; intro: string; phys: string; emo: string; intel: string; bilans: [number, string, string][]; ecart: string; caveat: string; lien: string };
  nom: { titre: string; intro: string; de: string; verdicts: Record<string, Verdict3>; familles: Record<string, string>; nombres: Record<string, string>; maitres: Record<string, string>; caveat: string; lien: string };
  vie: { titre: string; intro: string; de: string; caveat: string; lien: string };
  age: { titre: string; intro: string; meme_jour: string; bandes: [number, string][]; caveat: string; lien: string };
  flames: { titre: string; intro: string; restent: string; resultats: Record<string, string>; caveat: string };
  ved?: { titre: string; intro: string; lune_de: string; kutas: string[]; bilans: [number, string][]; total: string; sans_heure: string; caveat: string; lien: string };
  ui: Record<string, string>;
  fin: { titre: string; texte: string; liens: [string, string][] };
  liens: Record<string, string>;
};
type Donnees = Record<string, { t: Textes; ny: [number, number, number][]; u: string }>;
const D = compatTxt as unknown as Donnees;

export function textesCompat(lg: Langue): { t: Textes; ny: [number, number, number][]; u: string } {
  return D[lg] || D.en || D.fr;
}

/** g : sexe facultatif ('f', 'm' ou '') : sens traditionnel de la lecture védique pour un couple femme-homme (06/10/2026). */
export type Personne = { n: string; d: Date; h: number | null; tz: number; g?: string };
export type Ligne = { gras: string; texte: string };
export type Section = { k?: string; titre: string; intro: string; lignes: Ligne[]; verdict?: { titre: string; texte: string }; extra?: string[]; score: number | null; caveat: string; lien?: string; tableau?: [string, string][] };

const fmt = (s: string, ...v: (string | number)[]) => { let i = 0; return String(s).replace(/%[sd]/g, () => String(v[i++] ?? '')); };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const jours = (d: Date) => Math.round(d.getTime() / 86400000);
function reduire(n: number, maitres: boolean): number {
  while (n > 9) {
    if (maitres && (n === 11 || n === 22 || n === 33)) return n;
    n = String(n).split('').reduce((a, c) => a + parseInt(c, 10), 0);
  }
  return n;
}
export function plat(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
}

/* ---------------------------------------------------------- zodiaque */
const ZOD = [[3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23], [9, 23], [10, 23], [11, 22], [12, 22], [1, 20], [2, 19]];
export function zodiac(d: Date): number {
  const m = d.getUTCMonth() + 1, j = d.getUTCDate();
  for (let i = 0; i < 12; i++) {
    const a = ZOD[i], b = ZOD[(i + 1) % 12];
    const apres = m > a[0] || (m === a[0] && j >= a[1]), avant = m < b[0] || (m === b[0] && j < b[1]);
    if (a[0] <= b[0] ? apres && avant : apres || avant) return i;
  }
  return 0;
}
function lectureZodiac(T: Textes, p: Personne, q: Personne): Section {
  const za = zodiac(p.d), zb = zodiac(q.d), ea = za % 4, eb = zb % 4;
  let dist = Math.abs(za - zb); if (dist > 6) dist = 12 - dist;
  const asp = T.zod.aspects[String(dist)];
  let txt: string;
  if (ea === eb) txt = fmt(T.zod.elem_rel.meme, T.zod.elements[ea]);
  else {
    const pair = [Math.min(ea, eb), Math.max(ea, eb)].join('-');
    const type = pair === '0-2' || pair === '1-3' ? 'compl' : pair === '0-3' || pair === '1-2' ? 'tension' : 'voisin';
    txt = fmt(T.zod.elem_rel[type], cap(T.zod.elements_art[ea]), T.zod.elements_art[eb]);
  }
  return { k: 'zod', titre: T.zod.titre, intro: T.zod.intro, lignes: [
      { gras: fmt(T.zod.signe_de, p.n, T.zod.noms[za], T.zod.elements[ea], T.zod.modes[za % 3]), texte: T.zod.profils[za] },
      { gras: fmt(T.zod.signe_de, q.n, T.zod.noms[zb], T.zod.elements[eb], T.zod.modes[zb % 3]), texte: T.zod.profils[zb] },
    ], verdict: { titre: asp[0], texte: asp[1] + ' ' + txt }, score: asp[2], caveat: T.zod.caveat, lien: T.liens.zod };
}

/* ----------------------------------------------------------- chinois */
function lunaire(NY: [number, number, number][], d: Date): number | null {
  let y = d.getUTCFullYear();
  const ny = NY.find((x) => x[0] === y); if (!ny) return null;
  if (d.getTime() < Date.UTC(ny[0], ny[1] - 1, ny[2])) y -= 1;
  return NY.some((x) => x[0] === y) ? y : null;
}
const SECRET: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const elemChin = (y: number) => [0, 0, 1, 1, 2, 2, 3, 3, 4, 4][y % 10];
const ENGENDRE: Record<number, number> = { 2: 3, 3: 4, 4: 0, 0: 1, 1: 2 };
const CONTROLE: Record<number, number> = { 2: 4, 4: 1, 1: 3, 3: 0, 0: 2 };
function lectureChin(T: Textes, NY: [number, number, number][], p: Personne, q: Personne): Section {
  const ya = lunaire(NY, p.d), yb = lunaire(NY, q.d);
  const base = { k: 'chin', titre: T.chin.titre, intro: T.chin.intro };
  if (ya === null || yb === null) return { ...base, lignes: [], score: null, caveat: T.ui.hors };
  const aa = ((ya - 1924) % 12 + 12) % 12, ab = ((yb - 1924) % 12 + 12) % 12, ea = elemChin(ya), eb = elemChin(yb);
  const v = aa === ab ? 'meme' : SECRET[aa] === ab ? 'secret' : aa % 4 === ab % 4 ? 'trigone' : (aa + 6) % 12 === ab ? 'oppose' : 'neutre';
  const verdict = T.chin.verdicts[v]; let score = verdict[2]; let rel: string;
  if (ea === eb) rel = fmt(T.chin.elem_rel.meme, T.chin.elements[ea]);
  else if (ENGENDRE[ea] === eb) { rel = fmt(T.chin.elem_rel.engendre, cap(T.chin.elements_art[ea]), T.chin.elements_art[eb]); score += 5; }
  else if (ENGENDRE[eb] === ea) { rel = fmt(T.chin.elem_rel.engendre, cap(T.chin.elements_art[eb]), T.chin.elements_art[ea]); score += 5; }
  else if (CONTROLE[ea] === eb) { rel = fmt(T.chin.elem_rel.controle, cap(T.chin.elements_art[ea]), T.chin.elements_art[eb]); score -= 5; }
  else if (CONTROLE[eb] === ea) { rel = fmt(T.chin.elem_rel.controle, cap(T.chin.elements_art[eb]), T.chin.elements_art[ea]); score -= 5; }
  else rel = fmt(T.chin.elem_rel.neutre, cap(T.chin.elements_art[ea]), T.chin.elements_art[eb]);
  score = Math.max(0, Math.min(100, score));
  return { ...base, lignes: [
      { gras: fmt(T.chin.signe_de, p.n, T.chin.animaux[aa], T.chin.elements[ea], ya), texte: T.chin.profils[aa] },
      { gras: fmt(T.chin.signe_de, q.n, T.chin.animaux[ab], T.chin.elements[eb], yb), texte: T.chin.profils[ab] },
    ], verdict: { titre: verdict[0], texte: verdict[1] + ' ' + rel }, score, caveat: T.chin.caveat, lien: T.liens.chin };
}

/* -------------------------------------------------------- biorythmes */
function lectureBio(T: Textes, p: Personne, q: Personne): Section {
  const ecart = Math.abs(jours(p.d) - jours(q.d));
  const cycles: [number, string][] = [[23, T.bio.phys], [28, T.bio.emo], [33, T.bio.intel]];
  const tableau: [string, string][] = []; let total = 0;
  for (const [per, nom] of cycles) {
    const reste = ecart % per, dd = Math.min(reste, per - reste), pc = Math.round((1 - (2 * dd) / per) * 100);
    total += pc; tableau.push([nom + ' (' + per + ' ' + T.ui.jours + ')', pc + ' %']);
  }
  const moy = Math.round(total / 3);
  let lot = T.bio.bilans[0]; for (const b of T.bio.bilans) if (moy >= b[0]) lot = b;
  return { k: 'bio', titre: T.bio.titre, intro: T.bio.intro, lignes: [], tableau, verdict: { titre: lot[1], texte: lot[2] + ' ' + fmt(T.bio.ecart, ecart) }, score: moy, caveat: T.bio.caveat, lien: T.liens.bio };
}

/* ------------------------------------------------------ numérologie */
function valeurs(nom: string) {
  const s = plat(nom); let tot = 0, voy = 0, con = 0;
  for (const c of s) { const v = ((c.charCodeAt(0) - 65) % 9) + 1; tot += v; if ('AEIOUY'.includes(c)) voy += v; else con += v; }
  return { expr: reduire(tot, true), intime: reduire(voy, false), real: reduire(con, false) };
}
const famille = (n: number) => { n = reduire(n, false); return n === 1 || n === 5 || n === 7 ? '1' : n === 2 || n === 4 || n === 8 ? '2' : '3'; };
function verdictNombres(T: Textes, a: number, b: number): Verdict3 {
  const ra = reduire(a, false), rb = reduire(b, false), fa = famille(a), fb = famille(b);
  if (ra === rb) { const v = T.nom.verdicts.meme_nombre; return [v[0], v[1], v[2]]; }
  if (fa === fb) { const v = T.nom.verdicts.meme_famille; return [v[0], fmt(v[1], T.nom.familles[fa]), v[2]]; }
  const v = [fa, fb].sort().join('-') === '1-2' ? T.nom.verdicts.eloignee : T.nom.verdicts.amie;
  return [v[0], fmt(v[1], cap(T.nom.familles[fa]), T.nom.familles[fb]), v[2]];
}
function descNombre(T: Textes, n: number): string {
  let t = T.nom.nombres[String(reduire(n, false))];
  if (n === 11 || n === 22 || n === 33) t = T.nom.maitres[String(n)] + ' ' + t;
  return t;
}
function lectureNom(T: Textes, p: Personne, q: Personne): Section {
  const a = valeurs(p.n), b = valeurs(q.n), v = verdictNombres(T, a.expr, b.expr);
  return { k: 'nom', titre: T.nom.titre, intro: T.nom.intro, lignes: [
      { gras: fmt(T.nom.de, p.n, a.expr, a.intime, a.real), texte: descNombre(T, a.expr) },
      { gras: fmt(T.nom.de, q.n, b.expr, b.intime, b.real), texte: descNombre(T, b.expr) },
    ], verdict: { titre: v[0], texte: v[1] }, score: v[2], caveat: T.nom.caveat, lien: T.liens.nom };
}
function chemin(d: Date): number {
  return reduire(reduire(d.getUTCDate(), true) + reduire(d.getUTCMonth() + 1, true) + reduire(d.getUTCFullYear(), true), true);
}
function lectureVie(T: Textes, p: Personne, q: Personne): Section {
  const a = chemin(p.d), b = chemin(q.d), v = verdictNombres(T, a, b);
  return { k: 'vie', titre: T.vie.titre, intro: T.vie.intro, lignes: [
      { gras: fmt(T.vie.de, p.n, a), texte: descNombre(T, a) }, { gras: fmt(T.vie.de, q.n, b), texte: descNombre(T, b) },
    ], verdict: { titre: v[0], texte: v[1] }, score: v[2], caveat: T.vie.caveat, lien: T.liens.vie };
}

/* ---------------------------------------------------------------- âge */
function lectureAge(T: Textes, p: Personne, q: Personne): Section {
  let a = p.d, b = q.d; if (a > b) { const t = a; a = b; b = t; }
  let ans = b.getUTCFullYear() - a.getUTCFullYear(), mois = b.getUTCMonth() - a.getUTCMonth();
  if (b.getUTCDate() < a.getUTCDate()) mois -= 1;
  if (mois < 0) { ans -= 1; mois += 12; }
  const ecart = ans === 0 && mois === 0 ? T.age.meme_jour : ans + ' ' + T.ui.ans + (mois ? ' ' + T.ui.et + ' ' + mois + ' ' + T.ui.mois : '');
  let lot = T.age.bandes[0]; for (const k of T.age.bandes) if (ans >= k[0]) lot = k;
  return { k: 'age', titre: T.age.titre, intro: fmt(T.age.intro, ecart), lignes: [], verdict: { titre: '', texte: lot[1] }, score: null, caveat: T.age.caveat, lien: T.liens.age };
}

/* ------------------------------------------------------------- FLAMES */
function lectureFlames(T: Textes, p: Personne, q: Personne): Section {
  const a = plat(p.n).split(''), b = plat(q.n).split('');
  for (let i = 0; i < a.length; i++) { const j = b.indexOf(a[i]); if (j !== -1) { b.splice(j, 1); a.splice(i, 1); i -= 1; } }
  const n = a.length + b.length, lettres = ['F', 'L', 'A', 'M', 'E', 'S']; let pos = 0;
  while (lettres.length > 1 && n > 0) { pos = (pos + n - 1) % lettres.length; lettres.splice(pos, 1); if (pos >= lettres.length) pos = 0; }
  return { k: 'flames', titre: T.flames.titre, intro: T.flames.intro, lignes: [{ gras: '', texte: fmt(T.flames.restent, n) }], verdict: { titre: T.flames.resultats[lettres[0]], texte: '' }, score: null, caveat: T.flames.caveat };
}

/* ------------------------------------------------- védique (guna milan) */
const NAK_NOMS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_ENNEMI: Record<string, number> = { '0-8': 1, '1-13': 1, '2-11': 1, '3-12': 1, '4-10': 1, '5-6': 1, '7-9': 1 };
const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0];
const MAITRE = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4];
const AMIS = [[2, 2, 2, 1, 2, 0, 0], [2, 2, 1, 2, 1, 1, 1], [2, 2, 2, 0, 2, 1, 1], [2, 0, 1, 2, 1, 2, 1], [2, 2, 2, 0, 2, 0, 1], [0, 0, 1, 2, 1, 2, 2], [0, 0, 0, 2, 1, 2, 2]];
function vashya(r: number, deg: number): number {
  if (r === 0 || r === 1) return 0; if (r === 2 || r === 5 || r === 6 || r === 10) return 1;
  if (r === 3 || r === 11) return 2; if (r === 4) return 3; if (r === 7) return 4;
  if (r === 8) return deg < 15 ? 1 : 0; return deg < 15 ? 0 : 2;
}
const VASHYA_PTS = [[2, 1, 1, 0, 1], [1, 2, 1, 0.5, 0.5], [1, 1, 2, 1, 1], [0, 0.5, 1, 2, 0], [1, 0.5, 1, 0, 2]];
function moonSid(d: Date, h: number | null, tz: number) {
  const hh = typeof h === 'number' ? h : 12, j = ASTRO.jd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hh - (tz || 0));
  const ay = 23.853 + 1.39697 * (j - 2451545.0) / 36525, lon = ASTRO.norm(ASTRO.moonLon(j) - ay);
  return { lon, r: Math.floor(lon / 30), deg: lon % 30, nak: Math.floor(lon / (360 / 27)), change: ASTRO.sign(ASTRO.norm(ASTRO.moonLon(j - 0.5) - ay)) !== ASTRO.sign(ASTRO.norm(ASTRO.moonLon(j + 0.5) - ay)) };
}
/** sens : 1 si a est la femme et b l'homme, -1 l'inverse, 0 sans sexe précisé ou pour un couple de même sexe (même règle que compat.js). */
function kutas(a: ReturnType<typeof moonSid>, b: ReturnType<typeof moonSid>, sens: number): number[] {
  const pts: number[] = [];
  const vf = sens === 1 ? a : sens === -1 ? b : null, vm = sens === 1 ? b : sens === -1 ? a : null;
  pts.push(vf && vm ? (VARNA[vm.r] <= VARNA[vf.r] ? 1 : 0) : 1);
  const va = vashya(a.r, a.deg), vb = vashya(b.r, b.deg); pts.push(Math.max(VASHYA_PTS[va][vb], VASHYA_PTS[vb][va]));
  const tara = (x: number, y: number) => { const c = ((y - x) % 27 + 27) % 27 + 1, m = c % 9; return m === 3 || m === 5 || m === 7 ? 0 : 1; };
  const t = tara(a.nak, b.nak) + tara(b.nak, a.nak); pts.push(t === 2 ? 3 : t === 1 ? 1.5 : 0);
  const ya = YONI[a.nak], yb = YONI[b.nak], key = Math.min(ya, yb) + '-' + Math.max(ya, yb); pts.push(ya === yb ? 4 : YONI_ENNEMI[key] ? 0 : 2);
  const ma = MAITRE[a.r], mb = MAITRE[b.r], f1 = AMIS[ma][mb], f2 = AMIS[mb][ma];
  pts.push(ma === mb || (f1 === 2 && f2 === 2) ? 5 : f1 + f2 === 3 ? 4 : f1 === 1 && f2 === 1 ? 3 : f1 + f2 === 2 && f1 !== f2 ? 1 : f1 + f2 === 1 ? 0.5 : 0);
  const ga = GANA[a.nak], gb = GANA[b.nak], dvMh = !!(vf && vm && GANA[vf.nak] === 0 && GANA[vm.nak] === 1);
  pts.push(ga === gb ? 6 : ga + gb === 1 ? (dvMh ? 5 : 6) : ga + gb === 2 && ga !== gb ? 1 : 0);
  const dr = ((b.r - a.r) % 12 + 12) % 12; pts.push(dr === 1 || dr === 11 || dr === 4 || dr === 8 || dr === 5 || dr === 7 ? 0 : 7);
  pts.push(NADI[a.nak] === NADI[b.nak] ? 0 : 8);
  return pts;
}
function lectureVed(T: Textes, lg: Langue, p: Personne, q: Personne): Section | null {
  if (!T.ved) return null;
  const a = moonSid(p.d, p.h, p.tz), b = moonSid(q.d, q.h, q.tz);
  const sens = p.g === 'f' && q.g === 'm' ? 1 : p.g === 'm' && q.g === 'f' ? -1 : 0;
  const pts = kutas(a, b, sens), total = pts.reduce((x, y) => x + y, 0);
  let bilan = T.ved.bilans[0]; for (const bb of T.ved.bilans) if (total >= bb[0]) bilan = bb;
  const MAX = [1, 2, 3, 4, 5, 6, 7, 8];
  const extra: string[] = [];
  if ((typeof p.h !== 'number' && a.change) || (typeof q.h !== 'number' && b.change)) extra.push(T.ved.sans_heure);
  const S = textesS(lg); if (S) extra.push(sens ? S.vedTrad : S.vedSym);
  return { k: 'ved', titre: T.ved.titre, intro: T.ved.intro, lignes: [
      { gras: fmt(T.ved.lune_de, p.n, RASHI[a.r], T.zod.noms[a.r], NAK_NOMS[a.nak]), texte: '' },
      { gras: fmt(T.ved.lune_de, q.n, RASHI[b.r], T.zod.noms[b.r], NAK_NOMS[b.nak]), texte: '' },
    ], tableau: T.ved.kutas.map((k, i) => [k, String(pts[i]).replace('.', ',') + ' / ' + MAX[i]] as [string, string]),
    verdict: { titre: fmt(T.ved.total, String(total).replace('.', ',')), texte: bilan[1] }, extra, score: Math.round(total / 36 * 100), caveat: T.ved.caveat, lien: T.liens.ved };
}

/** Textes ajoutés le 06/10/2026 (sexe, tests enregistrés) : var S de compat.js, exportés par app_moteurs.py (ui.json « compatS »). */
export type TextesS = { sexe: string; np: string; f: string; m: string; garder: string; garde: string; voir: string; mes: string; plein: string; vedTrad: string; vedSym: string };
export function textesS(lg: Langue): TextesS {
  const S = (ui as unknown as { compatS: Record<string, TextesS> }).compatS;
  return S[lg] || S.fr;
}

/** r : score de chaque lecture chiffrée (clé zod, chin, ved, bio, nom, vie) ; z, c : signes du zodiaque et animaux chinois des deux personnes. */
export type Resultat = { total: number | null; sections: Section[]; avis: string[]; r: Record<string, number>; z: [number, number] | null; c: [number, number] | null };

/** Le test complet. dates : les deux dates sont connues ; noms : les deux prénoms sont utilisables. */
export function compatibilite(lg: Langue, p: Personne, q: Personne, dates: boolean, noms: boolean): Resultat {
  const { t: T, ny: NY } = textesCompat(lg);
  const parts: Section[] = [];
  if (dates) { parts.push(lectureZodiac(T, p, q), lectureChin(T, NY, p, q)); const v = lectureVed(T, lg, p, q); if (v) parts.push(v); parts.push(lectureBio(T, p, q)); }
  if (noms) parts.push(lectureNom(T, p, q));
  if (dates) parts.push(lectureVie(T, p, q), lectureAge(T, p, q));
  if (noms) parts.push(lectureFlames(T, p, q));
  let somme = 0, nb = 0;
  for (const x of parts) if (x.score !== null) { somme += x.score; nb++; }
  const avis: string[] = [];
  if (!dates) avis.push(T.ui.sans_dates);
  if (!noms) avis.push(T.ui.sans_prenoms);
  const r: Record<string, number> = {};
  for (const x of parts) if (x.k && x.score !== null) r[x.k] = x.score;
  let z: [number, number] | null = null, c: [number, number] | null = null;
  if (dates) {
    z = [zodiac(p.d), zodiac(q.d)];
    const ya = lunaire(NY, p.d), yb = lunaire(NY, q.d);
    if (ya !== null && yb !== null) c = [((ya - 1924) % 12 + 12) % 12, ((yb - 1924) % 12 + 12) % 12];
  }
  return { total: nb ? Math.round(somme / nb) : null, sections: parts, avis, r, z, c };
}
