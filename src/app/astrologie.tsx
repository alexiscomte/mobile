// Mon astrologie (espace membre, 07/10/2026 soir ; cahier specs/espace-membre-reduit-0710.md, point 9), comme la page du site
// fr/mon-astrologie.html… (espace_membre.py) : rappel des signes si la date de naissance est connue, puis les pages d'astrologie en
// cartes vers leurs écrans natifs. Textes et cartes : ui.json espacePages / espaceCartes (app_moteurs.py).
import React from 'react';

import { PageCartes } from '@/components/espace';

export default function MonAstrologie() {
  return <PageCartes onglet="astro" />;
}
