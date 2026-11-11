/* global __dirname */
// Changement de l'adresse e-mail du compte (comptes unifiés, lot 7) : le propriétaire des données de l'appareil est le COMPTE (« c:<id> »,
// champ id des réponses de connexion et de session), plus l'empreinte de son adresse. Le vrai client (src/compte.ts) et les vrais scripts de
// la vue web (src/site.ts) tournent sous Node ; seuls le stockage natif et la frontière HTTP sont remplacés. Aucun compte réel touché ;
// adresses et numéros fictifs (example.test). Mêmes règles que compte.js du site : un changement d'adresse ne remplace AUCUNE donnée locale,
// un autre compte reste un autre compte, un ancien propriétaire (empreinte d'adresse) est migré sans rien effacer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function transpiler(fichier) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', fichier), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}
const SOURCE_COMPTE = transpiler('compte.ts'), SOURCE_CT = transpiler('compat_tests.ts'), SOURCE_SITE = transpiler('site.ts');

// même royaume que les essais (comparaisons d'objets exactes) ; seules les dépendances déclarées sont fournies
function charger(source, modules, globaux = {}) {
  const sortie = {};
  const noms = Object.keys(globaux);
  new Function('exports', 'require', ...noms, source)(sortie, (n) => { assert.ok(modules[n], 'dépendance connue : ' + n); return modules[n]; }, ...noms.map((n) => globaux[n]));
  return sortie;
}

// Empreinte d'une adresse telle que la calcule le SERVEUR (compte_api.js empreinteNavigateur) : copie indépendante de celle de l'appli,
// pour prouver que les « anciennes » données à la connexion sont celles que l'appli a notées avant le lot 7.
function empreinteServeur(courriel) {
  const a = String(courriel || '').trim().toLowerCase();
  if (!a) return '';
  const s = JSON.stringify('ap:' + a);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + '.' + (h1 >>> 0).toString(16);
}

const ANCIENNE = 'camille@example.test', NOUVELLE = 'camille.nouvelle@example.test', AUTRE = 'sam@example.test';
const FP_ANCIENNE = empreinteServeur(ANCIENNE), FP_NOUVELLE = empreinteServeur(NOUVELLE), FP_AUTRE = empreinteServeur(AUTRE);
const FAV_A = { url: '/fr/a.html', titre: 'A', date: '2026-01-01' }, FAV_B = { url: '/fr/b.html', titre: 'B hors ligne', date: '2026-11-10' };
const BASE = { profil: { prenom: 'Camille' }, scores: {}, favoris: [FAV_A] };   // dernier état convenu avec le compte

/** Un appareil : AsyncStorage en mémoire (stockage : valeurs JSON ; brut : chaînes telles quelles), HTTP scripté (routes : « MÉTHODE chemin » →
 *  { statut, corps } ou fonction de la demande), minuteries suivies et coupées à la fin de l'essai. */
function appareil(t, { stockage = {}, brut = {}, routes = {} } = {}) {
  const memoire = new Map([...Object.entries(stockage).map(([k, v]) => [k, JSON.stringify(v)]), ...Object.entries(brut)]);
  const asyncStorage = {
    getItem: async (k) => memoire.get(k) ?? null,
    setItem: async (k, v) => { memoire.set(k, v); },
    removeItem: async (k) => { memoire.delete(k); },
    multiGet: async (cles) => cles.map((k) => [k, memoire.get(k) ?? null]),
    multiSet: async (paires) => { paires.forEach(([k, v]) => memoire.set(k, v)); },
    multiRemove: async (cles) => { cles.forEach((k) => memoire.delete(k)); },
    getAllKeys: async () => [...memoire.keys()],
  };
  const minuteries = new Set();
  const minuterie = (f, ms) => { const h = setTimeout(() => { minuteries.delete(h); f(); }, ms); minuteries.add(h); return h; };
  const couper = (h) => { minuteries.delete(h); clearTimeout(h); };
  t.after(() => { minuteries.forEach(clearTimeout); minuteries.clear(); });
  const appels = [];
  const fetch = async (url, options = {}) => {
    const chemin = String(url).replace('https://compte.example/', '');
    const demande = { chemin, methode: options.method || 'GET', session: String((options.headers || {}).Authorization || '').replace('Bearer ', ''),
      corps: options.body ? JSON.parse(options.body) : undefined };
    appels.push(demande);
    let r = routes[demande.methode + ' ' + chemin];
    if (typeof r === 'function') r = r(demande);
    if (!r) throw new Error('appel réseau imprévu : ' + demande.methode + ' ' + chemin);
    return { status: r.statut, json: async () => r.corps };
  };
  const modules = { '@react-native-async-storage/async-storage': asyncStorage, './site': { SITE: 'https://compte.example/' } };
  modules['./compat_tests'] = charger(SOURCE_CT, modules);
  const api = charger(SOURCE_COMPTE, modules, { fetch, setTimeout: minuterie, clearTimeout: couper });
  const lu = (k) => { const v = memoire.get(k); return v === undefined ? null : JSON.parse(v); };
  const posts = (session) => appels.filter((a) => a.methode === 'POST' && a.chemin === 'api/compte/donnees' && (!session || a.session === session));
  return { api, memoire, appels, routes, lu, posts };
}
/** Laisse finir ce que la connexion ou l'envoi lance sans l'attendre (noter().then(pousserMaintenant) de ouvrir). */
async function repos() { for (let i = 0; i < 60; i++) await new Promise((r) => setImmediate(r)); }
const ok = (corps = {}) => ({ statut: 200, corps: { ok: true, maj: '2026-11-11T00:00:00.000Z', ...corps } });
const refus = { statut: 401, corps: { ok: false, erreur: 'session' } };
/** Réponse de connexion du serveur (reponseConnexion de compte_api.js) : numéro, adresse, données, et éventuellement anciennes / adresse_reprise. */
const connexion = (id, courriel, extra = {}) => ({ session: 'S-neuve', id, courriel, sondage_jeton: '', sondages: {}, donnees: {}, mdp: true, newsletter: null, ...extra });
const sessionAvantLot7 = (courriel, session) => ({ courriel, session, sync: '2026-11-01T00:00:00.000Z', depuis: '2026-11-01', mdp: false });   // sans numéro

// ---------------------------------------------------------------------------------------------------------------- l'empreinte
test('l’empreinte d’adresse de l’appli est exactement celle du serveur : les propriétaires déjà notés et les « anciennes » se retrouvent', (t) => {
  const { api } = appareil(t);
  for (const a of [ANCIENNE, NOUVELLE, AUTRE, 'Demo@Example.TEST ', 'élodie.dupont+test@exemple.fr', 'a@b.co']) assert.equal(api.idDe(a), empreinteServeur(a), a);
  assert.equal(api.idDe('demo@example.test'), '779b13f.8ac5a22e');   // valeurs de référence : ce hachage est écrit sur les appareils, il ne doit jamais changer
  assert.equal(api.idDe('A@b.co '), '96ee2eb4.f02a37b');
  assert.equal(api.idDe(''), '');
});

