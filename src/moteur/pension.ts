// Pension alimentaire indicative : mêmes tables, mêmes règles et mêmes calculs que le site (assets/js/pension.js, source
// outils/gen/pension.js) ; textes du site (outils_txt.json, clé pension). Aucun texte ici. Garder les deux moteurs identiques
// (contrôle : python outils/gen/parite_moteur_pension.py ; rejeu des cas du site : node outils/tests/testpension_ts.js).
// Tables : FR table justice.fr (02/04/2024, minimum vital 652), UK guide CMS (01/04/2026), DE Düsseldorfer Tabelle (01/01/2026,
// Kindergeld 259), NL Tremanormen 2026 (behoeftetabel, draagkracht), ES fourchettes de cabinet (NON officielles).
import type { Langue } from '../i18n';
import outils from './outils_txt.json';

export type Pays = 'FR' | 'UK' | 'DE' | 'NL' | 'ES' | 'IT' | 'PT' | 'PL' | 'TR';
export type Source = { nom: string; url: string; date: string; sim: string; sim_nom: string };
export type TextesPension = {
  lang: string;
  ui: Record<string, string>;
  ordre: Pays[];
  pays: Record<Pays, string>;
  dev: Record<Pays, string>;
  fr: { garde: string; g: Record<string, string>; l: string[] };
  uk: { revenu: string; autres: string; o_autres: Record<string, string>; nuits: string; o_nuits: Record<string, string>; tranche: Record<string, string>; l: string[]; semaine: string };
  de: { actif: string; statut: string; o_statut: Record<string, string>; age_cl: string[]; l: string[] };
  nl: { gezin: string; a: string; b: string; zorg: string; o_zorg: Record<string, string>; l: string[] };
  es: { custodia: string; o_custodia: Record<string, string>; revision: string; fourchette: string; part: string; bas: string; haut: string; comp: string; exclus: string };
  info: Record<string, { methode: string; pratique: string }>;
  majeur: Record<Pays, string>;
  ou: Record<Pays, string>;
  src: Record<Pays, Source>;
};
const TXT = (outils as unknown as { pension?: Record<string, TextesPension> }).pension || {};
export const textesPension = (lg: Langue): TextesPension | undefined => TXT[lg] || TXT.en || TXT.fr;

/* ---------------- tables ---------------- */
type TauxFR = { reduit: number; classique: number; alterne: number };
const FR: { min: number; taux: Record<number, TauxFR> } = { min: 652, taux: { 1: { reduit: 0.180, classique: 0.135, alterne: 0.090 }, 2: { reduit: 0.155, classique: 0.115, alterne: 0.078 },
  3: { reduit: 0.133, classique: 0.100, alterne: 0.067 }, 4: { reduit: 0.117, classique: 0.088, alterne: 0.059 },
  5: { reduit: 0.106, classique: 0.080, alterne: 0.053 }, 6: { reduit: 0.095, classique: 0.072, alterne: 0.048 } } };
const UK: { plafond: number; flat: number; red_autres: Record<number, number>; reduced: Record<number, Record<number, number>>; basic: Record<number, number>; plus: Record<number, number>; nuits: Record<number, number> } = { plafond: 3000, flat: 7, red_autres: { 1: 0.11, 2: 0.14, 3: 0.16 },
  reduced: { 0: { 1: 0.17, 2: 0.25, 3: 0.31 }, 1: { 1: 0.141, 2: 0.212, 3: 0.264 }, 2: { 1: 0.132, 2: 0.199, 3: 0.249 }, 3: { 1: 0.124, 2: 0.189, 3: 0.238 } },
  basic: { 1: 0.12, 2: 0.16, 3: 0.19 }, plus: { 1: 0.09, 2: 0.12, 3: 0.15 },
  nuits: { 52: 1 / 7, 104: 2 / 7, 156: 3 / 7, 175: 1 / 2 } };
