// Contenu du site hors ligne : index par langue + paquets par groupe de dossiers (assets/data/contenu/, écrits par
// outils/gen/app_contenu.py), téléchargés à la demande et gardés dans le dossier de l'application (expo-file-system).
import { Directory, File, Paths } from 'expo-file-system';
import type { Langue } from '../i18n';
import { SITE } from '../site';

export type EntreeIndex = [string, string, string, string, string];   // u, titre, description, fil, groupe
export type Article = { t: string; d: string; fil: string; h1: string; lead: string; h: string; maj: string };
// r : ancienne adresse -> nouvelle (« fr/…/x.html#ancre »), fiches pays fusionnées dans les grosses pages droits (droits_pays.py, 08/10/2026)
type Index = { v: string; pages: EntreeIndex[]; r?: Record<string, string> };
type Paquet = { v: string; pages: Record<string, Article> };

const memIndex: Partial<Record<Langue, Index>> = {};
const memPaquets: Record<string, Paquet> = {};
const DUREE_INDEX = 24 * 3600 * 1000;

function dossier(): Directory {
  const d = new Directory(Paths.document, 'contenu');
  try { if (!d.exists) d.create(); } catch { /* existe déjà */ }
  return d;
}
function fichier(nom: string): File { return new File(dossier(), nom); }

async function lireLocal<T>(nom: string): Promise<{ data: T; age: number } | null> {
  try {
    const f = fichier(nom);
    if (!f.exists) return null;
    const info = f.info();
    const age = Date.now() - (info.modificationTime || 0) * 1000;
    return { data: JSON.parse(await f.text()) as T, age };
  } catch { return null; }
}
async function telecharger<T>(nom: string): Promise<T> {
  const r = await fetch(SITE + 'assets/data/contenu/' + nom);
  if (!r.ok) throw new Error('contenu ' + r.status);
  const texte = await r.text();
  try { fichier(nom).write(texte); } catch { /* pas de place : on garde seulement en mémoire */ }
  return JSON.parse(texte) as T;
}

/** L'index des pages de la langue (téléchargé au plus une fois par jour, sinon lu sur l'appareil). */
export async function index(lg: Langue): Promise<Index> {
  if (memIndex[lg]) return memIndex[lg] as Index;
  const nom = lg + '-index.json';
  const local = await lireLocal<Index>(nom);
  let idx: Index | null = local && local.age < DUREE_INDEX ? local.data : null;
  if (!idx) { try { idx = await telecharger<Index>(nom); } catch { idx = local ? local.data : null; } }
  if (!idx) throw new Error('index indisponible');
  memIndex[lg] = idx;
  return idx;
}

/** Un article : depuis la mémoire, l'appareil, ou le site (le paquet du groupe est alors gardé pour la suite). */
export async function article(lg: Langue, u: string): Promise<Article | null> {
  const idx = await index(lg);
  const vers: string | undefined = idx.r ? idx.r[u] : undefined;   // fiche fusionnée : on ouvre sa page de groupe
  const v = vers ? vers.split('#')[0] : u;
  const e = idx.pages.find((x) => x[0] === v);
  if (!e) return null;
  const nom = lg + '-' + e[4] + '.json';
  let p = memPaquets[nom];
  if (!p) {
    const local = await lireLocal<Paquet>(nom);
    p = local && local.data.v === idx.v ? local.data : await telecharger<Paquet>(nom).catch(() => (local ? local.data : (null as unknown as Paquet)));
    if (!p) return null;
    memPaquets[nom] = p;
  }
  return p.pages[v] || null;
}

/** Télécharge tous les paquets de la langue (lecture hors ligne complète) ; rend le nombre de paquets obtenus. */
export async function toutTelecharger(lg: Langue, progression?: (fait: number, total: number) => void): Promise<number> {
  const idx = await index(lg);
  const groupes = [...new Set(idx.pages.map((x) => x[4]))];
  let n = 0;
  for (const g of groupes) {
    const nom = lg + '-' + g + '.json';
    const local = await lireLocal<Paquet>(nom);
    if (!(local && local.data.v === idx.v)) { try { memPaquets[nom] = await telecharger<Paquet>(nom); } catch { /* on continue */ } }
    n++;
    if (progression) progression(n, groupes.length);
  }
  return n;
}

/** Une adresse absolue du site -> chemin de page (fr/…/x.html) ou null. */
export function cheminDe(url: string): string | null {
  if (!url.startsWith(SITE)) return null;
  const rel = url.slice(SITE.length).split('#')[0].split('?')[0];
  return /^[a-z]{2}\/.*\.html$/.test(rel) ? rel : null;
}
