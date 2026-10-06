// Mon compte (06/10/2026) : compte facultatif, comme la page « Mes infos » du site (assets/js/compte.js). Sans compte : « Se connecter »
// et « Créer un compte » ouvrent l'écran du service de connexion commun (adresse + mot de passe, mot de passe oublié ; connexion_oidc.js)
// dans une session web privée (code + PKCE, rien n'est gardé dans Safari), ou « Se connecter avec Google » (natif). Connecté : état de la
// synchronisation, « Synchroniser maintenant », mot de passe (changer / créer), « Se déconnecter », « Supprimer mon compte ».
// Textes : ui.json → compte (générés depuis le site).
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import { Banniere } from '@/components/illustration';
import { CONF, OIDC, changerMdp, connecterGoogle, connecterOidc, deconnecter, supprimer, tirer, type Reponse } from '@/compte';
import conf from '@/compte_conf.json';
import { TEXTES, fmt, type Langue } from '@/i18n';
import { TEXTES4 } from '@/i18n4';
import { TUILES } from '@/images';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

WebBrowser.maybeCompleteAuthSession();   // aperçu web : ferme la fenêtre de retour de Google

type TC = Record<string, string>;
const UI = (ui as { compte: Record<string, TC> }).compte;
const GOOGLE = conf as { googleIos?: string; googleWeb?: string };
// client Google de la plateforme (iOS : client iOS ; aperçu web : client web) ; aucun sur Android : pas de bouton
const ID_GOOGLE = Platform.OS === 'ios' ? GOOGLE.googleIos || '' : Platform.OS === 'web' ? GOOGLE.googleWeb || '' : '';
// iOS : retour de Google par le schéma d'URL inverse du client (déclaré dans app.json, ios.scheme)
const RETOUR_IOS = GOOGLE.googleIos ? 'com.googleusercontent.apps.' + GOOGLE.googleIos.replace(/\.apps\.googleusercontent\.com$/, '') + ':/oauthredirect' : undefined;
// service commun : retour par le schéma com.affectionplus.app (app.json), déclaré pour le client affectionplus-appli ; pas dans l'aperçu web
const AVEC_OIDC = Platform.OS !== 'web';

