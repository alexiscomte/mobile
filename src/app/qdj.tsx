// La question du jour à deux, native : même règle que le site (assets/js/qdj.js), série de jours gardée sur l'appareil.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import type { Langue } from '@/i18n';
import qdj from '@/moteur/qdj.json';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { page, SITE } from '@/site';
import { COULEURS } from '@/theme';

const D = qdj as { nom: Record<string, string>; questions: Record<string, string[]>; defis: Record<string, string[]> };
const UI = (ui as { qdj: Record<string, Record<string, string>> }).qdj;
const ORIGINE = Date.UTC(2026, 0, 1);
const CLE = 'ap.qdj';
const fmt = (s: string, x: string | number) => s.replace(/%[sd]/, String(x));
const cle = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mod = (a: number, n: number) => ((a % n) + n) % n;
function numero(d: Date) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - ORIGINE) / 86400000); }
function serie(jours: string[], auj: Date) {
  const s = new Set(jours); let n = 0; const dt = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
  if (!s.has(cle(dt))) dt.setDate(dt.getDate() - 1);
  while (s.has(cle(dt))) { n++; dt.setDate(dt.getDate() - 1); }
  return n;
}
type Etat = { jours: string[]; record: number };

export default function QuestionDuJour() {
  const { langue } = useProfil();
  const lg: Langue = langue;
  const t = UI[lg] || UI.fr, Q = D.questions[lg] || D.questions.fr, DF = D.defis[lg] || D.defis.fr;
  const [etat, setEtat] = useState<Etat>({ jours: [], record: 0 });
  const [extra, setExtra] = useState(0);
  const auj = new Date(), n = numero(auj);
  useEffect(() => { AsyncStorage.getItem(CLE).then((v) => { try { const x = v ? JSON.parse(v) : null; if (x && Array.isArray(x.jours)) setEtat({ jours: x.jours, record: x.record || 0 }); } catch { /* rien */ } }); }, []);
  const q = Q[mod(n + extra * 7, Q.length)], df = DF[mod(n, DF.length)];
  const fait = etat.jours.includes(cle(auj)), s = serie(etat.jours, auj);
  const marquer = async () => {
    if (fait) return;
    const jours = [...etat.jours, cle(auj)].sort().slice(-400);
    const e = { jours, record: Math.max(etat.record, serie(jours, auj)) };
    setEtat(e); await AsyncStorage.setItem(CLE, JSON.stringify(e));
  };
  const envoyer = () => {
    const u = SITE + page('qdj', lg).u;
    Share.share({ message: fmt(t.message, q) + ' ' + u }).catch(() => undefined);
  };
  const date = auj.toLocaleDateString(lg, { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <>
      <Stack.Screen options={{ title: D.nom[lg] || D.nom.fr }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.question}>{q}</Text>
        <View style={styles.boutons}>
          <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={envoyer}><Text style={styles.boutonTxt}>{t.envoyer}</Text></Pressable>
          <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={() => setExtra((x) => x + 1)}><Text style={styles.boutonSecTxt}>{t.autre}</Text></Pressable>
        </View>
        <View style={styles.defi}>
          <Text style={styles.defiTitre}>{t.defi}</Text>
          <Text style={styles.defiTxt}>{df}</Text>
        </View>
        {fait ? <Text style={styles.ok}>{t.fait_ok}</Text> : (
          <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={marquer}><Text style={styles.boutonTxt}>{t.fait}</Text></Pressable>
        )}
        <Text style={styles.serie}>{fmt(t.serie, s)}{etat.record > 1 ? ' · ' + fmt(t.record, etat.record) : ''}</Text>
        <View style={styles.semaine}>
          {[6, 5, 4, 3, 2, 1, 0].map((i) => {
            const dt = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - i), ok = etat.jours.includes(cle(dt));
            return (
              <View key={i} style={[styles.jour, ok && styles.jourOk, i === 0 && styles.jourAuj]}>
                <Text style={[styles.jourTxt, ok && styles.jourTxtOk]}>{dt.toLocaleDateString(lg, { weekday: 'narrow' })}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  date: { color: COULEURS.texteMuet, textTransform: 'capitalize', marginBottom: 6 },
  question: { fontSize: 26, lineHeight: 34, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 16 },
  boutons: { gap: 8, marginBottom: 16 },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
  presse: { opacity: 0.8 },
  defi: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 14, marginBottom: 16 },
  defiTitre: { fontWeight: '700', color: COULEURS.secondaireFonce, marginBottom: 4 },
  defiTxt: { fontSize: 16, lineHeight: 22, color: COULEURS.texte },
  ok: { color: COULEURS.vert, fontWeight: '600', fontSize: 16, textAlign: 'center', marginVertical: 8 },
  serie: { marginTop: 18, fontWeight: '700', color: COULEURS.texte },
  semaine: { flexDirection: 'row', gap: 8, marginTop: 8 },
  jour: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COULEURS.bordure, alignItems: 'center', justifyContent: 'center' },
  jourOk: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  jourAuj: { borderColor: COULEURS.secondaire },
  jourTxt: { color: COULEURS.texteMuet, fontSize: 13, textTransform: 'uppercase' },
  jourTxtOk: { color: '#fff' },
});
