// Images embarquées d'un article : les SVG gardent leur type même quand l'adresse locale n'a plus d'extension (Android, publication ; 05/11/2026).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/embarque.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function charger(uriLocale) {
  const mod = { exports: {} };
  const req = (m) => {
    if (m === './embarque-origine') return { texteOrigine: async () => null, uriOrigine: (nom) => uriLocale(nom) };
    if (m === './maj/depot') return { fichierDepot: () => null, texteDepot: async () => null };
    throw new Error('module ' + m);
  };
  vm.runInThisContext('(function (exports, require, module) {\n' + source + '\n})')(mod.exports, req, mod);
  return mod.exports;
}
const sansExtension = (nom) => 'file:///data/res/assets_embarque_' + nom.replace(/[^a-z0-9]/gi, '_').toLowerCase();

test('SVG embarqué sans extension : repéré par data-svg', () => {
  const { localiserImages } = charger(sansExtension);
  const h = localiserImages('<img class="card-img" src="https://images.affectionplus.com/assets/vignettes/picto-1.svg" width="72">');
  assert.match(h, /src="file:\/\/\/data\/res\/assets_embarque_i_vignettes_picto_1_svg" data-svg="i\/vignettes\/picto-1\.svg"/);
});
test('photo embarquée : pas de data-svg', () => {
  const { localiserImages } = charger(sansExtension);
  const h = localiserImages('<img src="https://images.affectionplus.com/assets/photos/a.webp">');
  assert.doesNotMatch(h, /data-svg/);
  assert.match(h, /src="file:\/\//);
});
test('SVG avec paramètre : repéré aussi', () => {
  const { localiserImages } = charger(sansExtension);
  assert.match(localiserImages('<img src="https://affectionplus.com/assets/x.svg?v=3">'), /data-svg="i\/x\.svg"/);
});
test('image sans copie embarquée : adresse laissée telle quelle', () => {
  const { localiserImages } = charger(() => null);
  const h = '<img src="https://images.affectionplus.com/assets/vignettes/inconnue.svg">';
  assert.equal(localiserImages(h), h);
});
