// Inscription à la lettre d'information, natif : même API que le site (/api/newsletter), messages du site (outils_txt.json).
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import outils from '@/moteur/outils_txt.json';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

type TN = Record<string, string>;
const TXT = (outils as unknown as { newsletter: Record<string, TN> }).newsletter;

export default function Newsletter() {
  const { langue, profil, fusionnerProfil } = useProfil();
  const T = TXT[langue] || TXT.en || TXT.fr;
  const [courriel, setCourriel] = useState(profil.courriel || '');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async () => {
    const c = courriel.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)) { setMsg({ t: T.courriel, ok: false }); return; }
    if (!consent) { setMsg({ t: T.consentement, ok: false }); return; }
    setEnvoi(true); setMsg(null);
    try {
      const r = await fetch(SITE + 'api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courriel: c, langue, consentement: 'oui', site: '', page: 'app' }) });
      const d = (await r.json()) as { ok?: boolean; etat?: string; erreur?: string };
      if (d.ok) { setMsg({ t: T[d.etat || 'attente'] || T.attente, ok: true }); fusionnerProfil({ courriel: c }); }
      else setMsg({ t: T[d.erreur || 'indisponible'] || T.indisponible, ok: false });
    } catch { setMsg({ t: T.indisponible, ok: false }); }
    setEnvoi(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: T.titre }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Champ label={T.courriel_lbl} value={courriel} onChangeText={setCourriel} placeholder={T.placeholder} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254} />
        <View style={styles.consent}>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: COULEURS.secondaire }} />
          <Text style={styles.consentTxt}>{T.consent}</Text>
        </View>
        <Bouton titre={T.go} onPress={envoyer} disabled={envoi} />
        {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]}>{msg.t}</Text> : null}
        {T.donnees ? (
          // « Vos données » (01/10/2026) : même texte que le site, dont le prestataire d'envoi (Brevo) ; lien vers la page Confidentialité du site
          <View style={styles.donnees}>
            <Text style={styles.h2}>{T.h_donnees}</Text>
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
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  consentTxt: { flex: 1, color: COULEURS.texte, fontSize: 14, lineHeight: 19 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
  donnees: { marginTop: 28, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COULEURS.bordure },
  h2: { fontSize: 17, fontWeight: '700', color: COULEURS.texte, marginBottom: 6 },
  donneesTxt: { color: COULEURS.texte, fontSize: 14, lineHeight: 20 },
  lien: { marginTop: 10, color: COULEURS.secondaire, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
