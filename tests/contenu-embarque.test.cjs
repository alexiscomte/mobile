const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const racine = path.resolve(__dirname, '..');
const registre = new Map();
for (const m of fs.readFileSync(path.join(racine, 'src/embarque-registre.ts'), 'utf8').matchAll(/"([^"]+)": require\("([^"]+)"\)/g)) {
  registre.set(m[1], path.resolve(racine, 'src', m[2]));
}
const ressources = new Map();
const lire = (nom) => {
  assert.ok(registre.has(nom), 'Ressource réellement embarquée : ' + nom);
  if (!ressources.has(nom)) ressources.set(nom, JSON.parse(fs.readFileSync(registre.get(nom), 'utf8')));
  return ressources.get(nom);
};
const source = ts.transpileModule(fs.readFileSync(path.join(racine, 'src/moteur/contenu.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const lg of ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr']) {
  test(`${lg} : tous les articles réels sont lisibles au premier lancement hors ligne`, async () => {
    // Aucun cache téléchargé ; toutes les tentatives réseau échouent.
    class Directory { get exists() { return false; } }
    const modules = {
      'expo-file-system': { Directory, Paths: { document: 'cache-vide' } },
      '../embarque': { jsonEmbarque: async (nom) => lire(nom) },
      // aucune mise à jour téléchargée (premier lancement)
      '../maj/depot': { derniereVerification: () => 0, majQuotidienne: () => undefined, mettreAJourContenu: async () => { throw new Error('Aucun réseau'); },
        surMaj: () => () => undefined, surNouveauContenu: () => () => undefined },
      '../site': { SITE: 'https://hors-ligne.invalid/' },
    };
    const exports = {};
    vm.runInNewContext(source, {
      exports, require: (nom) => { assert.ok(modules[nom]); return modules[nom]; },
      fetch: async () => { throw new Error('Aucun réseau'); },
    });
    const idx = lire(`c/${lg}-index.json`);
    assert.ok(idx.pages.length > 0);
    for (const [u, , , , groupe] of idx.pages) {
      const article = await exports.article(lg, u);
      assert.ok(article?.h, 'Article accessible : ' + u);
      assert.equal(article.h, lire(`c/${lg}-${groupe}.json`).pages[u].h, 'Texte intégral : ' + u);
    }
  });
}
