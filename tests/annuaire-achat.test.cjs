const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const sourceProduits = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/annuaire-produits.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText;

const sourceAchat = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/annuaire-achat.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } },
).outputText;

const exportsProduits = {};
vm.runInThisContext('(function (exports) {\n' + sourceProduits + '\n})')(exportsProduits);

function creerClient(plateforme, options = {}) {
  const appels = {
    envoyerApple: [],
    envoyerGoogle: [],
    finish: [],
    requestPurchase: [],
    deepLink: [],
    openURL: [],
  };
  const iapMock = {
    ErrorCode: { UserCancelled: 'user-cancelled' },
    initConnection: async () => true,
    endConnection: async () => true,
    purchaseUpdatedListener: (cb) => {
      iapMock._onUpdate = cb;
      return { remove: () => {} };
    },
    purchaseErrorListener: (cb) => {
      iapMock._onError = cb;
      return { remove: () => {} };
    },
    fetchProducts: async () => options.produits || [
      {
        id: 'com.affectionplus.app.annuaire.pages1',
        nameAndroid: '1 page',
        subscriptionOffers: [{ offerTokenAndroid: 'tok-offre-1', displayPrice: '9,99 €' }],
      },
      {
        id: 'com.affectionplus.app.annuaire.pages5',
        displayName: 'Jusqu’à 5 pages',
        displayPrice: '29,99 €',
        subscriptionOffers: [{ offerTokenAndroid: 'tok-offre-5', displayPrice: '29,99 €' }],
      },
    ],
    getActiveSubscriptions: async () => options.actifs || [],
    requestPurchase: async (req) => {
      appels.requestPurchase.push(req);
    },
    finishTransaction: async (arg) => {
      appels.finish.push(arg);
    },
    restorePurchases: async () => {},
    getAvailablePurchases: async () => options.achatsDisponibles || [],
    showManageSubscriptionsIOS: async () => {
      if (options.echecShowManage) throw new Error('indisponible');
    },
    deepLinkToSubscriptions: async (arg) => {
      if (options.echecDeepLink) throw new Error('indisponible');
      appels.deepLink.push(arg);
    },
  };
  const modules = {
    'react-native': {
      Platform: { OS: plateforme },
      Linking: { openURL: async (u) => { appels.openURL.push(u); } },
    },
    '@/annuaire-produits': exportsProduits,
    '@/annuaire-api': {
      envoyerTransaction: async (t) => {
        appels.envoyerApple.push(t);
        return { ok: options.serveurOk !== false, statut: options.serveurOk !== false ? 200 : 500 };
      },
      envoyerTransactionGoogle: async (id, t) => {
        appels.envoyerGoogle.push({ productId: id, purchaseToken: t });
        return { ok: options.serveurOk !== false, statut: options.serveurOk !== false ? 200 : 500 };
      },
    },
    'expo-iap': iapMock,
  };
  const exports = {};
  const fn = vm.runInThisContext('(function (exports, require) {\n' + sourceAchat + '\n})', { filename: 'annuaire-achat.ts' });
  fn(exports, (nom) => {
    assert.ok(modules[nom], 'module connu : ' + nom);
    return modules[nom];
  });
  return { achat: exports, appels, iapMock };
}

test('Google Play : lireOffres extrait le prix et offerTokenAndroid des subscriptionOffers', async () => {
  const { achat } = creerClient('android');
  assert.equal(achat.ACHAT_POSSIBLE, true);
  const offres = await achat.lireOffres();
  assert.equal(offres.length, 2);
  assert.deepEqual(offres[0], {
    id: 'com.affectionplus.app.annuaire.pages1',
    pages: 1,
    nom: '1 page',
    prix: '9,99 €',
    offerToken: 'tok-offre-1',
  });
});

test('Google Play : nouvel abonnement envoie obfuscatedAccountId et offerToken', async () => {
  const { achat, appels } = creerClient('android');
  await achat.acheter('com.affectionplus.app.annuaire.pages5', 'uuid-compte-123', 'tok-offre-5');
  assert.equal(appels.requestPurchase.length, 1);
  assert.deepEqual(appels.requestPurchase[0], {
    request: {
      google: {
        skus: ['com.affectionplus.app.annuaire.pages5'],
        obfuscatedAccountId: 'uuid-compte-123',
        subscriptionOffers: [{ sku: 'com.affectionplus.app.annuaire.pages5', offerToken: 'tok-offre-5' }],
      },
    },
    type: 'subs',
  });
});

