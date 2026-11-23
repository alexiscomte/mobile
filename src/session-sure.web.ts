// Aperçu web seulement (pas de Keychain ni de Keystore dans un navigateur) : même stockage que le site (localStorage), sous une clé à part.
// Les applis iOS et Android utilisent session-sure.ts (expo-secure-store).
import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'ap.compte.session';

export async function lireSession(): Promise<string | null | undefined> {
  try { return await AsyncStorage.getItem(CLE); } catch { return undefined; }
}
export async function ecrireSession(jeton: string): Promise<boolean> {
  try { await AsyncStorage.setItem(CLE, jeton); return true; } catch { return false; }
}
export async function effacerSession(): Promise<void> {
  try { await AsyncStorage.removeItem(CLE); } catch { /* stockage indisponible */ }
}