const DE: { kg: number; etudiant: number; sb: { oui: number; non: number }; max: number; g: number[][] } = { kg: 259, etudiant: 990, sb: { oui: 1450, non: 1200 }, max: 11200,
  /* [min, max, bedarf 0-5, 6-11, 12-17, 18+, bedarfskontrollbetrag] */
  g: [[0, 2100, 486, 558, 653, 698, 0], [2101, 2500, 511, 586, 686, 733, 1750], [2501, 2900, 535, 614, 719, 768, 1850],
      [2901, 3300, 559, 642, 751, 803, 1950], [3301, 3700, 584, 670, 784, 838, 2050], [3701, 4100, 623, 715, 836, 894, 2150],
      [4101, 4500, 661, 759, 889, 950, 2250], [4501, 4900, 700, 804, 941, 1006, 2350], [4901, 5300, 739, 849, 993, 1061, 2450],
      [5301, 5700, 778, 893, 1045, 1117, 2550], [5701, 6400, 817, 938, 1098, 1173, 2850], [6401, 7200, 856, 983, 1150, 1229, 3250],
      [7201, 8200, 895, 1027, 1202, 1285, 3750], [8201, 9700, 934, 1072, 1254, 1341, 4350], [9701, 11200, 972, 1116, 1306, 1396, 5050]] };
const NL: { col: number[]; beh: Record<number, number[]>; fixe: number[][]; lasten: number; zorg: Record<number, number> } = { col: [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500],
  beh: { 1: [200, 275, 350, 425, 540, 610, 680, 745, 805, 870, 930, 985], 2: [345, 475, 605, 735, 905, 1025, 1145, 1260, 1375, 1485, 1590, 1695],
         3: [345, 495, 645, 795, 945, 1080, 1215, 1345, 1470, 1595, 1720, 1835], 4: [410, 590, 770, 950, 1130, 1295, 1460, 1620, 1775, 1930, 2080, 2230] },
  fixe: [[1950, 50], [2000, 77], [2050, 96], [2100, 109], [2150, 116]], lasten: 1365, zorg: { 0: 0.05, 1: 0.15, 2: 0.25, 3: 0.35 } };
/* ES : fourchettes par enfant (custodia monoparental) d'un cabinet (chiffres CGPJ 2019 revalorises) : NON officielles */
type LigneES = [number, number, [number, number], [number, number], [number, number]];
const ES: LigneES[] = [[700, 1000, [190, 215], [165, 185], [140, 160]], [1000, 1500, [215, 285], [185, 245], [160, 215]], [1500, 2000, [285, 355], [245, 305], [215, 265]],
  [2000, 2500, [355, 420], [305, 360], [265, 315]], [2500, 3000, [420, 485], [360, 415], [315, 360]], [3000, 3500, [485, 545], [415, 465], [360, 405]],
  [3500, 4000, [545, 600], [465, 515], [405, 450]]];

/* ---------------- utilitaires ---------------- */
const LOCS: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL', tr: 'tr-TR' };
/** « %s » / « %d » remplacés dans l'ordre, puis « %% » (style Python des textes) = « % ». */
export const fmt = (s: string, args: (string | number)[]): string => { let i = 0; return String(s).replace(/%[sd]/g, () => String(args[i++])).replace(/%%/g, '%'); };
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Outils de mise en forme dépendant de la langue et des symboles monétaires des textes. */
export function formateur(T: TextesPension) {
  const LOC = LOCS[T.lang] || 'fr-FR';
  const num = (x: number, dec?: number) => {
    const d = dec === undefined ? (Math.abs(x - Math.round(x)) < 0.005 ? 0 : 2) : dec;
    try { return x.toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d }); } catch { return x.toFixed(d); }
  };
  const money = (x: number, p: Pays, dec?: number) => num(x, dec) + ' ' + T.dev[p];
  const pct = (x: number) => num(x * 100, (x * 1000) % 10 ? 1 : 0);
  return { num, money, pct };
}

/* ---------------- moteurs : {par: [par enfant], total, lignes: [texte]} ---------------- */
export type Garde = 'reduit' | 'classique' | 'alterne';
export type Enfant = { age: number; statut: string };
export type Donnees = { rev: number; revA?: number; gezin?: number; n: number; garde?: Garde; autres?: number; nuits?: string; actif?: string; enfants?: Enfant[]; zorg?: string; custodia?: string };
export type Resultat = { par: number[]; total: number; lignes: string[]; totalHebdo?: number; parHebdo?: number; groupe?: number; behoefte?: number; dA?: number; dB?: number; lo?: number | null; hi?: number | null; fourchette?: boolean };

