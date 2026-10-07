// Compte facultatif (06/10/2026), même système que le site (assets/js/compte.js, API compte_api.js) : identifiant = adresse
// électronique + mot de passe, par le service de connexion commun (connexion_oidc.js : écran web, code + PKCE, jeton d'identité
// vérifié par api/compte/oidc), ou par Google (api/compte/google). À la connexion, les données du compte
// remplissent l'appareil (profil, favoris, réponses aux sondages, scores des quiz) ; ensuite chaque changement local est renvoyé
// au compte (pousser(), appelé par profil.tsx, moteur/quiz.ts, sondages.tsx, qdj.tsx, jeu2.tsx, compat.tsx, mes-compat.tsx). Sans
// compte, rien ne change : tout reste sur l'appareil. Clé AsyncStorage « ap.compte » = { courriel, session, sync, depuis, mdp, newsletter,
// admin, messages_non_lus } (même forme que le localStorage du site).
// Synchronisation entièrement automatique depuis le 07/10/2026 (nuit, cahier specs/espace-membre-retouches-0710.md, décisions 3 et 7 :
// plus de bouton « Synchroniser maintenant ») ; « le local gagne » depuis la même nuit (cahier specs/synchro-local-0710.md) : toute
// modification faite sur l'appareil gagne, même hors ligne, même après une fermeture de l'appli, jusqu'à ce qu'elle soit envoyée ; une
// valeur NON modifiée ici n'écrase jamais ce qui a changé sur un autre appareil (envoi partiel, champ par champ). Clés : « ap.compte.sale »
// (marqueur persistant de ce qui reste à envoyer), « ap.compte.base » (dernier état convenu avec le compte), « ap.compte.empreinte »
// (hachage de la base, comparé au lancement et au passage en arrière-plan : identique = aucun appel), « ap.compte.essai » (calendrier des
// nouveaux essais). Les données du compte n'arrivent QU'À LA CONNEXION (plus de tirage au lancement ni au retour au premier plan). Mêmes
// règles que compte.js du site (voir « synchronisation » plus bas).
// Ce module n'importe ni profil.tsx ni les écrans (pas de cycle) : il prévient le contexte par surCompte().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SITE } from './site';
import { fusionnerCompat, K_CT } from './compat_tests';

export type Compte = { courriel: string; session: string;
  sync: string | null;               // dernier échange réussi avec le compte (connexion ou envoi)
  depuis?: string;
  mdp?: boolean;                     // le compte a un mot de passe (sinon l'écran « Changer mon mot de passe » n'en demande pas l'actuel)
  newsletter?: string | null;        // état de la lettre pour l'adresse du compte ('confirme' | 'attente' | 'desinscrit' | null), donné par le serveur
  admin?: boolean; messages_non_lus?: number };   // messagerie interne : compte ADMIN, fils non lus (badge de l'onglet Moi)
export type Reponse = { ok?: boolean; erreur?: string; statut: number; [k: string]: unknown };
type Score = { s?: number; n?: number; d?: string; t?: string; u?: string };
type FavoriBrut = { url?: unknown; date?: unknown; [k: string]: unknown };
type Donnees = { profil?: Record<string, unknown>; favoris?: FavoriBrut[]; scores?: Record<string, Score>; qdj?: unknown; jeu2?: unknown; compat?: unknown[] };

const K_COMPTE = 'ap.compte', K_PROFIL = 'ap.profil', K_FAVS = 'ap.favoris', K_SJ = 'ap.sondage.jeton', K_QDJ = 'ap.qdj', K_JEU2 = 'ap.jeu2';
const DELAI = 15000;           // délai d'un appel à l'API
const ATTENTE_POUSSER = 1500;  // regroupement des envois (comme le site)
const ESSAIS = 6;              // nouveaux essais d'un envoi en échec : 30 s, 1, 2, 4, 8, 10 min, puis au prochain changement
const ECHECS_SIGNALES = 3;     // échec durable : signalé discrètement dans « Mon compte » après 3 envois de suite en échec

/** Page « Confidentialité » du site par langue (section #compte), comme CONF de compte.js. */
export const CONF: Record<string, string> = {
  fr: 'fr/confidentialite.html', en: 'en/privacy.html', de: 'de/datenschutz.html', es: 'es/privacidad.html', it: 'it/privacy.html',
  pt: 'pt/privacidade.html', nl: 'nl/privacy.html', pl: 'pl/prywatnosc.html', tr: 'tr/gizlilik.html',
};
export const RX_COURRIEL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z0-9-]{2,}$/i;

