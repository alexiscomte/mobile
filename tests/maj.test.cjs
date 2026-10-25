/* global Buffer, __dirname */
// Mises à jour de contenu sans nouvelle version (#162) : le moteur réel (src/maj/coeur.ts) contre un VRAI serveur HTTP local et de vrais
// fichiers ; coupures de connexion, fichiers corrompus, état à moitié écrit, reprise, fichiers achetés, version minimale de l'appli.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function charger(fichier, modules = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', fichier), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  // même royaume que les essais (comparaisons d'objets exactes) ; seules les dépendances déclarées sont fournies
  new Function('exports', 'require', source)(exports, (n) => { assert.ok(modules[n], 'dépendance : ' + n); return modules[n]; });
  return exports;
}
const M = charger('maj/coeur.ts');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ---------------------------------------------------------------- site de test servi en HTTP
function site(t) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-site-'));
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  const regles = { couper: new Set(), corrompre: new Set(), absent: new Set() };
  const demandes = [];
  const serveur = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0].slice(1));
    demandes.push(u);
    const f = path.join(racine, u);
    if (regles.absent.has(u) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    const b = fs.readFileSync(f);
    if (regles.couper.has(u)) {          // coupure au milieu du fichier
      res.writeHead(200, { 'Content-Length': b.length });
      res.write(b.subarray(0, Math.max(1, b.length >> 1)));
      setTimeout(() => res.socket.destroy(), 5);
      return;
    }
    res.writeHead(200, { 'Content-Length': b.length });
    res.end(regles.corrompre.has(u) ? Buffer.from(b.toString('utf8').replace(/a/g, 'b')) : b);
  });
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => {
    t.after(() => new Promise((fin) => serveur.close(fin)));
    ok({ racine, regles, demandes, base: 'http://127.0.0.1:' + serveur.address().port + '/' });
  }));
}

// ---------------------------------------------------------------- entrées-sorties réelles (fs de Node) dans un dossier de l'appareil
function appareil(t, pannes = {}) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-appareil-'));
  t.after(() => fs.rmSync(racine, { recursive: true, force: true }));
  const p = (c) => path.join(racine, c);
  const es = {
    lire: (c) => { try { return fs.readFileSync(p(c), 'utf8'); } catch { return null; } },
    ecrire: (c, x) => { fs.mkdirSync(path.dirname(p(c)), { recursive: true }); fs.writeFileSync(p(c), x); },
    existe: (c) => fs.existsSync(p(c)),
    supprimer: (c) => fs.rmSync(p(c), { force: true }),
    deplacer: (de, vers) => {
      if (pannes.deplacer && pannes.deplacer(de, vers)) throw new Error('panne simulée');
      assert.ok(!fs.existsSync(p(vers)), 'jamais d’écrasement : ' + vers);
      fs.renameSync(p(de), p(vers));
    },
    lister: (c) => { try { return fs.readdirSync(p(c), { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name); } catch { return []; } },
    creerDossier: (c) => fs.mkdirSync(p(c), { recursive: true }),
    taille: (c) => fs.statSync(p(c)).size,
    empreinte: async (c) => sha(fs.readFileSync(p(c))),
    telecharger: async (url, c) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(p(c), Buffer.from(await r.arrayBuffer()));
    },
    texteDistant: async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); },
  };
  return { es, racine, p };
}

// ---------------------------------------------------------------- publication (comme app_manifeste.py) : fichiers -> lots -> manifeste
function publier(racine, version, fichiers, extra = {}) {
  const paquets = [];
  const lot = (id, categorie, noms) => {
    const liste = { id, fichiers: noms.map(([nom, url]) => { const b = fs.readFileSync(path.join(racine, url)); return { nom, url, taille: b.length, sha256: sha(b) }; }) };
    const txt = JSON.stringify(liste);
    fs.mkdirSync(path.join(racine, 'assets/data/appli/lots'), { recursive: true });
    fs.writeFileSync(path.join(racine, 'assets/data/appli/lots', id + '.json'), txt);
    paquets.push({ id, categorie, type: 'lot', url: 'assets/data/appli/lots/' + id + '.json', version: sha(txt).slice(0, 12), taille: Buffer.byteLength(txt), sha256: sha(txt), min_appli: extra.min && extra.min[id] || '1.0.0', acces: 'public' });
    return liste;
  };
  const lots = {};
  for (const [id, cat, noms] of fichiers.lots || []) lots[id] = lot(id, cat, noms);
  for (const [id, cat, nom, url, acces, dossier] of fichiers.seuls || []) {
    const b = fs.readFileSync(path.join(racine, url));
    paquets.push({ id, categorie: cat, type: 'fichier', nom, url, version: sha(b).slice(0, 12), taille: b.length, sha256: sha(b), min_appli: '1.0.0', acces: acces || 'public', ...(dossier ? { dossier } : {}) });
  }
  const m = { format: extra.format || 1, version, date: version.slice(0, 10), min_appli: '1.0.0', paquets, modifications: extra.modifications || [] };
  fs.mkdirSync(path.join(racine, 'assets/data/appli'), { recursive: true });
  fs.writeFileSync(path.join(racine, 'assets/data/appli/manifeste.json'), JSON.stringify(m));
  return { manifeste: m, lots };
}
const ecrire = (racine, rel, contenu) => { fs.mkdirSync(path.dirname(path.join(racine, rel)), { recursive: true }); fs.writeFileSync(path.join(racine, rel), contenu); };

