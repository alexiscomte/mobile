/* global __dirname */
// Authentification mobile (23/11/2026, projets/keycloak/MOBILE_AUTHENTICATION.md du dépôt claude) : jeton de session AffectionPlus dans le
// stockage sécurisé (Keychain / Keystore, src/session-sure.ts), jamais en clair dans AsyncStorage, avec migration transparente des sessions
// gardées en clair par la version précédente ; session refusée (401) = retour à l'état déconnecté ; déconnexion révoquée sur le serveur ;
// refus de connexion du serveur (compte suspendu, adresse à confirmer…) traduits en messages clairs dans les neuf langues.
// Le vrai compte.ts et le vrai connexion.ts tournent sous Node ; seuls le stockage natif, le coffre et la frontière HTTP sont remplacés.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const { CLE, coffreSur, lie } = require('./aide-coffre.cjs');

const SRC = path.join(__dirname, '..', 'src');
const transpiler = (f) => ts.transpileModule(fs.readFileSync(path.join(SRC, f), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const COMPTE = transpiler('compte.ts'), CONNEXION = transpiler('connexion.ts');

function charger(js, modules, globaux = {}) {
  const exp = {};
  const noms = ['exports', 'require', ...Object.keys(globaux)];
  new Function(...noms, js)(exp, (n) => { assert.ok(modules[n], 'dépendance connue : ' + n); return modules[n]; }, ...Object.values(globaux));
  return exp;
}

/** Un appareil : AsyncStorage et coffre en mémoire, HTTP scripté (« chemin » → { statut, corps }). */
function appareil(t, { stockage = {}, coffre: depart = {}, coffreRefuse = false, coffreIllisible = false, effacementRefuse = false, routes = {}, ecritureRefusee = () => false } = {}) {
  const memoire = new Map(Object.entries(stockage).map(([k, v]) => [k, JSON.stringify(v)]));
  const asyncStorage = {
    getItem: async (k) => memoire.get(k) ?? null, setItem: async (k, v) => { if (ecritureRefusee(k)) throw new Error('disque plein'); memoire.set(k, v); }, removeItem: async (k) => { memoire.delete(k); },
    multiGet: async (cles) => cles.map((k) => [k, memoire.get(k) ?? null]), multiSet: async (p) => { p.forEach(([k, v]) => memoire.set(k, v)); },
    multiRemove: async (cles) => { cles.forEach((k) => memoire.delete(k)); }, getAllKeys: async () => [...memoire.keys()],
  };
  // le VRAI session-sure.ts au-dessus d'un faux Keychain / Keystore
  const sur = coffreSur(depart, { refuseEcriture: coffreRefuse, refuseLecture: coffreIllisible, refuseEffacement: effacementRefuse });
  const coffre = sur.coffre, sure = sur.module;
  const appels = [];
  const fetch = async (url, o = {}) => {
    const chemin = String(url).replace('https://compte.example/', '');
    appels.push({ chemin, session: String((o.headers || {}).Authorization || '').replace('Bearer ', ''), corps: o.body ? JSON.parse(o.body) : undefined });
    const r = routes[chemin];
    if (!r) throw new Error('appel réseau imprévu : ' + chemin);
    return { status: r.statut, json: async () => r.corps };
  };
  const minuteries = new Set();
  const st = (f, ms) => { const h = setTimeout(() => { minuteries.delete(h); f(); }, ms); minuteries.add(h); return h; };
  const ct = (h) => { minuteries.delete(h); clearTimeout(h); };
  t.after(() => { minuteries.forEach(clearTimeout); });
  const modules = { '@react-native-async-storage/async-storage': asyncStorage, './site': { SITE: 'https://compte.example/' }, './session-sure': sure,
    './compat_tests': { K_CT: 'ap.compat', fusionnerCompat: (a) => a } };
  const api = charger(COMPTE, modules, { fetch, setTimeout: st, clearTimeout: ct });
  const lu = (k) => (memoire.has(k) ? JSON.parse(memoire.get(k)) : null);
  return { api, memoire, coffre, appels, lu, sur };
}
const ancienCompte = { id: 42, courriel: 'camille@example.test', session: 'S-ancienne', sync: null, depuis: '2026-11-01', mdp: true };
async function repos() { for (let i = 0; i < 60; i++) await new Promise((r) => setImmediate(r)); }

test('migration : une session gardée en clair passe dans le coffre et disparaît d’AsyncStorage, sans déconnecter', async (t) => {
  const { api, coffre, lu, sur } = appareil(t, { stockage: { 'ap.compte': ancienCompte } });
  const c = await api.chargerCompte();
  assert.equal(c.session, 'S-ancienne');
  assert.equal(c.courriel, 'camille@example.test');
  assert.deepEqual(sur.contenu(), { jeton: 'S-ancienne', id: '42', courriel: 'camille@example.test', lie: true }, 'jeton rangé avec son compte');
  assert.equal(lu('ap.compte').session, undefined, 'plus de jeton en clair');
  assert.equal(lu('ap.compte').id, 42);
  // lancement suivant : lu depuis le coffre
  const { api: api2 } = appareil(t, { stockage: { 'ap.compte': lu('ap.compte') }, coffre: { [CLE]: coffre.get(CLE) } });
  assert.equal((await api2.chargerCompte()).session, 'S-ancienne');
});

test('migration : coffre indisponible → rien n’est effacé, la session continue (nouvel essai au prochain lancement)', async (t) => {
  const { api, lu } = appareil(t, { stockage: { 'ap.compte': ancienCompte }, coffreRefuse: true });
  assert.equal((await api.chargerCompte()).session, 'S-ancienne');
  assert.equal(lu('ap.compte').session, 'S-ancienne');
});

test('appareil restauré (jeton resté sur l’ancien appareil) : déconnecté proprement, plus de compte sans jeton', async (t) => {
  const { session, ...sans } = ancienCompte; void session;
  const { api, memoire } = appareil(t, { stockage: { 'ap.compte': sans } });
  assert.equal(await api.chargerCompte(), null);
  assert.equal(memoire.has('ap.compte'), false);
});

test('connexion par Keycloak : la session reçue va dans le coffre seulement', async (t) => {
  const { api, coffre, lu, appels } = appareil(t, { routes: {
    'api/compte/oidc': { statut: 200, corps: { ok: true, session: 'S-neuve', id: 7, courriel: 'sam@example.test', donnees: {}, sondages: {} } },
    'api/compte/donnees': { statut: 200, corps: { ok: true, id: 7 } } } });
  await api.chargerCompte();
  const j = await api.connecterOidc('jeton-identite');
  await repos();
  assert.equal(j.ok, true);
  assert.equal(appels[0].chemin, 'api/compte/oidc');
  assert.equal(appels[0].corps.client_id, 'affectionplus-appli');
  assert.deepEqual(JSON.parse(coffre.get(CLE)), { j: 'S-neuve', id: '7', a: 'sam@example.test' });
  assert.equal(lu('ap.compte').session, undefined);
  assert.doesNotMatch(JSON.stringify(lu('ap.compte')), /S-neuve|jeton-identite/);
});

test('session expirée ou révoquée (401) : compte oublié, coffre vidé, l’appli revient à « Se connecter »', async (t) => {
  const { api, coffre, memoire } = appareil(t, { stockage: { 'ap.compte': { ...ancienCompte, session: undefined } }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/presence': { statut: 401, corps: { ok: false, erreur: 'session' } } } });
  await api.chargerCompte();
  assert.equal(await api.presence(), null);
  assert.equal(api.compteActuel(), null);
  assert.equal(coffre.has(CLE), false);
  assert.equal(memoire.has('ap.compte'), false);
});

test('déconnexion : session révoquée sur le serveur avec le jeton (attendue avant de rendre la main), coffre vidé', async (t) => {
  const { api, coffre, memoire, appels } = appareil(t, { stockage: { 'ap.compte': { ...ancienCompte, session: undefined } }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/compte/deconnexion': { statut: 200, corps: { ok: true } }, 'api/compte/donnees': { statut: 200, corps: { ok: true } } } });
  await api.chargerCompte();
  await api.deconnecter();
  const d = appels.find((a) => a.chemin === 'api/compte/deconnexion');   // sans attendre : l'appel est parti et revenu avant la fin de deconnecter()
  assert.ok(d, 'POST /api/compte/deconnexion appelé');
  assert.equal(d.session, 'S-ancienne');
  assert.equal(coffre.has(CLE), false);
  assert.equal(memoire.has('ap.compte'), false);
});

/* ---- jeton lié à son compte : jamais le compte B avec la session de A ---- */
const sansSession = (c) => { const o = { ...c }; delete o.session; return o; };
const REP_B = { ok: true, session: 'S-B', id: 8, courriel: 'bob@example.test', donnees: {}, sondages: {} };

test('coffre refusé à la connexion d’un autre compte : le jeton du premier n’y reste pas, et B n’est jamais relancé avec la session de A', async (t) => {
  const { api, coffre, lu, sur } = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/compte/oidc': { statut: 200, corps: REP_B }, 'api/compte/donnees': { statut: 200, corps: { ok: true, id: 8 } } } });
  await api.chargerCompte();
  sur.etat.refuseEcriture = true;                       // le Keychain / Keystore refuse d'écrire à partir d'ici
  assert.equal((await api.connecterOidc('jeton-identite')).ok, true);
  await repos();
  assert.equal(api.compteActuel().session, 'S-B', 'la session vit en mémoire pour ce lancement');
  assert.equal(coffre.has(CLE), false, 'le jeton de A est retiré du coffre');
  assert.equal(lu('ap.compte').session, undefined, 'jamais en clair');
  // lancement suivant : pas de jeton pour B → déconnecté proprement
  const suite = appareil(t, { stockage: { 'ap.compte': lu('ap.compte') } });
  assert.equal(await suite.api.chargerCompte(), null);
  assert.equal(suite.memoire.has('ap.compte'), false);
});

test('coffre qui refuse l’écriture ET l’effacement : le jeton de A resté dans le coffre n’est jamais rendu au compte B', async (t) => {
  const { api, coffre, lu, sur } = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/compte/oidc': { statut: 200, corps: REP_B }, 'api/compte/donnees': { statut: 200, corps: { ok: true, id: 8 } } } });
  await api.chargerCompte();
  sur.etat.refuseEcriture = true; sur.etat.refuseEffacement = true;
  await api.connecterOidc('jeton-identite');
  await repos();
  assert.equal(sur.jeton(), 'S-ancienne', 'le coffre garde le jeton de A (il refuse tout)');
  assert.equal(lu('ap.compte').id, 8);
  // lancement suivant, coffre de nouveau disponible : « ap.compte » dit B, le coffre dit A → rien n'est rendu, tout est effacé
  const suite = appareil(t, { stockage: { 'ap.compte': lu('ap.compte') }, coffre: { [CLE]: coffre.get(CLE) } });
  assert.equal(await suite.api.chargerCompte(), null, 'jamais B avec la session de A');
  assert.equal(suite.coffre.has(CLE), false);
  assert.equal(suite.memoire.has('ap.compte'), false);
});

test('coffre non vide sans compte (Keychain d’iOS resté après une désinstallation) : vidé au lancement, personne n’est connecté', async (t) => {
  const { api, coffre } = appareil(t, { coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') } });
  assert.equal(await api.chargerCompte(), null);
  assert.equal(coffre.has(CLE), false);
  // même chose pour un jeton rangé seul (version de travail)
  const seul = appareil(t, { coffre: { [CLE]: 'S-seul' } });
  assert.equal(await seul.api.chargerCompte(), null);
  assert.equal(seul.coffre.has(CLE), false);
});

test('coffre illisible pour l’instant (lireSession() undefined) : personne n’est connecté pour ce lancement, rien n’est effacé', async (t) => {
  const { api, coffre, lu } = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') }, coffreIllisible: true });
  assert.equal(await api.chargerCompte(), null);
  assert.equal(lu('ap.compte').id, 42, '« ap.compte » gardé');
  assert.equal(coffre.has(CLE), true, 'coffre intact');
  // lancement suivant, coffre lisible : la session est retrouvée
  const suite = appareil(t, { stockage: { 'ap.compte': lu('ap.compte') }, coffre: { [CLE]: coffre.get(CLE) } });
  assert.equal((await suite.api.chargerCompte()).session, 'S-ancienne');
});

test('même compte : adresse changée ou numéro appris depuis le rangement → le jeton est rendu et le coffre réécrit', async (t) => {
  // adresse changée (le numéro fait foi)
  const a = appareil(t, { stockage: { 'ap.compte': { ...sansSession(ancienCompte), courriel: 'nouvelle@example.test' } }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') } });
  assert.equal((await a.api.chargerCompte()).session, 'S-ancienne');
  assert.deepEqual(a.sur.contenu(), { jeton: 'S-ancienne', id: '42', courriel: 'nouvelle@example.test', lie: true });
  // numéro inconnu au rangement (serveur plus ancien) : l'adresse fait foi
  const b = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: lie('S-ancienne', undefined, 'Camille@Example.test') } });
  assert.equal((await b.api.chargerCompte()).session, 'S-ancienne');
  assert.equal(b.sur.contenu().id, '42');
  // jeton rangé seul par la version de travail : accepté une fois, puis lié
  const c = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: 'S-ancienne' } });
  assert.equal((await c.api.chargerCompte()).session, 'S-ancienne');
  assert.equal(c.sur.contenu().lie, true);
  // autre numéro, même adresse : refusé
  const d = appareil(t, { stockage: { 'ap.compte': { ...sansSession(ancienCompte), id: 43 } }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') } });
  assert.equal(await d.api.chargerCompte(), null);
});

test('migration refusée par le coffre puis synchro : la copie en clair d’origine reste, la session n’est pas perdue au lancement suivant', async (t) => {
  const { api, lu, coffre, sur } = appareil(t, { stockage: { 'ap.compte': ancienCompte }, coffreRefuse: true,
    routes: { 'api/compte/newsletter': { statut: 200, corps: { ok: true, newsletter: 'confirme' } } } });
  await api.chargerCompte();
  await api.lettre(true, 'fr');                         // n'importe quel garderCompte() pendant que le coffre refuse
  assert.equal(lu('ap.compte').session, 'S-ancienne', 'la copie en clair laissée par l’ancienne version n’est pas effacée');
  assert.equal(lu('ap.compte').newsletter, 'confirme');
  assert.equal(coffre.has(CLE), false);
  // le coffre répond de nouveau : le jeton y passe et quitte AsyncStorage
  sur.etat.refuseEcriture = false;
  await api.lettre(true, 'fr');
  assert.equal(sur.jeton(), 'S-ancienne');
  assert.equal(lu('ap.compte').session, undefined);
});

test('migration : AsyncStorage refuse l’écriture de nettoyage → la session continue et le propriétaire des données est lu quand même', async (t) => {
  const { api, sur } = appareil(t, { stockage: { 'ap.compte': ancienCompte, 'ap.compte.proprio': { id: 'c:42' } }, ecritureRefusee: (k) => k === 'ap.compte' });
  const c = await api.chargerCompte();
  assert.equal(c.session, 'S-ancienne');
  assert.equal(api.compteActuel().session, 'S-ancienne');
  assert.equal(api.proprioLocal(), 'c:42', 'le propriétaire n’est pas pris pour un invité');
  assert.equal(sur.jeton(), 'S-ancienne');
});

test('chargements simultanés : un seul passage, même résultat', async (t) => {
  const { api, coffre } = appareil(t, { stockage: { 'ap.compte': ancienCompte } });
  const [a, b] = await Promise.all([api.chargerCompte(), api.chargerCompte()]);
  assert.equal(a, b);
  assert.equal(a.session, 'S-ancienne');
  assert.equal(coffre.size, 1);
});

test('déconnexion pendant la réception des données de la connexion : la session n’est pas réécrite', async (t) => {
  let lacher; const attente = new Promise((r) => { lacher = r; });
  const { api, coffre, memoire } = appareil(t, { routes: {
    'api/compte/oidc': { statut: 200, corps: { ok: true, session: 'S-neuve', id: 7, courriel: 'sam@example.test', donnees: {}, sondages: {} } },
    'api/compte/deconnexion': { statut: 200, corps: { ok: true } }, 'api/compte/donnees': { statut: 200, corps: { ok: true, id: 7 } } } });
  await api.chargerCompte();
  const desabonner = api.surCompte((e) => { if (e === 'compte' && api.compteActuel() && !lacher.fait) { lacher.fait = true; lacher(); } });
  const connexion = api.connecterOidc('jeton-identite');
  await attente;                                        // le compte vient d'être affiché, les données arrivent encore
  await api.deconnecter();
  await connexion; await repos(); desabonner();
  assert.equal(api.compteActuel(), null);
  assert.equal(coffre.has(CLE), false);
  assert.equal(memoire.has('ap.compte'), false);
});

test('import du profil par un réseau relié à un AUTRE compte : ni la session ni les données ne changent, la session ouverte par le serveur est refermée', async (t) => {
  const { api, appels, lu, sur } = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte), 'ap.profil': { prenom: 'Camille' } }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/compte/oidc': { statut: 200, corps: REP_B }, 'api/compte/deconnexion': { statut: 200, corps: { ok: true } } } });
  await api.chargerCompte();
  const j = await api.connecterOidc('jeton-identite', true);
  await repos();
  assert.deepEqual([j.ok, j.erreur], [false, 'autre_compte']);
  assert.equal(api.compteActuel().session, 'S-ancienne');
  assert.equal(sur.jeton(), 'S-ancienne');
  assert.deepEqual(lu('ap.profil'), { prenom: 'Camille' });
  const fermee = appels.find((a) => a.chemin === 'api/compte/deconnexion');
  assert.equal(fermee && fermee.session, 'S-B', 'la session du compte B est refermée avec SON jeton');
  // même compte : l'import ouvre la session comme une connexion
  const meme = appareil(t, { stockage: { 'ap.compte': sansSession(ancienCompte) }, coffre: { [CLE]: lie('S-ancienne', 42, 'camille@example.test') },
    routes: { 'api/compte/oidc': { statut: 200, corps: { ...REP_B, id: 42, courriel: 'camille@example.test', session: 'S-2' } }, 'api/compte/donnees': { statut: 200, corps: { ok: true, id: 42 } } } });
  await meme.api.chargerCompte();
  assert.equal((await meme.api.connecterOidc('jeton-identite', true)).ok, true);
  await repos();
  assert.equal(meme.api.compteActuel().session, 'S-2');
});

/* ---- connexion.ts : refus du serveur ---- */
function connexion(reponse) {
  class AuthRequest {
    constructor() { this.codeVerifier = 'v'; }
    async promptAsync() { return { type: 'success', params: { code: 'c' } }; }
  }
  const modules = {
    'expo-apple-authentication': { isAvailableAsync: async () => false },
    'expo-auth-session': { AuthRequest, ResponseType: { Code: 'code' }, CodeChallengeMethod: { S256: 'S256' }, exchangeCodeAsync: async () => ({ idToken: 'id' }) },
    'react-native': { Platform: { OS: 'android' } },
    './compte': { OIDC: { client: 'affectionplus-appli', retour: 'com.affectionplus.app:/connexion', decouverte: {} },
      connecterOidc: async () => reponse },
  };
  return charger(CONNEXION, modules);
}

test('refus du serveur : compte suspendu, adresse à confirmer, trop d’essais, service indisponible, réseau', async () => {
  const cas = [
    [{ ok: false, erreur: 'bloque', statut: 403 }, 'bloque'],
    [{ ok: false, erreur: 'adresse', statut: 403 }, 'adresse'],
    [{ ok: false, erreur: 'trop', statut: 429 }, 'trop'],
    [{ ok: false, erreur: 'indisponible', statut: 503 }, 'indisponible'],
    [{ ok: false, erreur: 'reseau', statut: 0 }, 'reseau'],
    [{ ok: false, erreur: 'jeton', statut: 401 }, 'echec'],
    [{ ok: false, erreur: 'authentification', statut: 401 }, 'echec'],
    [{ ok: false, erreur: 'compte_deja_relie', statut: 409 }, 'relie'],
    [{ ok: false, erreur: 'autre_compte', statut: 409 }, 'autre'],
    // page d'erreur d'un relais (pas de JSON : compte.ts dit « reseau » avec le statut) : jamais « Pas de connexion à Internet »
    [{ ok: false, erreur: 'reseau', statut: 502 }, 'indisponible'],
    [{ ok: false, erreur: 'reseau', statut: 503 }, 'indisponible'],
    [{ ok: false, erreur: 'reseau', statut: 429 }, 'trop'],
    [{ ok: false, erreur: 'reseau', statut: 500 }, 'reseau'],
    [{ ok: true, statut: 200 }, 'ok'],
  ];
  for (const [rep, attendu] of cas) assert.equal(await connexion(rep).connexionOidc('fr'), attendu, JSON.stringify(rep));
});

test('messages de refus : neuf langues, « accès suspendu » clair, rien pour ok / invité / annulé', () => {
  const { messageConnexion } = connexion({ ok: true });
  for (const lg of ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr']) {
    for (const i of ['bloque', 'adresse', 'trop', 'reseau', 'indisponible', 'relie', 'autre']) assert.ok(messageConnexion(i, lg).length > 10, lg + ' ' + i);
    assert.match(messageConnexion('bloque', lg), /webmaster@affection\.org/);
  }
  assert.match(messageConnexion('bloque', 'fr'), /^Accès suspendu/);
  assert.equal(messageConnexion('bloque', 'xx'), messageConnexion('bloque', 'fr'));
  for (const i of ['ok', 'invite', 'annule']) assert.equal(messageConnexion(i, 'fr'), null);
  assert.equal(messageConnexion('echec', 'fr'), '');
});

test('chaque écran de connexion affiche le message du refus (plus seulement « échec »)', () => {
  for (const f of ['app/compte.tsx', 'app/(tabs)/moi.tsx', 'app/mot-de-passe.tsx', 'components/mon-compte.tsx', 'components/espace.tsx', 'components/profil-photo.tsx']) {
    const s = fs.readFileSync(path.join(SRC, f), 'utf8');
    assert.match(s, /messageConnexion\(/, f);
    assert.doesNotMatch(s, /=== 'echec'\)/, f);
  }
});

test('aucune vue web pour la connexion, aucun secret client, aucun jeton en clair', () => {
  const cx = fs.readFileSync(path.join(SRC, 'connexion.ts'), 'utf8'), co = fs.readFileSync(path.join(SRC, 'compte.ts'), 'utf8');
  assert.doesNotMatch(cx + co, /react-native-webview|client_secret|clientSecret/);
  assert.match(cx, /usePKCE: true/);
  assert.match(fs.readFileSync(path.join(SRC, 'session-sure.ts'), 'utf8'), /AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY/);
  assert.match(co, /JSON\.stringify\(enClair \? c : sansJeton\(c\)\)/);
});
