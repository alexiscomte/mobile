// Comparateur pays : données locales, aucune requête nécessaire à la comparaison.
import contenu from './comparateur.json';
import type { Langue } from '../i18n';

export type EntreePays = { cid: string; r: string; f: [string, string][]; u: string; sources: number[]; maj: string };
export type ThemePays = { id: string; titre: string; rows: EntreePays[] };
export type Comparateur = { route: string; ui: Record<string, string>; themes: ThemePays[]; references: [string, string, string][]; pays: [string, string][] };
type Depot = { version: number; filtreTr: string; langues: Record<Langue, Comparateur> };
const D = contenu as unknown as Depot;
const EXCLUS_TR = new Set(['mariagegay', 'orientations']);
const LIENS_TR = /cinsel-yonelimler|escinsel-evlilik/i;

export function donneesComparateur(lg: Langue): Comparateur {
  const d = D.langues[lg];
  if (lg !== 'tr') return d;
  // Défense aussi à la lecture des mises à jour ; aucune bascule vers une autre langue.
  const mots = new RegExp(D.filtreTr, 'iu');
  const references: [string, string, string][] = d.references.map((r) => mots.test(JSON.stringify(r)) || LIENS_TR.test(JSON.stringify(r)) ? ['', '', ''] : r);
  const themes = d.themes.filter((t) => !EXCLUS_TR.has(t.id) && !mots.test(t.titre)).map((t) => ({
    ...t, rows: t.rows.filter((r) => !mots.test(JSON.stringify(r)) && !LIENS_TR.test(JSON.stringify(r))).map((r) => ({ ...r, sources: r.sources.filter((i) => !!references[i]?.[0]) })),
  })).filter((t) => t.rows.length);
  const cids = new Set(themes.flatMap((t) => t.rows.map((r) => r.cid)));
  return { ...d, themes, references, pays: d.pays.filter(([id, nom]) => cids.has(id) && !mots.test(nom)) };
}

export type ChoixComparateur = { lg: Langue; theme?: string; a?: string; b?: string };
/** Reconnaît aussi les anciennes URL publiques ; conserve les paramètres de comparaison. */
export function choixDepuisUrl(u: string): ChoixComparateur | null {
  try {
    const p = new URL(u, 'https://affectionplus.com/');
    if (p.origin !== 'https://affectionplus.com') return null;
    const chemin = p.pathname.replace(/^\//, '');
    const lg = (Object.keys(D.langues) as Langue[]).find((l) => D.langues[l].route === chemin);
    const anciennes: Record<string, Langue> = {
      'fr/conseils/comparateur.html': 'fr', 'fr/conseils/voyage/comparateur.html': 'fr',
      'en/advice/comparator.html': 'en', 'en/advice/travel/comparator.html': 'en',
      'de/ratgeber/vergleich.html': 'de', 'de/ratgeber/reisen/vergleich.html': 'de',
    };
    const langue = lg || anciennes[chemin];
    return langue ? { lg: langue, theme: p.searchParams.get('theme') || undefined,
      a: p.searchParams.get('a') || undefined, b: p.searchParams.get('b') || undefined } : null;
  } catch { return null; }
}

export function langueComparateur(lg?: string): lg is Langue { return !!lg && Object.prototype.hasOwnProperty.call(D.langues, lg); }

export function themeInitial(d: Comparateur, tid?: string, cid?: string): string {
  // Un favori garde historique peut viser la crèche ; aucun déplacement des URL.
  if (tid === 'garde' && cid) {
    const garde = d.themes.find((t) => t.id === 'garde');
    const accueil = d.themes.find((t) => t.id === 'accueil-jeunes-enfants');
    if (accueil?.rows.some((r) => r.cid === cid) && !garde?.rows.some((r) => r.cid === cid)) return accueil.id;
  }
  return d.themes.some((t) => t.id === tid) ? tid! : '';
}
