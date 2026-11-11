/* global __dirname */
// Contrat entre l'appli et le site (comptes unifiés, lot 7, 11/11/2026) : le script que l'appli injecte AVANT le chargement d'une page de sa vue web
// (src/site.ts injectionAvant), puis le VRAI compte.js du site (dépôt « affection », jsdom), sur trois chargements successifs, ne doivent RIEN effacer
// dans la page, et le propriétaire de la page doit se stabiliser sous la forme « c:<numéro> » avec « a » = empreinte de l'adresse, comme dans l'appli.
// Cas A : la page apprend le numéro du compte la première (envoi de ses modifications non envoyées) ; cas B : l'appli le connaît déjà, la page est encore
// à l'ancienne forme (rien à envoyer). Les deux sessions de départ n'ont pas de numéro côté page.
// Ce contrôle a besoin du dépôt du site et de jsdom (outils de test du dépôt « claude »), à côté de ce dépôt ; sinon il est ignoré (AP_DEPOT_SITE et
// AP_JSDOM peuvent donner d'autres chemins). Aucun réseau : le serveur du compte est un faux ; temps accéléré par 20 dans la page, qui attend ses minuteries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const DEPOT_SITE = process.env.AP_DEPOT_SITE || path.join(__dirname, '..', '..', 'affection');
const JSDOM_DOSSIER = process.env.AP_JSDOM || path.join(__dirname, '..', '..', 'claude', 'outils', 'tests', 'node_modules', 'jsdom');
const COMPTE_JS = path.join(DEPOT_SITE, 'assets', 'js', 'compte.js');
const ABSENT = !fs.existsSync(COMPTE_JS) ? 'compte.js du site absent : ' + COMPTE_JS : !fs.existsSync(JSDOM_DOSSIER) ? 'jsdom absent : ' + JSDOM_DOSSIER : false;

function transpiler(fichier) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', fichier), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}
function charger(source, modules, globaux = {}) {
  const sortie = {};
  const noms = Object.keys(globaux);
  new Function('exports', 'require', ...noms, source)(sortie, (n) => { assert.ok(modules[n], 'dépendance connue : ' + n); return modules[n]; }, ...noms.map((n) => globaux[n]));
  return sortie;
}

const ANCIENNE = 'camille@example.test';
const FAV_A = { url: '/fr/a.html', titre: 'A', date: '2026-01-01' }, FAV_B = { url: '/fr/b.html', titre: 'B', date: '2026-11-10' };
// données que l'injection EFFACERAIT si elle prenait le propriétaire de la page pour un autre (et qu'elle ne remet jamais) : elles doivent survivre telles quelles
const SENTINELLES = { 'ap.qdj': { serie: 5 }, 'ap.jeu2': { parties: [1] }, 'apq:test1': { s: 80, d: '2026-11-01' }, 'ap.lettre': { etat: 'x' }, 'ap.messages': [], 'ap.compat': [{ id: 'x', m: 1 }] };
const SENTINELLES_BRUTES = { 'ap.sondage:7': '1', 'ap.sondage.jeton': 'jeton-de-la-page', ap_naissance: '1990-01-01' };
const valeurDeDepart = (k) => (k in SENTINELLES_BRUTES ? SENTINELLES_BRUTES[k] : JSON.stringify(SENTINELLES[k]));

/** L'appli : le vrai compte.ts et le vrai site.ts, stockage en mémoire, aucun appel réseau permis. */
function appli(stockage) {
  const memoire = new Map(Object.entries(stockage).map(([k, v]) => [k, JSON.stringify(v)]));
  const asyncStorage = {
    getItem: async (k) => memoire.get(k) ?? null, setItem: async (k, v) => { memoire.set(k, v); }, removeItem: async (k) => { memoire.delete(k); },
    multiGet: async (cles) => cles.map((k) => [k, memoire.get(k) ?? null]), multiSet: async (paires) => { paires.forEach(([k, v]) => memoire.set(k, v)); },
    multiRemove: async (cles) => { cles.forEach((k) => memoire.delete(k)); }, getAllKeys: async () => [...memoire.keys()],
  };
  const appels = [];
  const modules = { '@react-native-async-storage/async-storage': asyncStorage, './site': { SITE: 'https://compte.example/' }, './catalogue.json': { langues: [], site: '', pages: {} } };
  modules['./compat_tests'] = charger(transpiler('compat_tests.ts'), modules);
  const api = charger(transpiler('compte.ts'), modules, { fetch: async (u) => { appels.push(String(u)); throw new Error('appel réseau imprévu de l’appli : ' + u); } });
  const site = charger(transpiler('site.ts'), modules);
  return { api, site, appels, memoire, lu: (k) => (memoire.has(k) ? JSON.parse(memoire.get(k)) : null) };
}

