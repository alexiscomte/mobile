// Pays et villes du site (assets/data/pays.js, copié dans pays.json ; assets/data/villes/xx.js, lus à la demande sur le site).
import type { Langue } from '../i18n';
import { SITE } from '../site';
import pays from './pays.json';

type Pays = (string | number)[];
const LISTE = pays as unknown as Pays[];
// colonnes de pays.js : code, nom fr, en, de, lat, lon, (fiche), es, it, pt, nl, pl, tr
const IDX: Record<Langue, number> = { fr: 1, en: 2, de: 3, es: 7, it: 8, pt: 9, nl: 10, pl: 11, tr: 12 };

export const plain = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export type PaysInfo = { code: string; nom: string; lat: number; lon: number };
const infos = (p: Pays, lg: Langue): PaysInfo => ({ code: p[0] as string, nom: ((p[IDX[lg]] || p[2]) as string), lat: p[4] as number, lon: p[5] as number });

export function listePays(lg: Langue): PaysInfo[] {
  return LISTE.map((p) => infos(p, lg)).sort((a, b) => a.nom.localeCompare(b.nom, lg));
}
export function paysParCode(code: string, lg: Langue): PaysInfo | null {
  const p = LISTE.find((x) => x[0] === code.toUpperCase());
  return p ? infos(p, lg) : null;
}
export function chercherPays(liste: PaysInfo[], q: string, n = 6): PaysInfo[] {
  const p = plain(q.trim());
  if (!p) return [];
  return liste.filter((x) => plain(x.nom).startsWith(p) || plain(x.nom).includes(' ' + p)).slice(0, n);
}

export type Ville = { nom: string; lat: number; lon: number; pop: number; cp: string; alias: string };
const CACHE: Record<string, Ville[]> = {};

/** Les villes d'un pays, lues sur le site (fichier APV.set("XX", [...])) et gardées en mémoire. */
export async function villes(code: string): Promise<Ville[]> {
  const c = code.toUpperCase();
  if (CACHE[c]) return CACHE[c];
  const r = await fetch(SITE + 'assets/data/villes/' + c.toLowerCase() + '.js');
  if (!r.ok) throw new Error(String(r.status));
  const s = await r.text();
  const i = s.indexOf('['), j = s.lastIndexOf(']');
  const rows = JSON.parse(s.slice(i, j + 1)) as [string, number, number, number, string, string][];
  CACHE[c] = rows.map(([nom, lat, lon, pop, cp, alias]) => ({ nom, lat, lon, pop, cp, alias }));
  return CACHE[c];
}

export function chercherVille(liste: Ville[], q: string, n = 6): Ville[] {
  const p = plain(q.trim());
  if (!p) return [];
  return liste.filter((v) => plain(v.nom).startsWith(p) || plain(v.alias).includes('|' + p)).slice(0, n);
}

/** Distance à vol d'oiseau, en km. */
export function km(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371, p = Math.PI / 180, dLa = (la2 - la1) * p, dLo = (lo2 - lo1) * p;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * p) * Math.cos(la2 * p) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