export function calcFR(d: Donnees, T: TextesPension): Resultat {
  const { money, pct } = formateur(T);
  const n = Math.max(1, Math.min(6, d.n)), rev = d.rev, L = T.fr.l, lignes: string[] = [];
  const dispo = Math.max(0, rev - FR.min), taux = FR.taux[n][d.garde || 'classique'];
  lignes.push(fmt(L[0], [money(rev, 'FR'), money(FR.min, 'FR'), money(dispo, 'FR')]));
  lignes.push(fmt(L[1], [d.n, T.fr.g[d.garde || 'classique'].toLowerCase(), pct(taux)]));
  const par = r2(dispo * taux);
  lignes.push(fmt(L[2], [money(dispo, 'FR'), pct(taux), money(par, 'FR')]));
  if (d.n > 6) lignes.push(L[4]);
  const total = r2(par * d.n);
  lignes.push(fmt(L[3], [money(par, 'FR'), d.n, money(total, 'FR')]));
  const par_l: number[] = []; for (let i = 0; i < d.n; i++) par_l.push(par);
  return { par: par_l, total, lignes };
}

export function calcUK(d: Donnees, T: TextesPension): Resultat {
  const { money, pct } = formateur(T);
  const L = T.uk.l, lignes: string[] = [], nk = Math.min(3, Math.max(1, d.n)), autres = Math.min(3, d.autres || 0);
  let rev = d.rev, hebdo = 0;
  if (rev > UK.plafond) { rev = UK.plafond; lignes.push(fmt(L[0], [money(UK.plafond, 'UK')])); }
  if (rev < UK.flat) { lignes.push(L[9]); return { par: [], total: 0, totalHebdo: 0, lignes }; }
  if (autres && rev >= 200) { const red = UK.red_autres[autres]; rev = r2(rev * (1 - red)); lignes.push(fmt(L[1], [pct(red), autres, money(rev, 'UK')])); }
  let tranche: 'flat' | 'reduced' | 'basic' | 'basic_plus';
  if (rev <= 100) { tranche = 'flat'; hebdo = UK.flat; }
  else if (rev < 200) { tranche = 'reduced'; hebdo = UK.flat + (rev - 100) * UK.reduced[autres][nk]; }
  else if (rev <= 800) { tranche = 'basic'; hebdo = rev * UK.basic[nk]; }
  else { tranche = 'basic_plus'; hebdo = 800 * UK.basic[nk] + (rev - 800) * UK.plus[nk]; }
  lignes.push(fmt(L[2], [T.uk.tranche[tranche], money(rev, 'UK')]));
  if (tranche === 'flat') lignes.push(fmt(L[3], [money(UK.flat, 'UK')]));
  else if (tranche === 'reduced') lignes.push(fmt(L[4], [money(UK.flat, 'UK'), pct(UK.reduced[autres][nk]), money(rev, 'UK'), money(r2(hebdo), 'UK')]));
  else if (tranche === 'basic') lignes.push(fmt(L[5], [pct(UK.basic[nk]), money(rev, 'UK'), money(r2(hebdo), 'UK')]));
  else lignes.push(fmt(L[6], [pct(UK.basic[nk]), pct(UK.plus[nk]), money(rev, 'UK'), money(r2(hebdo), 'UK')]));
  let parEnfant = hebdo / d.n;
  const nuits = parseInt(d.nuits || '0', 10) || 0, par: number[] = [];
  if (nuits >= 52) {
    if (tranche === 'flat') parEnfant = 0;
    else { const f = UK.nuits[nuits]; parEnfant = parEnfant * (1 - f); if (nuits >= 175) parEnfant = Math.max(0, parEnfant - 7); }
    lignes.push(fmt(L[7], [nuits >= 175 ? '1/2' : nuits === 156 ? '3/7' : nuits === 104 ? '2/7' : '1/7', nuits]));
  }
  parEnfant = r2(parEnfant);
  for (let i = 0; i < d.n; i++) par.push(parEnfant);
  const totalHebdo = r2(parEnfant * d.n), mois = r2(totalHebdo * 52 / 12);
  lignes.push(fmt(L[8], [money(parEnfant, 'UK'), money(totalHebdo, 'UK'), money(mois, 'UK')]));
  return { par, total: mois, totalHebdo, parHebdo: parEnfant, lignes };
}

