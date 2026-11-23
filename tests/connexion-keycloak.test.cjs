/* global __dirname */
// Connexion par Keycloak CAPIT (auth.capit.net, realm capit, 23/11/2026 ; avant : connect.capit.net) : autorisation, jeton et déconnexion sur
// l'émetteur Keycloak, client public affectionplus-appli avec PKCE S256, session web PARTAGÉE avec le navigateur (jamais éphémère).
// Authentification TOUJOURS fraîche (relecture du 23/11/2026) : prompt=login à chaque connexion, « Créer un compte » → prompt=create +
// max_age=0, réseau social → kc_idp_hint + prompt=login ; plus de paramètre propre à l'ancien fournisseur (ecran, fournisseurs).
// src/connexion.ts est transpilé et exécuté avec de faux modules (aucun réseau).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const SRC = path.join(__dirname, '..', 'src');

function charger(os = 'android', { retour = { type: 'cancel', params: {} }, echange = async () => ({}), reponse = { ok: true } } = {}) {
  const appels = [], echanges = [], connexions = [];
  class AuthRequest {
    constructor(cfg) { this.cfg = cfg; this.codeVerifier = 'verificateur-pkce'; appels.push({ cfg }); }
    async promptAsync(decouverte, options) { Object.assign(appels[appels.length - 1], { decouverte, options }); return retour; }
  }
  const modules = {
    'expo-apple-authentication': { isAvailableAsync: async () => false },
    'expo-auth-session': { AuthRequest, ResponseType: { Code: 'code' }, Prompt: { Login: 'login' }, CodeChallengeMethod: { S256: 'S256' },
      exchangeCodeAsync: async (...a) => { echanges.push(a); return echange(...a); } },
    'react-native': { Platform: { OS: os } },
    './compte': {
      OIDC: { client: 'affectionplus-appli', retour: 'com.affectionplus.app:/connexion', decouverte: { authorizationEndpoint: 'a', tokenEndpoint: 't' } },
      connecterOidc: async (...a) => { connexions.push(a); return reponse; },
    },
  };
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, 'connexion.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exp = {};
  new Function('exports', 'require', js)(exp, (n) => { assert.ok(modules[n], 'dépendance connue : ' + n); return modules[n]; });
  return { exp, appels, echanges, connexions };
}

test('autorisation, jeton et déconnexion sur l\'émetteur Keycloak (realm capit), même client et même retour', () => {
  const src = fs.readFileSync(path.join(SRC, 'compte.ts'), 'utf8');
  assert.match(src, /OIDC_EMETTEUR = 'https:\/\/auth\.capit\.net\/realms\/capit'/);
  assert.match(src, /authorizationEndpoint: OIDC_EMETTEUR \+ '\/protocol\/openid-connect\/auth'/);
  assert.match(src, /tokenEndpoint: OIDC_EMETTEUR \+ '\/protocol\/openid-connect\/token'/);
  assert.match(src, /endSessionEndpoint: OIDC_EMETTEUR \+ '\/protocol\/openid-connect\/logout'/);
  assert.match(src, /client: 'affectionplus-appli'/);
  assert.match(src, /retour: 'com\.affectionplus\.app:\/connexion'/);
  const bloc = src.slice(src.indexOf('export const OIDC = {'), src.indexOf('};', src.indexOf('export const OIDC = {')));
  assert.doesNotMatch(bloc, /connect\.capit\.net|connexion\/token|SITE/);
});

test('connexion simple : authentification toujours fraîche (prompt=login), PKCE S256, sans paramètre de l\'ancien fournisseur', async () => {
  for (const os of ['android', 'ios']) {
    const { exp, appels } = charger(os);
    assert.equal(await exp.connexionOidc('fr'), 'annule');
    assert.equal(appels.length, 1);
    assert.equal(appels[0].options.preferEphemeralSession, false);
    assert.equal(appels[0].cfg.prompt, 'login', 'jamais de connexion sans écran : une autre appli qui déclarerait le schéma de retour ne passe pas en silence');
    assert.equal(appels[0].cfg.usePKCE, true);
    assert.equal(appels[0].cfg.codeChallengeMethod, 'S256');
    assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr' }, os);
  }
});

test('aucun chemin ne demande une connexion sans authentification fraîche (premier lancement, après un refus, une suppression, un 401)', async () => {
  for (const ecran of [undefined, 'inscription', 'facebook', 'linkedin', 'google', 'snapchat', 'nimporte']) {
    const { exp, appels } = charger();
    await exp.connexionOidc('fr', ecran);
    const { prompt, extraParams } = appels[0].cfg;
    assert.ok(prompt === 'login' || (prompt === 'create' && extraParams.max_age === '0'), String(ecran) + ' : ' + prompt);
    assert.ok(exp.parametresKeycloak(ecran).prompt, String(ecran));
  }
  const src = fs.readFileSync(path.join(SRC, 'connexion.ts'), 'utf8') + fs.readFileSync(path.join(SRC, 'compte.ts'), 'utf8');
  assert.doesNotMatch(src, /reconnexionDemandee|ap\.oidc\.reconnexion/, 'plus de drapeau : la règle ne dépend d\'aucun état');
});