/* ---- état du compte en mémoire + abonnés (le contexte de profil.tsx) ---- */
let actuel: Compte | null = null;
let charge = false;
type Evenement = 'compte' | 'donnees' | 'sync';
const abonnes = new Set<(e: Evenement) => void>();

/** S'abonne aux changements : « compte » (connexion, déconnexion, synchro), « donnees » (l'appareil a reçu les données du compte),
 *  « sync » (nombre d'envois en échec changé : echecsSynchro()). */
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
  if (typeof c.mdp === 'boolean') out.mdp = c.mdp;
  if (typeof c.newsletter === 'string') out.newsletter = c.newsletter;
  if (typeof c.admin === 'boolean') out.admin = c.admin;
  if (typeof c.messages_non_lus === 'number') out.messages_non_lus = c.messages_non_lus;
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

/* ---- API ---- */
/** Appel JSON à SITE + 'api/compte/' + chemin ; en-tête Bearer si connecté ; délai 15 s ; renvoie le JSON + statut HTTP (0 = réseau). */
export function api(chemin: string, corps?: unknown, methode?: string): Promise<Reponse> {
  return appelApi('api/compte/' + chemin, corps, methode);
}

/** Appel JSON à SITE + chemin (« api/messages/envoyer », « api/presence », « api/likes?p=… ») : en-tête Bearer si connecté, délai
 *  15 s, cache « no-store » ; renvoie le JSON + statut HTTP (0 = réseau). Client commun de messages.ts et aime.ts. */
