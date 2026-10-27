// Outil « distance et différences » : même règle et mêmes textes que le site (assets/js/distance.js, 9 langues ; culture.js).
import type { Langue } from '../i18n';
import culture from './culture.json';
import distance from './distance.json';
import { LIEU } from './lieu';
import { km, paysParCode } from './lieux';

export type TextesDistance = {
  p1: string; p2: string; go: string; manque: string; meme_ville: string; km: string; vol: string; train: string; tz0: string; tz: string;
  lendemain: string; veille: string; bandes: [number, string][]; pays_titre: string; memes_pays: string; langues: string; religions: string;
  monnaie: string; indicatif: string; conduite: string; droite: string; gauche: string; langue_commune: string; langue_aucune: string;
  religion_meme: string; religion_diff: string; fiche: string; comparer: string; hors_site: string; note: string;
};
type Donnees = { TXT: Record<string, TextesDistance>; LANGUES: Record<string, Record<string, string>>; RELIGIONS: Record<string, Record<string, string>>; PAYS_SITE: Record<string, Record<string, string>>; PAYS_ACTUELS?: Record<string, [string, string][]>; COMPARATEUR: Record<string, string> };
const D = distance as unknown as Donnees;
// [langues (codes), religions (codes), monnaie, indicatif, conduite r/l]
const CULTURE = culture as unknown as Record<string, [string[], string[], string, string, string]>;
const FAMILLE: Record<string, string> = { cat: 'chr', prot: 'chr', chr: 'chr', isl: 'isl', hin: 'hin', bud: 'bud', sik: 'sik', tao: 'tao', trad: 'trad', vod: 'vod', none: 'none' };
const LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL', tr: 'tr-TR' };
const UNITE_H: Record<string, string> = { fr: ' h', en: ' h', de: ' Std.', es: ' h', it: ' h', pt: ' h', nl: ' u', pl: ' godz.', tr: ' sa' };

export function textesDistance(lg: Langue): TextesDistance { return D.TXT[lg] || D.TXT.en || D.TXT.fr; }
export function slugsPays(lg: Langue): Record<string, string> { return D.PAYS_ACTUELS?.[lg] ? Object.fromEntries(D.PAYS_ACTUELS[lg]) : D.PAYS_SITE[lg] || {}; }

const fmt = (s: string, ...v: (string | number)[]) => String(s).replace(/%(\d)/g, (_m, i) => String(v[+i - 1] ?? ''));
const pad2 = (n: number) => (n < 10 ? '0' : '') + n;

/** 5.5 -> « 5 h 30 » / « 5 Std. 30 » / « 5 godz. 30 ». */
export function heures(h: number, lg: string): string {
  const s = h < 0 ? '-' : '', a = Math.abs(h); let hh = Math.floor(a), mm = Math.round((a - hh) * 60);
  if (mm === 60) { hh += 1; mm = 0; }
  return s + hh + (UNITE_H[lg] || ' h') + (mm ? ' ' + pad2(mm) : '');
}
/** Heure 0-24 -> « 23 h », « 11 pm », « 23 Uhr », « 23:00 ». */
export function horloge(h: number, lg: string): string {
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh += 1; mm = 0; }
  hh = ((hh % 24) + 24) % 24;
  const m2 = pad2(mm);
  if (lg === 'en') { const ap = hh >= 12 ? 'pm' : 'am', h12 = hh % 12 || 12; return h12 + (mm ? ':' + m2 : '') + ' ' + ap; }
  if (lg === 'de') return hh + (mm ? ':' + m2 : '') + ' Uhr';
  if (lg !== 'fr') return hh + ':' + m2;
  return hh + ' h' + (mm ? ' ' + m2 : '');
}

export type LieuD = { code: string; lat: number; lon: number; ville?: string | null; nom: string };
export type Rendu = {
  distance: string; trajet?: string; decalage: string; bande: string; diff: number;    // diff : décalage horaire en heures (b − a), pour les horloges
  pays?: { memes: boolean; table?: [string, string, string][]; langue?: string; religion?: string; fiches: { titre: string; slug: string }[]; comparer?: { titre: string; a: string; b: string; chemin: string }; horsSite: string[] };
  note: string;
};

