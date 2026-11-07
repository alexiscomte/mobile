// Calendrier de garde alternée, natif : rythmes du site (assets/js/garde.js), export .ics par la feuille de partage.
import { File, Paths } from 'expo-file-system';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Bouton, Champ, ChampDate, Erreur, F, fmt, Note, Puce } from '@/components/form';
import { FriseGarde } from '@/components/schemas';
import { attribution, compter, grille, ics, MOTIFS, RYTHMES, textesGarde, type Case, type Rythme } from '@/moteur/garde';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

const LIB: Record<Rythme, 'r_sem' | 'r_223' | 'r_2255' | 'r_we'> = { sem: 'r_sem', r223: 'r_223', r2255: 'r_2255', we: 'r_we' };
const COUL = ['#EAD9F3', '#D5EAF3'];

function Mois({ titre, semaines, noms, jours, annee, mois, langue, chez }: {
  titre: string; semaines: Case[][]; noms: [string, string]; jours: string[];
  annee: number; mois: number; langue: string; chez: string;
}) {
  const { fontScale } = useWindowDimensions();
  const grandsTextes = fontScale > 1.3;
  const date = (jour: number) => new Date(Date.UTC(annee, mois, jour)).toLocaleDateString(langue, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const libelle = (c: NonNullable<Case>) => `${date(c.d)}${c.q === undefined ? '' : `, ${chez} ${noms[c.q]}`}`;
  return (
    <View style={styles.mois}>
      <Text style={F.h3} accessibilityRole="header">{titre}</Text>
      {grandsTextes ? semaines.flat().map((c) => c ? (
        <View key={c.d} style={[styles.agenda, c.q !== undefined && { backgroundColor: COUL[c.q] }]}
          accessible accessibilityRole="text" accessibilityLanguage={langue} accessibilityLabel={libelle(c)}>
          <Text style={[styles.dateAgenda, c.q !== undefined && styles.surPastel]}>{date(c.d)}</Text>
          {c.q !== undefined ? <Text style={[styles.nomAgenda, styles.surPastel]}>{chez} {noms[c.q]}</Text> : null}
        </View>
      ) : null) : <>
        <View style={styles.legende}>
          {noms.map((nom, i) => (
            <View key={i} style={styles.parent} accessible accessibilityRole="text"
              accessibilityLanguage={langue} accessibilityLabel={`${i + 1}, ${chez} ${nom}`}>
              <View style={[styles.repere, { backgroundColor: COUL[i] }]}>
                <Text style={styles.numeroParent}>{i + 1}</Text>
              </View>
              <Text style={styles.nomParent}>{nom}</Text>
            </View>
          ))}
        </View>
        <View style={styles.ligne} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {jours.map((j, i) => <Text key={i} style={styles.th}>{j}</Text>)}
        </View>
        {semaines.map((s, i) => (
          <View key={i} style={styles.ligne}>
            {s.map((c, k) => (
              <View key={k} style={[styles.td, c && c.q !== undefined ? { backgroundColor: COUL[c.q] } : null]}
                accessible={!!c} accessibilityRole="text" accessibilityLanguage={langue} accessibilityLabel={c ? libelle(c) : undefined}>
                {c ? <Text style={[styles.jour, c.q !== undefined && styles.surPastel]}>{c.d}</Text> : null}
                {c && c.q !== undefined ? (
                  <View style={[styles.repere, styles.repereCase]}>
                    <Text style={styles.numeroParent}>{c.q + 1}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </>}
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
      out.push(<Mois key={k} titre={moisLoc(y, m)} semaines={grille(y, m, res.attrib)} noms={res.noms} jours={T.jours} annee={y} mois={m} langue={langue} chez={T.chez} />);
      m++; if (m > 11) { m = 0; y++; }
    }
    return out;
  };

  return (
    <>
      <Stack.Screen options={{ title: page('garde', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={F.label}>{T.rythme}</Text>
        <View style={F.puces}>
          {RYTHMES.map((r) => <Puce key={r} titre={T[LIB[r]]} actif={r === rythme} onPress={() => setRythme(r)} />)}
        </View>
        {/* deux semaines du rythme choisi, dans les couleurs du calendrier (components/schemas.tsx) */}
        <FriseGarde motif={MOTIFS[rythme]} jours={T.jours} couleurs={COUL} noms={[p1.trim() || T.p1, p2.trim() || T.p2]} langue={langue} />
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
  th: { flex: 1, textAlign: 'center', fontSize: 13, color: COULEURS.texteMuet, paddingVertical: 4 },
  td: { flex: 1, minWidth: 0, minHeight: 56, borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, padding: 3 },
  jour: { fontSize: 14, fontWeight: '600', color: COULEURS.texte },
  legende: { gap: 6, marginVertical: 8 },
  parent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  repere: { minWidth: 24, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#221B2B' },
  repereCase: { alignSelf: 'flex-end', marginTop: 4 },
  numeroParent: { fontSize: 13, fontWeight: '700', color: '#221B2B', textAlign: 'center' },
  nomParent: { flex: 1, fontSize: 15, color: COULEURS.texte },
  agenda: { padding: 12, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure },
  dateAgenda: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  nomAgenda: { fontSize: 15 },
  surPastel: { color: '#221B2B' },   // cases pastel : texte foncé dans les deux modes
});