export async function appelApi(chemin: string, corps?: unknown, methode?: string): Promise<Reponse> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const minuterie = ctrl ? setTimeout(() => ctrl.abort(), DELAI) : null;
  const entetes: Record<string, string> = { Accept: 'application/json' };
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  if (actuel) entetes.Authorization = 'Bearer ' + actuel.session;   // lu tout de suite : deconnecter() efface ensuite
  try {
    const r = await fetch(SITE + chemin, {
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

/* ---- état local envoyé au compte : { profil, favoris, scores (apq:*), qdj?, jeu2?, compat? } ---- */
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

/* ---- synchronisation « le local gagne » (07/10/2026 nuit, cahier specs/synchro-local-0710.md ; exactement les règles de compte.js) ----
   Ce qui a changé sur l'appareil depuis le dernier état convenu avec le compte (la « base », AsyncStorage ap.compte.base, sous la forme
   de forme()) est noté dans le marqueur PERSISTANT ap.compte.sale = { profil: { champ: horodatage }, scores: { id: horodatage },
   favoris, compat, qdj, jeu2: horodatage } : il survit à la fermeture de l'appli, jusqu'à ce que l'envoi réussisse. Détection : pousser()
   (appelé par profil.tsx, moteur/quiz.ts, sondages.tsx, qdj.tsx, jeu2.tsx, compat.tsx, mes-compat.tsx après chaque écriture) et
   l'EMPREINTE (ap.compte.empreinte = hachage de la base) comparée au lancement (synchroAuLancement) et au passage en arrière-plan
   (envoyerEnAttente) : empreinte identique = rien à faire, aucun appel.
   Envoi PARTIEL { donnees, partiel: 1 } (compte_api.fusionnerDonnees) : seulement ce qui est marqué, valeur locale (null = vidé, retiré) ;
   une valeur que la personne n'a pas touchée ici n'écrase donc pas ce qu'elle a changé sur un autre appareil. 1,5 s après chaque
   changement ; tout de suite au passage en arrière-plan ; au lancement s'il reste du « sale » (envoi d'abord). Succès : la base reçoit ce
   qui est parti ; le marqueur ne garde que ce qui a changé PENDANT l'envoi, qui repart. Échec (réseau, serveur) : nouvel essai après 30 s,
   1, 2, 4, 8 puis 10 min (6 au plus, puis au prochain changement ou 10 min plus tard ; calendrier gardé dans ap.compte.essai pour un
   relancement de l'appli) ; après 3 échecs de suite, « Mon compte » (components/mon-compte.tsx) le dit discrètement (syncKo). 401 : compte
   oublié (le marqueur reste : ces modifications gagneront à la prochaine connexion).
   Réception : SEULEMENT à la connexion (ouvrir : service commun, Google ; adopterCompte : connexion faite dans une page du site ouverte
   dans l'appli) ; aucune question au serveur sinon (ni au lancement, ni au retour au premier plan) : un changement fait sur un autre
   appareil arrive à la connexion suivante. À la connexion, ce qui est « sale » garde la valeur locale (même vidée, même un favori retiré) ;
   le reste est rempli par le compte comme avant. */
const K_SALE = 'ap.compte.sale', K_BASE = 'ap.compte.base', K_EMPREINTE = 'ap.compte.empreinte', K_ESSAI = 'ap.compte.essai';
const ENTIERES = ['favoris', 'compat', 'qdj', 'jeu2'] as const;     // comparées et envoyées en entier (profil, scores : champ par champ)
type Forme = { profil: Record<string, unknown>; scores: Record<string, unknown>; favoris?: unknown; compat?: unknown; qdj?: unknown; jeu2?: unknown };
type Marqueur = { profil?: Record<string, number>; scores?: Record<string, number>; favoris?: number; compat?: number; qdj?: number; jeu2?: number };
type Envoi = { profil?: Record<string, unknown>; scores?: Record<string, unknown>; favoris?: unknown; compat?: unknown; qdj?: unknown; jeu2?: unknown };

let minuteriePousser: ReturnType<typeof setTimeout> | null = null;
let minuterieReessai: ReturnType<typeof setTimeout> | null = null;
let enCours = false, echecs = 0;

function objet(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}; }
function propre(o: object, k: string): boolean { return Object.prototype.hasOwnProperty.call(o, k); }
function nul(v: unknown): boolean { return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length); }
/** Même contenu JSON, quel que soit l'ordre des clés (l'ordre des listes compte) : canon() de compte.js. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}
/** Forme comparable d'un état : un champ vide ou une liste vide = absent (forme() de compte.js). */
function forme(o: unknown): Forme {
  const e = objet(o);
  const r: Forme = { profil: {}, scores: {} };
  for (const p of ['profil', 'scores'] as const) {
    const a = objet(e[p]);
    for (const k of Object.keys(a)) if (k !== '__proto__' && !nul(a[k])) r[p][k] = a[k];
  }
  for (const p of ENTIERES) if (!nul(e[p])) r[p] = e[p];
  return r;
}
/** Empreinte (hachage de 64 bits, cyrb53 à deux moitiés) du JSON canonique : la même que compte.js. */
export function empreinte(f: unknown): string {
  const s = canon(f);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + '.' + (h1 >>> 0).toString(16);
}
function baseDe(brut: unknown, c: Compte | null): Forme | null {
  const b = objet(brut);
  return c && b.courriel === c.courriel && b.donnees && typeof b.donnees === 'object' ? (b.donnees as Forme) : null;
}
function marqueurDe(brut: unknown): Marqueur { return objet(brut) as Marqueur; }
async function garderBase(c: Compte, f: Forme) {
  await AsyncStorage.multiSet([[K_BASE, JSON.stringify({ courriel: c.courriel, donnees: f })], [K_EMPREINTE, JSON.stringify(empreinte(f))]]);
}

/* Les lectures-écritures du marqueur et de la base passent l'une après l'autre (AsyncStorage est asynchrone : deux contrôles mêlés
   pourraient perdre une marque) ; l'appel réseau, lui, se fait hors de cette file. */
let file: Promise<unknown> = Promise.resolve();
function enFile<T>(f: () => Promise<T>): Promise<T> { const p = file.then(f, f); file = p.catch(() => undefined); return p; }

/** Contrôle par l'empreinte, puis champ par champ : tient à jour le marqueur ap.compte.sale ; vrai s'il reste quelque chose à envoyer. */
function noter(): Promise<boolean> {
  return enFile(async () => {
    const c = actuel;
    if (!c) return false;
    const f = forme(await etatLocal());
    const v = new Map(await AsyncStorage.multiGet([K_BASE, K_EMPREINTE, K_SALE]));
    const b = baseDe(lireJson(v.get(K_BASE)), c), s = marqueurDe(lireJson(v.get(K_SALE)));
    if (!b) { await garderBase(c, f); return Object.keys(s).length > 0; }   // session ouverte avant cette version : l'état local devient la base
    if (empreinte(f) === lireJson(v.get(K_EMPREINTE))) { if (Object.keys(s).length) await AsyncStorage.removeItem(K_SALE); return false; }
    const n: Marqueur = {}, t = Date.now();
    for (const p of ['profil', 'scores'] as const) {
      const a = f[p], z = objet(b[p]), m0 = objet(s[p]), m: Record<string, number> = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(z)])) {
        if (canon(propre(a, k) ? a[k] : null) !== canon(propre(z, k) ? z[k] : null)) m[k] = (propre(m0, k) && Number(m0[k])) || t;
      }
      if (Object.keys(m).length) n[p] = m;
    }
    for (const p of ENTIERES) if (canon(f[p]) !== canon(nul(b[p]) ? undefined : b[p])) n[p] = Number(s[p]) || t;
    const reste = Object.keys(n).length > 0;
    if (canon(n) !== canon(s)) { if (reste) await AsyncStorage.setItem(K_SALE, JSON.stringify(n)); else await AsyncStorage.removeItem(K_SALE); }
    return reste;
  });
}
/** Ce qui part : les champs et données marqués, avec leur valeur locale (null = vidé ou retiré). */
async function chargeEnvoi(): Promise<Envoi> {
  const s = marqueurDe(lireJson(await AsyncStorage.getItem(K_SALE))), f = forme(await etatLocal()), d: Envoi = {};
  for (const p of ['profil', 'scores'] as const) {
    const m = objet(s[p]);
    if (!Object.keys(m).length) continue;
    const x: Record<string, unknown> = {};
    for (const k of Object.keys(m)) x[k] = propre(f[p], k) ? f[p][k] : null;
    d[p] = x;
  }
  for (const p of ENTIERES) if (s[p]) d[p] = propre(f, p) ? f[p] : (p === 'favoris' || p === 'compat' ? [] : null);
  return d;
}
/** Base après un envoi réussi : même règle que compte_api.fusionnerDonnees (envoi partiel) ; la liste compat telle qu'envoyée. */
function baseApres(b: Forme, d: Envoi): Forme {
  const r: Forme = { profil: { ...objet(b.profil) }, scores: { ...objet(b.scores) } };
  for (const p of ['profil', 'scores'] as const) {
    const x = d[p];
    if (x) for (const k of Object.keys(x)) { if (x[k] === null) delete r[p][k]; else r[p][k] = x[k]; }
  }
  for (const p of ENTIERES) { const v = propre(d, p) ? d[p] : b[p]; if (!nul(v)) r[p] = v; }
  return r;
}

