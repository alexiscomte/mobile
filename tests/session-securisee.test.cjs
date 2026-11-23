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
function appareil(t, { stockage = {}, coffre: depart = {}, coffreRefuse = false, routes = {} } = {}) {
  const memoire = new Map(Object.entries(stockage).map(([k, v]) => [k, JSON.stringify(v)]));
  const asyncStorage = {
    getItem: async (k) => memoire.get(k) ?? null, setItem: async (k, v) => { memoire.set(k, v); }, removeItem: async (k) => { memoire.delete(k); },
    multiGet: async (cles) => cles.map((k) => [k, memoire.get(k) ?? null]), multiSet: async (p) => { p.forEach(([k, v]) => memoire.set(k, v)); },
    multiRemove: async (cles) => { cles.forEach((k) => memoire.delete(k)); }, getAllKeys: async () => [...memoire.keys()],
  };
  const coffre = new Map(Object.entries(depart));
  const sure = {
    lireSession: async () => coffre.get('ap.compte.session') ?? null,
    ecrireSession: async (v) => { if (coffreRefuse) return false; coffre.set('ap.compte.session', v); return true; },
    effacerSession: async () => { coffre.delete('ap.compte.session'); },
  };
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
  return { api, memoire, coffre, appels, lu };
}
const ancienCompte = { id: 42, courriel: 'camille@example.test', session: 'S-ancienne', sync: null, depuis: '2026-11-01', mdp: true };
async function repos() { for (let i = 0; i < 60; i++) await new Promise((r) => setImmediate(r)); }

test('migration : une session gardée en clair passe dans le coffre et disparaît d’AsyncStorage, sans déconnecter', async (t) => {
  const { api, coffre, lu } = appareil(t, { stockage: { 'ap.compte': ancienCompte } });
  const c = await api.chargerCompte();
  assert.equal(c.session, 'S-ancienne');
  assert.equal(c.courriel, 'camille@example.test');
  assert.equal(coffre.get('ap.compte.session'), 'S-ancienne');
  assert.equal(lu('ap.compte').session, undefined, 'plus de jeton en clair');
  assert.equal(lu('ap.compte').id, 42);
  // lancement suivant : lu depuis le coffre
  const { api: api2 } = appareil(t, { stockage: { 'ap.compte': lu('ap.compte') }, coffre: { 'ap.compte.session': 'S-ancienne' } });
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
  assert.equal(coffre.get('ap.compte.session'), 'S-neuve');
  assert.equal(lu('ap.compte').session, undefined);
  assert.doesNotMatch(JSON.stringify(lu('ap.compte')), /S-neuve|jeton-identite/);
});

test('session expirée ou révoquée (401) : compte oublié, coffre vidé, l’appli revient à « Se connecter »', async (t) => {
  const { api, coffre, memoire } = appareil(t, { stockage: { 'ap.compte': { ...ancienCompte, session: undefined } }, coffre: { 'ap.compte.session': 'S-ancienne' },
    routes: { 'api/presence': { statut: 401, corps: { ok: false, erreur: 'session' } } } });
  await api.chargerCompte();
  assert.equal(await api.presence(), null);
  assert.equal(api.compteActuel(), null);
  assert.equal(coffre.has('ap.compte.session'), false);
  assert.equal(memoire.has('ap.compte'), false);
});

test('déconnexion : session révoquée sur le serveur avec le jeton, coffre vidé, prompt=login demandé à la prochaine connexion', async (t) => {
  const { api, coffre, memoire, appels } = appareil(t, { stockage: { 'ap.compte': { ...ancienCompte, session: undefined } }, coffre: { 'ap.compte.session': 'S-ancienne' },
    routes: { 'api/compte/deconnexion': { statut: 200, corps: { ok: true } }, 'api/compte/donnees': { statut: 200, corps: { ok: true } } } });
  await api.chargerCompte();
  await api.deconnecter();
  await repos();
  const d = appels.find((a) => a.chemin === 'api/compte/deconnexion');
  assert.ok(d, 'POST /api/compte/deconnexion appelé');
  assert.equal(d.session, 'S-ancienne');
  assert.equal(coffre.has('ap.compte.session'), false);
  assert.equal(memoire.has('ap.compte'), false);
  assert.equal(await api.reconnexionDemandee(), true);
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
      connecterOidc: async () => reponse, reconnexionDemandee: async () => false },
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
    [{ ok: true, statut: 200 }, 'ok'],
  ];
  for (const [rep, attendu] of cas) assert.equal(await connexion(rep).connexionOidc('fr'), attendu, JSON.stringify(rep));
});

test('messages de refus : neuf langues, « accès suspendu » clair, rien pour ok / invité / annulé', () => {
  const { messageConnexion } = connexion({ ok: true });
  for (const lg of ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr']) {
    for (const i of ['bloque', 'adresse', 'trop', 'reseau', 'indisponible']) assert.ok(messageConnexion(i, lg).length > 10, lg + ' ' + i);
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
  assert.match(co, /JSON\.stringify\(sansJeton\(c\)\)/);
});
