'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exécute le moteur livré à l'application, sans charger Expo ni accéder au réseau.
const source = fs.readFileSync(path.join(__dirname, '../src/recherche.ts'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsMoteur = {};
// dépendances natives remplacées par des fonctions vides (stockage, dépôt des mises à jour)
const vide = { __esModule: true, default: { multiRemove: async () => undefined }, surNouveauContenu: () => () => undefined };
vm.runInNewContext(code, { exports: exportsMoteur, require: () => vide });
const { chercher } = exportsMoteur;
const ligne = (titre, description = '', sousTitres = '', motsCles = '') =>
  ['fr/' + encodeURIComponent(titre) + '.html', titre, description, '', sousTitres, motsCles];
const titres = (lignes, q) => Array.from(chercher(lignes, q), r => r.t);

test('le polonais accepte les lettres accentuées et la saisie ASCII', () => {
  const lignes = [ligne('Miłość'), ligne('Miasto i jakość')];
  for (const q of ['miłość', 'MIŁOŚĆ', 'milosc']) assert.deepEqual(titres(lignes, q), ['Miłość']);
});

test('le turc conserve le mot entier au lieu de rechercher le fragment sağl', () => {
  const lignes = [ligne('Sağlık'), ligne('Sağlam')];
  for (const q of ['sağlık', 'SAĞLIK', 'saglik']) assert.deepEqual(titres(lignes, q), ['Sağlık']);
});

test('les ligatures françaises et le eszett allemand acceptent leurs équivalents ASCII', () => {
  assert.deepEqual(titres([ligne('Le cœur')], 'coeur'), ['Le cœur']);
  assert.deepEqual(titres([ligne('Œuvre')], 'oeuvre'), ['Œuvre']);
  assert.deepEqual(titres([ligne('Straße')], 'strasse'), ['Straße']);
});

test('les accents combinés et les apostrophes conservent les mots recherchés', () => {
  assert.deepEqual(titres([ligne('Cafe\u0301 en couple')], 'café couple'), ['Cafe\u0301 en couple']);
  assert.deepEqual(titres([ligne('L’amour à deux')], "l'amour"), ['L’amour à deux']);
});

test('la normalisation est identique dans tous les champs recherchés', () => {
  for (const champs of [['Miłość', '', ''], ['', 'Miłość', ''], ['', '', 'Miłość']]) {
    assert.deepEqual(titres([ligne('Relations', ...champs)], 'milosc'), ['Relations']);
  }
});

test('tous les mots sont nécessaires et les requêtes vides restent sans résultat', () => {
  assert.deepEqual(titres([ligne('Le cœur du couple'), ligne('Le cœur')], 'coeur couple'), ['Le cœur du couple']);
  for (const q of ['', ' ', 'a', '?!']) assert.deepEqual(titres([ligne('Amour')], q), []);
});

test('la recherche reste opérationnelle dans les neuf langues', () => {
  for (const mot of ['amour', 'love', 'liebe', 'amor', 'amore', 'saúde', 'liefde', 'miłość', 'sağlık']) {
    assert.deepEqual(titres([ligne(mot)], mot), [mot]);
  }
});

test('la limite de résultats demandée reste respectée', () => {
  const lignes = Array.from({ length: 80 }, (_, i) => ligne('Couple ' + i));
  assert.equal(chercher(lignes, 'couple').length, 60);
  assert.equal(chercher(lignes, 'couple', 5).length, 5);
});