export function calcDE(d: Donnees, T: TextesPension): Resultat {
  const { money } = formateur(T);
  const L = T.de.l, rev = d.rev, enfants = d.enfants || [], n = enfants.length;
  let lignes: string[] = [], gi = -1;
  for (let i = 0; i < DE.g.length; i++) { if (rev <= DE.g[i][1]) { gi = i; break; } }
  if (gi < 0) { gi = DE.g.length - 1; lignes.push(fmt(L[7], [money(DE.max, 'DE')])); }
  lignes.push(fmt(L[0], [money(rev, 'DE'), gi + 1, money(DE.g[gi][0], 'DE'), money(DE.g[gi][1], 'DE')]));
  if (n === 1 && gi < DE.g.length - 1) { gi++; lignes.push(fmt(L[1], [n, gi + 1])); }
  else if (n >= 3 && gi > 0) { gi--; lignes.push(fmt(L[1], [n, gi + 1])); }
  const zahl = (g: number) => {
    const out: number[] = [], det: string[] = [];
    for (let k = 0; k < n; k++) {
      const e = enfants[k], age = e.age, cl = age <= 5 ? 0 : age <= 11 ? 1 : age <= 17 ? 2 : 3;
      let z: number;
      if (cl === 3 && e.statut === 'etudiant') { z = DE.etudiant - DE.kg; det.push(fmt(L[3], [k + 1, money(DE.etudiant, 'DE'), money(DE.kg, 'DE'), money(z, 'DE')])); }
      else { const bed = DE.g[g][2 + cl], kg = cl === 3 ? DE.kg : DE.kg / 2; z = bed - kg; det.push(fmt(L[2], [k + 1, T.de.age_cl[cl], money(bed, 'DE'), money(kg, 'DE'), money(z, 'DE')])); }
      out.push(z);
    }
    return { z: out, det };
  };
  const somme_ = (a: number[]) => a.reduce((x, y) => x + y, 0);
  let Z = zahl(gi), somme = somme_(Z.z);
  while (gi > 0 && DE.g[gi][6] && rev - somme < DE.g[gi][6]) {
    lignes.push(fmt(L[4], [gi + 1, money(rev, 'DE'), money(somme, 'DE'), money(DE.g[gi][6], 'DE'), gi]));
    gi--; Z = zahl(gi); somme = somme_(Z.z);
  }
  lignes = lignes.concat(Z.det);
  const sb = DE.sb[d.actif === 'non' ? 'non' : 'oui'], reste = rev - sb;
  let par = Z.z.slice();
  lignes.push(fmt(L[5], [money(sb, 'DE'), money(Math.max(0, reste), 'DE')]));
  if (reste < somme) {
    const masse = Math.max(0, reste);
    par = Z.z.map((z) => r2(masse * z / somme));
    lignes.push(fmt(L[6], [money(masse, 'DE'), par.map((x) => money(x, 'DE')).join(' / ')]));
  }
  const total = r2(somme_(par));
  lignes.push(fmt(L[8], [money(total, 'DE')]));
  return { par, total, lignes, groupe: gi + 1 };
}

