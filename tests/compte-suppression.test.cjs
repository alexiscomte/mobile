const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/compte.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

// Le vrai client et ses transitions de session tournent sous Node ; seul le
// stockage natif et la frontière HTTP sont remplacés. Aucun compte réel touché.
function client(reponse, statut = 200) {
  const stockage = new Map([
    ['ap.compte', JSON.stringify({ courriel: 'demo@example.test', session: 'session-test', sync: null })],
    ['ap.compte.sale', 'modifications'],
    ['ap.profil', JSON.stringify({ prenom: 'Camille' })],
  ]);
  const storage = {
    getItem: async (k) => stockage.get(k) ?? null,
    setItem: async (k, v) => { stockage.set(k, v); },
    removeItem: async (k) => { stockage.delete(k); },
    multiGet: async (cles) => cles.map((k) => [k, stockage.get(k) ?? null]),
    multiRemove: async (cles) => { cles.forEach((k) => stockage.delete(k)); },
    getAllKeys: async () => [...stockage.keys()],
  };
  const modules = {
    '@react-native-async-storage/async-storage': storage,
    './site': { SITE: 'https://compte.example/' },
    './compat_tests': { K_CT: 'ap.compat' },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, setTimeout, clearTimeout, AbortController,
    require: (nom) => { assert.ok(modules[nom], 'dépendance connue : ' + nom); return modules[nom]; },
    fetch: async (url, options) => {
      assert.equal(url, 'https://compte.example/api/compte/supprimer');
      assert.equal(options.headers.Authorization, 'Bearer session-test');
      return { status: statut, json: async () => reponse };
    },
  }, { filename: 'compte.ts' });
  return { api: exports, stockage };
}

for (const etat of ['en_attente', 'manuelle']) {
  test(`une suppression réussie transmet l’état Apple ${etat} et ferme la session sans effacer les données locales`, async () => {
    const { api, stockage } = client({ ok: true, apple_revocation: etat });
    const resultat = await api.supprimer();
    assert.equal(resultat.ok, true);
    assert.equal(resultat.apple_revocation, etat);
    assert.equal(api.compteActuel(), null);
    assert.equal(stockage.has('ap.compte'), false);
    assert.equal(stockage.has('ap.compte.sale'), false);
    assert.equal(JSON.parse(stockage.get('ap.profil')).prenom, 'Camille');
  });
}

test('une réponse inconnue ne devient pas un état Apple affichable', async () => {
  const { api } = client({ ok: true, apple_revocation: '<message inconnu>' });
  const resultat = await api.supprimer();
  assert.equal(resultat.ok, true);
  assert.equal(resultat.apple_revocation, undefined);
});

test('un échec de suppression conserve le compte et ses modifications à synchroniser', async () => {
  const { api, stockage } = client({ ok: false, erreur: 'reseau', apple_revocation: 'en_attente' }, 503);
  const resultat = await api.supprimer();
  assert.equal(resultat.ok, false);
  assert.equal(resultat.apple_revocation, undefined);
  assert.equal(api.compteActuel().session, 'session-test');
  assert.equal(stockage.has('ap.compte.sale'), true);
});

test('une session expirée ne peut annoncer une suppression réussie', async () => {
  const { api, stockage } = client({ ok: false, erreur: 'session' }, 401);
  const resultat = await api.supprimer();
  assert.equal(resultat.ok, false);
  assert.equal(resultat.erreur, 'session');
  assert.equal(api.compteActuel(), null);
  assert.equal(stockage.has('ap.compte.sale'), true);
});