// état initial du site : 2 paquets de contenu, 1 index de recherche, 1 image, 1 fichier de données
function contenuV1(r) {
  ecrire(r, 'assets/data/contenu/fr-index.json', JSON.stringify({ v: 'v1', pages: [['fr/a.html', 'A', '', '', 'g']] }));
  ecrire(r, 'assets/data/contenu/fr-g.json', JSON.stringify({ v: 'v1', pages: { 'fr/a.html': { h: '<p>Version 1</p>' } } }));
  ecrire(r, 'assets/search-fr.json', JSON.stringify([['fr/a.html', 'A', '', '', '', '']]));
  ecrire(r, 'assets/photos/x.webp', 'image-v1');
  ecrire(r, 'assets/data/appli/donnees/ui.json', JSON.stringify({ a: 1 }));
  return publier(r, '2026-10-25T10:00:00Z', {
    lots: [['pages-fr', 'pages', [['c/fr-index.json', 'assets/data/contenu/fr-index.json'], ['c/fr-g.json', 'assets/data/contenu/fr-g.json']]],
      ['images', 'images', [['i/photos/x.webp', 'assets/photos/x.webp']]], ['outils', 'outils', [['d/ui.json', 'assets/data/appli/donnees/ui.json']]]],
    seuls: [['recherche-fr', 'recherche', 's/fr.json', 'assets/search-fr.json']],
  });
}
function contenuV2(r, extra) {
  ecrire(r, 'assets/data/contenu/fr-index.json', JSON.stringify({ v: 'v2', pages: [['fr/a.html', 'A', '', '', 'g'], ['fr/b.html', 'B', '', '', 'g']] }));
  ecrire(r, 'assets/data/contenu/fr-g.json', JSON.stringify({ v: 'v2', pages: { 'fr/a.html': { h: '<p>Version 2 avec barème</p>' }, 'fr/b.html': { h: '<p>Nouvelle page</p>' } } }));
  ecrire(r, 'assets/photos/y.webp', 'image-nouvelle-aaaa');
  ecrire(r, 'assets/data/appli/donnees/ui.json', JSON.stringify({ a: 2 }));
  return publier(r, '2026-10-26T10:00:00Z', {
    lots: [['pages-fr', 'pages', [['c/fr-index.json', 'assets/data/contenu/fr-index.json'], ['c/fr-g.json', 'assets/data/contenu/fr-g.json']]],
      ['images', 'images', [['i/photos/x.webp', 'assets/photos/x.webp'], ['i/photos/y.webp', 'assets/photos/y.webp']]],
      ['outils', 'outils', [['d/ui.json', 'assets/data/appli/donnees/ui.json']]]],
    seuls: [['recherche-fr', 'recherche', 's/fr.json', 'assets/search-fr.json'], ...((extra && extra.seuls) || [])],
  }, { modifications: [{ version: '2026-10-26T10:00:00Z', date: '2026-10-26', pages_modifiees: [
    { url: 'fr/b.html', titre: 'B', type: 'ajout', resume: 'Nouvelle' }, { url: 'fr/a.html', titre: 'A', type: 'mise_a_jour', resume: 'Barème' },
    { url: 'en/a.html', titre: 'A (en)', type: 'mise_a_jour' }], nombre: { fr: 2, en: 1 } }], ...(extra || {}) });
}
// le contenu embarqué dans l'appli = la v1 publiée (comme app_embarquer.py après app_manifeste.py)
function embarque(v1) {
  return { manifeste: async () => v1.manifeste, lot: async (id) => (v1.lots[id] ? v1.lots[id].fichiers : null) };
}
const lireDepot = (a, nom) => { const e = M.chargerEtat(a.es).fichiers[nom]; return e ? fs.readFileSync(a.p(e.f), 'utf8') : null; };