function dateTexte(iso: string | null, lg: Langue, jamais: string): string {
  if (!iso) return jamais;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return jamais;
  try { return d.toLocaleString(lg, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso.slice(0, 16).replace('T', ' '); }
}

/** « Se connecter » ou « Créer un compte » (ecran = 'inscription') : écran du service commun, puis échange du code contre le jeton d'identité. */
function BoutonOidc({ titre, ecran, langue, secondaire, occupe, onJeton, onEchec }:
  { titre: string; ecran?: string; langue: Langue; secondaire?: boolean; occupe: boolean; onJeton: (j: string) => void; onEchec: () => void }) {
  const [requete, reponse, demander] = AuthSession.useAuthRequest({
    clientId: OIDC.client, redirectUri: OIDC.retour, scopes: ['openid', 'email', 'profile'], usePKCE: true,
    responseType: AuthSession.ResponseType.Code, extraParams: ecran ? { ui_locales: langue, ecran } : { ui_locales: langue },
  }, OIDC.decouverte);
  useEffect(() => {
    if (!reponse || !requete) return;
    if (reponse.type === 'success' && reponse.params.code) {
      AuthSession.exchangeCodeAsync({ clientId: OIDC.client, code: reponse.params.code, redirectUri: OIDC.retour,
        extraParams: { code_verifier: requete.codeVerifier || '' } }, OIDC.decouverte)
        .then((tok) => { if (tok.idToken) onJeton(tok.idToken); else onEchec(); })
        .catch(onEchec);
    } else if (reponse.type === 'error') onEchec();
  }, [reponse]); // eslint-disable-line react-hooks/exhaustive-deps
  // session privée : pas de cookie gardé dans Safari ni d'alerte « … veut utiliser affectionplus.com pour se connecter »
  return <Bouton titre={titre} secondaire={secondaire} disabled={!requete || occupe} onPress={() => { demander({ preferEphemeralSession: true }).catch(onEchec); }} />;
}

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

export default function CompteEcran() {
  const { langue, compte } = useProfil();
  const T = TEXTES[langue];
  const T4 = TEXTES4[langue];
  const t = UI[langue] || UI.fr;
  const [consent, setConsent] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirme, setConfirme] = useState('');

  const viaOidc = async (jeton: string) => {
    setOccupe(true); setMsg(null);
    const j = await connecterOidc(jeton);
    setOccupe(false);
    setMsg(j.ok ? { t: t.connexionOk, ok: true } : { t: j.erreur === 'trop' ? t.trop : j.erreur === 'reseau' ? t.reseau : t.oidcKo, ok: false });
  };
  const viaGoogle = async (jeton: string) => {
    setOccupe(true); setMsg(null);
    const j = await connecterGoogle(jeton, langue, consent);
    setOccupe(false);
    if (j.ok) setMsg({ t: t.synchro, ok: true });
    else setMsg({ t: j.erreur === 'consentement' ? t.consentKo : j.erreur === 'trop' ? t.trop : j.erreur === 'reseau' ? t.reseau : t.googleKo, ok: false });
  };
  const synchroniser = async () => {
    setOccupe(true); setMsg(null);
    const ok = await tirer();
    setOccupe(false);
    setMsg({ t: ok ? t.synchro : t.reseau, ok });
  };
  const erreurMdp = (j: Reponse) => j.erreur === 'actuel' ? t.mdpActuelKo : j.erreur === 'court' ? t.mdpCourt : j.erreur === 'trop' ? t.trop : t.reseau;
  const enregistrerMdp = async () => {
    if (nouveau.length < 8) { setMsg({ t: t.mdpCourt, ok: false }); return; }
    if (nouveau !== confirme) { setMsg({ t: t.mdpDiff, ok: false }); return; }
    setOccupe(true); setMsg(null);
    const j = await changerMdp(ancien, nouveau);
    setOccupe(false);
    if (j.ok) { setAncien(''); setNouveau(''); setConfirme(''); setMdpOuvert(false); setMsg({ t: t.mdpOk, ok: true }); }
    else setMsg({ t: erreurMdp(j), ok: false });
  };
  const seDeconnecter = async () => {
    await deconnecter();
    setMdpOuvert(false); setAncien(''); setNouveau(''); setConfirme('');
    setMsg({ t: t.deconnecte, ok: true });
  };
  const confirmerSuppression = () => {
    const faire = async () => {
      setOccupe(true); setMsg(null);
      const ok = await supprimer();
      setOccupe(false);
      setMsg({ t: ok ? t.supprime : t.reseau, ok });
    };
    if (Platform.OS === 'web') {
      const confirmer = (globalThis as { confirm?: (m: string) => boolean }).confirm;
      if (!confirmer || confirmer(t.confirmeSuppr)) faire();
      return;
    }
    Alert.alert(t.supprimer, t.confirmeSuppr, [{ text: T.non, style: 'cancel' }, { text: T.oui, style: 'destructive', onPress: () => { faire(); } }]);
  };

  const [avantLien, apresLien] = (t.consent || '%s').split('%s');
  const lienConf = SITE + (CONF[langue] || CONF.fr) + '#compte';
  const echecOidc = () => { setOccupe(false); setMsg({ t: t.oidcKo, ok: false }); };

  return (
    <>
      <Stack.Screen options={{ title: t.titre }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Banniere image={TUILES.compte} ratio={1.78} />
        {compte ? (
          <>
            <View style={styles.etat}>
              <Text style={[F.texte, F.gras]}>{fmt(t.connecte, compte.courriel)}</Text>
              <Text style={F.muet}>{fmt(t.sync, dateTexte(compte.sync, langue, t.jamais))}</Text>
            </View>
            <Bouton titre={t.synchroniser} onPress={synchroniser} disabled={occupe} />
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: mdpOuvert }} onPress={() => setMdpOuvert(!mdpOuvert)} style={styles.mdpTitre}>
              <Text style={styles.lien}>{(mdpOuvert ? '▾ ' : '▸ ') + (compte.mdp ? t.mdpChanger : t.mdpCreer)}</Text>
            </Pressable>
            {mdpOuvert ? (
              <View style={styles.mdp}>
                {compte.mdp ? (
                  <Champ label={t.mdpActuel} value={ancien} onChangeText={setAncien} secureTextEntry autoCapitalize="none" autoCorrect={false}
                    textContentType="password" autoComplete="current-password" maxLength={200} />
                ) : null}
                <Champ label={t.mdpNouveau} value={nouveau} onChangeText={setNouveau} secureTextEntry autoCapitalize="none" autoCorrect={false}
                  textContentType="newPassword" autoComplete="new-password" maxLength={200} />
                <Champ label={t.mdpConfirmer} value={confirme} onChangeText={setConfirme} secureTextEntry autoCapitalize="none" autoCorrect={false}
                  textContentType="newPassword" autoComplete="new-password" maxLength={200} returnKeyType="done" onSubmitEditing={enregistrerMdp} />
                <Bouton titre={t.mdpEnregistrer} onPress={enregistrerMdp} disabled={occupe} />
              </View>
            ) : null}
            <Bouton titre={t.deconnecter} secondaire onPress={seDeconnecter} disabled={occupe} />
            <Pressable disabled={occupe} style={({ pressed }) => [styles.danger, (pressed || occupe) && F.presse]} onPress={confirmerSuppression}>
              <Text style={styles.dangerTxt}>{t.supprimer}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={F.texte}>{t.introOidc + ' ' + T4.sansCompte}</Text>
            {AVEC_OIDC ? (
              <>
                <BoutonOidc titre={t.seConnecter} langue={langue} occupe={occupe} onJeton={viaOidc} onEchec={echecOidc} />
                <BoutonOidc titre={t.creerCompte} ecran="inscription" secondaire langue={langue} occupe={occupe} onJeton={viaOidc} onEchec={echecOidc} />
              </>
            ) : null}
            {ID_GOOGLE ? (
              <>
                <Text style={styles.ou}>{t.ou}</Text>
                <View style={styles.consent}>
                  <Switch value={consent} onValueChange={setConsent} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={t.conf} />
                  <Text style={styles.consentTxt}>
                    {avantLien}
                    <Text style={styles.lien} accessibilityRole="link" onPress={() => { Linking.openURL(lienConf).catch(() => undefined); }}>{t.conf}</Text>
                    {apresLien || ''}
                  </Text>
                </View>
                <BoutonGoogle titre={t.google} langue={langue} occupe={occupe} onJeton={viaGoogle} onEchec={() => setMsg({ t: t.googleKo, ok: false })} />
              </>
            ) : null}
          </>
        )}
        {occupe ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
        {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  etat: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  consentTxt: { flex: 1, color: COULEURS.texte, fontSize: 14, lineHeight: 19 },
  lien: { color: COULEURS.secondaire, fontWeight: '600', textDecorationLine: 'underline' },
  mdpTitre: { marginTop: 18, paddingVertical: 6 },
  mdp: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 12, padding: 12, marginTop: 6 },
  ou: { textAlign: 'center', color: COULEURS.texteMuet, marginTop: 18 },
  danger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 28 },
  dangerTxt: { color: COULEURS.coeur, fontWeight: '600' },
  attente: { marginTop: 14 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
});
