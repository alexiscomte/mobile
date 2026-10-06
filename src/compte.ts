// Compte facultatif (06/10/2026), même système que le site (assets/js/compte.js, API compte_api.js) : identifiant = adresse
// électronique, prouvée par un code reçu par courriel (ou par Google), sans mot de passe. À la connexion, les données du compte
// remplissent l'appareil (profil, favoris, réponses aux sondages, scores des quiz) ; ensuite chaque changement local est renvoyé
// au compte (pousser(), appelé par profil.tsx, moteur/quiz.ts, sondages.tsx, qdj.tsx, jeu2.tsx). Sans compte, rien ne change :
// tout reste sur l'appareil. Clé AsyncStorage « ap.compte » = { courriel, session, sync } (même forme que le localStorage du site).
// Ce module n'importe ni profil.tsx ni les écrans (pas de cycle) : il prévient le contexte par surCompte().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SITE } from './site';
import { fusionnerCompat, K_CT } from './compat_tests';

export type Compte = { courriel: string; session: string; sync: string | null; depuis?: string };
export type Reponse = { ok?: boolean; erreur?: string; statut: number; [k: string]: unknown };
type Score = { s?: number; n?: number; d?: string; t?: string; u?: string };
type FavoriBrut = { url?: unknown; date?: unknown; [k: string]: unknown };
type Donnees = { profil?: Record<string, unknown>; favoris?: FavoriBrut[]; scores?: Record<string, Score>; qdj?: unknown; jeu2?: unknown; compat?: unknown[] };

const K_COMPTE = 'ap.compte', K_PROFIL = 'ap.profil', K_FAVS = 'ap.favoris', K_SJ = 'ap.sondage.jeton', K_QDJ = 'ap.qdj', K_JEU2 = 'ap.jeu2';
const DELAI = 15000;           // délai d'un appel à l'API
const ATTENTE_POUSSER = 1500;  // regroupement des envois (comme le site)
const AGE_TIRER = 10 * 60 * 1000;

/** Page « Confidentialité » du site par langue (section #compte), comme CONF de compte.js. */
export const CONF: Record<string, string> = {
  fr: 'fr/confidentialite.html', en: 'en/privacy.html', de: 'de/datenschutz.html', es: 'es/privacidad.html', it: 'it/privacy.html',
  pt: 'pt/privacidade.html', nl: 'nl/privacy.html', pl: 'pl/prywatnosc.html', tr: 'tr/gizlilik.html',
};
export const RX_COURRIEL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z0-9-]{2,}$/i;

/* ---- état du compte en mémoire + abonnés (le contexte de profil.tsx) ---- */
let actuel: Compte | null = null;
let charge = false;
type Evenement = 'compte' | 'donnees';
const abonnes = new Set<(e: Evenement) => void>();

/** S'abonne aux changements : « compte » (connexion, déconnexion, synchro), « donnees » (l'appareil a reçu les données du compte). */
export function surCompte(f: (e: Evenement) => void): () => void {
  abonnes.add(f);
  return () => { abonnes.delete(f); };
}
function signaler(e: Evenement) { abonnes.forEach((f) => { try { f(e); } catch { /* abonné en erreur */ } }); }