// ---------------------------------------------------------------------------------------------------------------- lecture à froid
test('lecture à froid : le propriétaire est lu au démarrage sous l’une ou l’autre forme, sans rien réécrire', async (t) => {
  const cas = [
    [{ id: 'c:42', a: FP_NOUVELLE }, 'c:42', FP_NOUVELLE],     // depuis le lot 7
    [{ id: 'c:42' }, 'c:42', ''],                                // numéro seul : adresse inconnue
    [{ id: FP_ANCIENNE }, FP_ANCIENNE, FP_ANCIENNE],             // ancienne forme : l’identifiant EST l’empreinte de l’adresse
    [{ id: FP_ANCIENNE, d: { p: {}, s: {}, f: [], c: [] } }, FP_ANCIENNE, FP_ANCIENNE],
    [null, '', ''],                                              // invité jamais connecté
    [{ id: 42 }, '', ''],                                        // illisible : pas de propriétaire
  ];
  for (const [proprio, id, adresse] of cas) {
    const { api, memoire } = appareil(t, { stockage: proprio ? { 'ap.compte.proprio': proprio } : {} });
    assert.equal(api.proprioLocal(), '', 'avant le chargement : rien');
    await api.chargerCompte();
    assert.equal(api.proprioLocal(), id, JSON.stringify(proprio));
    assert.equal(api.proprioLocalAdresse(), adresse, JSON.stringify(proprio));
    assert.equal(memoire.get('ap.compte.proprio'), proprio ? JSON.stringify(proprio) : undefined, 'lecture seule');
  }
});

// ---------------------------------------------------------------------------------------------------------------- changement d'adresse, même session
test('adresse changée dans une page du site (session gardée) : session, base et propriétaire suivent, aucune donnée locale n’est remplacée', async (t) => {
  const { api, lu, appels, posts, routes } = appareil(t, {
    stockage: { 'ap.compte': sessionAvantLot7(ANCIENNE, 'S1'), 'ap.compte.proprio': { id: FP_ANCIENNE },
      'ap.compte.base': { courriel: ANCIENNE, donnees: BASE }, 'ap.compte.empreinte': null,
      'ap.profil': { prenom: 'Camille', nom: 'Pas-Encore-Envoyé' }, 'ap.favoris': [FAV_A, FAV_B] },
    routes: { 'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  await api.adopterCompte(JSON.stringify({ id: 42, courriel: NOUVELLE, session: 'S1', sync: '2026-11-11T00:00:00.000Z', mdp: false }));   // ap.compte de la page
  await repos();
  assert.equal(appels.length, 0, 'aucun appel : ni lecture ni envoi, même compte');
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel, api.compteActuel().session], [42, NOUVELLE, 'S1']);
  assert.deepEqual([lu('ap.compte').id, lu('ap.compte').courriel, lu('ap.compte').session], [42, NOUVELLE, 'S1']);
  assert.deepEqual(lu('ap.profil'), { prenom: 'Camille', nom: 'Pas-Encore-Envoyé' }, 'profil local intact');
  assert.equal(lu('ap.favoris').length, 2, 'favoris locaux intacts');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE }, 'propriétaire = le compte, sans instantané');
  assert.deepEqual(lu('ap.compte.base'), { courriel: NOUVELLE, id: 42, donnees: BASE }, 'base convenue gardée, sous la nouvelle adresse et le numéro');
  assert.equal(api.proprioLocal(), 'c:42');
  assert.equal(api.proprioLocalAdresse(), FP_NOUVELLE);
  // la saisie non envoyée part au compte : la base est reconnue (envoi partiel : seulement ce qui a changé ici)
  await api.synchroAuLancement();
  assert.equal(posts().length, 1);
  assert.equal(posts()[0].session, 'S1');
  assert.equal(posts()[0].corps.partiel, 1);
  assert.deepEqual(posts()[0].corps.donnees.profil, { nom: 'Pas-Encore-Envoyé' });
  assert.deepEqual(posts()[0].corps.donnees.favoris, [FAV_A, FAV_B]);
  assert.equal(routes['POST api/compte/donnees'].statut, 200);
});

test('même session, nouvelle adresse déjà notée sous le numéro : un second message de la page ne change rien et ne rappelle pas le serveur', async (t) => {
  const { api, lu, appels } = appareil(t, {
    stockage: { 'ap.compte': { ...sessionAvantLot7(NOUVELLE, 'S1'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE },
      'ap.compte.base': { courriel: NOUVELLE, id: 42, donnees: BASE }, 'ap.profil': { prenom: 'Camille' } },
  });
  await api.chargerCompte();
  const avant = JSON.stringify([lu('ap.compte'), lu('ap.compte.proprio'), lu('ap.compte.base')]);
  await api.adopterCompte(JSON.stringify({ id: 42, courriel: NOUVELLE, session: 'S1', sync: '2026-11-12T00:00:00.000Z' }));   // la page n'a changé que sa date de synchro
  await repos();
  assert.equal(JSON.stringify([lu('ap.compte'), lu('ap.compte.proprio'), lu('ap.compte.base')]), avant);
  assert.equal(appels.length, 0);
});

test('une page qui annonce le numéro du compte avant l’appli le lui apprend : le propriétaire passe à « c:<id> » sans rien effacer', async (t) => {
  const { api, lu } = appareil(t, {
    stockage: { 'ap.compte': sessionAvantLot7(ANCIENNE, 'S1'), 'ap.compte.proprio': { id: FP_ANCIENNE }, 'ap.compte.base': { courriel: ANCIENNE, donnees: BASE },
      'ap.profil': { prenom: 'Camille', nom: 'Garde-Moi' } },
  });
  await api.chargerCompte();
  await api.adopterCompte(JSON.stringify({ id: '42', courriel: ANCIENNE, session: 'S1', sync: null }));   // numéro en chaîne : accepté
  assert.equal(api.compteActuel().id, '42');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE });
  assert.deepEqual(lu('ap.compte.base'), { courriel: ANCIENNE, id: '42', donnees: BASE });
  assert.equal(lu('ap.profil').nom, 'Garde-Moi');
});

