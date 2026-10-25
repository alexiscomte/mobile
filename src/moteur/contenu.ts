// Contenu du site hors ligne : index par langue + paquets par groupe de dossiers (assets/data/contenu/, écrits par
// outils/gen/app_contenu.py). TOUT est EMBARQUÉ dans l'appli (embarque.ts, décision d'Alexis du 11/10/2026) : la lecture marche hors ligne
// dès l'installation, sans aucun téléchargement. Les MISES À JOUR passent par le manifeste du site (maj/depot.ts, ticket #162, 26/10/2026) :
// vérification au plus une fois par jour, ou à la demande ; seuls les fichiers modifiés sont téléchargés, vérifiés (empreinte sha256) puis
// mis en service d'un coup, l'ancienne version restant en place si le téléchargement est coupé. jsonEmbarque lit la version en service.
// Un article absent de l'appareil (page toute nouvelle, avant la mise à jour) est lu sur le site, en mémoire seulement.
import { Directory, Paths } from 'expo-file-system';
import { jsonEmbarque } from '../embarque';
import type { Langue } from '../i18n';
import { derniereVerification, majQuotidienne, mettreAJourContenu, surMaj as surMajDepot, surNouveauContenu, type EtatMaj } from '../maj/depot';
import { SITE } from '../site';

export type EntreeIndex = [string, string, string, string, string];   // u, titre, description, fil, groupe
export type Article = { t: string; d: string; fil: string; h1: string; lead: string; h: string; maj: string };
// r : ancienne adresse -> nouvelle (« fr/…/x.html#ancre »), fiches pays fusionnées dans les grosses pages droits (droits_pays.py, 08/10/2026)
// v : « AAAA-MM-JJ-empreinte » ; pv : version (empreinte) de chaque paquet, par groupe
// hs / ha : numéro de signe du zodiaque / d'animal chinois -> page « horoscope du jour par signe / par animal » (12/10/2026)
type Index = { v: string; pv?: Record<string, string>; pages: EntreeIndex[]; r?: Record<string, string>; hs?: Record<string, string>; ha?: Record<string, string> };
type Paquet = { v: string; pages: Record<string, Article> };

let memIndex: Partial<Record<Langue, Index>> = {};
let memPaquets: Record<string, Paquet> = {};
const enLigne = new Map<string, Promise<Paquet | null>>();
// une mise à jour mise en service : les copies en mémoire sont relues
surNouveauContenu(() => { memIndex = {}; memPaquets = {}; });

// ancien cache des versions d'avant le 26/10/2026 (Documents/contenu) : remplacé par le dépôt des mises à jour, effacé une fois
try { const ancien = new Directory(Paths.document, 'contenu'); if (ancien.exists) ancien.delete(); } catch { /* aperçu web ou déjà effacé */ }

async function duSite<T>(nom: string): Promise<T> {
  const r = await fetch(SITE + 'assets/data/contenu/' + nom);
  if (!r.ok) throw new Error('contenu ' + r.status);
  return JSON.parse(await r.text()) as T;
}

const dateDe = (idx: Index) => idx.v.slice(0, 10);

/** L'index des pages de la langue (version en service : mise à jour téléchargée ou copie de l'appli). */
export async function index(lg: Langue): Promise<Index> {
  if (memIndex[lg]) return memIndex[lg] as Index;
  let idx = await jsonEmbarque<Index>('c/' + lg + '-index.json');
  if (!idx) { try { idx = await duSite<Index>(lg + '-index.json'); } catch { idx = null; } }   // appli sans contenu embarqué (essais)
  if (!idx) throw new Error('index indisponible');
  memIndex[lg] = idx;
  return idx;
}

/** Un paquet du site lu en ligne (une seule requête à la fois par paquet), gardé en mémoire ; null hors ligne. */
function paquetEnLigne(nom: string): Promise<Paquet | null> {
  const p = enLigne.get(nom);
  if (p) return p;
  const q = duSite<Paquet>(nom).catch(() => null).finally(() => { enLigne.delete(nom); });
  enLigne.set(nom, q);
  return q;
}

/** Le paquet en service ; si l'article cherché n'y est pas encore (page nouvelle), le paquet du site. */
async function paquet(lg: Langue, g: string, u: string): Promise<Paquet | null> {
  const nom = lg + '-' + g + '.json';
  let p: Paquet | null = memPaquets[nom] || null;
  if (!p) { p = await jsonEmbarque<Paquet>('c/' + nom); if (p) memPaquets[nom] = p; }
  if (p && p.pages[u]) return p;
  const net = await paquetEnLigne(nom);
  if (net && net.pages[u]) { memPaquets[nom] = { v: p ? p.v : net.v, pages: { ...net.pages, ...(p ? p.pages : {}) } }; return memPaquets[nom]; }
  return p;
}

/** Un article : depuis la mémoire ou l'appareil (le site ne sert qu'aux pages pas encore téléchargées). */
export async function article(lg: Langue, u: string): Promise<Article | null> {
  const idx = await index(lg);
  const vers: string | undefined = idx.r ? idx.r[u] : undefined;   // fiche fusionnée : on ouvre sa page de groupe
  const v = vers ? vers.split('#')[0] : u;
  const e = idx.pages.find((x) => x[0] === v);
  if (!e) return null;
  const p = await paquet(lg, e[4], v);
  return p ? p.pages[v] || null : null;
}

/** Mise à jour du contenu (bouton de l'écran Moi, geste « tirer pour actualiser ») : manifeste du site, fichiers modifiés seulement ;
 *  rend le nombre de fichiers téléchargés. Lève une erreur si le site ne répond pas (le contenu de l'appareil reste lisible). */
export async function toutTelecharger(_lg: Langue, progression?: (fait: number, total: number) => void): Promise<number> {
  const r = await mettreAJourContenu(progression);
  return r.telecharges;
}

export type { EtatMaj };
/** Suit l'état de la mise à jour du contenu ; rend la fonction de désabonnement. */
export const surMaj = surMajDepot;

/** Date (AAAA-MM-JJ) du contenu lu dans cette langue et date du dernier contrôle auprès du site. */
export async function infoContenu(lg: Langue): Promise<{ date: string; verifie: number }> {
  try { return { date: dateDe(await index(lg)), verifie: derniereVerification() }; } catch { return { date: '', verifie: derniereVerification() }; }
}

/** Mise à jour discrète au plus une fois par jour (au lancement de l'appli), sans message ni blocage. */
export function majArrierePlan(_lg: Langue): void { majQuotidienne(); }

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
