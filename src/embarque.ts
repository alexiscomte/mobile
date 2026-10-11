// Contenu du site EMBARQUÉ dans l'appli (décision d'Alexis, 11/10/2026 : tout est présent hors ligne dès l'installation ; le réseau ne sert
// qu'aux mises à jour). Les fichiers (assets/embarque/, générés par outils/gen/app_embarquer.py du dépôt Claude) sont des ressources Metro,
// listées dans embarque-registre.ts : c/ paquets de contenu, s/ recherche, q/ quiz, v/ villes, i/ images.
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { REGISTRE } from './embarque-registre';

/** L'adresse (locale) d'un fichier embarqué, ou null s'il n'existe pas. */
export function uriEmbarque(nom: string): string | null {
  const m = REGISTRE[nom];
  if (m === undefined) return null;
  try { return Asset.fromModule(m).uri || null; } catch { return null; }
}

/** Le texte d'un fichier embarqué (JSON, JS), ou null. */
export async function texteEmbarque(nom: string): Promise<string | null> {
  const u = uriEmbarque(nom);
  if (!u) return null;
  try {
    const r = await fetch(u);
    // les adresses « file:// » répondent sans code HTTP fiable sur certaines plateformes : on juge sur le texte
    if (Platform.OS === 'web' && !r.ok) return null;
    const t = await r.text();
    return t || null;
  } catch { return null; }
}

/** Un JSON embarqué. */
export async function jsonEmbarque<T>(nom: string): Promise<T | null> {
  const t = await texteEmbarque(nom);
  if (!t) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}

const SITE_ASSETS = /^https:\/\/affectionplus\.com\/(assets\/[^"'\s?#)]+)/;

/** L'adresse locale d'une image du site (« https://affectionplus.com/assets/… » ou « assets/… »), ou null si elle n'est pas embarquée. */
export function uriImage(adresse: string): string | null {
  const m = SITE_ASSETS.exec(adresse);
  const rel = m ? m[1] : adresse.startsWith('assets/') ? adresse.split(/[?#]/)[0] : '';
  if (!rel) return null;
  return uriEmbarque('i/' + rel.slice('assets/'.length));
}

/** Une adresse d'image : la copie embarquée si elle existe, sinon l'adresse en ligne telle quelle. */
export function imageLocale(adresse: string): string {
  return uriImage(adresse) || adresse;
}

/** Remplace dans un HTML les images du site par leurs copies embarquées (src="https://affectionplus.com/assets/…"). */
export function localiserImages(html: string): string {
  return html.replace(/src="(https:\/\/affectionplus\.com\/assets\/[^"]+)"/g, (tout, adr: string) => {
    const u = uriImage(adr);
    return u ? 'src="' + u + '"' : tout;
  });
}
