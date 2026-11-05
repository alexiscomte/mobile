const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/dossier-achat.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function client(plateforme, o = {}) {
  const a = { finish: [], request: [], apple: [], google: [], intention: [] };
  const iap = {
    finishTransaction: async (x) => { a.finish.push(x); if (o.finishEchoue) throw new Error('consomme'); },
    requestPurchase: async (x) => { a.request.push(x); },
    getAvailablePurchases: async () => o.disponibles || [],
    getPendingTransactionsIOS: async () => o.disponibles || [],
    fetchProducts: async () => [{ id: 'com.affectionplus.app.dossier.unite', displayPrice: '1,00 €' }],
    initConnection: async () => true, endConnection: async () => true,
    purchaseUpdatedListener: (f) => { a.ecoute = f; return { remove() {} }; }, purchaseErrorListener: (f) => { a.ecouteErreur = f; return { remove() {} }; }, ErrorCode: { UserCancelled: 'x' },
  };
  const req = (m) => {
    if (m === 'react-native') return { Platform: { OS: plateforme } };
    if (m === '@/dossiers-api') return {
      creerIntention: async (s, l, p) => { a.intention.push([s, l, p]); return o.intention || { ok: true, statut: 200, jeton: 'uuid-1', produit: 'com.affectionplus.app.dossier.unite', jeton_compte: 'compte-1' }; },
      envoyerApple: async (j) => { a.apple.push(j); return o.reponse || { ok: true, statut: 200 }; },
      envoyerGoogle: async (j) => { a.google.push(j); return o.reponse || { ok: true, statut: 200 }; },
    };
    if (m === 'expo-iap') return iap;
    throw new Error('module ' + m);
  };
  const mod = { exports: {} };
  const code = source.replace(/Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\('expo-iap'\)\)\)/g, "Promise.resolve(require('expo-iap'))").replace(/import\('expo-iap'\)/g, "Promise.resolve(require('expo-iap'))");
  vm.runInThisContext('(function (exports, require, module) {\n' + code + '\n})')(mod.exports, req, mod);
  return { m: mod.exports, a };
}

test('iOS : le jeton de l\'intention part dans appAccountToken, jamais de fin automatique', async () => {
  const { m, a } = client('ios');
  assert.equal(await m.acheter('mon-dossier', 'fr'), 'lance');
  assert.deepEqual(a.intention[0], ['mon-dossier', 'fr', 'apple']);
  const r = a.request[0].request.apple;
  assert.equal(r.appAccountToken, 'uuid-1');
  assert.equal(r.andDangerouslyFinishTransactionAutomatically, false);
  assert.equal(a.request[0].type, 'in-app');
});
test('Android : le jeton part dans obfuscatedProfileId', async () => {
  const { m, a } = client('android');
  await m.acheter('mon-dossier', 'de');
  const r = a.request[0].request.google;
  assert.equal(r.obfuscatedProfileId, 'uuid-1');
  assert.equal(r.obfuscatedAccountId, 'compte-1');
  assert.deepEqual(r.skus, ['com.affectionplus.app.dossier.unite']);
});
test('déjà autorisé : aucun achat lancé', async () => {
  const { m, a } = client('ios', { intention: { ok: false, statut: 409, erreur: 'deja' } });
  assert.equal(await m.acheter('x-y-z', 'fr'), 'deja');
  assert.equal(a.request.length, 0);
});
test('serveur d\'accord : transaction terminée en consommable', async () => {
  const { m, a } = client('ios');
  assert.equal(await m.traiterAchat({ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 'jws' }), 'enregistre');
  assert.deepEqual(a.apple, ['jws']);
  assert.equal(a.finish[0].isConsumable, true);
});
test('serveur refuse : transaction laissée ouverte, la boutique la représentera', async () => {
  const { m, a } = client('ios', { reponse: { ok: false, statut: 503 } });
  assert.equal(await m.traiterAchat({ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 'jws' }), 'erreur');
  assert.equal(a.finish.length, 0);
});
test('Android en attente : ni serveur ni consommation', async () => {
  const { m, a } = client('android');
  assert.equal(await m.traiterAchat({ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 't', purchaseState: 'pending' }), 'attente');
  assert.equal(a.google.length, 0);
  assert.equal(a.finish.length, 0);
});
test('Android : réponse 202 du serveur = attente, pas de consommation', async () => {
  const { m, a } = client('android', { reponse: { ok: false, statut: 202, erreur: 'attente' } });
  assert.equal(await m.traiterAchat({ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 't' }), 'attente');
  assert.equal(a.finish.length, 0);
});
test('Android : déjà consommé par le serveur, l\'échec de finishTransaction est sans effet', async () => {
  const { m } = client('android', { finishEchoue: true });
  assert.equal(await m.traiterAchat({ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 't' }), 'enregistre');
});
test('reprise au lancement : seuls les achats de dossiers partent au serveur', async () => {
  const { m, a } = client('ios', { disponibles: [{ productId: 'com.affectionplus.app.annuaire.pages1', purchaseToken: 'ab' }, { productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 'do' }] });
  assert.equal(await m.reprendre(), 1);
  assert.deepEqual(a.apple, ['do']);
});
test('écoute : un achat de l\'annuaire ne passe pas par ce module', async () => {
  const { m, a } = client('ios');
  const r = []; await m.ouvrirAchats((x) => r.push(x), () => undefined);
  a.ecoute({ productId: 'com.affectionplus.app.annuaire.pages1', purchaseToken: 'ab' });
  await new Promise((f) => setTimeout(f, 5));
  assert.equal(a.apple.length, 0);
  assert.equal(r.length, 0);
});
test('un paiement non accepté par le serveur bloque un nouvel achat', async () => {
  const { m, a } = client('ios', { reponse: { ok: false, statut: 503 }, disponibles: [{ productId: 'com.affectionplus.app.dossier.unite', purchaseToken: 'do' }] });
  assert.equal(await m.acheter('x-y-z', 'fr'), 'bloque');
  assert.equal(a.request.length, 0);
});
test('annulation par l\'utilisateur : rappel d\'annulation, pas d\'erreur', async () => {
  const { m, a } = client('ios');
  let annule = 0, erreur = 0;
  await m.ouvrirAchats(() => undefined, () => { erreur += 1; }, () => { annule += 1; });
  a.ecouteErreur({ code: 'x' });
  assert.equal(annule, 1);
  assert.equal(erreur, 0);
  a.ecouteErreur({ code: 'autre' });
  assert.equal(erreur, 1);
});
