// Jeton de session AffectionPlus dans le stockage sécurisé du système (23/11/2026) : Keychain sur iOS, Keystore sur Android (expo-secure-store),
// jamais en clair dans AsyncStorage. Le reste de « ap.compte » (adresse, dates, drapeaux) reste dans AsyncStorage : ce n'est pas un secret.
// iOS : AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY (lisible en arrière-plan après le premier déverrouillage, pour l'envoi au passage en arrière-plan ;
// jamais copié dans une sauvegarde iCloud ni restauré sur un autre appareil). Android : le coffre est exclu de la sauvegarde automatique
// (règles android:fullBackupContent / dataExtractionRules du dépôt affectionplus-android). Un appareil restauré redemande donc la connexion.
// Aucun jeton Keycloak n'est gardé : le jeton d'identité sert une fois (POST /api/compte/oidc) et n'est jamais écrit.
import * as SecureStore from 'expo-secure-store';

const CLE = 'ap.compte.session';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

/** Jeton gardé ; null s'il n'y en a pas ; undefined si le coffre est illisible pour l'instant (rien ne doit alors être effacé). */
export async function lireSession(): Promise<string | null | undefined> {
  try { return await SecureStore.getItemAsync(CLE, OPTIONS); } catch { return undefined; }
}
/** Range le jeton ; faux si le coffre a refusé (le jeton n'est alors jamais écrit en clair : il reste en mémoire pour ce lancement). */
export async function ecrireSession(jeton: string): Promise<boolean> {
  try { await SecureStore.setItemAsync(CLE, jeton, OPTIONS); return true; } catch { return false; }
}
export async function effacerSession(): Promise<void> {
  try { await SecureStore.deleteItemAsync(CLE, OPTIONS); } catch { /* coffre indisponible */ }
}
