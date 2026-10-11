// Mon compte (06/10/2026) : écran de connexion, comme le site (assets/js/compte.js). Sans compte : le texte de « Mes informations
// personnelles » (ces informations restent sur cet appareil…), puis « Se connecter » et « Créer un compte » ouvrent l'écran du service de
// connexion commun (adresse + mot de passe, mot de passe oublié ; connexion_oidc.js) dans une session web privée (code + PKCE, rien
// n'est gardé dans Safari), ou « Se connecter avec Google » (natif). Connecté (07/10/2026 nuit, cahier
// specs/espace-membre-retouches-0710.md, décision 7) : le même encadré « Mon compte » que « Mes informations personnelles »
// (components/mon-compte.tsx : Changer mon mot de passe, Supprimer mon compte avec confirmation) ; plus de « Connecté : … », de date de
// synchronisation, de « Synchroniser maintenant », de mot de passe déplié ni de « Se déconnecter » (onglet Moi). Sur iPhone, l'onglet
// Moi et « Mes informations personnelles » ouvrent directement le service commun : cet écran sert surtout à l'aperçu web.
// Textes : ui.json → compte (générés depuis le site).
// Se connecter avec Apple (12/10/2026, règle 4.8 de l'App Store) : sur iPhone, cet écran est celui de « Se connecter » dès qu'Apple est
// disponible (connexion.ts ecranNatif) ; bouton officiel d'Apple (noir en clair, blanc en sombre, 44 pt) AU-DESSUS de Google ; sur iOS,
// Google n'est montré QUE si Apple l'est aussi (googleAutorise) ; web et Android : rien ne change (Apple indisponible).
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bouton, F } from '@/components/form';
import { Banniere } from '@/components/illustration';
import { MonCompte, texteInfos } from '@/components/mon-compte';
import { CONF, connecterApple, connecterGoogle } from '@/compte';
import { AVEC_OIDC, appleDisponible, connexionOidc, googleAutorise } from '@/connexion';
import conf from '@/compte_conf.json';
import { type Langue } from '@/i18n';
import { TEXTES6 } from '@/i18n6';
import { TUILES } from '@/images';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { COULEURS, useCouleurs } from '@/theme';

WebBrowser.maybeCompleteAuthSession();   // aperçu web : ferme la fenêtre de retour de Google

type TC = Record<string, string>;
const UI = (ui as { compte: Record<string, TC> }).compte;
const GOOGLE = conf as { googleIos?: string; googleWeb?: string };
// client Google de la plateforme (iOS : client iOS ; aperçu web : client web) ; aucun sur Android : pas de bouton
const ID_GOOGLE = Platform.OS === 'ios' ? GOOGLE.googleIos || '' : Platform.OS === 'web' ? GOOGLE.googleWeb || '' : '';
// iOS : retour de Google par le schéma d'URL inverse du client (déclaré dans app.json, ios.scheme)
const RETOUR_IOS = GOOGLE.googleIos ? 'com.googleusercontent.apps.' + GOOGLE.googleIos.replace(/\.apps\.googleusercontent\.com$/, '') + ':/oauthredirect' : undefined;

/** Bouton « Se connecter avec Google » : jeton d'identité Google (expo-auth-session), envoyé ensuite à api/compte/google. */
function BoutonGoogle({ titre, langue, occupe, onJeton, onEchec }: { titre: string; langue: Langue; occupe: boolean; onJeton: (j: string) => void; onEchec: () => void }) {
  const [requete, reponse, demander] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE.googleIos, webClientId: GOOGLE.googleWeb, language: langue, selectAccount: true,
    ...(Platform.OS === 'ios' && RETOUR_IOS ? { redirectUri: RETOUR_IOS } : {}),
  });
  useEffect(() => {
    if (!reponse) return;
    if (reponse.type === 'success') {
      const jeton = reponse.params.id_token || reponse.authentication?.idToken;
      if (jeton) onJeton(jeton); else onEchec();
    } else if (reponse.type === 'error') onEchec();
  }, [reponse]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Bouton titre={titre} secondaire disabled={!requete || occupe} onPress={() => { demander().catch(onEchec); }} />;
}

/** Bouton officiel « Se connecter avec Apple » (libellé, logo et langue fournis par iOS ; style noir en clair, blanc en sombre). Le
 *  nonce brut reste ici, Apple reçoit son SHA-256 (le serveur compare). */
function BoutonApple({ occupe, onCredential, onEchec }: {
  occupe: boolean; onCredential: (c: AppleAuthentication.AppleAuthenticationCredential, nonce: string) => void; onEchec: () => void;
}) {
  const { sombre } = useCouleurs();
  const appuyer = async () => {
    if (occupe) return;
    try {
      const nonce = Crypto.randomUUID() + Crypto.randomUUID();
      const hache = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const c = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hache,
      });
      if (c.identityToken) onCredential(c, nonce); else onEchec();
    } catch (e) {
      // la personne a fermé la fenêtre d'Apple : pas un échec
      if ((e as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') onEchec();
    }
  };
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={sombre ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12} style={styles.apple} onPress={() => { appuyer(); }} />
  );
}

