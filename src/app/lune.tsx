// « Aujourd'hui, la Lune », natif : phase, signe, illumination, prochaines phases (assets/js/lune.js).
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ASTRO } from '@/moteur/astro';
import { textes } from '@/moteur/horoscope';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

function Disque({ illum, waxing }: { illum: number; waxing: boolean }) {
  const r = 40, dirn = waxing ? 1 : -1, x = r * (2 * illum - 1) * dirn, sweep1 = dirn === 1 ? 1 : 0;
  const sweep2 = x * dirn >= 0 ? (dirn === 1 ? 1 : 0) : (dirn === 1 ? 0 : 1);
  return (
    <Svg viewBox="-50 -50 100 100" width={120} height={120}>
      <Circle r={r} fill="#2b2140" />
      <Path d={`M0 -${r} A${r} ${r} 0 0 ${sweep1} 0 ${r} A${Math.abs(x).toFixed(2)} ${r} 0 0 ${sweep2} 0 -${r}Z`} fill="#f3e9c6" />
    </Svg>
  );
}

export default function Lune() {
  const { langue } = useProfil();
  const T = textes(langue), U = T.ui;
  const r = useMemo(() => {
    const now = new Date(), j = ASTRO.jdFromDate(now), ph = ASTRO.phase(j), ml = ASTRO.moonLon(j), s = ASTRO.sign(ml);
    const pleine = ASTRO.nextPhase(j, 180), nouvelle = ASTRO.nextPhase(j, 0);
    const courte = (jj: number | null) => (jj ? ASTRO.jdToDate(jj).toLocaleDateString(langue, { day: 'numeric', month: 'long' }) : '—');
    return { now, ph, ml, s, pleine: courte(pleine), nouvelle: courte(nouvelle) };
  }, [langue]);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <>
      <Stack.Screen options={{ title: page('lune', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={styles.carte}>
          <Disque illum={r.ph.illum} waxing={r.ph.waxing} />
          <View style={{ flex: 1 }}>
            <Text style={styles.titre}>{U.aujourd}, {r.now.toLocaleDateString(langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Text style={styles.phase}><Text style={styles.gras}>{T.phases[r.ph.idx]}</Text> — {U.lune_en} {T.signes[r.s]} {ASTRO.fmtDeg(r.ml)}, {U.eclairee} {Math.round(r.ph.illum * 100)} %.</Text>
            <Text style={styles.suite}>{cap(String(U.prochaine_pl))} : {r.pleine} · {U.prochaine_nl} : {r.nouvelle}.</Text>
          </View>
        </View>
        <Text style={styles.lecture}>{(T.horoscope.phase as string[])[r.ph.idx]} {T.lune[r.s]}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  carte: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: COULEURS.fondDoux, borderRadius: 14, padding: 14 },
  titre: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 4, textTransform: 'capitalize' },
  phase: { fontSize: 15, lineHeight: 21, color: COULEURS.texte },
  gras: { fontWeight: '700', color: COULEURS.primaireFonce },
  suite: { fontSize: 13, color: COULEURS.texteMuet, marginTop: 6 },
  lecture: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginTop: 16 },
});
