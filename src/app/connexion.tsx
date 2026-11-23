// Route neutre « /connexion » (23/11/2026, relecture) : adresse de retour de la connexion (com.affectionplus.app:/connexion?code=…).
// Sur Android, le retour de l'onglet du navigateur arrive à l'activité comme un lien ; expo-web-browser le lit pour finir la connexion,
// mais expo-router le reçoit aussi et afficherait « Unmatched Route » faute de route de ce nom. Cet écran ne montre rien et rend la main à
// l'écran d'où la connexion est partie (ou à l'accueil si l'appli a été ouverte par ce lien). Il ne lit ni le code ni l'état : la
// connexion est terminée par src/connexion.ts, jamais par un lien venu d'ailleurs.
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';

export default function RetourConnexion() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) router.back(); else router.replace('/');
  }, [router]);
  return <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
