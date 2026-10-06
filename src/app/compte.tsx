// Mon compte (06/10/2026) : compte facultatif, comme la fiche « Mes infos » du site (assets/js/compte.js). Sans compte : adresse
// électronique + consentement, code à 6 chiffres reçu par courriel (ou Google). Connecté : état de la synchronisation,
// « Synchroniser maintenant », « Se déconnecter », « Supprimer mon compte ». Textes : ui.json → compte (générés depuis le site).
import * as Google from 'expo-auth-session/providers/google';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import { Banniere } from '@/components/illustration';
import { CONF, RX_COURRIEL, connecter, connecterGoogle, deconnecter, envoyerCode, supprimer, tirer, type Reponse } from '@/compte';
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

/** L'intro du site finit par « Sans compte, tout reste dans ce navigateur » : l'appli dit « sur cet appareil ». */
function introAppli(intro: string, fin: string): string {
  const i = intro.lastIndexOf('. ', intro.length - 2);
  return i > 0 ? intro.slice(0, i + 1) + ' ' + fin : intro;
}

function dateTexte(iso: string | null, lg: Langue, jamais: string): string {
  if (!iso) return jamais;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return jamais;
  try { return d.toLocaleString(lg, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso.slice(0, 16).replace('T', ' '); }
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
  const { langue, profil, compte } = useProfil();
  const T = TEXTES[langue];
  const T4 = TEXTES4[langue];
  const t = UI[langue] || UI.fr;
  const [courriel, setCourriel] = useState(profil.courriel || '');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [etape2, setEtape2] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const erreur = (j: Reponse) => j.erreur === 'consentement' ? t.consentKo : j.erreur === 'trop' ? t.trop : j.erreur === 'courrier' ? t.courrierKo
    : j.erreur === 'courriel' ? t.adresseKo : j.erreur === 'code' ? t.codeFaux : j.erreur === 'expire' ? t.codeExpire
    : j.erreur === 'google' ? t.googleKo : t.reseau;

  const demanderCode = async () => {
    const c = courriel.trim().toLowerCase();
    if (!RX_COURRIEL.test(c)) { setMsg({ t: t.adresseKo, ok: false }); return; }
    setOccupe(true); setMsg(null);
    const j = await envoyerCode(c, langue, consent);
    setOccupe(false);
    if (j.ok) { setEtape2(true); setMsg({ t: fmt(t.envoye, c), ok: true }); }
    else setMsg({ t: erreur(j), ok: false });
  };
  const seConnecter = async () => {
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) { setMsg({ t: t.codeFaux, ok: false }); return; }
    setOccupe(true); setMsg(null);
    const j = await connecter(courriel, c);
    setOccupe(false);
    if (j.ok) { setCode(''); setEtape2(false); setMsg({ t: t.synchro, ok: true }); }
    else setMsg({ t: erreur(j), ok: false });
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
  const seDeconnecter = async () => {
    await deconnecter();
    setEtape2(false); setCode('');
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
            <Bouton titre={t.deconnecter} secondaire onPress={seDeconnecter} disabled={occupe} />
            <Pressable disabled={occupe} style={({ pressed }) => [styles.danger, (pressed || occupe) && F.presse]} onPress={confirmerSuppression}>
              <Text style={styles.dangerTxt}>{t.supprimer}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={F.texte}>{introAppli(t.intro, T4.sansCompte)}</Text>
            <Champ label={t.courriel} value={courriel} onChangeText={setCourriel} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              autoComplete="email" textContentType="emailAddress" maxLength={254} returnKeyType="send" onSubmitEditing={demanderCode} />
            <View style={styles.consent}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={t.conf} />
              <Text style={styles.consentTxt}>
                {avantLien}
                <Text style={styles.lien} accessibilityRole="link" onPress={() => { Linking.openURL(lienConf).catch(() => undefined); }}>{t.conf}</Text>
                {apresLien || ''}
              </Text>
            </View>
            <Bouton titre={t.envoyer} onPress={demanderCode} disabled={occupe} secondaire={etape2} />
            {etape2 ? (
              <>
                <Champ label={t.code} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6}
                  textContentType="oneTimeCode" autoComplete="one-time-code" autoFocus returnKeyType="done" onSubmitEditing={seConnecter} />
                <Bouton titre={t.connecter} onPress={seConnecter} disabled={occupe} />
              </>
            ) : null}
            {ID_GOOGLE ? (
              <>
                <Text style={styles.ou}>{t.ou}</Text>
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
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  consentTxt: { flex: 1, color: COULEURS.texte, fontSize: 14, lineHeight: 19 },
  lien: { color: COULEURS.secondaire, fontWeight: '600', textDecorationLine: 'underline' },
  ou: { textAlign: 'center', color: COULEURS.texteMuet, marginTop: 18 },
  danger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 28 },
  dangerTxt: { color: COULEURS.coeur, fontWeight: '600' },
  attente: { marginTop: 14 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
});