// ---------------------------------------------------------------- contrôles du manifeste
test('le manifeste refuse le code, les chemins dangereux et les empreintes invalides', () => {
  assert.equal(M.nomSur('c/fr-index.json'), true);
  assert.equal(M.nomSur('v/fr.js'), true, 'villes : données « APV.set(…) » lues comme JSON');
  assert.equal(M.nomSur('d/moteur.js'), false, 'aucun JavaScript hors des villes');
  assert.equal(M.nomSur('c/../../x.json'), false);
  assert.equal(M.nomSur('/c/x.json'), false);
  assert.equal(M.nomSur('i/photos/x.webp'), true);
  assert.equal(M.nomSur('z/x.json'), false);
  const bon = { format: 1, version: 'v', date: 'd', paquets: [{ id: 'a', categorie: 'x', type: 'fichier', nom: 'd/ui.json', url: 'assets/x.json', version: 'v', taille: 1, sha256: 'a'.repeat(64), min_appli: '1.0.0', acces: 'public' }] };
  assert.ok(M.lireManifeste(JSON.stringify(bon)));
  for (const mauvais of [
    { ...bon.paquets[0], nom: 'd/code.js' }, { ...bon.paquets[0], sha256: 'xyz' }, { ...bon.paquets[0], url: 'http://ailleurs/x.json' },
    { ...bon.paquets[0], url: 'assets/../server.js' }, { ...bon.paquets[0], acces: 'gratuit' }, { ...bon.paquets[0], type: 'script' }]) {
    assert.equal(M.lireManifeste(JSON.stringify({ ...bon, paquets: [mauvais] })), null, JSON.stringify(mauvais));
  }
  assert.equal(M.lireManifeste('{tronqué'), null);
  assert.equal(M.lireManifeste(JSON.stringify({ ...bon, paquets: [bon.paquets[0], bon.paquets[0]] })), null, 'identifiants en double');
});

test('versions de l’appli comparées numériquement', () => {
  assert.ok(M.compareVersions('1.10.0', '1.9.0') > 0);
  assert.equal(M.compareVersions('1.0', '1.0.0'), 0);
  assert.ok(M.compareVersions('1.0.0', '1.1.0') < 0);
});

// ---------------------------------------------------------------- téléchargement réel
test('première mise à jour : seuls les fichiers modifiés sont téléchargés, vérifiés puis mis en service', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  contenuV2(s.racine);
  const a = appareil(t);
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r.complet, true);
  assert.deepEqual(r.echecs, []);
  const etat = M.chargerEtat(a.es);
  // l'image x et la recherche n'ont pas changé : pas téléchargées ; index, paquet, nouvelle image, données, 3 lots et le manifeste
  assert.deepEqual(Object.keys(etat.fichiers).sort(), ['c/fr-g.json', 'c/fr-index.json', 'd/ui.json', 'i/photos/y.webp', 'l/images.json', 'l/outils.json', 'l/pages-fr.json', 'm/manifeste.json']);
  assert.equal(s.demandes.filter((u) => u === 'assets/photos/x.webp' || u === 'assets/search-fr.json').length, 0);
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 2/);
  assert.equal(etat.version, '2026-10-26T10:00:00Z');
  assert.deepEqual(a.es.lister('tmp'), [], 'dossier provisoire vidé');
  // un second passage n'a rien à télécharger
  const n = s.demandes.length;
  const r2 = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r2.telecharges, 0);
  assert.equal(s.demandes.length - n, 1, 'seul le manifeste est relu');
});

