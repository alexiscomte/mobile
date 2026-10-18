import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Complément de padding à appliquer au SafeAreaView des onglets sans en-tête natif. */
export function useTabTopClearance() {
  const { top } = useSafeAreaInsets();
  // Une fenêtre iPadOS peut annoncer seulement 10 pt d'inset, alors que ses boutons
  // de fermeture/réduction occupent le haut de la vue. Réserver au moins 44 pt, hors
  // du contenu défilant. SafeAreaView ajoute déjà l'inset natif : ne pas le doubler.
  // Les barres natives en plein écran fournissent normalement un inset supérieur.
  return Platform.OS === 'ios' && Platform.isPad ? Math.max(0, 44 - top) : 0;
}