test('Google Play : passage à une formule supérieure utilise charge-prorated-price et baisse utilise deferred', async () => {
  const { achat: achatUp, appels: appelsUp } = creerClient('android', {
    actifs: [{ isActive: true, productId: 'com.affectionplus.app.annuaire.pages1', purchaseTokenAndroid: 'ancien-tok-1' }],
  });
  await achatUp.acheter('com.affectionplus.app.annuaire.pages10', 'uuid-compte-123', 'tok-10');
  assert.deepEqual(appelsUp.requestPurchase[0].request.google.subscriptionProductReplacementParams, {
    oldProductId: 'com.affectionplus.app.annuaire.pages1',
    replacementMode: 'charge-prorated-price',
  });
  assert.equal(appelsUp.requestPurchase[0].request.google.purchaseToken, 'ancien-tok-1');

  const { achat: achatDown, appels: appelsDown } = creerClient('android', {
    actifs: [{ isActive: true, productId: 'com.affectionplus.app.annuaire.pages15', purchaseToken: 'ancien-tok-15' }],
  });
  await achatDown.acheter('com.affectionplus.app.annuaire.pages5', 'uuid-compte-123', 'tok-5');
  assert.deepEqual(appelsDown.requestPurchase[0].request.google.subscriptionProductReplacementParams, {
    oldProductId: 'com.affectionplus.app.annuaire.pages15',
    replacementMode: 'deferred',
  });
});

test('Google Play : traiterAchat n’appelle finishTransaction qu’après accord du serveur et ignore les achats pending', async () => {
  const { achat: achatOk, appels: appelsOk } = creerClient('android', { serveurOk: true });
  const pending = await achatOk.traiterAchat({
    productId: 'com.affectionplus.app.annuaire.pages1',
    purchaseToken: 'tok-pending',
    purchaseState: 'pending',
  });
  assert.equal(pending, false);
  assert.equal(appelsOk.envoyerGoogle.length, 0);
  assert.equal(appelsOk.finish.length, 0);

  const ok = await achatOk.traiterAchat({
    productId: 'com.affectionplus.app.annuaire.pages1',
    purchaseToken: 'tok-valide',
    purchaseState: 'purchased',
  });
  assert.equal(ok, true);
  assert.deepEqual(appelsOk.envoyerGoogle, [{ productId: 'com.affectionplus.app.annuaire.pages1', purchaseToken: 'tok-valide' }]);
  assert.equal(appelsOk.finish.length, 1);

  const { achat: achatKo, appels: appelsKo } = creerClient('android', { serveurOk: false });
  const ko = await achatKo.traiterAchat({
    productId: 'com.affectionplus.app.annuaire.pages1',
    purchaseToken: 'tok-ko',
    purchaseState: 'purchased',
  });
  assert.equal(ko, false);
  assert.equal(appelsKo.finish.length, 0);
});

test('Google Play : gererAbonnement ouvre le centre d’abonnements Google Play avec repli URL', async () => {
  const { achat, appels } = creerClient('android');
  await achat.gererAbonnement('com.affectionplus.app.annuaire.pages5');
  assert.deepEqual(appels.deepLink, [{
    packageNameAndroid: 'com.affectionplus.app',
    skuAndroid: 'com.affectionplus.app.annuaire.pages5',
  }]);

  const { achat: achatRepli, appels: appelsRepli } = creerClient('android', { echecDeepLink: true });
  await achatRepli.gererAbonnement('com.affectionplus.app.annuaire.pages5');
  assert.deepEqual(appelsRepli.openURL, [
    'https://play.google.com/store/account/subscriptions?package=com.affectionplus.app&sku=com.affectionplus.app.annuaire.pages5',
  ]);
});

test('iOS : acheter et traiterAchat continuent de passer par StoreKit / envoyerTransaction', async () => {
  const { achat, appels } = creerClient('ios', { serveurOk: true });
  await achat.acheter('com.affectionplus.app.annuaire.pages1', 'uuid-ios');
  assert.deepEqual(appels.requestPurchase[0], {
    request: {
      apple: {
        sku: 'com.affectionplus.app.annuaire.pages1',
        appAccountToken: 'uuid-ios',
        andDangerouslyFinishTransactionAutomatically: false,
      },
    },
    type: 'subs',
  });
  const ok = await achat.traiterAchat({
    productId: 'com.affectionplus.app.annuaire.pages1',
    purchaseToken: 'jws-apple',
  });
  assert.equal(ok, true);
  assert.deepEqual(appels.envoyerApple, ['jws-apple']);
  assert.equal(appels.finish.length, 1);
});