/** Un chargement de la page : script injecté avant (état de l'appli à cet instant, comme vue-site.tsx), vrai compte.js, script injecté après ; la page
 *  garde son localStorage et son sessionStorage d'un chargement à l'autre (même vue web). */
async function chargement(app, depart, journal) {
  const { JSDOM, VirtualConsole } = require(JSDOM_DOSSIER);
  const dom = new JSDOM('<!doctype html><html lang="fr"><head><script src="../../assets/js/compte.js"></script></head><body><section id="esp-compte"></section></body></html>',
    { url: 'https://compte.example/fr/mon-compte/mes-infos.html?app=1', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  for (const [k, v] of depart.local) w.localStorage.setItem(k, v);
  for (const [k, v] of depart.session) w.sessionStorage.setItem(k, v);
  // temps accéléré par 20 (800 ms → 40 ms), les minuteries en attente sont suivies pour que la page les ait toutes passées avant les contrôles
  const reel = { st: w.setTimeout.bind(w), ct: w.clearTimeout.bind(w) }, enAttente = new Set();
  w.setTimeout = (f, ms, ...a) => { const id = reel.st(() => { enAttente.delete(id); f(...a); }, Math.max(1, Math.round((ms || 0) / 20))); enAttente.add(id); return id; };
  w.clearTimeout = (id) => { enAttente.delete(id); reel.ct(id); };
  w.fetch = async (url, o = {}) => {
    const u = new URL(String(url), w.location.href), methode = o.method || 'GET';
    journal.push(methode + ' ' + u.pathname);
    if (u.pathname === '/api/compte/donnees' && methode === 'POST') return { ok: true, status: 200, json: async () => ({ ok: true, maj: new Date().toISOString(), id: 42 }) };   // routeDonneesEcrire : { ok, maj, id }
    if (u.pathname === '/api/annuaire/etat') return { ok: true, status: 200, json: async () => ({ ok: true, abonnement: { actif: false } }) };
    return { ok: false, status: 404, json: async () => ({ ok: false }) };
  };
  const messages = [], recus = [];
  w.ReactNativeWebView = { postMessage: (s) => messages.push(JSON.parse(s)) };
  w.eval(app.site.injectionAvant({ prenom: 'Camille', bio: 'Appli' }, [FAV_A], app.api.compteActuel(), app.api.proprioLocal(), app.api.proprioLocalAdresse()));
  w.eval(fs.readFileSync(COMPTE_JS, 'utf8'));
  w.eval(app.site.INJECTION_APRES);
  // ce que fait vue-site.tsx à chaque message de la page : propriétaire reconnu (profil et favoris repris) ou non, puis session reprise (adopterCompte)
  const traiter = async () => { while (messages.length) { const m = messages.shift(); recus.push(app.api.memeProprioPage(m.proprio, m.proprioA)); if (m.compteChange) await app.api.adopterCompte(m.compte ?? null); } };
  for (let tour = 0; ; tour++) {
    assert.ok(tour < 400, 'les minuteries de la page ne finissent jamais');
    await new Promise((r) => setTimeout(r, 5));
    await traiter();
    if (enAttente.size) continue;
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));   // fin des promesses de la page (faux serveur)
    await traiter();
    if (!enAttente.size) break;
  }
  const copie = (s) => { const m = new Map(); for (let i = 0; i < s.length; i++) { const k = s.key(i); m.set(k, s.getItem(k)); } return m; };
  const etat = { local: copie(w.localStorage), session: copie(w.sessionStorage), recus };
  w.close();
  return etat;
}

