// Jeton de session AffectionPlus dans le stockage sécurisé du système (23/11/2026) : Keychain sur iOS, Keystore sur Android (expo-secure-store),
// jamais en clair dans AsyncStorage. Le reste de « ap.compte » (adresse, dates, drapeaux) reste dans AsyncStorage : ce n'est pas un secret.
// iOS : AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY (lisible en arrière-plan après le premier déverrouillage, pour l'envoi au passage en arrière-plan ;
// jamais copié dans une sauvegarde iCloud ni restauré sur un autre appareil). Android : le coffre est exclu de la sauvegarde automatique
// (règles android:fullBackupContent / dataExtractionRules du dépôt affectionplus-android). Un appareil restauré redemande donc la connexion.
// Le jeton est rangé AVEC le compte auquel il appartient (numéro et adresse) : un jeton resté dans le coffre (écriture refusée lors d'un
// changement de compte, Keychain d'iOS qui survit à la désinstallation) n'est jamais rendu à un autre compte (compte.ts chargerCompte).
// Aucun jeton Keycloak n'est gardé : le jeton d'identité sert une fois (POST /api/compte/oidc) et n'est jamais écrit.
import * as SecureStore from 'expo-secure-store';

const CLE = 'ap.compte.session';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

/** Ce que garde le coffre : le jeton et le compte auquel il appartient (id = numéro du compte, '' s'il n'est pas connu ; courriel en
 *  minuscules). lie = faux pour un jeton rangé seul par une version de travail du 23/11/2026 (jamais publiée). */
export type SessionSure = { jeton: string; id: string; courriel: string; lie: boolean };

/** Lit le contenu du coffre (exporté pour les essais) : JSON { j, id, a } ; un texte qui n'est pas ce JSON est un jeton rangé seul. */
export function lireContenu(brut: string | null): SessionSure | null {
  if (!brut) return null;
  if (brut[0] === '{') {
    try {
      const o = JSON.parse(brut) as { j?: unknown; id?: unknown; a?: unknown };
      if (o && typeof o.j === 'string' && o.j) return { jeton: o.j, id: typeof o.id === 'string' ? o.id : '', courriel: typeof o.a === 'string' ? o.a : '', lie: true };
    } catch { /* illisible */ }
    return null;
  }
  return { jeton: brut, id: '', courriel: '', lie: false };
}
/** Le jeton du coffre appartient-il à ce compte ? Même numéro quand les deux sont connus (l'adresse peut avoir changé), sinon même adresse. */
export function memeCompte(s: SessionSure, id: unknown, courriel: unknown): boolean {
  if (!s.lie) return true;
  const n = id === undefined || id === null ? '' : String(id);
  if (s.id && n) return s.id === n;
  const a = typeof courriel === 'string' ? courriel.trim().toLowerCase() : '';
  return !!a && a === s.courriel;
}

/** Contenu du coffre ; null s'il est vide (ou illisible : rien d'utilisable) ; undefined si le coffre ne répond pas pour l'instant (rien ne
 *  doit alors être effacé). */
export async function lireSession(): Promise<SessionSure | null | undefined> {
  try { return lireContenu(await SecureStore.getItemAsync(CLE, OPTIONS)); } catch { return undefined; }
}
/** Range le jeton avec son compte ; faux si le coffre a refusé (le jeton n'est alors jamais écrit en clair : il reste en mémoire pour ce
 *  lancement). */
export async function ecrireSession(jeton: string, id: unknown, courriel: string): Promise<boolean> {
  const contenu = JSON.stringify({ j: jeton, id: id === undefined || id === null ? '' : String(id), a: String(courriel || '').trim().toLowerCase() });
  try { await SecureStore.setItemAsync(CLE, contenu, OPTIONS); return true; } catch { return false; }
}
/** Vide le coffre ; faux s'il a refusé (le jeton resté là ne sera rendu qu'à son propre compte, et effacé au lancement suivant). */
export async function effacerSession(): Promise<boolean> {
  try { await SecureStore.deleteItemAsync(CLE, OPTIONS); return true; } catch { return false; }
}