function nettoyerCompte(x: unknown): Compte | null {
  if (!x || typeof x !== 'object') return null;
  const c = x as Record<string, unknown>;
  if (typeof c.session !== 'string' || !c.session) return null;
  const out: Compte = { courriel: typeof c.courriel === 'string' ? c.courriel : '', session: c.session, sync: typeof c.sync === 'string' ? c.sync : null };
  if (typeof c.depuis === 'string') out.depuis = c.depuis;
  return out;
}
function lireJson(v: string | null | undefined): unknown {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

/** Lit « ap.compte » (appelé une fois par le contexte au démarrage, avant d'afficher quoi que ce soit). */
export async function chargerCompte(): Promise<Compte | null> {
  try { actuel = nettoyerCompte(lireJson(await AsyncStorage.getItem(K_COMPTE))); } catch { actuel = null; }
  charge = true;
  return actuel;
}
async function assurer() { if (!charge) await chargerCompte(); }
export function compteActuel(): Compte | null { return actuel; }

async function garderCompte(c: Compte | null) {
  actuel = c;
  try { if (c) await AsyncStorage.setItem(K_COMPTE, JSON.stringify(c)); else await AsyncStorage.removeItem(K_COMPTE); } catch { /* stockage indisponible */ }
  signaler('compte');
}

/** Vrai si la dernière synchronisation date de plus de 10 minutes (règle du site au chargement d'une page). */
export function synchroAncienne(c: Compte | null = actuel): boolean {
  if (!c) return false;
  const t = c.sync ? new Date(c.sync).getTime() : NaN;
  return isNaN(t) || Date.now() - t > AGE_TIRER;
}

/* ---- API ---- */
/** Appel JSON à SITE + 'api/compte/' + chemin ; en-tête Bearer si connecté ; délai 15 s ; renvoie le JSON + statut HTTP (0 = réseau). */
export async function api(chemin: string, corps?: unknown, methode?: string): Promise<Reponse> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const minuterie = ctrl ? setTimeout(() => ctrl.abort(), DELAI) : null;
  const entetes: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (actuel) entetes.Authorization = 'Bearer ' + actuel.session;   // lu tout de suite : deconnecter() efface ensuite
  try {
    const r = await fetch(SITE + 'api/compte/' + chemin, {
      method: methode || 'POST', headers: entetes, cache: 'no-store',
      body: corps !== undefined ? JSON.stringify(corps) : undefined, signal: ctrl ? ctrl.signal : undefined,
    });
    let j: unknown;
    try { j = await r.json(); } catch { j = null; }
    const o = j && typeof j === 'object' && !Array.isArray(j) ? (j as Record<string, unknown>) : { ok: false, erreur: 'reseau' };
    return { ...o, statut: r.status } as Reponse;
  } catch {
    return { ok: false, erreur: 'reseau', statut: 0 };
  } finally {
    if (minuterie) clearTimeout(minuterie);
  }
}

/* ---- état local envoyé au compte : { profil, favoris, scores (apq:*), qdj?, jeu2? } ---- */
async function etatLocal(): Promise<Donnees> {
  const cles = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('apq:'));
  const paires = await AsyncStorage.multiGet([K_PROFIL, K_FAVS, K_QDJ, K_JEU2, K_CT, ...cles]);
  const v = new Map(paires);
  const profil = lireJson(v.get(K_PROFIL));
  const favoris = lireJson(v.get(K_FAVS));
  const scores: Record<string, Score> = {};
  for (const k of cles) { const s = lireJson(v.get(k)); if (s && typeof s === 'object') scores[k.slice(4)] = s as Score; }
  const o: Donnees = {
    profil: profil && typeof profil === 'object' && !Array.isArray(profil) ? (profil as Record<string, unknown>) : {},
    favoris: Array.isArray(favoris) ? favoris : [],
    scores,
  };
  const q = lireJson(v.get(K_QDJ)); if (q) o.qdj = q;
  const j = lireJson(v.get(K_JEU2)); if (j) o.jeu2 = j;
  const ct = lireJson(v.get(K_CT)); if (Array.isArray(ct) && ct.length) o.compat = ct;   // tests de compatibilité enregistrés (06/10/2026)
  return o;
}

/** Profil : le compte gagne quand il a une valeur non vide (fusionnerProfil de compte.js). */
function fusionnerProfils(local: unknown, serveur: unknown): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (local && typeof local === 'object' && !Array.isArray(local)) Object.assign(p, local);
  if (serveur && typeof serveur === 'object' && !Array.isArray(serveur)) {
    for (const [k, v] of Object.entries(serveur as Record<string, unknown>)) if (v !== null && v !== undefined && v !== '') p[k] = v;
  }
  return p;
}

