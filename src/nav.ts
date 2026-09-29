// Ouvrir une page du site (vue web) par-dessus les onglets ; résolution des liens relatifs des textes du site.
import type { useRouter } from 'expo-router';

import type { Langue } from './i18n';
import { page, urlPage, type Cle } from './site';

type Router = ReturnType<typeof useRouter>;

export function ouvrir(router: Router, url: string, titre: string, apres?: string) {
  router.push({ pathname: '/page', params: { url, titre, ...(apres ? { apres } : {}) } });
}

export function ouvrirCle(router: Router, cle: Cle, lg: Langue, ancre?: string, apres?: string) {
  ouvrir(router, urlPage(cle, lg, ancre), page(cle, lg).t, apres);
}

/** Le chemin d'un lien relatif (« ../astrologie/biorythme.html ») depuis une page du site (« fr/conseils/x.html »). */
export function resoudre(base: string, rel: string): string {
  const parts = base.split('/').slice(0, -1);
  for (const seg of rel.split('#')[0].split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

/** Ouvre un article du site en natif (hors ligne possible) à partir d'un chemin « fr/… ». */
export function ouvrirArticle(router: Router, u: string) {
  router.push({ pathname: '/article', params: { u } });
}
