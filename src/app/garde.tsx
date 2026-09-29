// Calendrier de garde alternée, natif : rythmes du site (assets/js/garde.js), export .ics par la feuille de partage.
import { File, Paths } from 'expo-file-system';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Bouton, Champ, ChampDate, Erreur, F, fmt, Note, Puce } from '@/components/form';
import { attribution, compter, grille, ics, RYTHMES, textesGarde, type Case, type Rythme } from '@/moteur/garde';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

const LIB: Record<Rythme, 'r_sem' | 'r_223' | 'r_2255' | 'r_we'> = { sem: 'r_sem', r223: 'r_223', r2255: 'r_2255', we: 'r_we' };
const COUL = ['#EAD9F3', '#D5EAF3'];

function Mois({ titre, semaines, noms, jours }: { titre: string; semaines: Case[][]; noms: [string, string]; jours: string[] }) {
  return (
    <View style={styles.mois}>
      <Text style={F.h3}>{titre}</Text>
      <View style={styles.ligne}>{jours.map((j, i) => <Text key={i} style={styles.th}>{j}</Text>)}</View>
      {semaines.map((s, i) => (
        <View key={i} style={styles.ligne}>
          {s.map((c, k) => (
            <View key={k} style={[styles.td, c && c.q !== undefined ? { backgroundColor: COUL[c.q] } : null]}>
              {c ? <Text style={styles.jour}>{c.d}</Text> : null}
              {c && c.q !== undefined ? <Text style={styles.qui} numberOfLines={1}>{noms[c.q]}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

type Res = { attrib: Record<string, 0 | 1>; debut: Date; jours: number; nm: number; noms: [string, string]; na: number; nb: number };

export default function Garde() {
  const { langue } = useProfil();
  const T = textesGarde(langue);
  const [rythme, setRythme] = useState<Rythme>('sem');
  const [debut, setDebut] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [mois, setMois] = useState('3');
  const [res, setRes] = useState<Res | null>(null);
  const [erreur, setErreur] = useState('');

  const calculer = () => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(debut) ? new Date(debut + 'T00:00:00Z') : null;
    const noms: [string, string] = [p1.trim(), p2.trim()];
    const nm = Math.min(12, Math.max(1, parseInt(mois, 10) || 3));
    if (!d || isNaN(d.getTime()) || !noms[0] || !noms[1]) { setErreur(T.manque); setRes(null); return; }
    setErreur('');
    const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + nm, 1));
    const jours = Math.round((fin.getTime() - d.getTime()) / 86400000);
    const attrib = attribution(rythme, d, jours);
    const [na, nb] = compter(attrib);
    setRes({ attrib, debut: d, jours, nm, noms, na, nb });
  };
  const exporter = async () => {
    if (!res) return;
    const texte = ics(res.attrib, res.noms, res.debut, res.jours, T.chez);
    try {
      if (Platform.OS === 'web') { await Share.share({ message: texte }); return; }
      const f = new File(Paths.cache, 'garde.ics');
      f.write(texte);
      await Share.share({ url: f.uri, title: 'garde.ics' });
    } catch { /* partage annulé */ }
  };
  const moisLoc = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString(langue, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const calendriers = () => {
    if (!res) return null;
    const out: React.ReactNode[] = [];
    let y = res.debut.getUTCFullYear(), m = res.debut.getUTCMonth();
    for (let k = 0; k < res.nm; k++) {
      out.push(<Mois key={k} titre={moisLoc(y, m)} semaines={grille(y, m, res.attrib)} noms={res.noms} jours={T.jours} />);
      m++; if (m > 11) { m = 0; y++; }
    }
    return out;
  };

  return (
    <>
      <Stack.Screen options={{ title: page('garde', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Text style={F.label}>{T.rythme}</Text>
        <View style={F.puces}>
          {RYTHMES.map((r) => <Puce key={r} titre={T[LIB[r]]} actif={r === rythme} onPress={() => setRythme(r)} />)}
        </View>
        <ChampDate label={T.debut} value={debut} onChange={setDebut} langue={langue} min={new Date(2000, 0, 1)} max={new Date(2100, 0, 1)} />
        <Champ label={T.p1} value={p1} onChangeText={setP1} maxLength={30} autoCapitalize="words" />
        <Champ label={T.p2} value={p2} onChangeText={setP2} maxLength={30} autoCapitalize="words" />
        <Champ label={T.mois} value={mois} onChangeText={setMois} keyboardType="number-pad" maxLength={2} />
        <Bouton titre={T.go} onPress={calculer} />
        <Erreur>{erreur}</Erreur>
        <Note>{T.note}</Note>
        {res ? (
          <>
            <Text style={[F.texte, F.gras, { marginTop: 12 }]}>{fmt(T.nuits, res.noms[0], res.na, res.noms[1], res.nb, res.jours)}</Text>
            <Bouton titre={T.ics} onPress={exporter} secondaire />
            {calendriers()}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  mois: { marginTop: 6 },
  ligne: { flexDirection: 'row' },
  th: { flex: 1, textAlign: 'center', fontSize: 11, color: COULEURS.texteMuet, paddingVertical: 4 },
  td: { flex: 1, minHeight: 44, borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, padding: 3 },
  jour: { fontSize: 12, fontWeight: '600', color: COULEURS.texte },
  qui: { fontSize: 9, color: COULEURS.texteMuet },
});
