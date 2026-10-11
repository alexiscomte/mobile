// « Aujourd'hui, la Lune », natif : phase, signe, illumination, prochaines phases (assets/js/lune.js).
import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';

import { Illustration } from '@/components/illustration';
import { LUNE, ZODIAQUE } from '@/images';
import { ASTRO } from '@/moteur/astro';
import { textes } from '@/moteur/horoscope';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

// La Lune du jour : une photo de pleine Lune (src/images.ts, LUNE) dont on ne montre que la partie éclairée (masque de la phase),
// le reste du disque restant à peine visible (lumière cendrée). Sans l'image : le disque dessiné d'origine.
function Disque({ illum, waxing }: { illum: number; waxing: boolean }) {
  const r = 46, dirn = waxing ? 1 : -1, x = r * (2 * illum - 1) * dirn, sweep1 = dirn === 1 ? 1 : 0;
  const sweep2 = x * dirn >= 0 ? (dirn === 1 ? 1 : 0) : (dirn === 1 ? 0 : 1);
  const eclaire = `M0 -${r} A${r} ${r} 0 0 ${sweep1} 0 ${r} A${Math.abs(x).toFixed(2)} ${r} 0 0 ${sweep2} 0 -${r}Z`;
  const c = r * 1.03;      // l'image déborde à peine du disque : son fin liseré noir reste hors du masque
  return (
    <Svg viewBox="-50 -50 100 100" width={132} height={132}>
      <Defs>
        <ClipPath id="disque"><Circle r={r} /></ClipPath>
        <ClipPath id="eclaire"><Path d={eclaire} /></ClipPath>
      </Defs>
      <Circle r={r} fill="#17112b" />
      {LUNE ? (
        <>
          <SvgImage href={LUNE} x={-c} y={-c} width={2 * c} height={2 * c} preserveAspectRatio="xMidYMid slice" clipPath="url(#disque)" opacity={0.14} />
          <SvgImage href={LUNE} x={-c} y={-c} width={2 * c} height={2 * c} preserveAspectRatio="xMidYMid slice" clipPath="url(#eclaire)" />
        </>
      ) : <Path d={eclaire} fill="#f3e9c6" />}
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
            <Text style={styles.titre} accessibilityRole="header">{U.aujourd}, {r.now.toLocaleDateString(langue, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Text style={styles.phase}><Text style={styles.gras}>{T.phases[r.ph.idx]}</Text> — {U.lune_en} {T.signes[r.s]} {ASTRO.fmtDeg(r.ml)}, {U.eclairee} {Math.round(r.ph.illum * 100)} %.</Text>
            <Text style={styles.suite}>{cap(String(U.prochaine_pl))} : {r.pleine} · {U.prochaine_nl} : {r.nouvelle}.</Text>
          </View>
        </View>
        <View style={styles.signe}>
          <Illustration image={ZODIAQUE[r.s]} taille={72} alt={T.signes[r.s]} />
          <Text style={[styles.lecture, styles.lectureSigne]}>{(T.horoscope.phase as string[])[r.ph.idx]} {T.lune[r.s]}</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  carte: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: COULEURS.fondDoux, borderRadius: 14, padding: 14 },
  titre: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 4, textTransform: 'capitalize' },
  phase: { fontSize: 15, lineHeight: 21, color: COULEURS.texte },
  gras: { fontWeight: '700', color: COULEURS.primaireFonce },
  suite: { fontSize: 13, color: COULEURS.texteMuet, marginTop: 6 },
  lecture: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginTop: 16 },
  signe: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 16 },
  lectureSigne: { flex: 1, marginTop: 0 },
});