/** Nombre d'envois de suite en échec (0 après un succès) ; « Mon compte » signale l'échec durable à partir de ECHEC_DURABLE. */
export function echecsSynchro(): number { return echecs; }
export const ECHEC_DURABLE = ECHECS_SIGNALES;
function noterEchecs(n: number) { if (n !== echecs) { echecs = n; signaler('sync'); } }
async function finEssais() { noterEchecs(0); try { await AsyncStorage.removeItem(K_ESSAI); } catch { /* stockage indisponible */ } }
/** Déconnexion, suppression, session refusée : plus rien en attente ni en nouvel essai. */
function arreterEnvois() {
  if (minuteriePousser) { clearTimeout(minuteriePousser); minuteriePousser = null; }
  if (minuterieReessai) { clearTimeout(minuterieReessai); minuterieReessai = null; }
  noterEchecs(0);
}
/** Session refusée (401) ou déconnexion : le compte est oublié sur l'appareil, avec la base, l'empreinte et le calendrier des essais (la
 *  prochaine connexion repart des données du compte) ; le marqueur reste : ce qui n'a pas pu partir gagnera à la prochaine connexion. */
async function oublierCompteLocal() {
  arreterEnvois();
  try { await AsyncStorage.multiRemove([K_BASE, K_EMPREINTE, K_ESSAI]); } catch { /* stockage indisponible */ }
  await garderCompte(null);
}
/** « Effacer mes données » (profil.tsx effacer) : l'appareil est vidé ; ses modifications non envoyées sont oubliées aussi (elles ne
 *  doivent pas effacer le compte à la prochaine connexion). */
export async function oublierSynchro(): Promise<void> {
  try { await AsyncStorage.multiRemove([K_SALE, K_BASE, K_EMPREINTE, K_ESSAI]); } catch { /* stockage indisponible */ }
}

/** À appeler après chaque changement local : le marqueur est posé tout de suite (il survit à une fermeture immédiate), l'envoi part
 *  1,5 s plus tard (regroupé) si un compte est connecté ; rien sans compte. */
export function pousser(): void {
  if (!charge) { chargerCompte().then((c) => { if (c) pousser(); }).catch(() => undefined); return; }
  if (!actuel) return;
  if (minuteriePousser) clearTimeout(minuteriePousser);
  minuteriePousser = setTimeout(() => { minuteriePousser = null; pousserMaintenant(); }, ATTENTE_POUSSER);
  noter().catch(() => undefined);   // marqueur posé tout de suite ; l'envoi refait le contrôle (rien ne part si rien n'a changé)
}

/** L'appli passe en arrière-plan (ou change d'état) : contrôle de l'empreinte, et ce qui reste à envoyer part tout de suite. Pas pendant
 *  une série d'échecs (revue du 07/10/2026 nuit : sur iPhone, chaque passage active / inactive / arrière-plan relançait l'envoi en échec,
 *  hors calendrier) : les nouveaux essais gardent leur calendrier (30 s → 10 min). */
