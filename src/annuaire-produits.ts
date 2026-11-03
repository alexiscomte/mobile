// Formules App Store de l'annuaire (décision du 03/11/2026, claude/specs/annuaire-offre-decision.md § 2) : SEULE table à changer si la grille change (même liste dans
// claude/outils/asc_annuaire_iap.py, et côté serveur dans annuaire_api.js). `pages` = emplacements de la formule ; les prix viennent d'Apple, jamais d'ici.
export const PRODUITS_ANNUAIRE: readonly { id: string; pages: number }[] = [
  { id: 'com.affectionplus.app.annuaire.pages1', pages: 1 },
  { id: 'com.affectionplus.app.annuaire.pages5', pages: 5 },
  { id: 'com.affectionplus.app.annuaire.pages10', pages: 10 },
  { id: 'com.affectionplus.app.annuaire.pages15', pages: 15 },
  { id: 'com.affectionplus.app.annuaire.pages20', pages: 20 },
];
