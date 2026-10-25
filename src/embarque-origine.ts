// Fichiers EMBARQUÉS dans l'appli, tels quels (sans les mises à jour téléchargées) : registre embarque-registre.ts (app_embarquer.py).
// Lu par le dépôt des mises à jour (maj/depot.ts), qui compare les empreintes ; les écrans passent par embarque.ts.
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { REGISTRE } from './embarque-registre';

/** L'adresse (locale) d'un fichier embarqué, ou null s'il n'existe pas. */
export function uriOrigine(nom: string): string | null {
  const m = REGISTRE[nom];
  if (m === undefined) return null;
  try { return Asset.fromModule(m).uri || null; } catch { return null; }
}

/** Le texte d'une adresse locale (fichier embarqué ou téléchargé), ou null. */
export async function texteUri(u: string | null): Promise<string | null> {
  if (!u) return null;
  try {
    const r = await fetch(u);
    // les adresses « file:// » répondent sans code HTTP fiable sur certaines plateformes : on juge sur le texte
    if (Platform.OS === 'web' && !r.ok) return null;
    const t = await r.text();
    return t || null;
  } catch { return null; }
}

/** Le texte d'un fichier embarqué, ou null. */
export function texteOrigine(nom: string): Promise<string | null> {
  return texteUri(uriOrigine(nom));
}

/** Un JSON embarqué, ou null. */
export async function jsonOrigine<T>(nom: string): Promise<T | null> {
  const t = await texteOrigine(nom);
  if (!t) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}
