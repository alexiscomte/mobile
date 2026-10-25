// Contrôle sans réseau des ressources réellement livrées à Metro.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const LANGUES = ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr'];

function verifier(racine = path.resolve(__dirname, '..'), site = process.env.AP_SITE || path.resolve(racine, '../affection')) {
  const texte = fs.readFileSync(path.join(racine, 'src/embarque-registre.ts'), 'utf8');
  const registre = new Map();
  for (const m of texte.matchAll(/"([^"]+)": require\("([^"]+)"\)/g)) {
    assert.ok(!registre.has(m[1]), 'Ressource dupliquée : ' + m[1]);
    registre.set(m[1], path.resolve(racine, 'src', m[2]));
  }
  assert.ok(registre.size > 0, 'Registre embarqué vide');
  const sourceDisponible = site && fs.existsSync(path.join(site, 'assets/data/contenu'));
  const source = (nom) => {
    const rel = nom.slice(2);
    if (nom.startsWith('c/')) return 'data/contenu/' + rel;
    if (nom.startsWith('s/')) return 'search-' + rel;
    if (nom.startsWith('q/')) return 'data/quiz-' + rel;
    if (nom.startsWith('v/')) return 'data/villes/' + rel;
    // manifeste des mises à jour et ses lots, pages JSON, catalogue des dossiers (app_manifeste.py, #162)
    if (nom.startsWith('m/')) return 'data/appli/' + rel;
    if (nom.startsWith('l/')) return 'data/appli/lots/' + rel;
    if (nom.startsWith('p/')) return 'data/appli/pages/' + rel;
    if (nom.startsWith('k/')) return 'data/appli/dossiers/' + rel;
    return rel;
  };
  for (const [nom, fichier] of registre) {
    assert.ok(fs.existsSync(fichier), 'Fichier embarqué absent : ' + nom);
    if (sourceDisponible) {
      assert.ok(fs.readFileSync(fichier).equals(fs.readFileSync(path.join(site, 'assets', source(nom)))),
        'Ressource différente du site : ' + nom);
    }
  }
  const lire = (nom) => {
    assert.ok(registre.has(nom), 'Ressource non enregistrée : ' + nom);
    return JSON.parse(fs.readFileSync(registre.get(nom), 'utf8'));
  };
  const image = (url) => {
    const m = /^https:\/\/affectionplus\.com\/assets\/([^?#]+)/.exec(url);
    assert.ok(m, 'Image éditoriale non embarquable : ' + url);
    assert.ok(registre.has('i/' + m[1]), 'Image non enregistrée : ' + url);
  };
  let pages = 0;
  for (const lg of LANGUES) {
    const idx = lire('c/' + lg + '-index.json');
    assert.ok(idx.pages.length > 0, 'Catalogue vide : ' + lg);
    const paquets = new Map();
    const adresses = new Set();
    for (const [u, , , , g] of idx.pages) {
      assert.ok(!adresses.has(u), 'Article dupliqué : ' + u);
      adresses.add(u);
      if (!paquets.has(g)) paquets.set(g, lire('c/' + lg + '-' + g + '.json'));
      const paquet = paquets.get(g);
      assert.equal(paquet.v, idx.pv[g], 'Version incohérente : ' + lg + '/' + g);
      assert.ok(paquet.pages[u]?.h, 'Article absent ou vide : ' + u);
      for (const m of paquet.pages[u].h.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) image(m[1]);
      pages++;
    }
    for (const row of lire('s/' + lg + '.json')) {
      assert.ok(adresses.has(row[0].split('#')[0]), 'Résultat de recherche absent hors ligne : ' + row[0]);
    }
    const quiz = lire('q/' + lg + '.json');
    for (const m of JSON.stringify(quiz).matchAll(/"(assets\/[^"\\]+\.(?:webp|png|jpe?g|svg|gif))"/g)) {
      image('https://affectionplus.com/' + m[1]);
    }
    // Sur la machine de préparation, détecte aussi l'ajout d'un paquet non embarqué.
    if (sourceDisponible) {
      const attendu = JSON.parse(fs.readFileSync(path.join(site, 'assets/data/contenu', lg + '-index.json'), 'utf8'));
      assert.deepEqual(idx, attendu, 'Catalogue différent du site : ' + lg);
    }
  }
  return { pages, fichiers: registre.size, langues: LANGUES.length, siteCompare: !!sourceDisponible };
}

if (require.main === module) {
  try {
    const r = verifier();
    console.log(`Contenu hors ligne vérifié : ${r.pages} pages, ${r.langues} langues, ${r.fichiers} ressources${r.siteCompare ? ', identiques aux exports du site' : ''}.`);
  } catch (e) {
    console.error('Contenu hors ligne incomplet : ' + e.message);
    process.exitCode = 1;
  }
}
module.exports = { verifier };
