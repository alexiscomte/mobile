// Ouvrir une page du site (vue web) par-dessus les onglets.
import type { Router } from 'expo-router';

import type { Langue } from './i18n';
import { page, urlPage, type Cle } from './site';

export function ouvrir(router: Router, url: string, titre: string, apres?: string) {
  router.push({ pathname: '/page', params: { url, titre, ...(apres ? { apres } : {}) } });
}

export function ouvrirCle(router: Router, cle: Cle, lg: Langue, ancre?: string, apres?: string) {
  ouvrir(router, urlPage(cle, lg, ancre), page(cle, lg).t, apres);
}
