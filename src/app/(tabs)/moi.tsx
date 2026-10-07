// Moi = accueil de l'espace membre (Alexis, 07/10/2026), comme le cadre des sous-pages du site (espace_membre.py, espace.js cadre) :
// sans compte ni choix « invité » pendant ce lancement, l'arrivée sur l'onglet ouvre directement l'écran de connexion (avec
// « Continuer en invité ») ; état « Connecté : … » ou « Mode hors ligne » + « Se connecter » ; bandeau « Tenez-vous informé » si la
// personne n'est pas abonnée ; les cinq sous-écrans (infos, sondages, favoris, compatibilités, newsletter) ; langue, lecture hors
// ligne, à propos, effacement ; « Suivez-nous sur les réseaux sociaux » en français. Sans compte, tout reste sur l'appareil.
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne, Titre } from '@/components/carte';
import { Bandeau } from '@/components/form';
import { AVEC_OIDC, connexionOidc, dejaPropose, estInvite } from '@/connexion';
import { LANGUES, NOMS_LANGUES, TEXTES, fmt, type Langue } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { TEXTES4 } from '@/i18n4';
import { useLettre } from '@/lettre';
import { toutTelecharger } from '@/moteur/contenu';
import ui from '@/moteur/ui.json';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, SITE } from '@/site';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_COMPTE = (ui as { compte: Record<string, TX> }).compte;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
const RESEAUX = (ui as unknown as { reseaux: { titre: TX; texte: TX; liens: [string, string][] } }).reseaux;

