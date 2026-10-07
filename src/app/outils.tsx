// Mes outils (espace membre, 07/10/2026 soir ; cahier specs/espace-membre-reduit-0710.md, point 9), comme la page du site
// fr/mes-outils.html… (espace_membre.py) : maternité la plus proche, distance entre nos villes, compteur de couple (écrans natifs) et
// anniversaires de mariage (page du site). Textes et cartes : ui.json espacePages / espaceCartes (app_moteurs.py).
import React from 'react';

import { PageCartes } from '@/components/espace';

export default function MesOutils() {
  return <PageCartes onglet="outils" />;
}