/** Le résultat complet pour deux lieux, à la date donnée (décalage horaire du jour). */
export function rendu(lg: Langue, a: LieuD, b: LieuD, quand: Date = new Date()): Rendu {
  const T = textesDistance(lg);
  const d = Math.round(km(a.lat, a.lon, b.lat, b.lon));
  const na = a.nom || (paysParCode(a.code, lg)?.nom ?? a.code), nb = b.nom || (paysParCode(b.code, lg)?.nom ?? b.code);
  const distanceTxt = d < 3 && a.ville && a.ville === b.ville ? T.meme_ville : fmt(T.km, na, nb, d.toLocaleString(LOCALES[lg] || 'fr-FR'));
  const trajet = d >= 300 ? fmt(T.vol, heures(Math.round((d / 850 + 0.75) * 4) / 4, lg)) : d >= 30 ? T.train : undefined;
  const y = quand.getFullYear(), m = quand.getMonth() + 1, j = quand.getDate();
  const fa = LIEU.fuseau(a.code || '', a.lat, a.lon, y, m, j).total, fb = LIEU.fuseau(b.code || '', b.lat, b.lon, y, m, j).total;
  const diff = fb - fa;
  let decalage: string;
  if (Math.abs(diff) < 0.01) decalage = T.tz0;
  else { const la = 20 + diff, suffixe = la >= 24 ? T.lendemain : la < 0 ? T.veille : ''; decalage = fmt(T.tz, (diff > 0 ? '+' : '') + heures(diff, lg), horloge(la, lg), suffixe); }
  let bande = T.bandes[0]; for (const bb of T.bandes) if (d >= bb[0]) bande = bb;
  const out: Rendu = { distance: distanceTxt, trajet, decalage, bande: bande[1], note: T.note, diff };
  if (a.code && b.code) {
    if (a.code === b.code) out.pays = { memes: true, fiches: [], horsSite: [] };
    else out.pays = culturePays(lg, a.code, b.code, na, nb);
  }
  return out;
}

function liste(codes: string[], dico: Record<string, string>): string { return codes.map((c) => dico[c] || c).join(', '); }

function culturePays(lg: Langue, ca: string, cb: string, na: string, nb: string): NonNullable<Rendu['pays']> {
  const T = textesDistance(lg), LG = D.LANGUES[lg] || D.LANGUES.en, RL = D.RELIGIONS[lg] || D.RELIGIONS.en;
  const A = CULTURE[ca], B = CULTURE[cb];
  const p: NonNullable<Rendu['pays']> = { memes: false, fiches: [], horsSite: [] };
  if (A && B) {
    p.table = [
      [T.langues, liste(A[0], LG), liste(B[0], LG)], [T.religions, liste(A[1], RL), liste(B[1], RL)],
      [T.monnaie, A[2], B[2]], [T.indicatif, A[3], B[3]], [T.conduite, A[4] === 'l' ? T.gauche : T.droite, B[4] === 'l' ? T.gauche : T.droite],
    ];
    const communes = A[0].filter((c) => B[0].includes(c) && !c.startsWith('plus'));
    p.langue = communes.length ? fmt(T.langue_commune, liste(communes, LG)) : T.langue_aucune;
    const ra = A[1][0], rb = B[1][0];
    p.religion = FAMILLE[ra] === FAMILLE[rb] ? fmt(T.religion_meme, RL[ra] || ra) : fmt(T.religion_diff, RL[ra] || ra, RL[rb] || rb);
  }
  const slugs = slugsPays(lg);
  for (const [code, nom] of [[ca, na], [cb, nb]] as [string, string][]) {
    if (slugs[code]) p.fiches.push({ titre: fmt(T.fiche, nom), slug: slugs[code] });
    else p.horsSite.push(fmt(T.hors_site, nom));
  }
  if (slugs[ca] && slugs[cb] && D.COMPARATEUR[lg]) p.comparer = {
    titre: fmt(T.comparer, na, nb), a: slugs[ca], b: slugs[cb],
    chemin: D.COMPARATEUR[lg] + '?theme=mariage&a=' + encodeURIComponent(slugs[ca]) + '&b=' + encodeURIComponent(slugs[cb]),
  };
  return p;
}