test('une page d’un autre compte (autre numéro, même session) ou un numéro absurde ne change ni la session ni le propriétaire', async (t) => {
  const { api, lu } = appareil(t, {
    stockage: { 'ap.compte': { ...sessionAvantLot7(ANCIENNE, 'S1'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE }, 'ap.profil': { prenom: 'Camille' } },
  });
  await api.chargerCompte();
  await api.adopterCompte(JSON.stringify({ id: 43, courriel: AUTRE, session: 'S1' }));
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel], [42, ANCIENNE]);
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE });
  assert.equal(await api.adresseChangee({ id: 43, courriel: AUTRE }), false, 'adresseChangee refuse le numéro d’un autre compte');
  assert.equal(await api.adresseChangee({ id: 42 }), false, 'sans adresse : rien');
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel], [42, ANCIENNE]);
  assert.equal(await api.adresseChangee({ id: 'abc', courriel: NOUVELLE }), true, 'un numéro illisible n’est pas pris : l’adresse seule change');
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel], [42, NOUVELLE]);
});

// ---------------------------------------------------------------------------------------------------------------- la base suit le numéro
test('la base convenue est reconnue par le numéro du compte, plus par l’adresse : une saisie locale n’est pas absorbée dans la base', async (t) => {
  const { api, posts } = appareil(t, {
    stockage: { 'ap.compte': { ...sessionAvantLot7(NOUVELLE, 'S1'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE },
      'ap.compte.base': { courriel: ANCIENNE, id: 42, donnees: BASE },     // rangée sous l’ancienne adresse, même numéro
      'ap.profil': { prenom: 'Camille', bio: 'Pas-Encore-Envoyée' }, 'ap.favoris': [FAV_A] },
    routes: { 'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  await api.synchroAuLancement();
  assert.equal(posts().length, 1, 'la base est reconnue : la saisie part');
  assert.deepEqual(posts()[0].corps.donnees, { profil: { bio: 'Pas-Encore-Envoyée' } });
});

test('une base d’un autre numéro n’est jamais reprise, même sous la même adresse', async (t) => {
  const { api, posts, lu } = appareil(t, {
    stockage: { 'ap.compte': { ...sessionAvantLot7(ANCIENNE, 'S1'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE },
      'ap.compte.base': { courriel: ANCIENNE, id: 77, donnees: BASE }, 'ap.profil': { prenom: 'Camille', bio: 'x' } },
  });
  await api.chargerCompte();
  await api.synchroAuLancement();
  assert.equal(posts().length, 0, 'base inconnue : l’état local devient la base (session ouverte avant cette version)');
  assert.equal(lu('ap.compte.base').id, 42);
});

// ---------------------------------------------------------------------------------------------------------------- autre appareil : session fermée, reconnexion
/** Appareil dont la session a été fermée par le changement fait ailleurs (401 au premier envoi), avec une saisie pas encore envoyée. */
async function sessionFermee(t, { proprio = { id: FP_ANCIENNE }, compte = sessionAvantLot7(ANCIENNE, 'S2'), routes = {} } = {}) {
  const a = appareil(t, {
    stockage: { 'ap.compte': compte, 'ap.compte.proprio': proprio, 'ap.compte.base': { courriel: ANCIENNE, ...(compte.id ? { id: compte.id } : {}), donnees: BASE },
      'ap.profil': { prenom: 'Camille', bio: 'Bio-Hors-Ligne' }, 'ap.favoris': [FAV_A] },
    routes: { 'POST api/compte/donnees': refus, ...routes },
  });
  await a.api.chargerCompte();
  await a.api.synchroAuLancement();
  assert.equal(a.api.compteActuel(), null, 'session fermée par le serveur : compte oublié sur l’appareil');
  assert.equal(a.lu('ap.compte.proprio').id, proprio.id, 'données gardées avec leur propriétaire');
  assert.ok(a.lu('ap.compte.proprio').d, '… et l’instantané de ce moment');
  assert.equal(a.lu('ap.profil').bio, 'Bio-Hors-Ligne');
  assert.deepEqual(a.lu('ap.compte.sale').profil && Object.keys(a.lu('ap.compte.sale').profil), ['bio'], 'saisie toujours à envoyer');
  return a;
}

test('autre appareil : reconnexion avec la nouvelle adresse, propriétaire ANCIEN (empreinte) : « anciennes » le reconnaît, la saisie locale gagne et part, propriétaire réécrit', async (t) => {
  const { api, lu, posts, routes, appels } = await sessionFermee(t);
  routes['POST api/compte/oidc'] = ok(connexion(42, NOUVELLE, { donnees: BASE, anciennes: [FP_ANCIENNE] }));
  routes['POST api/compte/donnees'] = ok({ id: 42 });
  const j = await api.connecterOidc('jeton-identite');
  await repos();
  assert.equal(j.ok, true);
  assert.equal(appels.find((a) => a.chemin === 'api/compte/oidc').corps.jeton_local, '', 'avec un propriétaire, le jeton de vote local n’est pas transmis');
  assert.equal(lu('ap.profil').bio, 'Bio-Hors-Ligne', 'même compte reconnu : la saisie locale gagne');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE }, 'propriétaire réécrit sous la nouvelle forme, sans instantané');
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel, api.compteActuel().session], [42, NOUVELLE, 'S-neuve']);
  assert.equal(lu('ap.compte.base').id, 42);
  assert.equal(posts('S2').length, 1, 'le seul envoi de l’ancienne session est celui que le serveur a refusé');
  assert.equal(posts('S-neuve').length, 1, 'la saisie de cet appareil arrive au compte, avec la nouvelle session');
  assert.deepEqual(posts('S-neuve')[0].corps.donnees, { profil: { bio: 'Bio-Hors-Ligne' } });
});

test('autre appareil : sans les « anciennes » du serveur, l’ancienne forme ne reconnaît pas la nouvelle adresse (comme sur le site : c’est la raison d’être de « anciennes »)', async (t) => {
  const { api, lu, routes } = await sessionFermee(t);
  routes['POST api/compte/oidc'] = ok(connexion(42, NOUVELLE, { donnees: BASE }));
  routes['POST api/compte/donnees'] = ok({ id: 42 });
  await api.connecterOidc('jeton-identite');
  await repos();
  assert.equal(lu('ap.profil').bio, undefined, 'sans « anciennes » : la saisie locale est remplacée (appareil partagé)');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE });
});

test('autre appareil déjà migré (propriétaire « c:<id> ») : la nouvelle adresse est reconnue sans « anciennes » ni adresse, données gardées', async (t) => {
  const { api, lu, routes, posts } = await sessionFermee(t, { proprio: { id: 'c:42', a: FP_ANCIENNE }, compte: { ...sessionAvantLot7(ANCIENNE, 'S2'), id: 42 } });
  assert.equal(api.proprioLocal(), 'c:42', 'la session fermée garde le propriétaire sous le numéro');
  routes['POST api/compte/oidc'] = ok(connexion(42, NOUVELLE, { donnees: BASE }));
  routes['POST api/compte/donnees'] = ok({ id: 42 });
  await api.connecterOidc('jeton-identite');
  await repos();
  assert.equal(lu('ap.profil').bio, 'Bio-Hors-Ligne');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE });
  assert.equal(posts('S-neuve').length, 1);
});

