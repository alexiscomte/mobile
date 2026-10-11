// Newsletter (espace membre) : même API que le site. Connecté (07/10/2026) : état du serveur et abonnement direct ou désabonnement
// (compte.ts lettre, /api/compte/newsletter : adresse prouvée par la session) ; sans compte : inscription en double opt-in
// (/api/newsletter, courriel de confirmation ; état gardé sur l'appareil, lettre.ts). Messages du site (outils_txt.json, ui.json espace).
// Sans compte, la preuve anti-robot (robot.ts) se prépare dès que le formulaire est affiché ; échec : texte de robot.js (ui.json robot).
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import { lettre } from '@/compte';
import { fmt } from '@/i18n';
import { abonnerInvite, useLettre } from '@/lettre';
import outils from '@/moteur/outils_txt.json';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { preparerRobot } from '@/robot';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

type TN = Record<string, string>;
const TXT = (outils as unknown as { newsletter: Record<string, TN> }).newsletter;
const UI_E = (ui as unknown as { espace: Record<string, TN> }).espace;
const UI_R = (ui as unknown as { robot?: Record<string, TN> }).robot || {};

export default function Newsletter() {
  const { langue, profil, compte, fusionnerProfil } = useProfil();
  const T = TXT[langue] || TXT.en || TXT.fr;
  const E = UI_E[langue] || UI_E.fr;
  const { etat, courriel: courrielLettre, recharger } = useLettre(compte);
  const [courriel, setCourriel] = useState(profil.courriel || '');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async () => {
    const c = courriel.trim().toLowerCase();
    if (!compte && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) { setMsg({ t: T.courriel, ok: false }); return; }
    if (!consent) { setMsg({ t: T.consentement, ok: false }); return; }
    setEnvoi(true); setMsg(null);
    if (compte) {
      const j = await lettre(true, langue);
      setMsg(j.ok ? { t: fmt(E.newsAbonne, compte.courriel), ok: true } : { t: E.newsErreur, ok: false });
    } else {
      const d = await abonnerInvite(c, langue);
      const R = UI_R[langue] || UI_R.fr || {};
      if (d.ok) { setMsg({ t: T[d.etat || 'attente'] || T.attente, ok: true }); fusionnerProfil({ courriel: c }); }
      // preuve impossible (calcul, réseau, plafond du défi) : texte de robot.js selon la raison, comme nl_form.js (APROBOT.message)
      else if (d.robot) setMsg({ t: (d.robot === 'trop' ? R.trop : d.robot === 'reseau' ? R.reseau : R.ko) || T.indisponible, ok: false });
      else setMsg({ t: T[d.erreur || 'indisponible'] || T.indisponible, ok: false });
    }
    await recharger(); setEnvoi(false);
  };
  const desabonner = async () => {
    setEnvoi(true); setMsg(null);
    const j = await lettre(false, langue);
    setMsg(j.ok ? { t: E.newsDesabonne, ok: true } : { t: E.newsErreur, ok: false });
    await recharger(); setEnvoi(false);
  };

  const etatTxt = etat === 'confirme' ? fmt(E.newsAbonne, courrielLettre) : etat === 'attente' ? fmt(E.newsAttente, courrielLettre) : E.newsNon;
  const formulaire = !etat || (!compte && etat === 'attente');
  useEffect(() => { if (formulaire && !compte) preparerRobot(); }, [formulaire, compte]);
  return (
    <>
      <Stack.Screen options={{ title: T.titre }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={[F.texte, F.gras]}>{etatTxt}</Text>
        {compte && etat ? <Bouton titre={E.newsBoutonDesab} secondaire onPress={desabonner} disabled={envoi} /> : null}
        {!compte && etat === 'confirme' ? <Text style={[F.muet, styles.note]}>{E.newsInviteDesab}</Text> : null}
        {formulaire ? (
          <>
            {compte ? null : (
              <Champ label={T.courriel_lbl} value={courriel} onChangeText={setCourriel} placeholder={T.placeholder} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
            )}
            <View style={styles.consent}>
              <Switch value={consent} onValueChange={setConsent} trackColor={{ true: COULEURS.secondaire }} />
              <Text style={styles.consentTxt}>{compte ? E.newsCaseNote : T.consent}</Text>
            </View>
            <Bouton titre={compte ? E.newsBandeauBtn : T.go} onPress={envoyer} disabled={envoi} />
          </>
        ) : null}
        {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]}>{msg.t}</Text> : null}
        {T.donnees ? (
          // « Vos données » (01/10/2026) : même texte que le site, dont le prestataire d'envoi (Brevo) ; lien vers la page Confidentialité du site
          <View style={styles.donnees}>
            <Text style={styles.h2} accessibilityRole="header">{T.h_donnees}</Text>
            <Text style={styles.donneesTxt}>{T.donnees}</Text>
            {T.confidentialite_url ? (
              <Text style={styles.lien} accessibilityRole="link" onPress={() => Linking.openURL(SITE + langue + '/' + T.confidentialite_url)}>
                {T.confidentialite_lbl}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 8 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  consentTxt: { flex: 1, color: COULEURS.texte, fontSize: 14, lineHeight: 19 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
  donnees: { marginTop: 28, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COULEURS.bordure },
  h2: { fontSize: 17, fontWeight: '700', color: COULEURS.texte, marginBottom: 6 },
  donneesTxt: { color: COULEURS.texte, fontSize: 14, lineHeight: 20 },
  lien: { marginTop: 10, color: COULEURS.secondaire, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
