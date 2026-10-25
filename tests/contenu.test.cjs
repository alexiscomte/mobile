/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Le moteur réel (src/moteur/contenu.ts) est exécuté sous Node ; le contenu en service (jsonEmbarque : mise à jour téléchargée ou copie de
// l'appli), le dépôt des mises à jour (maj/depot.ts) et le réseau sont simulés. Depuis le 26/10/2026 (#162), les mises à jour passent par le
// manifeste (tests/maj.test.cjs) ; contenu.ts ne lit plus le site que pour une page toute nouvelle, absente de l'appareil.
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/moteur/contenu.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const page = 'fr/guides/article.html';
const nouvellePage = 'fr/guides/nouveau.html';
const entree = (u) => [u, 'Article', 'Description', 'Guides', 'guides'];
const texte = (h) => ({ t: 'Article', d: 'Description', fil: 'Guides', h1: 'Article', lead: '', h, maj: '2026-10-18' });
const indexAppli = { v: '2026-10-18-index', pv: { guides: 'ancien' }, pages: [entree(page), entree(nouvellePage)] };
const embarque = { v: 'ancien', pages: { [page]: texte('Copie embarquée') } };
const recent = { v: 'nouveau', pages: { [page]: texte('Copie actualisée'), [nouvellePage]: texte('Nouvel article') } };

function differee() {
  let resolve, reject;
  const promise = new Promise((ok, ko) => { resolve = ok; reject = ko; });
  return { promise, resolve, reject };
}
const reponse = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });

function moteur({ fichiers = { 'c/fr-index.json': indexAppli, 'c/fr-guides.json': embarque }, fetch, maj } = {}) {
  const service = { ...fichiers };
  const abonnes = [];
  let supprime = false;
  class Directory { constructor() { this.exists = true; } delete() { supprime = true; } }
  const modules = {
    'expo-file-system': { Directory, Paths: { document: '/doc' } },
    '../embarque': { jsonEmbarque: async (nom) => (service[nom] ? JSON.parse(JSON.stringify(service[nom])) : null) },
    '../maj/depot': {
      derniereVerification: () => 1234, majQuotidienne: () => undefined, surMaj: () => () => undefined,
      surNouveauContenu: (f) => { abonnes.push(f); return () => undefined; },
      mettreAJourContenu: maj || (async () => ({ telecharges: 0 })),
    },
    '../site': { SITE: 'https://contenu.example/' },
  };
  const exports = {};
  const appels = [];
  const req = (n) => { assert.ok(modules[n], 'dépendance native connue : ' + n); return modules[n]; };
  new Function('exports', 'require', 'fetch', source)(exports, req, (u) => { appels.push(u); return (fetch || (() => { throw new Error('requête inattendue'); }))(u); });
  return { api: exports, service, appels, publier: () => abonnes.forEach((f) => f()), supprime: () => supprime };
}

test('un article de l’appli se lit sans réseau', async () => {
  const { api, appels } = moteur();
  assert.equal((await api.article('fr', page)).h, 'Copie embarquée');
  assert.deepEqual(appels, []);
});

test('l’ancien cache d’avant le manifeste est effacé', () => {
  assert.equal(moteur().supprime(), true);
});

test('une page toute nouvelle, absente de l’appareil, est lue sur le site (une seule requête pour les lectures simultanées)', async () => {
  const reseau = differee();
  const { api, appels } = moteur({ fetch: () => reseau.promise });
  const lectures = Promise.all([api.article('fr', nouvellePage), api.article('fr', nouvellePage)]);
  await new Promise((ok) => setImmediate(ok));
  reseau.resolve(reponse(recent));
  assert.deepEqual((await lectures).map((a) => a.h), ['Nouvel article', 'Nouvel article']);
  assert.deepEqual(appels, ['https://contenu.example/assets/data/contenu/fr-guides.json']);
  assert.equal((await api.article('fr', page)).h, 'Copie embarquée', 'la page déjà présente garde la version en service');
});

test('hors ligne : une page absente rend null, les autres restent lisibles', async () => {
  const { api } = moteur({ fetch: async () => { throw new Error('hors ligne'); } });
  assert.equal(await api.article('fr', nouvellePage), null);
  assert.equal((await api.article('fr', page)).h, 'Copie embarquée');
});

test('une mise à jour mise en service remplace les copies en mémoire', async () => {
  const m = moteur();
  assert.equal((await m.api.article('fr', page)).h, 'Copie embarquée');
  m.service['c/fr-guides.json'] = recent;
  m.service['c/fr-index.json'] = { ...indexAppli, v: '2026-10-26-index', pv: { guides: 'nouveau' } };
  assert.equal((await m.api.article('fr', page)).h, 'Copie embarquée', 'mémoire tant que rien n’est annoncé');
  m.publier();
  assert.equal((await m.api.article('fr', page)).h, 'Copie actualisée');
  assert.equal((await m.api.infoContenu('fr')).date, '2026-10-26');
});

test('le bouton « Mettre à jour » passe par le manifeste et rend le nombre de fichiers reçus', async () => {
  let appel = 0;
  const { api } = moteur({ maj: async (progression) => { appel++; progression(1, 1); return { telecharges: 3 }; } });
  const vus = [];
  assert.equal(await api.toutTelecharger('fr', (f, t) => vus.push([f, t])), 3);
  assert.equal(appel, 1);
  assert.deepEqual(vus, [[1, 1]]);
});

test('le site ne répond pas : le bouton lève une erreur, le contenu reste lisible', async () => {
  const { api } = moteur({ maj: async () => { throw new Error('hors ligne'); } });
  await assert.rejects(api.toutTelecharger('fr'));
  assert.equal((await api.article('fr', page)).h, 'Copie embarquée');
});

test('fiche fusionnée : l’ancienne adresse ouvre la page de groupe et son ancre', async () => {
  const { api } = moteur({ fichiers: { 'c/fr-index.json': { ...indexAppli, r: { 'fr/vieux.html': page + '#section' } }, 'c/fr-guides.json': embarque } });
  assert.equal((await api.article('fr', 'fr/vieux.html')).h, 'Copie embarquée');
  assert.equal(await api.ancreRedirigee('fr', 'fr/vieux.html'), 'section');
});
