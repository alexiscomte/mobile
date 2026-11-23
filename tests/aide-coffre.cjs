/* global __dirname */
// Coffre des essais : le VRAI src/session-sure.ts (jeton rangé avec son compte) au-dessus d'un faux expo-secure-store en mémoire.
// coffre = Map du Keychain / Keystore ; etat.refuseEcriture / refuseLecture / refuseEffacement simulent un coffre indisponible.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const CLE = 'ap.compte.session';
const JS = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'src', 'session-sure.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function coffreSur(depart = {}, etat = {}) {
  const coffre = new Map(Object.entries(depart));
  const secureStore = {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'apres-premier-deverrouillage-cet-appareil',
    getItemAsync: async (k) => { if (etat.refuseLecture) throw new Error('coffre illisible'); return coffre.get(k) ?? null; },
    setItemAsync: async (k, v) => { if (etat.refuseEcriture) throw new Error('coffre refusé'); coffre.set(k, v); },
    deleteItemAsync: async (k) => { if (etat.refuseEffacement) throw new Error('coffre refusé'); coffre.delete(k); },
  };
  const module = {};
  new Function('exports', 'require', JS)(module, (n) => { if (n !== 'expo-secure-store') throw new Error('dépendance imprévue : ' + n); return secureStore; });
  /** Jeton rangé (null si le coffre est vide) et compte auquel il est lié. */
  const contenu = () => module.lireContenu(coffre.get(CLE) ?? null);
  return { module, coffre, etat, contenu, jeton: () => (contenu() || {}).jeton ?? null };
}
/** Contenu du coffre tel que l'appli l'écrit : jeton lié au compte (numéro, adresse). */
const lie = (jeton, id, courriel) => JSON.stringify({ j: jeton, id: id === undefined ? '' : String(id), a: String(courriel || '').toLowerCase() });

module.exports = { CLE, coffreSur, lie };