test('coupure pendant un téléchargement : l’ancienne version reste intacte, puis la reprise ne retélécharge pas ce qui est vérifié', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  const a = appareil(t);
  // une première mise à jour en service (v1 -> v1bis du paquet) pour avoir une « ancienne version » téléchargée
  ecrire(s.racine, 'assets/data/contenu/fr-g.json', JSON.stringify({ v: 'v1b', pages: { 'fr/a.html': { h: '<p>Version 1 bis</p>' } } }));
  publier(s.racine, '2026-10-25T12:00:00Z', {
    lots: [['pages-fr', 'pages', [['c/fr-index.json', 'assets/data/contenu/fr-index.json'], ['c/fr-g.json', 'assets/data/contenu/fr-g.json']]],
      ['images', 'images', [['i/photos/x.webp', 'assets/photos/x.webp']]], ['outils', 'outils', [['d/ui.json', 'assets/data/appli/donnees/ui.json']]]],
    seuls: [['recherche-fr', 'recherche', 's/fr.json', 'assets/search-fr.json']],
  });
  await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 1 bis/);
  // nouvelle version du site ; le paquet d'articles est coupé en plein transfert
  contenuV2(s.racine);
  s.regles.couper.add('assets/data/contenu/fr-g.json');
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r.complet, false);
  assert.deepEqual(r.echecs, ['c/fr-g.json']);
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 1 bis/, 'l’ancienne version reste en service');
  assert.equal(M.chargerEtat(a.es).version, '2026-10-25T12:00:00Z', 'la mise à jour n’est pas annoncée comme faite');
  const avant = s.demandes.length;
  // le réseau revient
  s.regles.couper.clear();
  const r2 = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r2.complet, true);
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 2/);
  const repris = s.demandes.slice(avant);
  assert.deepEqual(repris.filter((u) => !u.endsWith('manifeste.json')), ['assets/data/contenu/fr-g.json'], 'seul le fichier coupé est retéléchargé');
});

test('un fichier corrompu (empreinte fausse) ou absent du site est refusé ; l’ancienne version reste', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  contenuV2(s.racine);
  s.regles.corrompre.add('assets/data/appli/donnees/ui.json');
  s.regles.absent.add('assets/photos/y.webp');
  const a = appareil(t);
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.deepEqual(r.echecs.sort(), ['d/ui.json', 'i/photos/y.webp']);
  assert.equal(M.chargerEtat(a.es).fichiers['d/ui.json'], undefined, 'les données de l’appli restent en service');
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 2/, 'les autres fichiers vérifiés sont en service');
  assert.deepEqual(a.es.lister('tmp'), []);
});

test('appli fermée pendant l’écriture de l’état : l’état précédent fait foi', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  contenuV2(s.racine);
  const a = appareil(t, { deplacer: (de) => /^tmp\/etat-/.test(de) });   // le renommage du nouvel état échoue
  await assert.rejects(M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' }));
  assert.deepEqual(M.chargerEtat(a.es).fichiers, {}, 'aucun fichier à moitié mis en service');
  // un état tronqué sur le disque (coupure en pleine écriture) est ignoré au profit du précédent
  const b = appareil(t);
  await M.mettreAJour({ es: b.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  const bon = M.chargerEtat(b.es);
  fs.writeFileSync(b.p('etat-' + (bon.n + 1) + '.json'), '{"fichiers": {"c/fr-g.js');
  assert.deepEqual(M.chargerEtat(b.es).fichiers, bon.fichiers);
});

test('les fichiers achetés ne sont jamais téléchargés sans droit et sont rangés à part', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  ecrire(s.racine, 'assets/achats/d1/synthese.json', JSON.stringify({ t: 'Dossier complet' }));
  contenuV2(s.racine, { seuls: [['achat-d1', 'dossier', 'a/d1/synthese.json', 'assets/achats/d1/synthese.json', 'achat', 'd1']] });
  const a = appareil(t);
  await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(M.chargerEtat(a.es).fichiers['a/d1/synthese.json'], undefined);
  assert.equal(s.demandes.includes('assets/achats/d1/synthese.json'), false, 'aucune requête sans droit');
  await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0', droit: (d) => d === 'd1' });
  const e = M.chargerEtat(a.es).fichiers['a/d1/synthese.json'];
  assert.ok(e && e.f.startsWith('achats/'), 'dossier distinct des fichiers publics');
});

test('un paquet réservé à une version plus récente de l’appli est laissé tel quel', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  contenuV2(s.racine, { min: { outils: '9.0.0' } });
  const a = appareil(t);
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r.complet, true);
  assert.equal(M.chargerEtat(a.es).fichiers['d/ui.json'], undefined);
  assert.equal(s.demandes.includes('assets/data/appli/donnees/ui.json'), false);
});

