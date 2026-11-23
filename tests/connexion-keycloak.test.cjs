/* global __dirname */
// Connexion par Keycloak CAPIT (auth.capit.net, realm capit, 23/11/2026 ; avant : connect.capit.net) : autorisation, jeton et déconnexion sur
// l'émetteur Keycloak, client public affectionplus-appli avec PKCE S256, session web PARTAGÉE avec le navigateur (jamais éphémère).
// Écrans : « Créer un compte » → prompt=create ; réseau social → kc_idp_hint + prompt=login ; prompt=login après une déconnexion dans
// l'appli ; plus de paramètre propre à l'ancien fournisseur (ecran, fournisseurs). src/connexion.ts est transpilé et exécuté avec de
// faux modules (aucun réseau).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const SRC = path.join(__dirname, '..', 'src');

function charger(reconnexion, os = 'android') {
  const appels = [];
  class AuthRequest {
    constructor(cfg) { this.cfg = cfg; this.codeVerifier = 'v'; appels.push({ cfg }); }
    async promptAsync(decouverte, options) { Object.assign(appels[appels.length - 1], { decouverte, options }); return { type: 'cancel', params: {} }; }
  }
  const modules = {
    'expo-apple-authentication': { isAvailableAsync: async () => false },
    'expo-auth-session': { AuthRequest, ResponseType: { Code: 'code' }, Prompt: { Login: 'login' }, CodeChallengeMethod: { S256: 'S256' },
      exchangeCodeAsync: async () => ({}) },
    'react-native': { Platform: { OS: os } },
    './compte': {
      OIDC: { client: 'affectionplus-appli', retour: 'com.affectionplus.app:/connexion', decouverte: { authorizationEndpoint: 'a', tokenEndpoint: 't' } },
      connecterOidc: async () => ({ ok: true }),
      reconnexionDemandee: async () => reconnexion,
    },
  };
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, 'connexion.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exp = {};
  new Function('exports', 'require', js)(exp, (n) => { assert.ok(modules[n], 'dépendance connue : ' + n); return modules[n]; });
  return { exp, appels };
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

test('connexion simple : session web partagée, PKCE S256, sans prompt ni paramètre de l\'ancien fournisseur', async () => {
  for (const os of ['android', 'ios']) {
    const { exp, appels } = charger(false, os);
    assert.equal(await exp.connexionOidc('fr'), 'annule');
    assert.equal(appels.length, 1);
    assert.equal(appels[0].options.preferEphemeralSession, false);
    assert.equal(appels[0].cfg.prompt, undefined);
    assert.equal(appels[0].cfg.usePKCE, true);
    assert.equal(appels[0].cfg.codeChallengeMethod, 'S256');
    assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr' }, os);
  }
});

test('« Créer un compte » : prompt=create', async () => {
  const { exp, appels } = charger(false);
  await exp.connexionOidc('de', 'inscription');
  assert.equal(appels[0].cfg.prompt, 'create');
  assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'de' });
});

test('réseau social : kc_idp_hint du realm et prompt=login', async () => {
  const attendu = { facebook: 'facebook', linkedin: 'linkedin-openid-connect', google: 'google' };
  for (const [ecran, idp] of Object.entries(attendu)) {
    const { exp, appels } = charger(false);
    await exp.connexionOidc('fr', ecran);
    assert.equal(appels[0].cfg.prompt, 'login', ecran);
    assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr', kc_idp_hint: idp });
  }
});

test('écran inconnu (ancien Snapchat) : connexion simple', async () => {
  const { exp, appels } = charger(false);
  await exp.connexionOidc('fr', 'snapchat');
  assert.equal(appels[0].cfg.prompt, undefined);
  assert.deepEqual(appels[0].cfg.extraParams, { ui_locales: 'fr' });
});

test('prompt=login après une déconnexion dans l\'appli', async () => {
  const { exp, appels } = charger(true);
  await exp.connexionOidc('fr');
  assert.equal(appels[0].cfg.prompt, 'login');
});

test('plus de bouton Snapchat', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(SRC, 'app', 'compte.tsx'), 'utf8'), /snapchat/i);
  assert.doesNotMatch(fs.readFileSync(path.join(SRC, 'components', 'profil-photo.tsx'), 'utf8'), /RESEAUX = .*snapchat/);
});
