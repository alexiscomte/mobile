// Thème astral, natif : roue, positions, éléments, lecture — à partir des infos personnelles (date, heure, lieu).
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { GLYPHES, TEXTES2 } from '@/i18n2';
import { ASTRO, type Carte } from '@/moteur/astro';
import { textes } from '@/moteur/horoscope';
import { carteDe, elements, GLYPHES_PLANETES, lecture, positions } from '@/moteur/theme';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

function Roue({ c, largeur }: { c: Carte; largeur: number }) {
  const R = 150, cx = 160, cy = 160, rot = typeof c.asc === 'number' ? c.asc : 0;
  const pt = (lon: number, r: number): [number, number] => { const a = (180 - (lon - rot)) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const items = ASTRO.PLANETS.map((k) => ({ k: k as string, lon: c.planets[k].lon }));
  if (typeof c.asc === 'number' && typeof c.mc === 'number') { items.push({ k: 'asc', lon: c.asc }); items.push({ k: 'mc', lon: c.mc }); }
  items.sort((a, b) => ((a.lon - rot) % 360 + 360) % 360 - ((b.lon - rot) % 360 + 360) % 360);
  let last = -99, level = 0;
  const places = items.map((it) => { const rel = ((it.lon - rot) % 360 + 360) % 360; level = rel - last < 7 ? level + 1 : 0; last = rel; return { ...it, r: R - 44 - level * 14 }; });
  return (
    <Svg width={largeur} height={largeur} viewBox="0 0 320 320">
      <Circle cx={cx} cy={cy} r={R} fill={COULEURS.fondDoux} stroke={COULEURS.bordure} />
      <Circle cx={cx} cy={cy} r={R - 26} fill="#fff" stroke={COULEURS.bordure} />
      <Circle cx={cx} cy={cy} r={R - 90} fill="none" stroke={COULEURS.bordure} />
      {Array.from({ length: 12 }, (_, i) => {
        const p1 = pt(i * 30, R), p2 = pt(i * 30, R - 26), g = pt(i * 30 + 15, R - 13);
        const h1 = pt(rot + i * 30, R - 26), h2 = pt(rot + i * 30, R - 90), hn = pt(rot + i * 30 + 15, R - 82);
        return (
          <React.Fragment key={i}>
            <Line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={COULEURS.bordure} />
            <SvgText x={g[0]} y={g[1] + 5} textAnchor="middle" fontSize="14" fill={COULEURS.primaire}>{GLYPHES[i]}</SvgText>
            {typeof c.asc === 'number' ? (<><Line x1={h1[0]} y1={h1[1]} x2={h2[0]} y2={h2[1]} stroke="#e3e4f6" /><SvgText x={hn[0]} y={hn[1] + 3} textAnchor="middle" fontSize="8" fill={COULEURS.texteMuet}>{i + 1}</SvgText></>) : null}
          </React.Fragment>
        );
      })}
      {c.aspects.map((a, i) => {
        const p1 = pt(c.planets[a.a].lon, R - 92), p2 = pt(c.planets[a.b].lon, R - 92);
        const col = a.type === 'sq' || a.type === 'opp' ? '#c04c4c' : a.type === 'conj' ? '#8a7a2a' : '#3f6fa8';
        return <Line key={'a' + i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} stroke={col} strokeWidth={1} opacity={0.7} />;
      })}
      {places.map((it) => {
        const p = pt(it.lon, it.r), q1 = pt(it.lon, R - 26), q2 = pt(it.lon, R - 31);
        return (
          <React.Fragment key={it.k}>
            <Line x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} stroke={COULEURS.primaireFonce} />
            <SvgText x={p[0]} y={p[1] + 4} textAnchor="middle" fontSize={it.k === 'asc' || it.k === 'mc' ? '9' : '13'} fill={COULEURS.primaireFonce}>{GLYPHES_PLANETES[it.k]}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export default function Theme() {
  const { langue, profil } = useProfil();
  const T = textes(langue), U = T.ui, T2 = TEXTES2[langue];
  const router = useRouter();
  const [largeur, setLargeur] = useState(0);
  const r = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profil.naissance || '');
    if (!m) return null;
    const l = profil.naissance_lieu;
    return carteDe({ y: +m[1], m: +m[2], d: +m[3], heure: profil.heure, lat: l ? l.lat : null, lon: l ? l.lon : null });
  }, [profil]);
  return (
    <>
      <Stack.Screen options={{ title: page('themeAstral', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu} onLayout={(e) => setLargeur(Math.min(e.nativeEvent.layout.width - 32, 360))}>
        {!r ? (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTxt}>{T2.sansDate}</Text>
            <Pressable onPress={() => router.push('/(tabs)/moi')}><Text style={styles.lien}>{T2.renseigner} →</Text></Pressable>
          </View>
        ) : (
          <>
            {!r.heureConnue ? <Text style={styles.note}>{U.sans_heure}</Text> : null}
            {largeur > 0 ? <View style={styles.roue}><Roue c={r.carte} largeur={largeur} /></View> : null}
            <View style={styles.table}>
              <View style={styles.tr}><Text style={[styles.th, { flex: 2 }]}>{U.planete}</Text><Text style={[styles.th, { flex: 2 }]}>{U.signe}</Text><Text style={styles.th}>{U.degre}</Text>{r.heureConnue ? <Text style={styles.th}>{U.maison}</Text> : null}</View>
              {positions(r.carte, langue).map((x) => (
                <View key={x.k} style={styles.tr}>
                  <Text style={[styles.td, { flex: 2 }]}>{x.glyphe} {x.nom}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{x.signe}</Text>
                  <Text style={styles.td}>{x.degre}{x.retro ? ' R' : ''}</Text>
                  {r.heureConnue ? <Text style={styles.td}>{x.maison ?? ''}</Text> : null}
                </View>
              ))}
            </View>
            <Text style={styles.elements}><Text style={styles.gras}>{U.elements}</Text> : {elements(r.carte, langue).map((e) => e.nom + ' ' + e.n).join(' · ')}.</Text>
            <Text style={styles.sousTitre}>{U.lecture}</Text>
            {lecture(r.carte, langue).paragraphes.map((p, i) => (
              <Text key={i} style={styles.texte}>{p.titre ? <Text style={styles.gras}>{p.titre}. </Text> : null}{p.texte}</Text>
            ))}
            {lecture(r.carte, langue).aspects.length ? (
              <>
                <Text style={styles.sousTitre}>{U.aspects}</Text>
                {lecture(r.carte, langue).aspects.map((a, i) => <Text key={i} style={styles.texte}>• {a}</Text>)}
              </>
            ) : null}
            <Text style={styles.note}>{U.precision}</Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  bandeau: { backgroundColor: COULEURS.primaire, borderRadius: 12, padding: 14 },
  bandeauTxt: { color: '#fff', fontSize: 15 },
  lien: { color: '#fff', textDecorationLine: 'underline', marginTop: 8, fontWeight: '600' },
  note: { color: COULEURS.texteMuet, fontSize: 12, marginVertical: 8 },
  roue: { alignItems: 'center', marginVertical: 8 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure, paddingVertical: 6, paddingHorizontal: 8 },
  th: { flex: 1, fontWeight: '700', color: COULEURS.primaireFonce, fontSize: 13 },
  td: { flex: 1, color: COULEURS.texte, fontSize: 14 },
  elements: { marginTop: 10, color: COULEURS.texte },
  gras: { fontWeight: '700' },
  sousTitre: { fontSize: 18, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 16, marginBottom: 6 },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 8 },
});
