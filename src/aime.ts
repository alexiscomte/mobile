// Pouce « j'aime » (07/10/2026, soir ; cahier specs/espace-membre-reduit-0710.md, point 7), comme espace.js du site (installerPouce) :
// GET /api/likes?p=<page>&j=<jeton local> et POST /api/likes {p, jeton_local} -> {ok, n, moi} (activite_api.js). Connecté, la session
// part dans l'en-tête Authorization (client commun de compte.ts) et le j'aime est celui du compte ; sans compte, un jeton aléatoire
// gardé sur l'appareil (« ap.jaime.jeton », 24 caractères, créé au premier toucher seulement, haché par le serveur ; il ne suit pas
// le compte). Aucune liste de personnes, et le titre de la page n'est jamais envoyé.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { appelApi, compteActuel } from './compte';

const K_JETON = 'ap.jaime.jeton';
const RX_JETON = /^[A-Za-z0-9_-]{16,64}$/;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export type EtatAime = { n: number; moi: boolean };

/** Chemin d'une page du site tel que le site le compte (« /fr/….html », index.html → dossier), sans ancre ni paramètres. */
export function cheminAime(u: string): string {
  let p = String(u || '').trim().replace(/^https?:\/\/[^/?#]+/i, '').split('#')[0].split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/index\.html$/, '/');
}

async function jeton(creer: boolean): Promise<string> {
  try {
    const j = await AsyncStorage.getItem(K_JETON);
    if (j && RX_JETON.test(j)) return j;
    if (!creer) return '';
    const b = Crypto.getRandomBytes(24);
    let o = '';
    for (let i = 0; i < 24; i++) o += ALPHABET.charAt(b[i] % 64);
    await AsyncStorage.setItem(K_JETON, o);
    return o;
  } catch { return ''; }
}

function etat(r: { ok?: boolean; n?: unknown; moi?: unknown }): EtatAime | null {
  return r.ok ? { n: Math.max(0, Math.floor(Number(r.n) || 0)), moi: !!r.moi } : null;
}

/** Nombre de j'aime de la page et « moi » (le compte connecté ou le jeton de l'appareil l'aime-t-il ?) ; null hors ligne. */
export async function lireAime(p: string): Promise<EtatAime | null> {
  const j = await jeton(false);
  return etat(await appelApi('api/likes?p=' + encodeURIComponent(p) + (j ? '&j=' + encodeURIComponent(j) : ''), undefined, 'GET'));
}

/** J'aime / je n'aime plus (bascule côté serveur) ; null hors ligne, au plafond ou sans compte ni stockage pour le jeton. */
export async function basculerAime(p: string): Promise<EtatAime | null> {
  const c = compteActuel();
  const j = await jeton(!c);                       // jeton créé seulement sans compte
  if (!c && !j) return null;
  const corps: Record<string, string> = { p };
  if (j) corps.jeton_local = j;
  return etat(await appelApi('api/likes', corps));
}