test('« Créer un compte » : prompt=create et max_age=0 (retour vers la connexion : mot de passe redemandé)', async () => {
  const { exp, appels } = charger();
  await exp.connexionOidc('de', 'inscription');
  assert.equal(appels[0].cfg.prompt, 'create');
  assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'de', max_age: '0' });
});

test('réseau social : kc_idp_hint du realm et prompt=login', async () => {
  const attendu = { facebook: 'facebook', linkedin: 'linkedin-openid-connect', google: 'google' };
  for (const [ecran, idp] of Object.entries(attendu)) {
    const { exp, appels } = charger();
    await exp.connexionOidc('fr', ecran);
    assert.equal(appels[0].cfg.prompt, 'login', ecran);
    assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr', kc_idp_hint: idp });
  }
});

test('écran inconnu (ancien Snapchat) : connexion simple, fraîche', async () => {
  const { exp, appels } = charger();
  await exp.connexionOidc('fr', 'snapchat');
  assert.equal(appels[0].cfg.prompt, 'login');
  assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr' });
});

test('retour avec un code : échange avec le code_verifier de la demande, jeton d\'identité remis à compte.ts', async () => {
  const { exp, echanges, connexions } = charger('ios', { retour: { type: 'success', params: { code: 'CODE' } }, echange: async () => ({ idToken: 'JETON-ID' }) });
  assert.equal(await exp.connexionOidc('fr'), 'ok');
  assert.deepEqual(echanges[0][0], { clientId: 'affectionplus-appli', code: 'CODE', redirectUri: 'com.affectionplus.app:/connexion', extraParams: { code_verifier: 'verificateur-pkce' } });
  assert.deepEqual(connexions[0], ['JETON-ID', false]);
  // import du profil (personne déjà connectée) : compte.ts refuse un autre compte
  const imp = charger('ios', { retour: { type: 'success', params: { code: 'CODE' } }, echange: async () => ({ idToken: 'JETON-ID' }), reponse: { ok: false, erreur: 'autre_compte', statut: 409 } });
  assert.equal(await imp.exp.connexionOidc('fr', 'facebook', true), 'autre');
  assert.deepEqual(imp.connexions[0], ['JETON-ID', true]);
});

test('pannes et abandons : Keycloak en panne à l\'échange, pas de jeton d\'identité, état refusé, écran fermé', async () => {
  const succes = { type: 'success', params: { code: 'CODE' } };
  assert.equal(await charger('ios', { retour: succes, echange: async () => { throw new Error('503'); } }).exp.connexionOidc('fr'), 'echec');
  assert.equal(await charger('ios', { retour: succes, echange: async () => ({}) }).exp.connexionOidc('fr'), 'echec');
  assert.equal(await charger('ios', { retour: { type: 'error', params: { error: 'state_mismatch' } } }).exp.connexionOidc('fr'), 'echec');
  assert.equal(await charger('ios', { retour: { type: 'error', params: { error: 'access_denied' } } }).exp.connexionOidc('fr'), 'annule');
  for (const type of ['cancel', 'dismiss', 'locked']) assert.equal(await charger('ios', { retour: { type, params: {} } }).exp.connexionOidc('fr'), 'annule', type);
  // un échec sans cause connue a toujours un texte à l'écran (jamais silencieux)
  const { exp } = charger();
  assert.equal(exp.messageConnexion('echec', 'fr'), '');
  assert.match(fs.readFileSync(path.join(SRC, 'components', 'espace.tsx'), 'utf8'), /m !== null\) Alert\.alert\('AffectionPlus', m \|\| \(UI_C\[lg\] \|\| UI_C\.fr\)\.oidcKo\)/);
});

test('plus de bouton Snapchat', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(SRC, 'app', 'compte.tsx'), 'utf8'), /snapchat/i);
  assert.doesNotMatch(fs.readFileSync(path.join(SRC, 'components', 'profil-photo.tsx'), 'utf8'), /RESEAUX = .*snapchat/);
});

test('retour de la connexion : route neutre « /connexion » (pas d\'écran « Unmatched Route » sur Android), qui ne lit ni code ni état', () => {
  const ecran = fs.readFileSync(path.join(SRC, 'app', 'connexion.tsx'), 'utf8');
  assert.match(ecran, /router\.canGoBack\(\)\) router\.back\(\); else router\.replace\('\/'\)/);
  assert.doesNotMatch(ecran, /useLocalSearchParams|connecterOidc|exchangeCodeAsync/);
  assert.match(fs.readFileSync(path.join(SRC, 'app', '_layout.tsx'), 'utf8'), /<Stack\.Screen name="connexion" options=\{\{ headerShown: false/);
  assert.match(fs.readFileSync(path.join(SRC, 'compte.ts'), 'utf8'), /retour: 'com\.affectionplus\.app:\/connexion'/);
});