export function envoyerEnAttente(): void {
  if (!actuel || enCours || echecs !== 0) return;
  noter().then((d) => { if (d && actuel && !enCours && echecs === 0) pousserMaintenant(); }).catch(() => undefined);
}

/** Lancement de l'appli (profil.tsx, 800 ms après le chargement) : contrôle de l'empreinte ; s'il reste du « sale », il part d'abord,
 *  sauf si un nouvel essai est déjà prévu plus tard (série d'échecs : le calendrier continue). Aucun appel si rien n'a changé. */
export async function synchroAuLancement(): Promise<void> {
  await assurer();
  if (!actuel || !(await noter())) return;
  const e = objet(lireJson(await AsyncStorage.getItem(K_ESSAI).catch(() => null)));
  const attente = Number(e.t) ? Math.min(Number(e.t) - Date.now(), 600000) : 0;
  noterEchecs(Number(e.n) > 0 ? Math.min(Number(e.n), ESSAIS + 1) : 0);
  if (attente > 0) {
    if (minuterieReessai) clearTimeout(minuterieReessai);
    minuterieReessai = setTimeout(() => { minuterieReessai = null; pousserMaintenant(); }, attente);
    return;
  }
  await pousserMaintenant();
}

async function pousserMaintenant(): Promise<void> {
  const c = actuel;
  if (!c || enCours) return;
  if (minuteriePousser) { clearTimeout(minuteriePousser); minuteriePousser = null; }
  if (minuterieReessai) { clearTimeout(minuterieReessai); minuterieReessai = null; }
  enCours = true;
  let dn: Envoi = {};
  try {
    if (!(await noter())) { enCours = false; await finEssais(); return; }   // plus rien à envoyer (changement défait)
    dn = await enFile(chargeEnvoi);
  } catch { enCours = false; return; }
  let j: Reponse;
  try { j = await api('donnees', { donnees: dn, partiel: 1 }); }
  catch { j = { ok: false, erreur: 'reseau', statut: 0 }; }
  enCours = false;
  if (!actuel || actuel.session !== c.session) { if (actuel) pousser(); return; }   // déconnecté ou autre session pendant l'envoi
  if (j.ok) {
    const moi = actuel;
    await enFile(async () => {
      const b = baseDe(lireJson(await AsyncStorage.getItem(K_BASE)), moi) || forme(await etatLocal());
      await garderBase(moi, baseApres(b, dn));
    });
    await finEssais();
    if (actuel && actuel.session === c.session) await garderCompte({ ...actuel, sync: new Date().toISOString() });
    // un changement arrivé PENDANT l'envoi est resté marqué : il repart (jamais deux fois le même envoi)
    if (await noter()) { const d2 = await enFile(chargeEnvoi); if (canon(d2) !== canon(dn)) pousser(); }
    return;
  }
  if (j.statut === 401) { await oublierCompteLocal(); return; }   // session expirée ou fermée ailleurs
  const n = echecs + 1;
  noterEchecs(n);
  const prevu = n <= ESSAIS && j.statut !== 400, attente = prevu ? Math.min(30000 * Math.pow(2, n - 1), 600000) : 600000;
  try { await AsyncStorage.setItem(K_ESSAI, JSON.stringify({ n, t: Date.now() + attente })); } catch { /* stockage indisponible */ }
  if (prevu) minuterieReessai = setTimeout(() => { minuterieReessai = null; pousserMaintenant(); }, attente);
}

/** Profil : le compte gagne quand il a une valeur non vide (fusionnerProfil de compte.js)… */
function fusionnerProfils(local: unknown, serveur: unknown): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (local && typeof local === 'object' && !Array.isArray(local)) Object.assign(p, local);
  if (serveur && typeof serveur === 'object' && !Array.isArray(serveur)) {
    for (const [k, v] of Object.entries(serveur as Record<string, unknown>)) if (v !== null && v !== undefined && v !== '') p[k] = v;
  }
  return p;
}

/** Données du compte vers l'appareil, à la connexion seulement, avec exactement les règles de compte.js (appliquer) : ce qui est marqué
 *  « sale » (modifié ici et pas encore envoyé) garde la valeur locale, même vidée ou retirée ; le reste est rempli par le compte. */
