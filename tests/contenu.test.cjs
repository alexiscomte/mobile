const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Le moteur réel est exécuté sous Node ; seuls les accès natifs aux ressources
// Expo et le réseau sont remplacés. Le cache reste constitué de vrais fichiers.
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/moteur/contenu.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const page = 'fr/guides/article.html';
const nouvellePage = 'fr/guides/nouveau.html';
const entree = (u) => [u, 'Article', 'Description', 'Guides', 'guides'];
const indexRecent = { v: '2026-10-18-index', pv: { guides: 'nouveau' }, pages: [entree(page), entree(nouvellePage)] };
const texte = (h) => ({ t: 'Article', d: 'Description', fil: 'Guides', h1: 'Article', lead: '', h, maj: '2026-10-18' });
const embarque = { v: 'ancien', pages: { [page]: texte('Copie embarquée') } };
const recent = { v: 'nouveau', pages: { [page]: texte('Copie actualisée'), [nouvellePage]: texte('Nouvel article') } };

function differee() {
  let resolve, reject;
  const promise = new Promise((ok, ko) => { resolve = ok; reject = ko; });
  return { promise, resolve, reject };
}
const reponse = (data) => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
const prochainTour = () => new Promise((resolve) => setImmediate(resolve));
async function sansAttendreLeReseau(promise) {
  const attente = Symbol('réseau encore suspendu');
  const resultat = await Promise.race([promise, prochainTour().then(() => attente)]);
  assert.notEqual(resultat, attente, 'un article présent sur l’appareil doit être lisible avant la réponse réseau');
  return resultat;
}

function moteur(t, { paquetLocal, paquetEmbarque = embarque, fetch } = {}) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'affection-contenu-'));
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  fs.mkdirSync(path.join(racine, 'contenu'));
  fs.writeFileSync(path.join(racine, 'contenu/fr-index.json'), JSON.stringify(indexRecent));
  if (paquetLocal) fs.writeFileSync(path.join(racine, 'contenu/fr-guides.json'), JSON.stringify(paquetLocal));
  class Directory {
    constructor(parent, nom) { this.path = path.join(parent.path || parent, nom); }
    get exists() { return fs.existsSync(this.path); }
    create() { fs.mkdirSync(this.path); }
  }
  class File extends Directory {
    info() { return { modificationTime: fs.statSync(this.path).mtimeMs / 1000 }; }
    async text() { return fs.readFileSync(this.path, 'utf8'); }
    write(contenu) { fs.writeFileSync(this.path, contenu); }
  }
  const modules = {
    'expo-file-system': { Directory, File, Paths: { document: racine } },
    '../embarque': { jsonEmbarque: async (nom) => nom === 'c/fr-guides.json' ? paquetEmbarque : null },
    '../site': { SITE: 'https://contenu.example/' },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (nom) => { assert.ok(modules[nom], 'dépendance native connue : ' + nom); return modules[nom]; },
    fetch: fetch || (() => { throw new Error('requête inattendue'); }),
  }, { filename: 'contenu.ts' });
  return { api: exports, cache: () => JSON.parse(fs.readFileSync(path.join(racine, 'contenu/fr-guides.json'), 'utf8')) };
}

test('un index plus récent ne bloque pas la lecture de l’article embarqué sur un réseau suspendu', async (t) => {
  const reseau = differee();
  const { api } = moteur(t, { fetch: () => reseau.promise });
  assert.equal((await sansAttendreLeReseau(api.article('fr', page))).h, 'Copie embarquée');
});

test('la copie téléchargée reste lisible immédiatement même si une nouvelle version est annoncée', async (t) => {
  const reseau = differee();
  const { api } = moteur(t, {
    paquetLocal: { v: 'intermediaire', pages: { [page]: texte('Copie téléchargée') } },
    fetch: () => reseau.promise,
  });
  assert.equal((await sansAttendreLeReseau(api.article('fr', page))).h, 'Copie téléchargée');
});

