// Biorythmes du jour, natif : les trois cycles, le bilan, les courbes sur trente jours, les prochains repères.
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { TEXTES2 } from '@/i18n2';
import { biorythmes, courbe, CYCLES, type EtatCycle } from '@/moteur/biorythme';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type TB = {
  titre: string; cycles: string[]; jours: string; etat: Record<string, string>; diag: Record<string, Record<string, string>>;
  bilan: string; bonne: string; moyenne: string; dure: string; critique: string; prochains: string; crit: string; pic: string;
  aujourdhui: string; demain: string; dans: string; vecu: string; rappel: string; legende: string; montant: string; descendant: string;
};
const UI = (ui as { biomoi: Record<string, TB> }).biomoi;
const fmt = (s: string, ...v: (string | number)[]) => s.replace(/%(\d)/g, (_m, i) => String(v[+i - 1] ?? ''));

function Graphe({ age, etats, lang, t, largeur }: { age: number; etats: EtatCycle[]; lang: string; t: TB; largeur: number }) {
  const W = 720, H = 300, L = 46, R = 14, T = 16, B = 40, w = W - L - R, h = H - T - B, mid = T + h / 2, amp = h / 2 - 6;
  const X = (k: number) => L + (k + 15) / 30 * w, Y = (v: number) => mid - v * amp;
  const now = Date.now();
  const courte = (dt: Date) => { try { return dt.toLocaleDateString(lang, { day: 'numeric', month: 'short' }); } catch { return dt.getDate() + '/' + (dt.getMonth() + 1); } };
  const reperes = [-15, -10, -5, 0, 5, 10, 15];
  return (
    <Svg width={largeur} height={largeur * H / W} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={L} y={T} width={w} height={h} fill={COULEURS.fondEleve} stroke={COULEURS.bordure} />
      <Line x1={L} y1={mid} x2={L + w} y2={mid} stroke={COULEURS.hors} strokeDasharray="4 4" />
      <SvgText x={L - 6} y={Y(1) + 4} textAnchor="end" fontSize="11" fill={COULEURS.texteMuet}>+100</SvgText>
      <SvgText x={L - 6} y={mid + 4} textAnchor="end" fontSize="11" fill={COULEURS.texteMuet}>0</SvgText>
      <SvgText x={L - 6} y={Y(-1) + 4} textAnchor="end" fontSize="11" fill={COULEURS.texteMuet}>−100</SvgText>
      {reperes.map((k) => (
        <React.Fragment key={k}>
          <Line x1={X(k)} y1={T} x2={X(k)} y2={T + h} stroke={COULEURS.grille} />
          <SvgText x={X(k)} y={T + h + 16} textAnchor="middle" fontSize="11" fill={COULEURS.texteMuet}>{courte(new Date(now + k * 86400000))}</SvgText>
        </React.Fragment>
      ))}
      <Line x1={X(0)} y1={T} x2={X(0)} y2={T + h} stroke={COULEURS.primaire} strokeWidth={2} />
      <SvgText x={X(0)} y={T + h + 32} textAnchor="middle" fontSize="12" fontWeight="600" fill={COULEURS.primaire}>{t.aujourdhui}</SvgText>
      {etats.map((e) => (
        <React.Fragment key={e.k}>
          <Polyline fill="none" stroke={e.col} strokeWidth={2.5} points={courbe(age, e.P).map(([q, v]) => X(q).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')} />
          <Circle cx={X(0)} cy={Y(e.v)} r={6} fill={e.col} stroke={COULEURS.fondEleve} strokeWidth={2} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

export default function Biorythme() {
  const { langue, profil } = useProfil();
  const t = UI[langue] || UI.fr, T2 = TEXTES2[langue];
  const router = useRouter();
  const [largeur, setLargeur] = useState(0);
  const r = useMemo(() => (profil.naissance ? biorythmes(profil.naissance, profil.heure) : null), [profil]);
  const dateLoc = (dt: Date) => { try { return dt.toLocaleDateString(langue, { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return dt.toLocaleDateString(); } };
  const quand = (kj: number) => {
    const n = Math.ceil(kj - 0.5); if (n <= 0) return t.aujourdhui;
    return (n === 1 ? t.demain : fmt(t.dans, n)) + ' (' + dateLoc(new Date(Date.now() + n * 86400000)) + ')';
  };
  return (
    <>
      <Stack.Screen options={{ title: t.titre }} />
      <ScrollView contentContainerStyle={styles.contenu} onLayout={(e) => setLargeur(Math.min(e.nativeEvent.layout.width, 760) - 32)}>
        {!r ? (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTxt}>{T2.sansDate}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/moi')}><Text style={styles.lien}>{T2.renseigner} →</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.bandeau}>
              <Text style={styles.bandeauTitre}>{t.bilan}</Text>
              <Text style={styles.bandeauTxt}>{t[r.bilan]}.</Text>
            </View>
            {r.etats.map((e, i) => (
              <View key={e.k} style={styles.ligne}>
                <View style={[styles.puce, { backgroundColor: e.col }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cycle}>{t.cycles[i]} <Text style={styles.muet}>{e.P} {t.jours}</Text></Text>
                  <Text style={styles.muet}>{e.monte ? t.montant : t.descendant} — {t.etat[e.cat]}</Text>
                </View>
                <Text style={[styles.valeur, { color: e.col }]}>{(e.v >= 0 ? '+' : '−') + Math.round(Math.abs(e.v) * 100)} %</Text>
              </View>
            ))}
            {largeur > 0 ? <View style={styles.graphe}><Graphe age={r.age} etats={r.etats} lang={langue} t={t} largeur={largeur} /></View> : null}
            <View style={styles.legende}>
              {CYCLES.map((c, i) => <Text key={c.k} style={styles.legendeItem}><Text style={{ color: c.col }}>●</Text> {t.cycles[i]}</Text>)}
            </View>
            <Text style={styles.note}>{t.legende}</Text>
            {r.etats.map((e, i) => (
              <Text key={e.k} style={styles.diag}><Text style={styles.gras}>{t.cycles[i]}</Text> — {t.diag[e.k][e.cat]}</Text>
            ))}
            <Text style={styles.sousTitre}>{t.prochains}</Text>
            {r.etats.map((e, i) => (
              <Text key={e.k} style={styles.diag}><Text style={styles.gras}>{t.cycles[i]}</Text> : {t.crit} {quand(e.kz)} · {t.pic} {quand(e.kp)}</Text>
            ))}
            <Text style={styles.note}>{fmt(t.vecu, Math.floor(r.age).toLocaleString(langue))} {t.rappel}</Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  bandeau: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, padding: 14, marginBottom: 14 },
  bandeauTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bandeauTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
  lien: { color: '#fff', textDecorationLine: 'underline', marginTop: 8, fontWeight: '600' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  puce: { width: 12, height: 12, borderRadius: 6 },
  cycle: { fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  muet: { color: COULEURS.texteMuet, fontSize: 13, fontWeight: '400' },
  valeur: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  graphe: { marginTop: 14 },
  legende: { flexDirection: 'row', gap: 14, marginTop: 6, flexWrap: 'wrap' },
  legendeItem: { color: COULEURS.texteMuet, fontSize: 13 },
  note: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 6, marginBottom: 10 },
  diag: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 6 },
  gras: { fontWeight: '700' },
  sousTitre: { fontSize: 17, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 12, marginBottom: 6 },
});