async function appliquer(j: Reponse) {
  const dn = (j.donnees && typeof j.donnees === 'object' ? j.donnees : {}) as Donnees;
  const sc = dn.scores && typeof dn.scores === 'object' && !Array.isArray(dn.scores) ? dn.scores : {};
  const clesScores = Object.keys(sc).map((id) => 'apq:' + id);
  const v = new Map(await AsyncStorage.multiGet([K_PROFIL, K_FAVS, K_QDJ, K_JEU2, K_CT, K_SALE, ...clesScores]));
  const s = marqueurDe(lireJson(v.get(K_SALE))), sp = objet(s.profil), ss = objet(s.scores);
  const ecrire: [string, string][] = [];
  // profil : fusion, le compte gagne quand il sait… sauf pour ce qui a été modifié ici (même vidé)
  const pl = objet(lireJson(v.get(K_PROFIL))), p = fusionnerProfils(pl, dn.profil);
  for (const k of Object.keys(sp)) { if (nul(pl[k])) delete p[k]; else p[k] = pl[k]; }
  ecrire.push([K_PROFIL, JSON.stringify(p)]);
  // favoris : union par url (ceux du compte d'abord), triés par date décroissante, 500 au plus ; marqués : la liste locale reste
  if (!s.favoris) {
    const locaux = lireJson(v.get(K_FAVS));
    const vus = new Set<string>(), favs: FavoriBrut[] = [];
    for (const f of [...(Array.isArray(dn.favoris) ? dn.favoris : []), ...(Array.isArray(locaux) ? locaux : [])]) {
      if (f && typeof f === 'object' && typeof f.url === 'string' && f.url && !vus.has(f.url)) { vus.add(f.url); favs.push(f); }
    }
    favs.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    ecrire.push([K_FAVS, JSON.stringify(favs.slice(0, 500))]);
  }
  // scores : le plus récent (champ d) gagne ; à égalité, le compte ; marqués (effacés ou refaits ici) : la valeur locale reste
  for (const id of Object.keys(sc)) {
    const sco = sc[id];
    if (!sco || typeof sco !== 'object' || propre(ss, id)) continue;
    const loc = lireJson(v.get('apq:' + id)) as Score | null;
    if (!loc || String(sco.d || '') >= String(loc.d || '')) ecrire.push(['apq:' + id, JSON.stringify(sco)]);
  }
  // question du jour et parties à deux : seulement si l'appareil n'en a pas (et ne les a pas effacées ici)
  if (dn.qdj && !lireJson(v.get(K_QDJ)) && !s.qdj) ecrire.push([K_QDJ, JSON.stringify(dn.qdj)]);
  if (dn.jeu2 && !lireJson(v.get(K_JEU2)) && !s.jeu2) ecrire.push([K_JEU2, JSON.stringify(dn.jeu2)]);
  // tests de compatibilité : fusion par test, la version la plus récente gagne (comme le serveur et le site)
  if (Array.isArray(dn.compat)) ecrire.push([K_CT, JSON.stringify(fusionnerCompat(dn.compat, lireJson(v.get(K_CT))))]);
  // sondages : le jeton de vote du compte, puis les votes (index du choix, en chaîne)
  if (typeof j.sondage_jeton === 'string' && j.sondage_jeton) ecrire.push([K_SJ, j.sondage_jeton]);
  const so = j.sondages && typeof j.sondages === 'object' ? (j.sondages as Record<string, unknown>) : {};
  for (const sid of Object.keys(so)) if (so[sid] !== null && so[sid] !== undefined) ecrire.push(['ap.sondage:' + sid, String(so[sid])]);
  try { await AsyncStorage.multiSet(ecrire); } catch { /* stockage indisponible */ }
}

/** Les données du compte arrivent (connexion) : posées sur l'appareil (ce qui est « sale » gagne), puis ce que le compte a devient la
 *  base ; ce que l'appareil a de plus ou de modifié est marqué et part tout de suite (envoi partiel). */
async function recevoir(j: Reponse, prenomGoogle?: string) {
  const moi = actuel;
  if (!moi) return;
  await enFile(async () => {
    await appliquer(j);
    // connexion Google : le prénom du compte Google remplit « Mes infos » seulement si l'appareil et le compte n'en ont pas (compte.js)
    if (prenomGoogle) {
      try {
        const pf = objet(lireJson(await AsyncStorage.getItem(K_PROFIL)));
        if (!pf.prenom) { pf.prenom = prenomGoogle.slice(0, 40); await AsyncStorage.setItem(K_PROFIL, JSON.stringify(pf)); }
      } catch { /* stockage indisponible */ }
    }
    await garderBase(moi, forme(j.donnees));
    try { await AsyncStorage.removeItem(K_ESSAI); } catch { /* stockage indisponible */ }
  });
}

/** Connexion faite dans une page du site ouverte dans l'appli (adopterCompte) : c'est une connexion, donc le seul cas où l'appli demande
 *  les données du compte (GET /api/compte/donnees). Faux si impossible. */
