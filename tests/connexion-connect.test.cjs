/* global __dirname */
// Connexion par connect.capit.net (décision d'Alexis du 17/11/2026) : l'écran d'autorisation est servi par connect.capit.net, l'échange du code
// reste sur l'émetteur signé (affectionplus.com/connexion), la session web est PARTAGÉE avec le navigateur (jamais éphémère), et prompt=login
// n'est demandé que si l'écran l'exige (créer un compte, réseau social, import de profil) ou après une déconnexion dans l'appli.
// src/connexion.ts est transpilé et exécuté avec de faux modules (aucun réseau).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const SRC = path.join(__dirname, '..', 'src');

function charger(reconnexion) {
  const appels = [];
  class AuthRequest {
    constructor(cfg) { this.cfg = cfg; this.codeVerifier = 'v'; appels.push({ cfg }); }
    async promptAsync(decouverte, options) { Object.assign(appels[appels.length - 1], { decouverte, options }); return { type: 'cancel', params: {} }; }
  }
  const modules = {
    'expo-apple-authentication': { isAvailableAsync: async () => false },
    'expo-auth-session': { AuthRequest, ResponseType: { Code: 'code' }, Prompt: { Login: 'login' }, exchangeCodeAsync: async () => ({}) },
    'react-native': { Platform: { OS: 'android' } },
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

test('écran d\'autorisation sur connect.capit.net, échange du code sur l\'émetteur', () => {
  const src = fs.readFileSync(path.join(SRC, 'compte.ts'), 'utf8');
  assert.match(src, /authorizationEndpoint: 'https:\/\/connect\.capit\.net\/connexion\/auth'/);
  assert.match(src, /tokenEndpoint: SITE \+ 'connexion\/token'/);
  assert.doesNotMatch(src, /authorizationEndpoint: SITE/);
});

test('session web partagée, sans prompt=login pour une connexion simple', async () => {
  const { exp, appels } = charger(false);
  assert.equal(await exp.connexionOidc('fr'), 'annule');
  assert.equal(appels.length, 1);
  assert.equal(appels[0].options.preferEphemeralSession, false);
  assert.equal(appels[0].cfg.prompt, undefined);
});

test('prompt=login pour un écran demandé (créer un compte, réseau social)', async () => {
  for (const ecran of ['inscription', 'facebook', 'linkedin', 'snapchat']) {
    const { exp, appels } = charger(false);
    await exp.connexionOidc('fr', ecran);
    assert.equal(appels[0].cfg.prompt, 'login', ecran);
    assert.equal(appels[0].cfg.extraParams.ecran, ecran);
  }
});

test('prompt=login après une déconnexion dans l\'appli', async () => {
  const { exp, appels } = charger(true);
  await exp.connexionOidc('fr');
  assert.equal(appels[0].cfg.prompt, 'login');
});
