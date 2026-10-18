const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { verifier } = require('../scripts/verifier-contenu.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'affection-embarque-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'));
  const entrees = [];
  const ecrire = (nom, data) => {
    const cible = path.join(root, 'assets/embarque', nom);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.writeFileSync(cible, JSON.stringify(data));
    entrees.push(`"${nom}": require("../assets/embarque/${nom}"),`);
    return cible;
  };
  for (const lg of ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr']) {
    const u = lg + '/index.html';
    ecrire('c/' + lg + '-index.json', { pv: { racine: 'v1' }, pages: [[u, 'Titre', '', '', 'racine']] });
    ecrire('c/' + lg + '-racine.json', { v: 'v1', pages: { [u]: { h: '<p>Article</p><img src="https://affectionplus.com/assets/photo.webp">' } } });
    ecrire('s/' + lg + '.json', [[u + '#section', 'Titre']]);
    ecrire('q/' + lg + '.json', { quiz: [] });
  }
  ecrire('i/photo.webp', 'image');
  fs.writeFileSync(path.join(root, 'src/embarque-registre.ts'), entrees.join('\n'));
  return root;
}

test('valide les neuf langues sans serveur ni dépôt du site', (t) => {
  assert.deepEqual(verifier(fixture(t), null), { pages: 9, fichiers: 37, langues: 9, siteCompare: false });
});
test('refuse un paquet physiquement absent', (t) => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, 'assets/embarque/c/fr-racine.json'));
  assert.throws(() => verifier(root, null), /Fichier embarqué absent/);
});
test('refuse un article absent dans un paquet existant', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'assets/embarque/c/fr-racine.json'), JSON.stringify({ v: 'v1', pages: {} }));
  assert.throws(() => verifier(root, null), /Article absent ou vide/);
});
test('refuse une image utilisée mais omise du registre', (t) => {
  const root = fixture(t);
  const p = path.join(root, 'src/embarque-registre.ts');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split('\n').filter((l) => !l.startsWith('"i/')).join('\n'));
  assert.throws(() => verifier(root, null), /Image non enregistrée/);
});
test('refuse une recherche pointant vers une page non embarquée', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'assets/embarque/s/fr.json'), '[["fr/absent.html"]]');
  assert.throws(() => verifier(root, null), /Résultat de recherche absent/);
});
test('refuse une version de paquet différente du catalogue', (t) => {
  const root = fixture(t);
  const p = path.join(root, 'assets/embarque/c/fr-racine.json');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('v1', 'v0'));
  assert.throws(() => verifier(root, null), /Version incohérente/);
});
