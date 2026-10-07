// Mes outils (espace membre ; « Mon astrologie » fusionnée le 07/10/2026 nuit, cahier specs/espace-membre-retouches-0710.md, décisions
// 5 et 7), comme la page du site fr/mes-outils.html… (espace_membre.py) : rappel des signes si la date de naissance est connue, puis trois
// groupes de cartes vers les écrans natifs — astrologie, outils du couple et de la famille, Mes sondages / Mes compatibilités amoureuses /
// Mon historique de connexion (sortis du menu). Textes et cartes : ui.json espacePages.outils / espaceCartes (app_moteurs.py).
import React from 'react';

import { PageOutils } from '@/components/espace';

export default function MesOutils() {
  return <PageOutils />;
}