test('un manifeste d’un format inconnu ou plus ancien que le contenu de l’appli ne change rien', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  const a = appareil(t);
  contenuV2(s.racine, { format: 2 });
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r.telecharges, 0);
  assert.deepEqual(M.chargerEtat(a.es).fichiers, {});
  // nouvelle version de l'appli installée, embarquant la v2 : les fichiers téléchargés avant elle sont retirés
  const v2 = contenuV2(s.racine);
  await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.ok(Object.keys(M.chargerEtat(a.es).fichiers).length > 0);
  assert.deepEqual(M.sansPerime(M.chargerEtat(a.es), v2.manifeste.version).fichiers, {});
  await M.mettreAJour({ es: a.es, embarque: embarque(v2), site: s.base, appli: '1.0.0' });
  assert.deepEqual(M.chargerEtat(a.es).fichiers, {});
  assert.deepEqual(a.es.lister('f'), [], 'fichiers inutiles effacés');
});

test('le site ne répond pas : erreur, rien n’est touché', async (t) => {
  const a = appareil(t);
  await assert.rejects(M.mettreAJour({ es: a.es, embarque: { manifeste: async () => null, lot: async () => null }, site: 'http://127.0.0.1:9/', appli: '1.0.0' }));
  assert.deepEqual(a.es.lister(''), []);
});

test('journal des changements : pages de la langue de l’appli, dernière mise à jour', () => {
  const m = { modifications: [
    { version: '3', date: '2026-10-27', pages_modifiees: [{ url: 'en/x.html', titre: 'X', type: 'ajout' }] },
    { version: '2', date: '2026-10-26', pages_modifiees: [{ url: 'fr/b.html', titre: 'B', type: 'ajout' }, { url: 'fr/a.html', titre: 'A', type: 'mise_a_jour' }], nombre: { fr: 5 } }] };
  const fr = M.nouveautes(m, 'fr');
  assert.equal(fr.length, 1);
  assert.equal(fr[0].date, '2026-10-26');
  assert.deepEqual(fr[0].pages.map((p) => p.url), ['fr/b.html', 'fr/a.html']);
  assert.equal(fr[0].total, 5);
  assert.deepEqual(M.nouveautes(m, 'de'), []);
  assert.deepEqual(M.nouveautes(null, 'fr'), []);
});

test('données des outils : fusion en place, identités conservées, forme inattendue ignorée', () => {
  const D = charger('maj/donnees.ts', new Proxy({}, { get: (_, n) => (n === './depot' ? { texteDepotSync: () => null } : {}), has: () => true }));
  const ui = { a: { fr: 'ancien', en: 'old' }, liste: [1, 2], n: 1 };
  const liste = ui.liste, a = ui.a;
  D.fusionner(ui, { a: { fr: 'neuf' }, liste: [3], n: 'texte', ajout: { x: 1 } });
  assert.equal(ui.a, a);
  assert.equal(ui.liste, liste);
  assert.deepEqual(ui, { a: { fr: 'neuf', en: 'old' }, liste: [3], n: 1, ajout: { x: 1 } });
});

test('appli tuée en plein téléchargement : les points de reprise gardent ce qui est vérifié, la relance repart de là', async (t) => {
  const s = await site(t);
  const v1 = contenuV1(s.racine);
  contenuV2(s.racine);
  const a = appareil(t);
  const vrai = a.es.telecharger;
  // le paquet d'articles ne répond jamais (appli tuée pendant ce téléchargement)
  a.es.telecharger = (url, c) => (url.includes('fr-g.json') ? new Promise(() => undefined) : vrai(url, c));
  M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0', pointDeReprise: 1 });
  await new Promise((ok) => setTimeout(ok, 150));
  const pendant = M.chargerEtat(a.es);
  assert.ok(pendant.fichiers['i/photos/y.webp'] && pendant.fichiers['d/ui.json'], 'déjà vérifiés et notés');
  assert.equal(pendant.fichiers['c/fr-g.json'], undefined, 'l’ancien paquet (celui de l’appli) reste en service');
  assert.equal(pendant.version, '', 'mise à jour non annoncée');
  // relance de l'appli : même dossier, réseau normal
  a.es.telecharger = vrai;
  const avant = s.demandes.length;
  const r = await M.mettreAJour({ es: a.es, embarque: embarque(v1), site: s.base, appli: '1.0.0' });
  assert.equal(r.complet, true);
  // seuls le paquet bloqué et l'index (téléchargé en dernier, après les paquets qu'il annonce) restaient à faire
  assert.deepEqual(s.demandes.slice(avant).filter((u) => !u.endsWith('manifeste.json')), ['assets/data/contenu/fr-g.json', 'assets/data/contenu/fr-index.json']);
  assert.match(lireDepot(a, 'c/fr-g.json'), /Version 2/);
});
