// Contenu du site hors ligne : index par langue + paquets par groupe de dossiers (assets/data/contenu/, écrits par
// outils/gen/app_contenu.py). TOUT est EMBARQUÉ dans l'appli (embarque.ts, décision d'Alexis du 11/10/2026) : la lecture marche hors ligne
// dès l'installation, sans aucun téléchargement. Le réseau ne sert qu'aux MISES À JOUR : l'index du site est comparé à celui de
// l'appli (au plus une fois par jour, sans bloquer la lecture) et seuls les paquets modifiés sont téléchargés, puis gardés dans le dossier de
// l'application (expo-file-system). Un paquet est valable si sa version (empreinte) est celle annoncée par l'index (`pv`, sinon `v`).
import { Directory, File, Paths } from 'expo-file-system';
import { jsonEmbarque } from '../embarque';
import type { Langue } from '../i18n';
import { SITE } from '../site';

export type EntreeIndex = [string, string, string, string, string];   // u, titre, description, fil, groupe
export type Article = { t: string; d: string; fil: string; h1: string; lead: string; h: string; maj: string };
// r : ancienne adresse -> nouvelle (« fr/…/x.html#ancre »), fiches pays fusionnées dans les grosses pages droits (droits_pays.py, 08/10/2026)
// v : « AAAA-MM-JJ-empreinte » ; pv : version (empreinte) de chaque paquet, par groupe
// hs / ha : numéro de signe du zodiaque / d'animal chinois -> page « horoscope du jour par signe / par animal » (12/10/2026)
type Index = { v: string; pv?: Record<string, string>; pages: EntreeIndex[]; r?: Record<string, string>; hs?: Record<string, string>; ha?: Record<string, string> };
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
  const data = JSON.parse(texte) as T;                   // illisible : on n'écrase rien
  try { fichier(nom).write(texte); } catch { /* pas de place : on garde seulement en mémoire */ }
  return data;
}

const dateDe = (idx: Index) => idx.v.slice(0, 10);
/** Le plus récent des deux index (à date égale, `b` : celui du site, téléchargé après la construction de l'appli). */
function plusRecent(a: Index | null, b: Index | null): Index | null {
  if (!a) return b;
  if (!b) return a;
  return dateDe(a) > dateDe(b) ? a : b;
}
const versionPaquet = (idx: Index, g: string) => (idx.pv ? idx.pv[g] : idx.v);

/** Compare l'index du site à celui qu'on utilise et garde le plus récent ; vrai si le site a répondu. Ne lève jamais d'erreur. */
async function rafraichirIndex(lg: Langue): Promise<boolean> {
  try {
    const net = await telecharger<Index>(lg + '-index.json');
    const actuel = memIndex[lg] || null;
    if (!actuel || net.v !== actuel.v) memIndex[lg] = plusRecent(actuel, net) as Index;
    return true;
  } catch { return false; }
}

/** L'index des pages de la langue : celui de l'appli ou, s'il est plus récent, celui déjà téléchargé ; mis à jour en arrière-plan. */
export async function index(lg: Langue): Promise<Index> {
  if (memIndex[lg]) return memIndex[lg] as Index;
  const [emb, local] = await Promise.all([jsonEmbarque<Index>('c/' + lg + '-index.json'), lireLocal<Index>(lg + '-index.json')]);
  let idx = plusRecent(emb, local ? local.data : null);
  if (!idx) { try { idx = await telecharger<Index>(lg + '-index.json'); } catch { idx = null; } }   // appli sans contenu embarqué (essais)
  if (!idx) throw new Error('index indisponible');
  memIndex[lg] = idx;
  if (!local || local.age > DUREE_INDEX) rafraichirIndex(lg).catch(() => undefined);   // sans attendre : la lecture ne dépend pas du réseau
  return idx;
}

/** Un paquet à la version voulue : mémoire, téléchargé, embarqué, sinon le site ; à défaut, la meilleure version disponible hors ligne. */
async function paquet(lg: Langue, g: string, idx: Index): Promise<Paquet | null> {
  const nom = lg + '-' + g + '.json';
  const voulue = versionPaquet(idx, g);
  const m = memPaquets[nom];
  if (m && m.v === voulue) return m;
  const local = await lireLocal<Paquet>(nom);
  if (local && local.data.v === voulue) return (memPaquets[nom] = local.data);
  const emb = await jsonEmbarque<Paquet>('c/' + nom);
  if (emb && emb.v === voulue) return (memPaquets[nom] = emb);
  try { return (memPaquets[nom] = await telecharger<Paquet>(nom)); } catch { /* hors ligne : on se rabat sur l'ancienne version */ }
  const reste = m || (local ? local.data : null) || emb;
  if (reste) memPaquets[nom] = reste;
  return reste;
}

/** Un article : depuis la mémoire, l'appareil ou l'appli (le site ne sert qu'aux mises à jour). */
export async function article(lg: Langue, u: string): Promise<Article | null> {
  const idx = await index(lg);
  const vers: string | undefined = idx.r ? idx.r[u] : undefined;   // fiche fusionnée : on ouvre sa page de groupe
  const v = vers ? vers.split('#')[0] : u;
  const e = idx.pages.find((x) => x[0] === v);
  if (!e) return null;
  const p = await paquet(lg, e[4], idx);
  return p ? p.pages[v] || null : null;
}

