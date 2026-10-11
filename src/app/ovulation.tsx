// Estimateur d'ovulation (méthode du calendrier), natif : mêmes textes et même calcul que le site (assets/js/ovulation.js).
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FriseCycle } from '@/components/schemas';
import outils from '@/moteur/outils_txt.json';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

type T = Record<string, string>;
const TXT = (outils as { ovulation: Record<string, T> }).ovulation;
const pad = (n: number) => (n < 10 ? '0' : '') + n;
const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

export default function Ovulation() {
  const { langue } = useProfil();
  const t = TXT[langue] || TXT.fr;
  const [regles, setRegles] = useState('');
  const [cycle, setCycle] = useState('28');
  const [res, setRes] = useState<{ n: number; ovu: string; fenetre: string; regles: string; test: string }[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const f = (d: Date) => d.toLocaleDateString(langue, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const j = (d: Date, n: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };
  const calculer = () => {
    const c = parseInt(cycle, 10), deb = /^\d{4}-\d{2}-\d{2}$/.test(regles) ? new Date(regles + 'T00:00:00Z') : null;
    if (!deb || isNaN(deb.getTime()) || !(c >= 21 && c <= 35)) { setErreur(true); setRes(null); return; }
    setErreur(false);
    const out = [];
    for (let k = 0; k < 3; k++) {
      const d0 = j(deb, k * c), suiv = j(d0, c), ovu = j(suiv, -14);
      out.push({ n: k + 1, ovu: f(ovu), fenetre: f(j(ovu, -5)) + ' → ' + f(ovu), regles: f(suiv), test: f(j(suiv, 1)) });
    }
    setRes(out);
  };
  return (
    <>
      <Stack.Screen options={{ title: page('ovulation', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={styles.label}>{t.regles}</Text>
        {Platform.OS === 'web' ? (
          <TextInput style={styles.entree} value={regles} onChangeText={setRegles} placeholder="AAAA-MM-JJ" placeholderTextColor={COULEURS.texteMuet} />
        ) : (
          <DateTimePicker value={regles ? new Date(regles + 'T12:00:00') : new Date()} mode="date" display="compact" locale={langue} onChange={(_e, d) => { if (d) setRegles(iso(d)); }} style={styles.picker} />
        )}
        <Text style={styles.label}>{t.cycle}</Text>
        <TextInput style={styles.entree} value={cycle} onChangeText={setCycle} keyboardType="number-pad" maxLength={2} />
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={calculer}><Text style={styles.boutonTxt}>{t.go}</Text></Pressable>
        <Text style={styles.note}>{t.note}</Text>
        {erreur ? <Text style={styles.erreur}>{t.manque}</Text> : null}
        {res ? (
          <View style={styles.resultat}>
            <Text style={styles.titre} accessibilityRole="header">{t.titre}</Text>
            {/* frise du premier cycle : règles, fenêtre fertile, jour d'ovulation (schéma exact, components/schemas.tsx) */}
            <FriseCycle c={parseInt(cycle, 10)} legendes={{ regles: t.regles_s, fenetre: t.fenetre, ovulation: t.ovu }} />
            {res.map((r) => (
              <View key={r.n} style={styles.cycle}>
                <Text style={styles.cycleTitre}>{t.cycle_n.replace('%d', String(r.n))}</Text>
                <Text style={styles.ligne}><Text style={styles.gras}>{t.ovu}</Text> : {r.ovu}</Text>
                <Text style={styles.ligne}><Text style={styles.gras}>{t.fenetre}</Text> : {r.fenetre}</Text>
                <Text style={styles.ligne}><Text style={styles.gras}>{t.regles_s}</Text> : {r.regles}</Text>
                <Text style={styles.ligne}><Text style={styles.gras}>{t.test}</Text> : {r.test}</Text>
              </View>
            ))}
            <View style={styles.avert}><Text style={styles.avertTxt}>{t.avert}</Text></View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  label: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, marginTop: 10, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte },
  picker: { alignSelf: 'flex-start', marginLeft: -8 },
  bouton: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  presse: { opacity: 0.8 },
  note: { color: COULEURS.texteMuet, fontSize: 13, marginTop: 8 },
  erreur: { color: COULEURS.coeur, marginTop: 8 },
  resultat: { marginTop: 16 },
  titre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 8 },
  cycle: { backgroundColor: COULEURS.fondMuet, borderRadius: 12, padding: 12, marginBottom: 10 },
  cycleTitre: { fontWeight: '700', color: COULEURS.primaire, marginBottom: 4 },
  ligne: { fontSize: 14, lineHeight: 21, color: COULEURS.texte },
  gras: { fontWeight: '700' },
  avert: { backgroundColor: COULEURS.avertFond, borderRadius: 10, padding: 12, marginTop: 6 },
  avertTxt: { color: COULEURS.avertTexte, fontSize: 14, lineHeight: 20 },
});