async function scenario(t, { appConnaitLeNumero, pageAEnvoyer }) {
  const FP = appli({}).api.idDe(ANCIENNE);
  const app = appli({
    'ap.compte': { ...(appConnaitLeNumero ? { id: 42 } : {}), courriel: ANCIENNE, session: 'S1', sync: null, depuis: '2026-11-01' },
    'ap.compte.proprio': appConnaitLeNumero ? { id: 'c:42', a: FP } : { id: FP },
    'ap.profil': { prenom: 'Camille', bio: 'Appli' }, 'ap.favoris': [FAV_A],
  });
  await app.api.chargerCompte();
  // vue web telle qu'une version précédente de l'appli l'a laissée : propriétaire = empreinte de l'adresse, session sans numéro, données des jeux et des votes
  const local = new Map();
  const poser = (k, v) => local.set(k, JSON.stringify(v));
  poser('ap.compte', { courriel: ANCIENNE, session: 'S1', sync: '2026-11-01T00:00:00.000Z', depuis: '2026-11-01' });
  poser('ap.compte.proprio', { id: FP });
  poser('ap.profil', { prenom: 'Camille', bio: 'Appli', ...(pageAEnvoyer ? { ville: 'Page' } : {}) });   // « ville » et le favori B : modifications de la page pas encore envoyées
  poser('ap.favoris', pageAEnvoyer ? [FAV_A, FAV_B] : [FAV_A]);
  poser('ap.compte.base', { courriel: ANCIENNE, donnees: { profil: { prenom: 'Camille', bio: 'Appli' }, scores: { test1: SENTINELLES['apq:test1'] }, favoris: [FAV_A],
    qdj: SENTINELLES['ap.qdj'], jeu2: SENTINELLES['ap.jeu2'], compat: SENTINELLES['ap.compat'] } });
  for (const [k, v] of Object.entries(SENTINELLES)) poser(k, v);
  for (const [k, v] of Object.entries(SENTINELLES_BRUTES)) local.set(k, v);
  const journal = [], chargements = [];
  let etat = { local, session: new Map() };
  for (let n = 1; n <= 3; n++) {
    etat = await chargement(app, etat, journal);
    const cle = (m, k) => (m.has(k) ? JSON.parse(m.get(k)) : null);
    chargements.push({
      n,
      efface: [...Object.keys(SENTINELLES), ...Object.keys(SENTINELLES_BRUTES)].filter((k) => etat.local.get(k) !== valeurDeDepart(k)),
      proprioPage: cle(etat.local, 'ap.compte.proprio'), idPage: (cle(etat.local, 'ap.compte') || {}).id,
      appli: { id: app.api.compteActuel().id, proprio: app.lu('ap.compte.proprio') },
      marques: [etat.session.get('ap.app'), etat.session.get('ap.app.proprio')], reconnu: etat.recus, profil: cle(etat.local, 'ap.profil'),
    });
  }
  t.diagnostic(JSON.stringify(chargements));
  return { chargements, journal, app, FP };
}

for (const [nom, options] of [
  ['A : la page apprend le numéro du compte la première, l’appli le reçoit de la page', { appConnaitLeNumero: false, pageAEnvoyer: true }],
  ['B : l’appli connaît déjà le numéro, la page le reçoit de l’appli', { appConnaitLeNumero: true, pageAEnvoyer: false }],
]) {
  test('appli à jour + vrai compte.js du site, trois chargements de la vue web sans numéro puis avec numéro — ' + nom, { skip: ABSENT }, async (t) => {
    const { chargements, journal, app, FP } = await scenario(t, options);
    const final = { id: 'c:42', a: FP };
    for (const c of chargements) {
      assert.deepEqual(c.efface, [], 'chargement ' + c.n + ' : rien n’est effacé dans la page');
      assert.deepEqual(c.marques, ['1', 'c'], 'chargement ' + c.n + ' : « ap.app » = 1 et le signal « ap.app.proprio » = c');
      assert.ok(c.reconnu.length > 0 && c.reconnu.every((x) => x === true), 'chargement ' + c.n + ' : la page est toujours reconnue comme celle de l’appli (profil et favoris repris)');
      assert.deepEqual(c.proprioPage, final, 'chargement ' + c.n + ' : propriétaire de la page = c:<numéro> avec l’empreinte de l’adresse');
      assert.equal(c.idPage, 42, 'chargement ' + c.n + ' : la session de la page porte le numéro du compte');
      assert.deepEqual(c.appli, { id: 42, proprio: final }, 'chargement ' + c.n + ' : l’appli connaît le numéro et son propriétaire est le même');
      assert.equal(c.profil.bio, 'Appli');
    }
    assert.equal(chargements[2].profil.ville, options.pageAEnvoyer ? 'Page' : undefined, 'la modification de la page est gardée');
    // (la page lit aussi l'état Premium du compte, GET /api/annuaire/etat : lecture sans rapport avec les données de l'appareil)
    assert.deepEqual(journal.filter((r) => r !== 'GET /api/annuaire/etat'), options.pageAEnvoyer ? ['POST /api/compte/donnees'] : [],
      'seule la page envoie ses modifications non envoyées (une fois), jamais rien de plus');
    assert.equal(app.appels.length, 0, 'l’appli n’a fait aucun appel réseau');
  });
}