async function tirerALaConnexion(): Promise<boolean> {
  await assurer();
  const c = actuel;
  if (!c) return false;
  const j = await api('donnees', undefined, 'GET');
  if (j.statut === 401) { if (actuel && actuel.session === c.session) await oublierCompteLocal(); return false; }
  if (!j.ok || !actuel || actuel.session !== c.session) return false;
  await recevoir(j);
  if (!actuel || actuel.session !== c.session) return false;
  await garderCompte({ ...actuel, courriel: typeof j.courriel === 'string' && j.courriel ? j.courriel : actuel.courriel, sync: new Date().toISOString(),
    ...(typeof j.mdp === 'boolean' ? { mdp: j.mdp } : {}),
    ...(j.newsletter !== undefined ? { newsletter: typeof j.newsletter === 'string' ? j.newsletter : null } : {}),
    ...(typeof j.admin === 'boolean' ? { admin: j.admin } : {}),
    ...(typeof j.messages_non_lus === 'number' ? { messages_non_lus: j.messages_non_lus } : {}) });
  signaler('donnees');
  if (await noter()) pousserMaintenant();
  return true;
}

/** Connexion réussie (service commun ou Google) : garde la session, remplit l'appareil, envoie ce qui diffère (connecter de compte.js). */
async function ouvrir(j: Reponse) {
  const courriel = typeof j.courriel === 'string' ? j.courriel : '';
  const session = typeof j.session === 'string' ? j.session : '';
  if (!session) return;
  const mdp = !!j.mdp, newsletter = typeof j.newsletter === 'string' ? j.newsletter : null;
  const admin = !!j.admin, messages_non_lus = typeof j.messages_non_lus === 'number' ? j.messages_non_lus : 0;
  arreterEnvois();
  const depuis = new Date().toISOString().slice(0, 10);
  await garderCompte({ courriel, session, sync: null, depuis, mdp, newsletter, admin, messages_non_lus });
  await recevoir(j, typeof j.prenom_google === 'string' ? j.prenom_google : '');
  await garderCompte({ courriel, session, sync: new Date().toISOString(), depuis, mdp, newsletter, admin, messages_non_lus });
  signaler('donnees');
  noter().then((d) => { if (d) pousserMaintenant(); }).catch(() => undefined);
}

/** Client de l'appli auprès du service de connexion commun (connexion_oidc.js) : public, code + PKCE, retour par le schéma de l'appli. */
export const OIDC = {
  client: 'affectionplus-appli',
  retour: 'com.affectionplus.app:/connexion',
  decouverte: { authorizationEndpoint: SITE + 'connexion/auth', tokenEndpoint: SITE + 'connexion/token' },
};

/** Ouvre la session de l'appli avec le jeton d'identité du service commun. Erreurs : jeton (401), trop, reseau. */
export async function connecterOidc(idToken: string): Promise<Reponse> {
  const jetonLocal = (await AsyncStorage.getItem(K_SJ).catch(() => null)) || '';
  const j = await api('oidc', { id_token: idToken, client_id: OIDC.client, jeton_local: jetonLocal, appareil: 'appli' });
  if (j.ok) await ouvrir(j);
  return j;
}

/** Nombre de fils non lus après une lecture de la messagerie (badge de l'onglet Moi). */
export async function noterNonLus(n: number, admin?: boolean): Promise<void> {
  await assurer();
  if (actuel && (actuel.messages_non_lus !== n || (admin !== undefined && actuel.admin !== admin))) {
    await garderCompte({ ...actuel, messages_non_lus: n, ...(admin !== undefined ? { admin } : {}) });
  }
}

/** Session refusée par le serveur (401 : expirée, supprimée) : le compte est oublié sur l'appareil s'il s'agit toujours de la même. */
export async function oublierSession(session: string): Promise<void> {
  await assurer();
  if (actuel && actuel.session === session) await oublierCompteLocal();
}

/** Présence (activite_api.js, 07/10/2026 soir) : POST /api/presence {appareil:'appli'}, appelé toutes les 60 s par le contexte quand
 *  l'appli est au premier plan et qu'un compte est connecté ; met à jour le nombre de fils non lus (badge de l'onglet Moi) ; 401 = la
 *  session est oubliée. Renvoie le pays déduit de l'adresse IP (code ISO à deux lettres) ou null. */
export async function presence(): Promise<string | null> {
  await assurer();
  const c = actuel;
  if (!c) return null;
  const j = await appelApi('api/presence', { appareil: 'appli' });
  if (!actuel || actuel.session !== c.session) return null;   // déconnecté entre-temps
  if (j.statut === 401) { await oublierCompteLocal(); return null; }
  if (!j.ok) return null;
  if (typeof j.messages_non_lus === 'number' && j.messages_non_lus !== actuel.messages_non_lus) {
    await garderCompte({ ...actuel, messages_non_lus: j.messages_non_lus });
  }
  return typeof j.pays_ip === 'string' && /^[A-Z]{2}$/.test(j.pays_ip) ? j.pays_ip : null;
}

