import { AccessibilityInfo, Platform } from 'react-native';

/** iOS ne prend pas en charge accessibilityLiveRegion ; Android et le web gardent leur annonce native. */
export function annoncerIOS(texte: string) {
  if (Platform.OS !== 'ios' || !texte) return;
  try {
    AccessibilityInfo.announceForAccessibilityWithOptions(texte, { queue: true });
  } catch { /* l'annonce ne doit pas empêcher l'action */ }
}
