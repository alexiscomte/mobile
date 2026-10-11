// Vue web d'une page du site en mode application : profil, favoris et compte injectés, retour du profil, des favoris et du compte tenus par le site,
// liens externes ouverts dans le navigateur du téléphone, hors-ligne, barre de progression. Sur le web (aperçu), un iframe.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { adopterCompte, proprioLocal } from '../compte';
import { TEXTES } from '../i18n';
import { profilPourSite, useProfil } from '../profil';
import { INJECTION_APRES, estExterne, injectionAvant, lireMessage } from '../site';
import { COULEURS } from '../theme';

type Props = {
  url: string;
  /** action après chargement : « espace » ouvre la fiche « Mes infos personnelles » du site */
  apres?: string;
  onTitre?: (t: string) => void;
  onNavigation?: (peutRevenir: boolean, url: string) => void;
};

export type VueSiteRef = { revenir: () => boolean; recharger: () => void };

const APRES: Record<string, string> = {
  espace: `setTimeout(function(){try{window.ESPACE&&window.ESPACE.ouvrir();}catch(e){}},900);`,
};

export const VueSite = React.forwardRef<VueSiteRef, Props>(function VueSite({ url, apres, onTitre, onNavigation }, ref) {
  const { profil, favoris, compte, langue, fusionnerProfil, setFavoris } = useProfil();
  const T = TEXTES[langue];
  const web = useRef<WebView>(null);
  const peutRevenir = useRef(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [cle, setCle] = useState(0);
  // propriétaire des données de l'appli (appareil partagé, 08/10/2026) : la page efface les données d'un autre propriétaire avant tout
  const avant = injectionAvant(profilPourSite(profil), favoris, compte, proprioLocal());

  React.useImperativeHandle(ref, () => ({
    revenir: () => { if (peutRevenir.current && web.current) { web.current.goBack(); return true; } return false; },
    recharger: () => { setErreur(false); setCle((k) => k + 1); },
  }), []);

  const surMessage = useCallback((e: WebViewMessageEvent) => {
    const m = lireMessage(e.nativeEvent.data);
    if (!m) return;
    // appareil partagé (08/10/2026) : une page chargée avec les données d'un autre propriétaire (avant une connexion qui les a remplacées
    // dans l'appli) ne renvoie ni profil ni favoris : ils ne doivent pas revenir dans l'appli ni partir au compte connecté
    const meme = (typeof m.proprio === 'string' ? m.proprio : '') === proprioLocal();
    try { if (meme && m.profil) fusionnerProfil(JSON.parse(m.profil)); } catch { /* profil illisible */ }
    try { if (meme && m.favoris) setFavoris(JSON.parse(m.favoris)); } catch { /* favoris illisibles */ }
    if (m.compteChange) adopterCompte(m.compte ?? null).catch(() => undefined);   // connexion ou déconnexion faite dans la page
    if (m.titre && onTitre) onTitre(m.titre.replace(/\s*[—-]\s*AffectionPlus\s*$/, ''));
  }, [fusionnerProfil, setFavoris, onTitre]);

  const surNavigation = useCallback((n: WebViewNavigation) => {
    peutRevenir.current = n.canGoBack;
    if (onNavigation) onNavigation(n.canGoBack, n.url);
    if (n.title && onTitre) onTitre(n.title.replace(/\s*[—-]\s*AffectionPlus\s*$/, ''));
  }, [onNavigation, onTitre]);

  if (Platform.OS === 'web') {
    // aperçu dans un navigateur : iframe (react-native-webview ne fonctionne pas sur le web)
    return React.createElement('iframe', { src: url, style: { border: 0, width: '100%', height: '100%', flex: 1 }, title: 'AffectionPlus' });
  }

  return (
    <View style={styles.conteneur}>
      {erreur ? (
        <View style={styles.horsLigne}>
          <Text style={styles.horsLigneTxt}>{T.horsLigne}</Text>
          <Pressable style={styles.bouton} onPress={() => { setErreur(false); setCle((k) => k + 1); }}>
            <Text style={styles.boutonTxt}>{T.reessayer}</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={cle}
          ref={web}
          source={{ uri: url }}
          style={styles.web}
          injectedJavaScriptBeforeContentLoaded={avant}
          injectedJavaScript={INJECTION_APRES + (apres && APRES[apres] ? APRES[apres] + 'true;' : '')}
          onMessage={surMessage}
          onNavigationStateChange={surNavigation}
          onLoadStart={() => setChargement(true)}
          onLoadEnd={() => setChargement(false)}
          onError={() => { setChargement(false); setErreur(true); }}
          onShouldStartLoadWithRequest={(req) => {
            if (estExterne(req.url)) { Linking.openURL(req.url).catch(() => undefined); return false; }
            return true;
          }}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          sharedCookiesEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          decelerationRate="normal"
        />
      )}
      {chargement && !erreur ? (
        <View style={styles.progression} pointerEvents="none">
          <ActivityIndicator color={COULEURS.primaire} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: COULEURS.fond },
  web: { flex: 1, backgroundColor: COULEURS.fond },
  progression: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  horsLigne: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  horsLigneTxt: { fontSize: 16, textAlign: 'center', color: COULEURS.texte },
  bouton: { backgroundColor: COULEURS.primairePlein, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 10 },
  boutonTxt: { color: '#fff', fontWeight: '600' },
});