/** Pose sur l'appareil les données reçues du compte, avec exactement les règles de compte.js (appliquer). */
async function appliquer(j: Reponse) {
  const dn = (j.donnees && typeof j.donnees === 'object' ? j.donnees : {}) as Donnees;
  const sc = dn.scores && typeof dn.scores === 'object' && !Array.isArray(dn.scores) ? dn.scores : {};
  const clesScores = Object.keys(sc).map((id) => 'apq:' + id);
  const v = new Map(await AsyncStorage.multiGet([K_PROFIL, K_FAVS, K_QDJ, K_JEU2, K_CT, ...clesScores]));
  const ecrire: [string, string][] = [];
  // profil : fusion, le compte gagne quand il sait
  ecrire.push([K_PROFIL, JSON.stringify(fusionnerProfils(lireJson(v.get(K_PROFIL)), dn.profil))]);
  // favoris : union par url (ceux du compte d'abord), triés par date décroissante, 500 au plus
  const locaux = lireJson(v.get(K_FAVS));
  const vus = new Set<string>(), favs: FavoriBrut[] = [];
  for (const f of [...(Array.isArray(dn.favoris) ? dn.favoris : []), ...(Array.isArray(locaux) ? locaux : [])]) {
    if (f && typeof f === 'object' && typeof f.url === 'string' && f.url && !vus.has(f.url)) { vus.add(f.url); favs.push(f); }
  }
  favs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  ecrire.push([K_FAVS, JSON.stringify(favs.slice(0, 500))]);
  // scores : le plus récent (champ d) gagne ; à égalité, le compte
  for (const id of Object.keys(sc)) {
    const s = sc[id];
    if (!s || typeof s !== 'object') continue;
    const loc = lireJson(v.get('apq:' + id)) as Score | null;
    if (!loc || String(s.d || '') >= String(loc.d || '')) ecrire.push(['apq:' + id, JSON.stringify(s)]);
  }
  // question du jour et parties à deux : seulement si l'appareil n'en a pas
  if (dn.qdj && !lireJson(v.get(K_QDJ))) ecrire.push([K_QDJ, JSON.stringify(dn.qdj)]);
  if (dn.jeu2 && !lireJson(v.get(K_JEU2))) ecrire.push([K_JEU2, JSON.stringify(dn.jeu2)]);
  // tests de compatibilité : fusion par test, la version la plus récente gagne (comme le serveur et le site)
  if (Array.isArray(dn.compat)) ecrire.push([K_CT, JSON.stringify(fusionnerCompat(dn.compat, lireJson(v.get(K_CT))))]);
  // sondages : le jeton de vote du compte, puis les votes (index du choix, en chaîne)
  if (typeof j.sondage_jeton === 'string' && j.sondage_jeton) ecrire.push([K_SJ, j.sondage_jeton]);
  const s = j.sondages && typeof j.sondages === 'object' ? (j.sondages as Record<string, unknown>) : {};
  for (const sid of Object.keys(s)) if (s[sid] !== null && s[sid] !== undefined) ecrire.push(['ap.sondage:' + sid, String(s[sid])]);
  try { await AsyncStorage.multiSet(ecrire); } catch { /* stockage indisponible */ }
}

/* ---- synchronisation ---- */
let minuteriePousser: ReturnType<typeof setTimeout> | null = null;
let sale = false, enCours = false, rejouer = false;

/** À appeler après chaque changement local : envoi regroupé (1,5 s) si un compte est connecté, rien sinon. */
export function pousser(): void {
  if (!charge) { chargerCompte().then((c) => { if (c) pousser(); }).catch(() => undefined); return; }
  if (!actuel) return;
  sale = true;
  if (enCours) { rejouer = true; return; }
  if (minuteriePousser) clearTimeout(minuteriePousser);
  minuteriePousser = setTimeout(() => { minuteriePousser = null; pousserMaintenant(); }, ATTENTE_POUSSER);
}

async function pousserMaintenant(): Promise<void> {
  const c = actuel;
  if (!c || !sale || enCours) return;
  enCours = true; sale = false;
  try {
    const j = await api('donnees', { donnees: await etatLocal() });
    if (j.ok) { if (actuel && actuel.session === c.session) await garderCompte({ ...actuel, sync: new Date().toISOString() }); }
    else if (j.statut === 401) { if (actuel && actuel.session === c.session) await garderCompte(null); }
    else sale = true;   // réseau : repartira au prochain changement ou à la prochaine synchro
  } catch {
    sale = true;
  } finally {
    enCours = false;
  }
  if (rejouer) { rejouer = false; pousser(); }   // un changement est arrivé pendant l'envoi
}

/** Récupère les données du compte, les pose sur l'appareil, puis renvoie l'union au compte. Faux si impossible. */
export async function tirer(): Promise<boolean> {
  await assurer();
  const c = actuel;
  if (!c) return false;
  const j = await api('donnees', undefined, 'GET');
  if (j.statut === 401) { if (actuel && actuel.session === c.session) await garderCompte(null); return false; }
  if (!j.ok) return false;
  if (!actuel || actuel.session !== c.session) return false;   // déconnecté entre-temps
  await appliquer(j);
  await garderCompte({ ...actuel, courriel: typeof j.courriel === 'string' && j.courriel ? j.courriel : actuel.courriel, sync: new Date().toISOString() });
  signaler('donnees');
  sale = true;
  if (enCours) rejouer = true;   // un envoi est en route : l'union repartira juste après
  else await pousserMaintenant();   // l'union locale repart vers le compte
  return true;
}

