// Horoscope du jour : même règle que le site (assets/js/horoscope.js) — texte composé, pour chaque signe, à partir des
// positions réelles du jour (Lune, Soleil, Mercure, Vénus, Mars), de la phase de la Lune et d'un conseil qui tourne.
import type { Langue } from '../i18n';
import { ASTRO } from './astro';
import { ASTRO_TXT, type TextesAstro } from './astro_txt';

/** Textes d'astrologie dans la langue, sinon en anglais, sinon en français. */
export function textes(lg: Langue): TextesAstro {
  return ASTRO_TXT[lg] || ASTRO_TXT.en || ASTRO_TXT.fr;
}

function rel(a: number, b: number): 'meme' | 'opp' | 'tri' | 'sq' | 'sex' | 'none' {
  const d = ((a - b) % 12 + 12) % 12;
  if (d === 0) return 'meme'; if (d === 6) return 'opp'; if (d === 4 || d === 8) return 'tri'; if (d === 3 || d === 9) return 'sq'; if (d === 2 || d === 10) return 'sex';
  return 'none';
}

export type Ciel = {
  jd: number; jour: number;
  signes: { sun: number; moon: number; mercury: number; venus: number; mars: number };
  mercureRetro: boolean;
  phase: { idx: number; illum: number; waxing: boolean };
};

/** Le ciel du jour (à l'instant donné). */
export function ciel(quand: Date = new Date()): Ciel {
  const j = ASTRO.jdFromDate(quand);
  const A = ASTRO;
  return {
    jd: j, jour: Math.floor(j + 0.5),
    signes: { sun: A.sign(A.sunLon(j)), moon: A.sign(A.moonLon(j)), mercury: A.sign(A.planetLon('mercury', j)), venus: A.sign(A.planetLon('venus', j)), mars: A.sign(A.planetLon('mars', j)) },
    mercureRetro: A.retrograde('mercury', j),
    phase: A.phase(j),
  };
}

/** En-tête du jour : « Positions du … (heure locale) — Premier quartier, Lune en Lion. » (même forme que horoscope.js du site) */
export function entete(c: Ciel, lg: Langue, quand: Date = new Date()): string {
  const T = textes(lg), U = T.ui;
  const date = quand.toLocaleDateString(lg, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return U.maj + ' ' + date + (U.heure_locale ? ' (' + U.heure_locale + ')' : '') + ' — ' + T.phases[c.phase.idx] + ', ' + String(U.lune_en || '').toLowerCase() + ' ' + T.signes[c.signes.moon] + '.';
}

/** La date locale décalée de `jour` jours (1 = demain, page « horoscope de demain » du site), même heure. */
export function dateDecalee(jour: number, base: Date = new Date()): Date {
  const d = new Date(base.getTime());
  if (jour) d.setDate(d.getDate() + jour);
  return d;
}

/** Page de demain : « aujourd'hui » -> « demain » dans un texte du jour (table ui.demain d'astro_txt.js, copie de la fonction
 *  auLendemain de horoscope.js du site : mots entiers, accents compris, majuscule initiale conservée). Sans table : texte inchangé. */
export function auLendemain(s: string, lg: Langue): string {
  const table = (textes(lg).ui as unknown as Record<string, unknown>).demain as [string, string][] | undefined;
  if (!Array.isArray(table)) return s;
  for (const paire of table) {
    const re = new RegExp('(^|[^\\p{L}])(' + paire[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\p{L}])', 'giu');
    s = s.replace(re, (_m: string, avant: string, mot: string) => {
      let r = paire[1];
      if (mot.charAt(0) !== mot.charAt(0).toLowerCase()) r = r.charAt(0).toUpperCase() + r.slice(1);
      return avant + r;
    });
  }
  return s;
}

/** Les phrases du jour pour un signe (0 = Bélier … 11 = Poissons) et le conseil du jour. */
export function horoscope(c: Ciel, signe: number, lg: Langue): { phrases: string[]; conseil: string } {
  const H = textes(lg).horoscope as Record<string, string | string[]>;
  const t = (k: string) => (typeof H[k] === 'string' ? (H[k] as string) : '');
  const p: string[] = [];
  const s = signe;
  p.push(t('lune_' + rel(c.signes.moon, s)));
  const rv = rel(c.signes.venus, s); if (rv !== 'none') p.push(t('venus_' + rv));
  const rma = rel(c.signes.mars, s); if (rma !== 'none') p.push(t('mars_' + rma));
  const rme = rel(c.signes.mercury, s); if (rme === 'meme' || rme === 'opp' || rme === 'sq') p.push(t('mercure_' + rme));
  if (c.mercureRetro) p.push(t('mercure_retro'));
  const rs = rel(c.signes.sun, s); if (rs === 'meme' || rs === 'opp') p.push(t('soleil_' + rs));
  const phase = H.phase as string[]; p.push(phase[c.phase.idx]);
  const conseils = H.conseils as string[];
  return { phrases: p.filter(Boolean), conseil: conseils[(c.jour + s * 7) % conseils.length] };
}

/** Signes d'une personne : Soleil (à midi UT le jour de naissance), animal chinois, ascendant si heure et lieu connus. */
export type Signes = { soleil: number; degre: number; chinois: { animal: number; element: number; yang: boolean; annee: number }; ascendant: number | null };

export function signesDe(naissance: string, heure?: string, lat?: number | null, lon?: number | null, decalageHeures?: number | null): Signes | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(naissance || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const lonSoleil = ASTRO.norm(ASTRO.sunLon(ASTRO.jd(y, mo, d, 12)));
  const ch = ASTRO.chinese(y, mo, d);
  let ascendant: number | null = null;
  const h = /^(\d{2}):(\d{2})/.exec(heure || '');
  if (h && typeof lat === 'number' && typeof lon === 'number') {
    const locale = +h[1] + +h[2] / 60;
    const dec = typeof decalageHeures === 'number' ? decalageHeures : Math.round(lon / 15);   // sans base des fuseaux : heure solaire moyenne
    ascendant = ASTRO.sign(ASTRO.angles(ASTRO.jd(y, mo, d, locale - dec), lat, lon).asc);
  }
  return { soleil: Math.floor(lonSoleil / 30), degre: lonSoleil % 30, chinois: { animal: ch.animal, element: ch.element, yang: ch.yang, annee: ch.year }, ascendant };
}
