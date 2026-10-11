// Retours haptiques (recommandations d'Apple « Playing haptics » : rares, courts, toujours avec un retour visible, même sens
// partout). Trois sens seulement dans l'appli :
// - choix()   : sélection d'une option parmi d'autres (puces, langue, réponse d'un quiz ou d'un sondage) ;
// - succes()  : une action qui aboutit (vote, envoi, enregistrement, « j'aime ») ;
// - erreur()  : une action refusée (formulaire incomplet, échec du réseau).
// Sans effet sur le web, en mode économie d'énergie ou si l'iPhone a coupé les vibrations système (iOS s'en charge).
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const ACTIF = Platform.OS === 'ios' || Platform.OS === 'android';

export function choix(): void {
  if (ACTIF) Haptics.selectionAsync().catch(() => undefined);
}

export function succes(): void {
  if (ACTIF) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function erreur(): void {
  if (ACTIF) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}