test('toutes les connexions (service commun, Google, Apple) lisent le numéro, les anciennes et la reprise de la même façon', async (t) => {
  for (const [nom, appel, chemin] of [['oidc', (api) => api.connecterOidc('j'), 'api/compte/oidc'], ['google', (api) => api.connecterGoogle('j', 'fr', true), 'api/compte/google'],
    ['apple', (api) => api.connecterApple('j', 'n', null, '', 'fr', true), 'api/compte/apple']]) {
    const a = appareil(t, { stockage: { 'ap.compte.proprio': { id: FP_ANCIENNE, d: { p: {}, s: {}, f: [], c: [] } }, 'ap.profil': { prenom: 'Camille', bio: 'Garde-Moi' } },
      routes: { ['POST ' + chemin]: ok(connexion(42, NOUVELLE, { anciennes: [FP_ANCIENNE] })), 'POST api/compte/donnees': ok({ id: 42 }) } });
    await a.api.chargerCompte();
    assert.equal((await appel(a.api)).ok, true, nom);
    await repos();
    assert.deepEqual(a.lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE }, nom);
    assert.equal(a.lu('ap.profil').bio, 'Garde-Moi', nom + ' : données gardées');
    assert.equal(a.api.compteActuel().id, 42, nom);
  }
});

// ---------------------------------------------------------------------------------------------------------------- migration depuis l'ancienne empreinte
test('migration : une session d’avant le lot 7 apprend le numéro du compte à son premier envoi ; le propriétaire est réécrit, rien n’est effacé', async (t) => {
  const { api, lu, posts, appels } = appareil(t, {
    stockage: { 'ap.compte': sessionAvantLot7(ANCIENNE, 'S1'), 'ap.compte.proprio': { id: FP_ANCIENNE }, 'ap.compte.base': { courriel: ANCIENNE, donnees: BASE },
      'ap.profil': { prenom: 'Camille', nom: 'Pas-Encore-Envoyé' }, 'ap.favoris': [FAV_A] },
    routes: { 'POST api/compte/donnees': ok({ id: 42 }) },   // routeDonneesEcrire : { ok, maj, id }
  });
  await api.chargerCompte();
  assert.equal(api.compteActuel().id, undefined);
  await api.synchroAuLancement();
  assert.equal(posts().length, 1);
  assert.deepEqual(posts()[0].corps.donnees, { profil: { nom: 'Pas-Encore-Envoyé' } });
  assert.equal(appels.length, 1, 'un seul appel : celui de l’envoi');
  assert.equal(api.compteActuel().id, 42);
  assert.equal(lu('ap.compte').id, 42);
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE }, 'propriétaire réécrit sous la nouvelle forme');
  assert.deepEqual([lu('ap.compte.base').id, lu('ap.compte.base').courriel], [42, ANCIENNE]);
  assert.deepEqual(lu('ap.profil'), { prenom: 'Camille', nom: 'Pas-Encore-Envoyé' });
  assert.equal(api.proprioLocal(), 'c:42');
});

test('migration : session d’avant le lot 7 sans rien à envoyer, ancien propriétaire, même adresse : rien n’est effacé ni appelé, la forme ancienne reste comprise', async (t) => {
  const { api, lu, appels } = appareil(t, {
    stockage: { 'ap.compte': sessionAvantLot7(ANCIENNE, 'S1'), 'ap.compte.proprio': { id: FP_ANCIENNE }, 'ap.compte.base': { courriel: ANCIENNE, donnees: BASE },
      'ap.profil': { prenom: 'Camille' }, 'ap.favoris': [FAV_A] },
  });
  await api.chargerCompte();
  await api.synchroAuLancement();
  await repos();
  assert.equal(appels.length, 0);
  assert.deepEqual(lu('ap.compte.proprio'), { id: FP_ANCIENNE }, 'pas de numéro : rien à réécrire');
  assert.deepEqual(lu('ap.profil'), { prenom: 'Camille' });
  assert.equal(api.proprioLocal(), FP_ANCIENNE);
});

test('migration à la connexion : ancien propriétaire (empreinte) et même adresse : même compte, données gardées, propriétaire réécrit', async (t) => {
  const { api, lu, posts } = appareil(t, {
    stockage: { 'ap.compte.proprio': { id: FP_ANCIENNE, d: { p: { prenom: api0().empreinte('Camille') }, s: {}, f: [], c: [] } }, 'ap.profil': { prenom: 'Camille', bio: 'Hors-Ligne' } },
    routes: { 'POST api/compte/oidc': ok(connexion(42, ANCIENNE, { donnees: { profil: { prenom: 'Camille' } } })), 'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  await api.connecterOidc('j');
  await repos();
  assert.equal(lu('ap.profil').bio, 'Hors-Ligne');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE });
  assert.equal(posts().length, 1);
});
// empreinte() ne dépend d’aucun état : un client neuf suffit pour calculer les empreintes de champs des instantanés
function api0() { return charger(SOURCE_COMPTE, { '@react-native-async-storage/async-storage': {}, './site': { SITE: 'x/' }, './compat_tests': { K_CT: 'ap.compat' } }); }

// ---------------------------------------------------------------------------------------------------------------- un autre compte reste un autre compte
const SCORE_CAMILLE = { s: 80, d: '2026-11-01' };
// instantané pris à la déconnexion de Camille : empreintes de ce qui était sur l'appareil à ce moment (le prénom, le nom, le score, le favori)
const INSTANTANE_CAMILLE = () => ({ p: { prenom: api0().empreinte('Camille'), nom: api0().empreinte('Secret-De-Camille') }, s: { test1: api0().empreinte(SCORE_CAMILLE) },
  f: [api0().empreinte('/fr/a.html')], c: [] });
const DONNEES_CAMILLE = {
  'ap.profil': { prenom: 'Camille', nom: 'Secret-De-Camille', ville: 'Lyon' },   // « ville » : saisie faite HORS compte depuis la déconnexion
  'ap.favoris': [FAV_A], 'ap.qdj': { serie: 9, secret: 'Secret-De-Camille' }, 'ap.jeu2': { parties: [1], secret: 'Secret-De-Camille' },
  'apq:test1': SCORE_CAMILLE, 'ap.lettre': { etat: 'Secret-De-Camille' }, 'ap.compte.sale': { profil: { nom: 1 } },
};
const BRUT_CAMILLE = { 'ap.sondage.jeton': 'jeton-de-Camille', 'ap.sondage:7': '1' };

test('autre compte (autre numéro) : les données de l’ancien propriétaire sont effacées, jamais fusionnées ni envoyées ; seule une saisie hors compte reste', async (t) => {
  const { api, lu, memoire, appels, posts } = appareil(t, {
    stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE },
    brut: BRUT_CAMILLE,
    routes: { 'POST api/compte/oidc': ok(connexion(43, AUTRE, { donnees: { profil: { prenom: 'Sam' } }, sondage_jeton: 'jeton-de-Sam', sondages: { 9: 2 } })),
      'POST api/compte/donnees': ok({ id: 43 }) },
  });
  await api.chargerCompte();
  await api.connecterOidc('j');
  await repos();
  assert.equal(appels[0].corps.jeton_local, '', 'le jeton de vote de Camille n’est pas transmis');
  assert.deepEqual(lu('ap.profil'), { prenom: 'Sam', ville: 'Lyon' }, 'compte de Sam + saisie hors compte (donnée d’invité)');
  assert.equal(lu('ap.qdj'), null);
  assert.equal(lu('ap.jeu2'), null);
  assert.equal(lu('apq:test1'), null);
  assert.equal(lu('ap.lettre'), null);
  assert.equal(memoire.get('ap.sondage.jeton'), 'jeton-de-Sam');
  assert.equal(memoire.has('ap.sondage:7'), false);
  assert.equal(memoire.get('ap.sondage:9'), '2');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:43', a: FP_AUTRE });
  assert.equal(api.proprioLocal(), 'c:43');
  assert.equal([...memoire.values()].concat(JSON.stringify(appels)).filter((v) => v.includes('Secret-De-Camille') || v.includes('jeton-de-Camille')).length, 0, 'aucune trace de Camille');
  assert.deepEqual(posts().map((p) => p.corps.donnees.profil), [{ ville: 'Lyon' }], 'seule la saisie hors compte part, sous la règle des données d’invité');
});