export default function CompteEcran() {
  const { langue, compte } = useProfil();
  const t = UI[langue] || UI.fr;
  const [consent, setConsent] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const t6 = TEXTES6[langue] || TEXTES6.fr;
  const [apple, setApple] = useState(false);
  useEffect(() => { let actif = true; appleDisponible().then((a) => { if (actif) setApple(a); }); return () => { actif = false; }; }, []);
  const avecGoogle = !!ID_GOOGLE && googleAutorise(Platform.OS, apple);
  // Apple ne donne le prénom qu'à la toute première autorisation : gardé si cette première tentative demande encore le consentement
  const prenomApple = useRef('');

  // service commun (src/connexion.ts) : « Continuer en invité » n'est pas un échec
  const viaOidc = async (ecran?: string) => {
    setOccupe(true); setMsg(null);
    const r = await connexionOidc(langue, ecran);
    setOccupe(false);
    // connexion réussie : pas de message « Vous êtes connecté » (revue du 07/10/2026 nuit : l'état connecté est dans l'onglet Moi, et
    // l'écran passe de lui-même à l'encadré « Mon compte »)
    if (r === 'invite') setMsg({ t: t.invitePasse, ok: true });
    else if (r === 'echec') setMsg({ t: t.oidcKo, ok: false });
  };
  const viaGoogle = async (jeton: string) => {
    setOccupe(true); setMsg(null);
    const j = await connecterGoogle(jeton, langue, consent);
    setOccupe(false);
    if (!j.ok) setMsg({ t: j.erreur === 'consentement' ? t.consentKo : j.erreur === 'trop' ? t.trop : j.erreur === 'reseau' ? t.reseau : t.googleKo, ok: false });
  };
  const viaApple = async (c: AppleAuthentication.AppleAuthenticationCredential, nonce: string) => {
    const prenom = (c.fullName?.givenName || '').trim();
    if (prenom) prenomApple.current = prenom;
    setOccupe(true); setMsg(null);
    const j = await connecterApple(c.identityToken || '', nonce, c.authorizationCode, prenomApple.current, langue, consent);
    setOccupe(false);
    if (j.ok) { prenomApple.current = ''; return; }
    setMsg({ t: j.erreur === 'consentement' ? t.consentKo : j.erreur === 'courriel' ? t6.appleCourriel : j.erreur === 'trop' ? t.trop
      : j.erreur === 'reseau' ? t.reseau : t6.appleKo, ok: false });
  };

  const [avantLien, apresLien] = (t.consent || '%s').split('%s');
  const lienConf = SITE + (CONF[langue] || CONF.fr) + '#compte';

  return (
    <>
      <Stack.Screen options={{ title: t.titre }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Banniere image={TUILES.compte} ratio={1.78} />
        {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
        {compte ? <MonCompte /> : (
          <>
            <Text style={[F.texte, styles.intro]}>{texteInfos(langue, false)}</Text>
            {AVEC_OIDC ? (
              <>
                <Bouton titre={t.seConnecter} onPress={() => { viaOidc(); }} disabled={occupe} />
                <Bouton titre={t.creerCompte} secondaire onPress={() => { viaOidc('inscription'); }} disabled={occupe} />
              </>
            ) : null}
            {apple || avecGoogle ? (
              <>
                {AVEC_OIDC ? <Text style={styles.ou}>{t.ou}</Text> : null}
                <View style={styles.consent}>
                  <Switch value={consent} onValueChange={setConsent} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={t.conf} />
                  <Text style={styles.consentTxt}>
                    {avantLien}
                    <Text style={styles.lien} accessibilityRole="link" onPress={() => { Linking.openURL(lienConf).catch(() => undefined); }}>{t.conf}</Text>
                    {apresLien || ''}
                  </Text>
                </View>
                {apple ? <BoutonApple occupe={occupe} onCredential={viaApple} onEchec={() => setMsg({ t: t6.appleKo, ok: false })} /> : null}
                {avecGoogle ? <BoutonGoogle titre={t.google} langue={langue} occupe={occupe} onJeton={viaGoogle} onEchec={() => setMsg({ t: t.googleKo, ok: false })} /> : null}
              </>
            ) : null}
          </>
        )}
        {occupe ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 12 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  consentTxt: { flex: 1, color: COULEURS.texte, fontSize: 14, lineHeight: 19 },
  lien: { color: COULEURS.secondaire, fontWeight: '600', textDecorationLine: 'underline' },
  ou: { textAlign: 'center', color: COULEURS.texteMuet, marginTop: 18 },
  attente: { marginTop: 14 },
  apple: { height: 44, width: '100%', marginTop: 18 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
});
