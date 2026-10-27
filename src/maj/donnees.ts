// Données des écrans natifs mises à jour sans nouvelle version (#162) : textes et barèmes des outils, interface, questions du jour,
// sondages, pays, villes de maternité, catalogue des pages. Ces JSON sont compilés dans l'appli ; une version plus récente téléchargée
// (d/<nom>.json, manifeste « outils ») est fusionnée EN PLACE dans l'objet importé, au lancement (premier import de app/_layout.tsx),
// avant que les écrans ne le lisent. Fusion profonde : une clé absente du fichier téléchargé garde sa valeur de l'appli ; un tableau est
// remplacé dans le même objet (les références gardées par les modules restent justes). Aucune donnée n'est exécutée.
import catalogue from '../catalogue.json';
import comparateur from '../moteur/comparateur.json';
import compatTxt from '../moteur/compat_txt.json';
import culture from '../moteur/culture.json';
import distance from '../moteur/distance.json';
import jeu2 from '../moteur/jeu2.json';
import maternites from '../moteur/maternites_fr.json';
import outilsTxt from '../moteur/outils_txt.json';
import pays from '../moteur/pays.json';
import qdj from '../moteur/qdj.json';
import sondages from '../moteur/sondages.json';
import ui from '../moteur/ui.json';
import { texteDepotSync } from './depot';

type Objet = Record<string, unknown>;
export const DONNEES: Record<string, unknown> = {
  'd/comparateur.json': comparateur, 'd/catalogue.json': catalogue, 'd/compat_txt.json': compatTxt, 'd/culture.json': culture, 'd/distance.json': distance,
  'd/jeu2.json': jeu2, 'd/maternites_fr.json': maternites, 'd/outils_txt.json': outilsTxt, 'd/pays.json': pays, 'd/qdj.json': qdj,
  'd/sondages.json': sondages, 'd/ui.json': ui,
};

const estObjet = (x: unknown): x is Objet => !!x && typeof x === 'object' && !Array.isArray(x);

/** Fusionne `neuf` dans `cible` sans changer l'identité des objets et tableaux de `cible`. Les types différents gardent la valeur de l'appli. */
export function fusionner(cible: unknown, neuf: unknown): void {
  if (Array.isArray(cible) && Array.isArray(neuf)) { cible.splice(0, cible.length, ...neuf); return; }
  if (!estObjet(cible) || !estObjet(neuf)) return;
  for (const [k, v] of Object.entries(neuf)) {
    const a = cible[k];
    if (estObjet(a) && estObjet(v)) fusionner(a, v);
    else if (Array.isArray(a) && Array.isArray(v)) fusionner(a, v);
    else if (a === undefined || a === null || typeof a === typeof v && !estObjet(v) && !Array.isArray(v)) cible[k] = v;
  }
}

let applique = false;
/** Applique les données téléchargées (une fois, au lancement). Rend les noms appliqués. */
export function appliquerDonnees(lire: (nom: string) => string | null = texteDepotSync): string[] {
  if (applique) return [];
  applique = true;
  const faits: string[] = [];
  for (const [nom, cible] of Object.entries(DONNEES)) {
    try {
      const t = lire(nom);
      if (!t) continue;
      const neuf = JSON.parse(t) as unknown;
      if (Array.isArray(cible) !== Array.isArray(neuf) || typeof neuf !== 'object') continue;   // forme inattendue : on garde l'appli
      if (nom === 'd/comparateur.json') {
        if (!estObjet(neuf) || neuf.version !== 1 || typeof neuf.filtreTr !== 'string' || !estObjet(neuf.langues)) continue;
        // Refuse un export incomplet avant la fusion : aucune langue ne récupère les données d'une autre.
        const langues = ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr'];
        const complet = langues.every((lg) => {
          const d = (neuf.langues as Objet)[lg];
          return estObjet(d) && typeof d.route === 'string' && estObjet(d.ui)
            && Array.isArray(d.themes) && Array.isArray(d.pays) && Array.isArray(d.references);
        });
        if (!complet) continue;
        new RegExp(neuf.filtreTr, 'iu'); // invalide : le catch garde intégralement la copie embarquée
      }
      fusionner(cible, neuf);
      faits.push(nom);
    } catch { /* fichier illisible : les données de l'appli restent */ }
  }
  return faits;
}

appliquerDonnees();