export function behoefteNL(gezin: number, n: number): { v: number; hors: boolean } {
  const row = NL.beh[Math.min(4, Math.max(1, n))], c = NL.col, hors = false;
  if (gezin <= c[0]) return { v: row[0], hors: gezin < c[0] };
  if (gezin >= c[c.length - 1]) return { v: row[row.length - 1], hors: gezin > c[c.length - 1] };
  for (let i = 1; i < c.length; i++) {
    if (gezin <= c[i]) { const t = (gezin - c[i - 1]) / (c[i] - c[i - 1]); return { v: Math.round(row[i - 1] + t * (row[i] - row[i - 1])), hors }; }
  }
  return { v: row[row.length - 1], hors: true };
}
export function draagkrachtNL(nbi: number, n: number): number {
  if (nbi < NL.fixe[0][0]) return n >= 2 ? 50 : 25;
  for (let i = 0; i < NL.fixe.length; i++) { if (nbi < NL.fixe[i][0] + 50) return NL.fixe[i][1]; }
  return Math.round(r2(0.70 * (nbi - (0.30 * nbi + NL.lasten))));      /* arrondi au centime d'abord : 2 200 -> 122,5 -> 123 (table officielle) */
}
export function calcNL(d: Donnees, T: TextesPension): Resultat {
  const { money, pct } = formateur(T);
  const L = T.nl.l, lignes: string[] = [], n = d.n, gezin = d.gezin || 0, B = behoefteNL(gezin, n), beh = B.v;
  lignes.push(fmt(L[0], [n, money(gezin, 'NL'), money(beh, 'NL')]));
  if (B.hors) lignes.push(L[1]);
  const dA = draagkrachtNL(d.revA || 0, n), dB = draagkrachtNL(d.rev, n), somme = dA + dB;
  let part: number, tekort = 0;
  lignes.push(fmt(L[2], [money(dA, 'NL')])); lignes.push(fmt(L[3], [money(dB, 'NL')]));
  if (somme >= beh) { part = Math.round(beh * dB / somme); lignes.push(fmt(L[4], [money(beh, 'NL'), money(dB, 'NL'), money(somme, 'NL'), money(part, 'NL')])); }
  else { part = dB; tekort = beh - somme; lignes.push(fmt(L[5], [money(somme, 'NL'), money(beh, 'NL'), money(tekort, 'NL')])); }
  const zp = NL.zorg[parseInt(d.zorg || '1', 10)] || 0.05, zk = Math.round(beh * zp);
  let zkEff = tekort ? Math.max(0, zk - tekort / 2) : zk;
  zkEff = Math.round(zkEff);
  lignes.push(fmt(L[6], [pct(zp), money(beh, 'NL'), money(zk, 'NL'), money(zkEff, 'NL')]));
  const total = Math.max(0, part - zkEff);
  lignes.push(fmt(L[7], [money(part, 'NL'), money(zkEff, 'NL'), money(total, 'NL')]));
  const par: number[] = []; for (let i = 0; i < n; i++) par.push(r2(total / n));
  return { par, total, lignes, behoefte: beh, dA, dB };
}

export function calcES(d: Donnees, T: TextesPension): Resultat {
  const { num, money } = formateur(T);
  const lignes: string[] = [], n = Math.min(3, Math.max(1, d.n)), rev = d.rev, revA = d.revA || 0;
  let lo: number | null = null, hi: number | null = null;
  lignes.push(T.es.revision);
  if (d.custodia === 'comp') lignes.push(T.es.comp);
  else if (rev < 700) lignes.push(T.es.bas);
  else if (rev > 4000) lignes.push(T.es.haut);
  else {
    for (let i = 0; i < ES.length; i++) { if (rev >= ES[i][0] && rev <= ES[i][1]) { const f = ES[i][1 + n] as [number, number]; lo = f[0]; hi = f[1]; } }
    const l = lo || 0, h = hi || 0;
    lignes.push(fmt(T.es.fourchette, [d.n, money(l, 'ES'), money(h, 'ES'), money(l * d.n, 'ES'), money(h * d.n, 'ES')]));
  }
  if (revA > 0 && rev > 0) lignes.push(fmt(T.es.part, [num(100 * rev / (rev + revA), 0)]));
  lignes.push(T.es.exclus);
  return { par: [], total: 0, lo, hi, lignes, fourchette: true };
}

/** Pays qui ont un calcul (les autres : méthode et pratique seulement, T.info). */
export const CALC: Partial<Record<Pays, (d: Donnees, T: TextesPension) => Resultat>> = { FR: calcFR, UK: calcUK, DE: calcDE, NL: calcNL, ES: calcES };
export const calcule = (p: Pays, d: Donnees, T: TextesPension): Resultat | null => { const f = CALC[p]; return f ? f(d, T) : null; };

/** Données complètes pour le pays (mêmes règles que le formulaire du site). */
export function valide(p: Pays, d: Donnees): boolean {
  if (!(d.n >= 1)) return false;
  let ok = p === 'NL' ? (d.gezin || 0) >= 0 && (d.revA || 0) >= 0 && d.rev >= 0 : d.rev >= 0;
  if (p === 'DE') ok = ok && !!d.enfants && d.enfants.length > 0 && d.enfants.every((e) => e.age >= 0 && e.age <= 30);
  if (p === 'ES') ok = ok && (d.revA || 0) >= 0;
  return ok && !isNaN(d.rev);
}
