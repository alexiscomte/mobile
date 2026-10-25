// Contenu du site EMBARQUÉ dans l'appli (décision d'Alexis, 11/10/2026 : tout est présent hors ligne dès l'installation ; le réseau ne sert
// qu'aux mises à jour). Les fichiers (assets/embarque/, générés par outils/gen/app_embarquer.py du dépôt Claude) sont des ressources Metro,
// listées dans embarque-registre.ts : c/ paquets de contenu, s/ recherche, q/ quiz, v/ villes, i/ images, p/ pages JSON, k/ catalogue des
// dossiers, m/ manifeste et l/ lots des mises à jour.
import { texteUri, uriOrigine } from './embarque-origine';
import { fichierDepot, texteDepot } from './maj/depot';

// Mises à jour sans nouvelle version (#162) : un fichier téléchargé et vérifié (maj/depot.ts) remplace la copie embarquée du même nom.

/** L'adresse (locale) d'un fichier : la mise à jour téléchargée s'il y en a une, sinon la copie embarquée ; null s'il n'existe pas. */
export function uriEmbarque(nom: string): string | null {
  return fichierDepot(nom) || uriOrigine(nom);
}

/** Le texte d'un fichier (JSON, villes), mis à jour ou embarqué, ou null. */
export async function texteEmbarque(nom: string): Promise<string | null> {
  const t = await texteDepot(nom);
  if (t) return t;
  return texteUri(uriOrigine(nom));
}

/** Un JSON, mis à jour ou embarqué. */
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