test('même adresse mais autre numéro (adresse reprise par un autre compte) : un autre compte, données effacées — l’adresse ne décide jamais', async (t) => {
  const { api, lu } = appareil(t, {
    stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE,
    routes: { 'POST api/compte/oidc': ok(connexion(77, ANCIENNE, { donnees: {} })), 'POST api/compte/donnees': ok({ id: 77 }) },
  });
  await api.chargerCompte();
  await api.connecterOidc('j');
  await repos();
  assert.equal(JSON.stringify(lu('ap.profil')).includes('Secret-De-Camille'), false);
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:77', a: FP_ANCIENNE });
});

test('ancienne forme + adresse_reprise : l’adresse a été reprise par un autre compte, ses données ne lui passent pas ; sans l’indicateur, l’adresse reconnaîtrait le compte', async (t) => {
  const depart = () => ({ 'ap.compte.proprio': { id: FP_ANCIENNE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE });
  const repris = appareil(t, { stockage: depart(), brut: BRUT_CAMILLE,
    routes: { 'POST api/compte/oidc': ok(connexion(77, ANCIENNE, { adresse_reprise: true })), 'POST api/compte/donnees': ok({ id: 77 }) } });
  await repris.api.chargerCompte();
  await repris.api.connecterOidc('j');
  await repos();
  assert.equal(JSON.stringify([...repris.memoire.values()]).includes('Secret-De-Camille'), false);
  assert.deepEqual(repris.lu('ap.compte.proprio'), { id: 'c:77', a: FP_ANCIENNE });
  const meme = appareil(t, { stockage: depart(), brut: BRUT_CAMILLE,
    routes: { 'POST api/compte/oidc': ok(connexion(42, ANCIENNE)), 'POST api/compte/donnees': ok({ id: 42 }) } });
  await meme.api.chargerCompte();
  await meme.api.connecterOidc('j');
  await repos();
  assert.equal(meme.lu('ap.profil').nom, 'Secret-De-Camille', 'même adresse, pas de reprise : même compte, ses données restent');
});

test('session déjà présente avant la migration : les données d’un AUTRE compte sont effacées tant que rien n’a été convenu avec lui, jamais celles du même compte', async (t) => {
  // session d’un autre compte (sans numéro), propriétaire = Camille sous l’ancienne forme, aucune base : effacé, jamais envoyé
  const autre = appareil(t, { stockage: { 'ap.compte': sessionAvantLot7(AUTRE, 'S5'), 'ap.compte.proprio': { id: FP_ANCIENNE }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE });
  await autre.api.chargerCompte();
  await autre.api.synchroAuLancement();
  assert.equal(autre.lu('ap.profil') && autre.lu('ap.profil').nom, null, 'données de Camille effacées');
  assert.deepEqual(autre.lu('ap.compte.proprio'), { id: FP_AUTRE });
  // même chose avec les numéros : la session est celle du compte 43, le propriétaire celui du compte 42
  const numeros = appareil(t, { stockage: { 'ap.compte': { ...sessionAvantLot7(AUTRE, 'S5'), id: 43 }, 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE });
  await numeros.api.chargerCompte();
  await numeros.api.synchroAuLancement();
  assert.equal(JSON.stringify([...numeros.memoire.values()]).includes('Secret-De-Camille'), false);
  assert.deepEqual(numeros.lu('ap.compte.proprio'), { id: 'c:43', a: FP_AUTRE });
  // la session a déjà une base convenue sous son numéro : ce sont ses données (adresse changée entre-temps), rien n’est effacé et le propriétaire suit
  const bien = appareil(t, { stockage: { 'ap.compte': { ...sessionAvantLot7(NOUVELLE, 'S6'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE },
    'ap.compte.base': { courriel: ANCIENNE, id: 42, donnees: BASE }, 'ap.profil': { prenom: 'Camille', nom: 'Garde-Moi' } } });
  await bien.api.chargerCompte();
  await bien.api.synchroAuLancement();
  assert.equal(bien.lu('ap.profil').nom, 'Garde-Moi');
});

// ---------------------------------------------------------------------------------------------------------------- session sans numéro (serveur plus ancien)
test('serveur plus ancien (réponse sans numéro) : retour à la comparaison par l’adresse ; même adresse = même compte, jamais un effacement de plus', async (t) => {
  for (const proprio of [{ id: FP_ANCIENNE }, { id: 'c:42', a: FP_ANCIENNE }]) {
    const a = appareil(t, { stockage: { 'ap.compte.proprio': { ...proprio, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE,
      routes: { 'POST api/compte/oidc': ok(connexion(undefined, ANCIENNE, { donnees: { profil: { prenom: 'Camille' } } })), 'POST api/compte/donnees': ok() } });
    await a.api.chargerCompte();
    await a.api.connecterOidc('j');
    await repos();
    assert.equal(a.api.compteActuel().id, undefined, 'pas de numéro : la session n’en invente pas');
    assert.equal(a.lu('ap.profil').nom, 'Secret-De-Camille', JSON.stringify(proprio) + ' : même adresse, données gardées');
    assert.deepEqual(a.lu('ap.compte.proprio'), { id: FP_ANCIENNE }, 'ancien comportement : le propriétaire est l’empreinte de l’adresse');
    assert.equal(a.lu('ap.compte.base').id, undefined);
  }
  // autre adresse, sans numéro : un autre compte (ancien comportement : remplacement, rien ne passe)
  const b = appareil(t, { stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE,
    routes: { 'POST api/compte/oidc': ok(connexion(undefined, AUTRE)), 'POST api/compte/donnees': ok() } });
  await b.api.chargerCompte();
  await b.api.connecterOidc('j');
  await repos();
  assert.equal(JSON.stringify([...b.memoire.values()]).includes('Secret-De-Camille'), false);
  assert.deepEqual(b.lu('ap.compte.proprio'), { id: FP_AUTRE });
});

test('numéro illisible dans la réponse (chaîne vide, zéro, négatif, décimal, trop long, objet) : traité comme absent', async (t) => {
  for (const id of ['', 0, '0', -3, 4.5, '007', '1234567890123456', {}, [], null, true]) {
    const a = appareil(t, { stockage: { 'ap.compte.proprio': { id: FP_ANCIENNE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE,
      routes: { 'POST api/compte/oidc': ok(connexion(id, ANCIENNE)), 'POST api/compte/donnees': ok() } });
    await a.api.chargerCompte();
    await a.api.connecterOidc('j');
    await repos();
    assert.equal(a.api.compteActuel().id, undefined, JSON.stringify(id));
    assert.deepEqual(a.lu('ap.compte.proprio'), { id: FP_ANCIENNE }, JSON.stringify(id));
    assert.equal(a.lu('ap.profil').nom, 'Secret-De-Camille', JSON.stringify(id));
  }
});

// ---------------------------------------------------------------------------------------------------------------- invité jamais connecté
test('invité jamais connecté : pas de propriétaire, fusion « le local gagne », jeton de vote transmis ; le compte devient propriétaire sous son numéro', async (t) => {
  const { api, lu, memoire, appels, posts } = appareil(t, {
    stockage: { 'ap.profil': { ville: 'Lyon' }, 'ap.favoris': [FAV_B] }, brut: { 'ap.sondage.jeton': 'jeton-invite', 'ap.sondage:7': '1' },
    routes: { 'POST api/compte/oidc': ok(connexion(42, ANCIENNE, { donnees: { profil: { prenom: 'Camille' }, favoris: [FAV_A] }, sondage_jeton: 'jeton-compte', sondages: { 7: 1 } })),
      'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  assert.equal(api.proprioLocal(), '');
  await api.connecterOidc('j');
  await repos();
  assert.equal(appels.find((a) => a.chemin === 'api/compte/oidc').corps.jeton_local, 'jeton-invite', 'invité : son jeton de vote est transmis au compte');
  assert.deepEqual(lu('ap.profil'), { prenom: 'Camille', ville: 'Lyon' }, 'fusion : rien n’est perdu');
  assert.deepEqual(lu('ap.favoris').map((f) => f.url).sort(), ['/fr/a.html', '/fr/b.html']);
  assert.equal(memoire.get('ap.sondage.jeton'), 'jeton-compte');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE });
  assert.equal(api.proprioLocal(), 'c:42');
  assert.equal(posts().length, 1, 'ce que l’invité avait de plus part au compte');
  assert.deepEqual(posts()[0].corps.donnees.profil, { ville: 'Lyon' });
});

test('invité jamais connecté qui se connecte avec un serveur plus ancien : propriétaire noté par l’adresse, comme avant', async (t) => {
  const { api, lu } = appareil(t, { stockage: { 'ap.profil': { ville: 'Lyon' } },
    routes: { 'POST api/compte/oidc': ok(connexion(undefined, ANCIENNE)), 'POST api/compte/donnees': ok() } });
  await api.chargerCompte();
  await api.connecterOidc('j');
  await repos();
  assert.deepEqual(lu('ap.compte.proprio'), { id: FP_ANCIENNE });
  assert.equal(lu('ap.profil').ville, 'Lyon');
});

// ---------------------------------------------------------------------------------------------------------------- connexion faite dans une page du site
test('connexion faite dans une page du site après un changement d’adresse : le propriétaire « c:<id> » reconnaît le compte, données gardées et envoyées', async (t) => {
  const { api, lu, appels, posts } = appareil(t, {
    stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE, d: { p: { prenom: api0().empreinte('Camille') }, s: {}, f: [], c: [] } }, 'ap.profil': { prenom: 'Camille', bio: 'Hors-Ligne' } },
    routes: { 'GET api/compte/donnees': ok({ id: 42, courriel: NOUVELLE, donnees: { profil: { prenom: 'Camille' } }, sondage_jeton: '', sondages: {}, mdp: true, newsletter: null }),
      'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  await api.adopterCompte(JSON.stringify({ id: 42, courriel: NOUVELLE, session: 'S9', sync: null }));   // ap.compte posé par la page après sa connexion
  await repos();
  assert.equal(appels[0].methode + ' ' + appels[0].chemin + ' ' + appels[0].session, 'GET api/compte/donnees S9');
  assert.equal(lu('ap.profil').bio, 'Hors-Ligne');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE });
  assert.deepEqual([api.compteActuel().id, api.compteActuel().courriel], [42, NOUVELLE]);
  assert.equal(lu('ap.compte.base').id, 42);
  assert.equal(posts().length, 1);
});

test('connexion faite dans une page du site avec un AUTRE compte : remplacement, comme avant', async (t) => {
  const { api, lu, memoire } = appareil(t, {
    stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE, d: INSTANTANE_CAMILLE() }, ...DONNEES_CAMILLE }, brut: BRUT_CAMILLE,
    routes: { 'GET api/compte/donnees': ok({ id: 43, courriel: AUTRE, donnees: { profil: { prenom: 'Sam' } }, sondage_jeton: '', sondages: {}, mdp: true, newsletter: null }),
      'POST api/compte/donnees': ok({ id: 43 }) },
  });
  await api.chargerCompte();
  await api.adopterCompte(JSON.stringify({ id: 43, courriel: AUTRE, session: 'S9', sync: null }));
  await repos();
  assert.equal(JSON.stringify([...memoire.values()]).includes('Secret-De-Camille'), false);
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:43', a: FP_AUTRE });
});

// ---------------------------------------------------------------------------------------------------------------- déconnexion et reconnexion ordinaires
test('déconnexion puis reconnexion du même compte (cas courant) : propriétaire « c:<id> » gardé avec son instantané, puis retrouvé sans effacement', async (t) => {
  const { api, lu, routes } = appareil(t, {
    stockage: { 'ap.compte': { ...sessionAvantLot7(ANCIENNE, 'S1'), id: 42 }, 'ap.compte.proprio': { id: 'c:42', a: FP_ANCIENNE }, 'ap.compte.base': { courriel: ANCIENNE, id: 42, donnees: BASE },
      'ap.profil': { prenom: 'Camille', nom: 'Garde-Moi' } },
    routes: { 'POST api/compte/deconnexion': ok(), 'POST api/compte/donnees': ok({ id: 42 }) },
  });
  await api.chargerCompte();
  await api.deconnecter();
  assert.equal(api.compteActuel(), null);
  assert.equal(lu('ap.compte.proprio').id, 'c:42');
  assert.equal(lu('ap.compte.proprio').a, FP_ANCIENNE);
  assert.ok(lu('ap.compte.proprio').d, 'instantané des données à la déconnexion');
  routes['POST api/compte/oidc'] = ok(connexion(42, ANCIENNE, { donnees: { profil: { prenom: 'Camille' } } }));
  await api.connecterOidc('j');
  await repos();
  assert.equal(lu('ap.profil').nom, 'Garde-Moi');
  assert.deepEqual(lu('ap.compte.proprio'), { id: 'c:42', a: FP_ANCIENNE }, 'plus d’instantané : le compte est reconnecté');
});

// ---------------------------------------------------------------------------------------------------------------- vue web
const CATALOGUE = { langues: [], site: '', pages: {} };   // import par défaut d'un JSON : l'interop de TypeScript l'enveloppe
const site = charger(SOURCE_SITE, { './catalogue.json': CATALOGUE });

/** Une page du site (localStorage en mémoire) où l'on exécute les scripts injectés par l'appli. */
function pageWeb(initial = {}) {
  const m = new Map(Object.entries(initial).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  class Storage {
    constructor(memoire) { this.memoire = memoire; }
    get length() { return this.memoire.size; }
    key(i) { return [...this.memoire.keys()][i] ?? null; }
    getItem(k) { return this.memoire.has(k) ? this.memoire.get(k) : null; }
    setItem(k, v) { this.memoire.set(k, String(v)); }
    removeItem(k) { this.memoire.delete(k); }
  }
  const localStorage = new Storage(m);
  const messages = [];
  const contexte = { Storage, localStorage, sessionStorage: new Storage(new Map()), document: { documentElement: { classList: { add() {} } }, title: 'Titre', hidden: false, addEventListener() {} },
    window: { localStorage, ReactNativeWebView: { postMessage: (s) => messages.push(JSON.parse(s)) } }, location: { href: 'https://compte.example/fr/page.html' } };
  vm.createContext(contexte);
  const lire = (k) => (m.has(k) ? JSON.parse(m.get(k)) : null);
  return { m, contexte, messages, lire, executer: (script) => vm.runInContext(script, contexte) };
}
const DONNEES_PAGE = { 'ap.profil': { prenom: 'Page', champ_page: 'garde' }, 'ap.favoris': [FAV_A], 'ap.compte.sale': { profil: { prenom: 1 } }, 'ap.compte.base': { courriel: ANCIENNE, donnees: BASE }, 'ap.qdj': { serie: 3 } };

// [propriétaire de l'appli (id, a) ; propriétaire noté par la page (id, a) ; même compte ? ; description] : une seule table pour memeProprioPage (TypeScript)
// et pour le script injecté (JavaScript), qui doivent toujours donner la même réponse.
const CAS = [
  [['', ''], ['', ''], true, 'ni l’un ni l’autre : invité jamais connecté'],
  [['c:42', FP_NOUVELLE], ['c:42', FP_NOUVELLE], true, 'même numéro'],
  [['c:42', FP_NOUVELLE], ['c:42', FP_ANCIENNE], true, 'même numéro, adresse périmée dans la page'],
  [['c:42', ''], ['c:42', FP_ANCIENNE], true, 'même numéro, adresse de l’appli inconnue'],
  [['c:42', FP_NOUVELLE], [FP_NOUVELLE, ''], true, 'appli : numéro ; page : ancienne forme, même adresse'],
  [[FP_NOUVELLE, FP_NOUVELLE], ['c:42', FP_NOUVELLE], true, 'appli : ancienne forme ; page : numéro, même adresse'],
  [[FP_NOUVELLE, FP_NOUVELLE], [FP_NOUVELLE, ''], true, 'deux anciennes formes identiques'],
  [['c:42', FP_NOUVELLE], ['c:43', FP_NOUVELLE], false, 'deux numéros différents, même adresse : deux comptes'],
  [['c:42', FP_NOUVELLE], [FP_AUTRE, ''], false, 'ancienne forme d’une autre adresse'],
  [[FP_AUTRE, FP_AUTRE], ['c:42', FP_NOUVELLE], false, 'ancienne forme de l’appli, autre adresse'],
  [['c:42', ''], [FP_NOUVELLE, ''], false, 'adresse de l’appli inconnue : jamais de supposition'],
  [['c:42', FP_NOUVELLE], ['c:43', ''], false, 'deux numéros différents'],
  [[FP_ANCIENNE, FP_ANCIENNE], [FP_NOUVELLE, ''], false, 'deux anciennes formes différentes'],
  [['', ''], ['c:42', FP_NOUVELLE], false, 'appli sans propriétaire, page avec'],
  [['c:42', FP_NOUVELLE], ['', ''], false, 'page sans propriétaire, appli avec'],
];
const enregistrement = ([id, a]) => (!id ? null : id.indexOf('c:') === 0 ? { id, ...(a ? { a } : {}) } : { id });

test('vue web : l’appli et la page se reconnaissent par la même règle, en TypeScript (memeProprioPage) et dans le script injecté', async (t) => {
  for (const [appli, page, meme, quoi] of CAS) {
    const { api } = appareil(t, { stockage: enregistrement(appli) ? { 'ap.compte.proprio': enregistrement(appli) } : {} });
    await api.chargerCompte();
    assert.equal(api.memeProprioPage(page[0], page[1]), meme, 'memeProprioPage : ' + quoi);
    const p = pageWeb({ ...DONNEES_PAGE, ...(enregistrement(page) ? { 'ap.compte.proprio': enregistrement(page) } : {}) });
    p.executer(site.injectionAvant({ prenom: 'Appli' }, [], null, api.proprioLocal(), api.proprioLocalAdresse()));
    assert.equal(p.m.has('ap.compte.sale'), meme, 'script injecté, données de la page ' + (meme ? 'gardées' : 'effacées') + ' : ' + quoi);
    assert.deepEqual(p.lire('ap.compte.proprio'), meme ? enregistrement(page) : enregistrement(appli), 'propriétaire de la page : ' + quoi);
    // même propriétaire : le profil de l'appli est fusionné dans celui de la page (l'appli gagne sur un même champ), le reste de la page reste ;
    // autre propriétaire : la page est vidée avant, il ne reste que le profil de l'appli
    assert.equal(p.lire('ap.profil').prenom, 'Appli', 'profil de l’appli : ' + quoi);
    assert.equal(p.lire('ap.profil').champ_page, meme ? 'garde' : undefined, 'champ propre à la page : ' + quoi);
  }
});

test('vue web : valeurs illisibles ou étrangères notées par la page ne sont jamais prises pour un propriétaire', async (t) => {
  const { api } = appareil(t, { stockage: { 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE } } });
  await api.chargerCompte();
  for (const brut of ['pas du json', 'null', '[1]', '42', '"c:42"', '{"id":42}', '{"id":["c:42"]}', '{"a":"x"}', 'true']) {
    assert.equal(api.memeProprioPage(undefined), false);
    const p = pageWeb({ ...DONNEES_PAGE, 'ap.compte.proprio': brut });
    p.executer(site.injectionAvant(null, [], null, api.proprioLocal(), api.proprioLocalAdresse()));
    assert.equal(p.m.has('ap.compte.sale'), false, brut);
    assert.deepEqual(p.lire('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE }, brut);
  }
  for (const faux of [42, null, undefined, {}, ['c:42']]) assert.equal(api.memeProprioPage(faux, faux), false, JSON.stringify(faux));
});

test('vue web : la session posée dans la page porte le numéro du compte quand l’appli le connaît (compte.js la reconnaît sans l’adresse)', () => {
  const avecNumero = pageWeb();
  avecNumero.executer(site.injectionAvant(null, [], { id: 42, courriel: NOUVELLE, session: 'S1', sync: null, depuis: '2026-11-01', admin: true }, 'c:42', FP_NOUVELLE));
  assert.deepEqual(avecNumero.lire('ap.compte'), { id: 42, courriel: NOUVELLE, session: 'S1', sync: null, depuis: '2026-11-01', admin: true });
  assert.deepEqual(avecNumero.lire('ap.compte.proprio'), { id: 'c:42', a: FP_NOUVELLE }, 'avec l’empreinte de l’adresse : compte.js reconnaît aussi une session sans numéro');
  const sansNumero = pageWeb();
  sansNumero.executer(site.injectionAvant(null, [], { courriel: ANCIENNE, session: 'S1', sync: null }, FP_ANCIENNE, FP_ANCIENNE));
  assert.deepEqual(sansNumero.lire('ap.compte'), { courriel: ANCIENNE, session: 'S1', sync: null }, 'sans numéro connu : rien d’inventé');
  assert.deepEqual(sansNumero.lire('ap.compte.proprio'), { id: FP_ANCIENNE });
  // session déjà posée dans la page (même session) : elle garde sa propre fiche, comme avant
  const deja = pageWeb({ 'ap.compte': { id: 42, courriel: NOUVELLE, session: 'S1', sync: '2026-11-11T00:00:00.000Z' }, 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE } });
  deja.executer(site.injectionAvant(null, [], { id: 42, courriel: NOUVELLE, session: 'S1', sync: null }, 'c:42', FP_NOUVELLE));
  assert.equal(deja.lire('ap.compte').sync, '2026-11-11T00:00:00.000Z');
  // appli sans compte : la session de la page est retirée
  const dehors = pageWeb({ 'ap.compte': { courriel: NOUVELLE, session: 'S1' } });
  dehors.executer(site.injectionAvant(null, [], null, '', ''));
  assert.equal(dehors.m.has('ap.compte'), false);
});

test('vue web : un autre compte vide TOUTES les données de la page (profil, favoris, séries, votes, marqueur, base…) avant d’y poser celles de l’appli', () => {
  const p = pageWeb({ ...DONNEES_PAGE, 'apq:test1': { s: 1 }, 'ap.sondage:7': '1', 'ap.sondage.jeton': 'jeton-de-Camille', 'ap.lettre': { a: 1 }, ap_naissance: '1990-01-01', 'ap.messages': [], 'ap.jeu2': { a: 1 }, 'ap.compat': [{ id: 'x' }], 'ap.compte.essai': { n: 1 }, 'ap.compte.empreinte': 'x',
    'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE }, 'ap.autre.cle': 'garde' });
  p.executer(site.injectionAvant({ prenom: 'Sam' }, [FAV_B], null, 'c:43', FP_AUTRE));
  assert.deepEqual([...p.m.keys()].sort(), ['ap.autre.cle', 'ap.compte.proprio', 'ap.favoris', 'ap.profil'], 'seules les clés du site sans lien avec une personne restent');
  assert.deepEqual(p.lire('ap.compte.proprio'), { id: 'c:43', a: FP_AUTRE });
  assert.deepEqual(p.lire('ap.profil'), { prenom: 'Sam' });
  assert.deepEqual(p.lire('ap.favoris'), [FAV_B]);
});

test('vue web : le message renvoyé à l’appli porte le propriétaire de la page (id et empreinte d’adresse), jamais autre chose qu’une chaîne', () => {
  const lectures = [
    [{ id: 'c:42', a: FP_NOUVELLE }, 'c:42', FP_NOUVELLE], [{ id: FP_ANCIENNE }, FP_ANCIENNE, ''], [{ id: 'c:42', a: 7 }, 'c:42', ''], [{ id: 7 }, '', ''],
    ['pas du json', '', ''], ['null', '', ''], [null, '', ''],
  ];
  for (const [noté, id, a] of lectures) {
    const p = pageWeb(noté === null ? {} : { 'ap.compte.proprio': noté });
    p.executer(site.INJECTION_APRES);
    assert.equal(p.messages.length, 1, 'message initial');
    assert.deepEqual([p.messages[0].type, p.messages[0].proprio, p.messages[0].proprioA, p.messages[0].compteChange], ['etat', id, a, false]);
  }
  // changement de « ap.compte » dans la page : message avec compteChange, propriétaire de ce moment
  const p = pageWeb({ 'ap.compte.proprio': { id: 'c:42', a: FP_NOUVELLE } });
  p.executer(site.INJECTION_APRES);
  p.contexte.localStorage.setItem('ap.compte', JSON.stringify({ id: 42, courriel: NOUVELLE, session: 'S1' }));
  assert.equal(p.messages.length, 2);
  assert.deepEqual([p.messages[1].compteChange, p.messages[1].proprio, p.messages[1].proprioA, JSON.parse(p.messages[1].compte).id], [true, 'c:42', FP_NOUVELLE, 42]);
});