/** Connexion réussie (code ou Google) : garde la session, remplit l'appareil, renvoie l'union (connecter de compte.js). */
async function ouvrir(j: Reponse) {
  const courriel = typeof j.courriel === 'string' ? j.courriel : '';
  const session = typeof j.session === 'string' ? j.session : '';
  if (!session) return;
  await garderCompte({ courriel, session, sync: null, depuis: new Date().toISOString().slice(0, 10) });
  await appliquer(j);
  // connexion Google : le prénom du compte Google remplit « Mes infos » seulement si l'appareil et le compte n'en ont pas (compte.js)
  if (typeof j.prenom_google === 'string' && j.prenom_google) {
    try {
      const pf = (lireJson(await AsyncStorage.getItem(K_PROFIL)) || {}) as Record<string, unknown>;
      if (!pf.prenom) { pf.prenom = j.prenom_google.slice(0, 40); await AsyncStorage.setItem(K_PROFIL, JSON.stringify(pf)); }
    } catch { /* stockage indisponible */ }
  }
  await garderCompte({ courriel, session, sync: new Date().toISOString(), depuis: actuel?.depuis });
  signaler('donnees');
  sale = true;
  if (enCours) rejouer = true; else pousserMaintenant();
}

/** Demande un code par courriel. Erreurs : consentement (409), courriel (400), trop (429), courrier (503), reseau. */
export function envoyerCode(courriel: string, langue: string, consentement: boolean): Promise<Reponse> {
  return api('code', { courriel: courriel.trim().toLowerCase(), langue, consentement: consentement ? 'oui' : '', site: '' });
}

/** Connexion par le code à 6 chiffres. Erreurs : code, expire (401), trop, reseau. */
export async function connecter(courriel: string, code: string): Promise<Reponse> {
  const jetonLocal = (await AsyncStorage.getItem(K_SJ).catch(() => null)) || '';
  const j = await api('connexion', { courriel: courriel.trim().toLowerCase(), code: code.replace(/\D/g, ''), jeton_local: jetonLocal, appareil: 'appli' });
  if (j.ok) await ouvrir(j);
  return j;
}

/** Connexion par le jeton d'identité Google. Erreurs : consentement (409, compte à créer), google (401), trop, reseau. */
export async function connecterGoogle(credential: string, langue: string, consentement: boolean): Promise<Reponse> {
  const jetonLocal = (await AsyncStorage.getItem(K_SJ).catch(() => null)) || '';
  const corps: Record<string, string> = { credential, langue, jeton_local: jetonLocal, appareil: 'appli' };
  if (consentement) corps.consentement = 'oui';
  const j = await api('google', corps);
  if (j.ok) await ouvrir(j);
  return j;
}

/** Déconnexion : la session est fermée sur le serveur, les données restent sur l'appareil. */
export async function deconnecter(): Promise<void> {
  await assurer();
  if (!actuel) return;
  api('deconnexion', {}).catch(() => undefined);   // l'en-tête est lu avant l'effacement ci-dessous
  if (minuteriePousser) { clearTimeout(minuteriePousser); minuteriePousser = null; }
  sale = false; rejouer = false;
  await garderCompte(null);
}

/** Suppression du compte sur le serveur (les données de l'appareil sont gardées). Vrai si c'est fait. */
export async function supprimer(): Promise<boolean> {
  await assurer();
  if (!actuel) return true;
  const j = await api('supprimer', {});
  if (j.ok || j.statut === 401) {
    if (minuteriePousser) { clearTimeout(minuteriePousser); minuteriePousser = null; }
    sale = false; rejouer = false;
    await garderCompte(null);
    return true;
  }
  return false;
}

/** La page du site ouverte dans l'appli a changé « ap.compte » (connexion, déconnexion) : l'appli reprend la session.
 *  La date de synchro de la page n'est pas reprise : elle dit que la vue web a reçu le compte, pas l'appareil (scores, votes…). */
export async function adopterCompte(brut: string | null): Promise<void> {
  await assurer();
  const c = nettoyerCompte(lireJson(brut));
  if (!c) { if (actuel) await garderCompte(null); return; }
  if (!actuel || actuel.session !== c.session) {   // connexion faite dans la page : l'appli récupère les données du compte
    await garderCompte({ courriel: c.courriel, session: c.session, sync: null, depuis: c.depuis });
    tirer().catch(() => undefined);
    return;
  }
  if (c.courriel && c.courriel !== actuel.courriel) await garderCompte({ ...actuel, courriel: c.courriel });
}