export default function Moi() {
  const { langue, favoris, compte, setLangue, effacer } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue], T4 = TEXTES4[langue];
  const TC = UI_COMPTE[langue] || UI_COMPTE.fr, E = UI_E[langue] || UI_E.fr;
  const router = useRouter();
  const { etat } = useLettre(compte);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [progression, setProgression] = useState('');

  const seConnecter = useCallback(async () => {
    const r = await connexionOidc(langue);
    if (r === 'ok') setMsg({ t: TC.connexionOk, ok: true });
    else if (r === 'invite') setMsg({ t: TC.invitePasse, ok: true });
    else if (r === 'echec') setMsg({ t: TC.oidcKo, ok: false });
  }, [langue, TC]);
  // ouverture directe de la connexion à l'arrivée sur l'onglet : une fois par lancement, sans compte ni choix « invité »
  useFocusEffect(useCallback(() => {
    if (compte || estInvite() || dejaPropose() || !AVEC_OIDC) return undefined;
    const id = setTimeout(() => { seConnecter(); }, 350);
    return () => clearTimeout(id);
  }, [compte, seConnecter]));

  const telecharger = async () => {
    setProgression(T3.telechargement);
    try { await toutTelecharger(langue, (f, t) => setProgression(T3.telechargement + ' ' + f + '/' + t)); setProgression(T3.horsLigneOk); }
    catch { setProgression(T.horsLigne); }
  };
  const confirmerEffacer = () => {
    if (Platform.OS === 'web') { effacer(); return; }
    Alert.alert(T.effacer, T.effacerConfirm + (compte ? '\n\n' + T4.effacerCompte : ''), [{ text: T.non, style: 'cancel' }, { text: T.oui, style: 'destructive', onPress: () => effacer() }]);
  };

  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{E.espTitre}</Text>

        <View style={styles.etat}>
          <View style={[styles.pastille, { backgroundColor: compte ? COULEURS.vert : COULEURS.texteMuet }]} />
          <Text style={styles.etatTxt} numberOfLines={2}>{compte ? fmt(E.connecteA, compte.courriel) : E.horsLigne}</Text>
          {compte ? (
            <Pressable onPress={() => router.push('/compte')} hitSlop={8} accessibilityRole="button">
              <Text style={styles.lien}>{T4.gerer}</Text>
            </Pressable>
          ) : (
            <Pressable style={({ pressed }) => [styles.boutonPetit, pressed && styles.presse]} onPress={AVEC_OIDC ? seConnecter : () => router.push('/compte')} accessibilityRole="button">
              <Text style={styles.boutonPetitTxt}>{E.seConnecter}</Text>
            </Pressable>
          )}
        </View>
        {msg ? <Text style={[styles.message, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
        {!etat ? <Bandeau texte={E.newsBandeau} lien={E.newsBandeauBtn} onPress={() => router.push('/newsletter')} /> : null}

        <Ligne titre={E.ongInfos} sf="person.text.rectangle.fill" onPress={() => router.push('/mes-infos')} />
        <Ligne titre={E.ongSondages} sf="chart.bar.fill" onPress={() => router.push({ pathname: '/sondages', params: { mes: '1' } })} />
        <Ligne titre={E.ongFavoris} texte={favoris.length ? String(favoris.length) : undefined} sf="star.fill" onPress={() => router.push('/favoris')} />
        <Ligne titre={E.ongCompat} sf="heart.text.square.fill" onPress={() => router.push('/mes-compat')} />
        <Ligne titre={E.ongNews} sf="envelope.fill" onPress={() => router.push('/newsletter')} />

        <Titre>{T.langue}</Titre>
        <View style={styles.langues}>
          {LANGUES.map((lg: Langue) => (
            <Pressable key={lg} onPress={() => setLangue(lg)} style={[styles.langue, lg === langue && styles.langueActive]}>
              <Text style={[styles.langueTxt, lg === langue && styles.langueTxtActive]}>{NOMS_LANGUES[lg]}</Text>
            </Pressable>
          ))}
        </View>

        <Titre>{T.infos}</Titre>
        <Text style={styles.aide}>{T3.horsLigneTxt}</Text>
        <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={telecharger}>
          <Text style={styles.boutonSecTxt}>{T3.telecharger}</Text>
        </Pressable>
        {progression ? <Text style={styles.progression}>{progression}</Text> : null}

        <Titre>{T.aPropos}</Titre>
        <Text style={styles.aide}>{T.aProposTxt}</Text>
        <Ligne titre={T.siteWeb} sf="safari" onPress={() => Linking.openURL(SITE + page('accueil', langue).u)} />
        <Ligne titre={T.confidentialite} sf="lock.fill" onPress={() => ouvrirCle(router, 'confidentialite', langue)} />
        <Ligne titre={page('apropos', langue).t} sf="info.circle.fill" onPress={() => ouvrirCle(router, 'apropos', langue)} />

        {langue === 'fr' ? (
          // « Suivez-nous sur les réseaux sociaux » : en français seulement (demande d'Alexis), mêmes comptes que le site (footer.SOCIAL)
          <>
            <Titre>{RESEAUX.titre.fr}</Titre>
            <Text style={styles.aide}>{RESEAUX.texte.fr}</Text>
            <View style={styles.reseaux}>
              {RESEAUX.liens.map(([nom, lien]) => (
                <Pressable key={lien} onPress={() => { Linking.openURL(lien).catch(() => undefined); }} style={({ pressed }) => [styles.reseau, pressed && styles.presse]} accessibilityRole="link">
                  <Text style={styles.reseauTxt}>{nom}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable style={({ pressed }) => [styles.boutonDanger, pressed && styles.presse]} onPress={confirmerEffacer}>
          <Text style={styles.boutonDangerTxt}>{T.effacer}</Text>
        </Pressable>
        <Text style={styles.version}>{T.version} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 16, paddingBottom: 110 },
  titre: { fontSize: 28, fontWeight: '800', color: COULEURS.primaire, marginBottom: 10 },
  etat: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  pastille: { width: 10, height: 10, borderRadius: 5 },
  etatTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  lien: { color: COULEURS.secondaire, fontWeight: '600', textDecorationLine: 'underline' },
  boutonPetit: { backgroundColor: COULEURS.primaire, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  boutonPetitTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  message: { marginTop: 8, fontSize: 14, lineHeight: 19 },
  aide: { color: COULEURS.texteMuet, fontSize: 14, lineHeight: 19 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600', fontSize: 15 },
  progression: { color: COULEURS.vert, marginTop: 8, textAlign: 'center' },
  boutonDanger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 28 },
  boutonDangerTxt: { color: COULEURS.coeur, fontWeight: '600' },
  presse: { opacity: 0.8 },
  langues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langue: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  langueActive: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  langueTxt: { color: COULEURS.texte },
  langueTxtActive: { color: '#fff', fontWeight: '600' },
  reseaux: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reseau: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  reseauTxt: { color: COULEURS.secondaire, fontWeight: '600', fontSize: 14 },
  version: { color: COULEURS.texteMuet, textAlign: 'center', marginTop: 16, fontSize: 12 },
});
