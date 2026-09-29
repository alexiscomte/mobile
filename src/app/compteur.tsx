// Compteur de couple, natif : jours ensemble, prochains caps, anniversaires, noces (assets/js/compteur.js).
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput } from 'react-native';

import outils from '@/moteur/outils_txt.json';
import { useProfil } from '@/profil';
import { page, SITE } from '@/site';
import { COULEURS } from '@/theme';

type T = Record<string, string> & { noces_liste: Record<string, string> };
const TXT = (outils as { compteur: Record<string, T> }).compteur;
const pad = (n: number) => (n < 10 ? '0' : '') + n;
const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmt = (s: string, ...v: (string | number)[]) => { let i = 0; return s.replace(/%s/g, () => String(v[i++] ?? '')); };

export default function Compteur() {
  const { langue } = useProfil();
  const t = TXT[langue] || TXT.fr;
  const [rencontre, setRencontre] = useState('');
  const [mariage, setMariage] = useState('');
  const [noms, setNoms] = useState('');
  const [res, setRes] = useState<{ n: number; y: number[]; caps: string[]; anniv: string; noces: string | null; texte: string } | null>(null);
  const [erreur, setErreur] = useState('');
  const f = (d: Date) => d.toLocaleDateString(langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const j = (d: Date, n: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };
  const jours = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
  const loc = (n: number) => n.toLocaleString(langue);
  const ymd = (a: Date, b: Date) => {
    let y = b.getUTCFullYear() - a.getUTCFullYear(), m = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate();
    if (d < 0) { m -= 1; d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (m < 0) { y -= 1; m += 12; }
    return [y, m, d];
  };
  const prochain = (a: Date, auj: Date): [Date, number] => {
    let n = auj.getUTCFullYear() - a.getUTCFullYear();
    let p = new Date(Date.UTC(a.getUTCFullYear() + n, a.getUTCMonth(), a.getUTCDate()));
    if (p <= auj) { n += 1; p = new Date(Date.UTC(a.getUTCFullYear() + n, a.getUTCMonth(), a.getUTCDate())); }
    return [p, n];
  };
  const calculer = () => {
    const deb = /^\d{4}-\d{2}-\d{2}$/.test(rencontre) ? new Date(rencontre + 'T00:00:00Z') : null;
    if (!deb || isNaN(deb.getTime())) { setErreur(t.manque); setRes(null); return; }
    const a = new Date(); const auj = new Date(Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()));
    if (deb > auj) { setErreur(t.futur); setRes(null); return; }
    setErreur('');
    const n = jours(deb, auj), y = ymd(deb, auj);
    const caps = [100, 365, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000].filter((c) => c > n).slice(0, 4).map((c) => fmt(t.cap, loc(c), f(j(deb, c)), loc(c - n)));
    const pa = prochain(deb, auj);
    let noces: string | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(mariage)) {
      const md = new Date(mariage + 'T00:00:00Z');
      if (!isNaN(md.getTime()) && md <= auj) { const pm = prochain(md, auj); noces = fmt(t.noces_txt, f(pm[0]), pm[1], t.noces_liste[String(pm[1])] || '…', jours(auj, pm[0])); }
    }
    setRes({ n, y, caps, anniv: fmt(t.anniv_txt, f(pa[0]), pa[1], jours(auj, pa[0])), noces, texte: fmt(t.texte, noms.trim() || '❤', loc(n)) });
  };
  const champDate = (v: string, set: (s: string) => void) => Platform.OS === 'web'
    ? <TextInput style={styles.entree} value={v} onChangeText={set} placeholder="AAAA-MM-JJ" placeholderTextColor={COULEURS.texteMuet} />
    : <DateTimePicker value={v ? new Date(v + 'T12:00:00') : new Date()} mode="date" display="compact" locale={langue} maximumDate={new Date()} onChange={(_e, d) => { if (d) set(iso(d)); }} style={styles.picker} />;
  return (
    <>
      <Stack.Screen options={{ title: page('compteur', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t.rencontre}</Text>{champDate(rencontre, setRencontre)}
        <Text style={styles.label}>{t.mariage}</Text>{champDate(mariage, setMariage)}
        <Text style={styles.label}>{t.noms}</Text>
        <TextInput style={styles.entree} value={noms} onChangeText={setNoms} maxLength={60} />
        <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={calculer}><Text style={styles.boutonTxt}>{t.go}</Text></Pressable>
        <Text style={styles.note}>{t.note}</Text>
        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        {res ? (
          <>
            <Text style={styles.total}>{t.ensemble} <Text style={styles.nombre}>{loc(res.n)}</Text> {t.jours}</Text>
            <Text style={styles.texte}>{fmt(t.soit, res.y[0] + ' ' + t.ans + ', ' + res.y[1] + ' ' + t.mois + ', ' + res.y[2] + ' ' + t.j)} — {fmt(t.semaines, loc(Math.floor(res.n / 7)), res.n % 7)}</Text>
            <Text style={styles.sousTitre}>{t.caps}</Text>
            {res.caps.map((c, i) => <Text key={i} style={styles.texte}>• {c}</Text>)}
            <Text style={styles.sousTitre}>{t.anniv}</Text>
            <Text style={styles.texte}>{res.anniv}</Text>
            {res.noces ? <><Text style={styles.sousTitre}>{t.noces}</Text><Text style={styles.texte}>{res.noces}</Text></> : null}
            <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={() => Share.share({ message: res.texte + ' ' + SITE + page('compteur', langue).u }).catch(() => undefined)}>
              <Text style={styles.boutonSecTxt}>{t.partager}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  label: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, marginTop: 10, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte },
  picker: { alignSelf: 'flex-start', marginLeft: -8 },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 14 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
  presse: { opacity: 0.8 },
  note: { color: COULEURS.texteMuet, fontSize: 13, marginTop: 8 },
  erreur: { color: COULEURS.coeur, marginTop: 8 },
  total: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18 },
  nombre: { fontSize: 30, color: COULEURS.primaire },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 6 },
  sousTitre: { fontSize: 17, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 12, marginBottom: 4 },
});