test('les lectures concurrentes partagent une mise à jour qui remplace ensuite le cache', async (t) => {
  const reseau = differee();
  let appels = 0;
  const { api, cache } = moteur(t, { fetch: () => { appels++; return reseau.promise; } });
  const lectures = await sansAttendreLeReseau(Promise.all([api.article('fr', page), api.article('fr', page)]));
  assert.deepEqual(lectures.map((a) => a.h), ['Copie embarquée', 'Copie embarquée']);
  assert.equal(appels, 1, 'un seul téléchargement par paquet en cours');
  reseau.resolve(reponse(recent));
  await prochainTour();
  assert.equal((await api.article('fr', page)).h, 'Copie actualisée');
  assert.equal(cache().pages[page].h, 'Copie actualisée');
  assert.equal(appels, 1);
});

test('une mise à jour échouée laisse la copie lisible et permet une nouvelle tentative', async (t) => {
  const premiere = differee();
  const seconde = differee();
  let appels = 0;
  const { api } = moteur(t, { fetch: () => ++appels === 1 ? premiere.promise : seconde.promise });
  assert.equal((await sansAttendreLeReseau(api.article('fr', page))).h, 'Copie embarquée');
  premiere.reject(new Error('hors ligne'));
  await prochainTour();
  assert.equal((await sansAttendreLeReseau(api.article('fr', page))).h, 'Copie embarquée');
  assert.equal(appels, 2);
  seconde.resolve(reponse(recent));
  await prochainTour();
  assert.equal((await api.article('fr', page)).h, 'Copie actualisée');
});

test('un article nouveau absent des copies attend le téléchargement au lieu de retourner introuvable', async (t) => {
  const reseau = differee();
  const { api } = moteur(t, { fetch: () => reseau.promise });
  let terminee = false;
  const lecture = api.article('fr', nouvellePage).then((a) => { terminee = true; return a; });
  await prochainTour();
  assert.equal(terminee, false);
  reseau.resolve(reponse(recent));
  assert.equal((await lecture).h, 'Nouvel article');
});

test('un paquet local incomplet ne masque pas un article encore présent dans la copie embarquée', async (t) => {
  const reseau = differee();
  const { api } = moteur(t, {
    paquetLocal: { v: 'intermediaire', pages: { [nouvellePage]: texte('Autre article') } },
    fetch: () => reseau.promise,
  });
  assert.equal((await sansAttendreLeReseau(api.article('fr', page))).h, 'Copie embarquée');
});

test('une copie à jour est lue sans télécharger à nouveau le paquet', async (t) => {
  const { api } = moteur(t, { paquetLocal: recent, fetch: () => assert.fail('aucun téléchargement nécessaire') });
  assert.equal((await api.article('fr', page)).h, 'Copie actualisée');
});

test('la mise à jour explicite attend et partage le téléchargement déjà lancé par la lecture', async (t) => {
  const reseau = differee();
  let paquets = 0;
  const { api } = moteur(t, { fetch: (url) => {
    if (url === 'https://contenu.example/assets/data/contenu/fr-index.json') return Promise.resolve(reponse(indexRecent));
    assert.equal(url, 'https://contenu.example/assets/data/contenu/fr-guides.json');
    paquets++;
    return reseau.promise;
  } });
  await sansAttendreLeReseau(api.article('fr', page));
  let terminee = false;
  const miseAJour = api.toutTelecharger('fr').then((n) => { terminee = true; return n; });
  await prochainTour();
  assert.equal(terminee, false, 'le bouton de mise à jour attend toujours la fin du téléchargement');
  assert.equal(paquets, 1);
  reseau.resolve(reponse(recent));
  assert.equal(await miseAJour, 1);
  assert.equal((await api.article('fr', page)).h, 'Copie actualisée');
});

test('un article absent de l’appareil retourne introuvable lorsque le réseau échoue', async (t) => {
  const { api } = moteur(t, { fetch: async () => { throw new Error('hors ligne'); } });
  assert.equal(await api.article('fr', nouvellePage), null);
  assert.equal((await api.article('fr', page)).h, 'Copie embarquée');
});