/** Mise à jour du contenu de la langue (bouton de l'écran Moi) : compare l'index du site, télécharge les seuls paquets modifiés ; rend le
 *  nombre de paquets vérifiés. Lève une erreur si le site ne répond pas (le contenu embarqué reste lisible). */
export async function toutTelecharger(lg: Langue, progression?: (fait: number, total: number) => void): Promise<number> {
  noter({ enCours: true });
  try {
    const n = await toutTelechargerSansEtat(lg, progression);
    noter({ enCours: false, verifie: Date.now() });
    return n;
  } catch (e) { noter({ enCours: false }); throw e; }
}

async function toutTelechargerSansEtat(lg: Langue, progression?: (fait: number, total: number) => void): Promise<number> {
  await index(lg);
  if (!(await rafraichirIndex(lg))) throw new Error('hors ligne');
  const idx = memIndex[lg] as Index;
  const groupes = [...new Set(idx.pages.map((x) => x[4]))];
  let n = 0;
  for (const g of groupes) {
    const nom = lg + '-' + g + '.json';
    const voulue = versionPaquet(idx, g);
    const local = await lireLocal<Paquet>(nom);
    let ok = !!local && local.data.v === voulue;
    if (!ok) { const emb = await jsonEmbarque<Paquet>('c/' + nom); ok = !!emb && emb.v === voulue; }
    if (!ok) { try { memPaquets[nom] = await telecharger<Paquet>(nom); } catch { /* on continue */ } }
    n++;
    if (progression) progression(n, groupes.length);
  }
  return n;
}

// ---- état de la mise à jour (indicateur discret de l'écran Moi, 12/10/2026 : recommandations d'Apple sur les chargements)
export type EtatMaj = { enCours: boolean; verifie: number };   // verifie : dernier contact réussi avec le site (ms), 0 = inconnu
let etatMaj: EtatMaj = { enCours: false, verifie: 0 };
const abonnes = new Set<(e: EtatMaj) => void>();
function noter(e: Partial<EtatMaj>): void { etatMaj = { ...etatMaj, ...e }; abonnes.forEach((f) => f(etatMaj)); }
/** Suit l'état de la mise à jour du contenu ; rend la fonction de désabonnement. */
export function surMaj(f: (e: EtatMaj) => void): () => void { abonnes.add(f); f(etatMaj); return () => { abonnes.delete(f); }; }
/** Date (AAAA-MM-JJ) du contenu lu dans cette langue et date du dernier contrôle auprès du site (fichier de l'index téléchargé). */
export async function infoContenu(lg: Langue): Promise<{ date: string; verifie: number }> {
  try {
    const idx = await index(lg);
    let verifie = etatMaj.verifie;
    if (!verifie) { try { const f = fichier(lg + '-index.json'); if (f.exists) verifie = (f.info().modificationTime || 0) * 1000; } catch { /* inconnu */ } }
    return { date: dateDe(idx), verifie };
  } catch { return { date: '', verifie: 0 }; }
}

/** Mise à jour discrète au plus une fois par jour (au lancement de l'appli), sans message ni blocage. */
let derniereMaj = 0;
export function majArrierePlan(lg: Langue): void {
  if (Date.now() - derniereMaj < DUREE_INDEX) return;
  derniereMaj = Date.now();
  toutTelecharger(lg).catch(() => { derniereMaj = 0; });
}

/** Ancre de la nouvelle adresse d'une fiche fusionnée (table « r » de l'index : « page#ancre »), sinon '' (09/10/2026). */
export async function ancreRedirigee(lg: Langue, u: string): Promise<string> {
  const idx = await index(lg);
  const v = idx.r ? idx.r[u] : undefined;
  const i = v ? v.indexOf('#') : -1;
  return v && i >= 0 ? v.slice(i + 1) : '';
}

/** Pages « horoscope du jour » par signe (0-11) et par animal chinois (0-11) de la langue, si l'index les connaît (12/10/2026). */
export async function pagesHoroscope(lg: Langue): Promise<{ signes: Record<number, string>; animaux: Record<number, string> }> {
  const vide = { signes: {}, animaux: {} };
  try {
    const idx = await index(lg);
    const table = (t?: Record<string, string>) => Object.fromEntries(Object.entries(t || {}).map(([n, u]) => [Number(n), u])) as Record<number, string>;
    return { signes: table(idx.hs), animaux: table(idx.ha) };
  } catch { return vide; }
}

/** L'ancre d'une adresse (« …/x.html#mariage-civil » -> « mariage-civil »), décodée ; '' sans ancre. */
export function ancreDe(url: string): string {
  const i = url.indexOf('#');
  if (i < 0) return '';
  try { return decodeURIComponent(url.slice(i + 1)); } catch { return url.slice(i + 1); }
}

/** Une adresse absolue du site -> chemin de page (fr/…/x.html) ou null. */
export function cheminDe(url: string): string | null {
  if (!url.startsWith(SITE)) return null;
  const rel = url.slice(SITE.length).split('#')[0].split('?')[0];
  return /^[a-z]{2}\/.*\.html$/.test(rel) ? rel : null;
}