/** La lettre pour l'adresse du compte connecté : abonnement direct (adresse prouvée par la session, case cochée par la personne) ou
 *  désabonnement ; POST /api/compte/newsletter. Erreurs : consentement, session, trop, indisponible, reseau. */
export async function lettre(abonne: boolean, langue: string): Promise<Reponse> {
  await assurer();
  const j = await api('newsletter', abonne ? { abonne: true, consentement: 'oui', langue, page: 'appli' } : { abonne: false });
  if (j.ok && actuel) await garderCompte({ ...actuel, newsletter: typeof j.newsletter === 'string' ? j.newsletter : null });
  return j;
}

/** Change (ou crée) le mot de passe du compte connecté (POST /api/compte/mot-de-passe, même route que le site). Erreurs : court (400),
 *  actuel (401 : actuel faux, ou absent alors que le compte en a un), session (401), trop (429 : 5 essais faux par heure et par compte,
 *  10 par adresse IP), reseau. */
export async function changerMdp(ancien: string, nouveau: string): Promise<Reponse> {
  await assurer();
  const j = await api('mot-de-passe', { actuel: ancien, nouveau });
  if (j.ok && actuel) await garderCompte({ ...actuel, mdp: true });
  return j;
}

/** Le serveur dit que le compte a un mot de passe (posé ailleurs entre-temps) : l'écran « Changer mon mot de passe » demande l'actuel. */
export async function noterMdp(): Promise<void> {
  await assurer();
  if (actuel && !actuel.mdp) await garderCompte({ ...actuel, mdp: true });
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

/** Déconnexion : ce qui attend encore part d'abord (4 s au plus ; ce qui n'a pas pu partir reste marqué et gagnera à la prochaine
 *  connexion), puis la session est fermée sur le serveur ; les données restent sur l'appareil. */
export async function deconnecter(): Promise<void> {
  await assurer();
  if (!actuel) return;
  try {
    if (await noter()) await Promise.race([pousserMaintenant(), new Promise<void>((r) => setTimeout(r, 4000))]);
  } catch { /* rien : la déconnexion continue */ }
  if (!actuel) return;
  api('deconnexion', {}).catch(() => undefined);   // l'en-tête est lu avant l'effacement ci-dessous
  await oublierCompteLocal();
}

/** Suppression du compte sur le serveur (POST /api/compte/supprimer, après la confirmation de « Mon compte ») : tout ce que le compte
 *  garde est effacé (informations, messages, j'aime, historique de connexion, abonnement à la lettre) ; les données de l'appareil
 *  restent. { ok } si c'est fait ; { ok: false, erreur: 'session' } si la session n'existait déjà plus (compte oublié sur l'appareil, rien
 *  de supprimé : il faut se reconnecter) ; sinon { ok: false, erreur: 'trop' | 'reseau' | … }. */
export async function supprimer(): Promise<{ ok: boolean; erreur?: string }> {
  await assurer();
  if (!actuel) return { ok: false, erreur: 'session' };
  const j = await api('supprimer', {});
  if (j.ok || j.statut === 401) {
    if (j.ok) await AsyncStorage.removeItem(K_SALE).catch(() => undefined);   // compte effacé : plus rien à lui envoyer
    await oublierCompteLocal();
    // 401 : la session était déjà fermée (expirée, mot de passe changé ailleurs) : RIEN n'a été supprimé (revue du 07/10/2026 nuit)
    return j.ok ? { ok: true } : { ok: false, erreur: 'session' };
  }
  return { ok: false, erreur: typeof j.erreur === 'string' ? j.erreur : 'reseau' };
}

/** La page du site ouverte dans l'appli a changé « ap.compte » (connexion, déconnexion) : l'appli reprend la session.
 *  La date de synchro de la page n'est pas reprise : elle dit que la vue web a reçu le compte, pas l'appareil (scores, votes…). */
export async function adopterCompte(brut: string | null): Promise<void> {
  await assurer();
  const c = nettoyerCompte(lireJson(brut));
  if (!c) { if (actuel) await oublierCompteLocal(); return; }
  if (!actuel || actuel.session !== c.session) {   // connexion faite dans la page : c'est une connexion, l'appli reçoit les données du compte
    arreterEnvois();
    await garderCompte({ courriel: c.courriel, session: c.session, sync: null, depuis: c.depuis });
    tirerALaConnexion().catch(() => undefined);
    return;
  }
  if (c.courriel && c.courriel !== actuel.courriel) await garderCompte({ ...actuel, courriel: c.courriel });
}
