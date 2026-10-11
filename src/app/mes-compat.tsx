// Mes tests de compatibilité (06/10/2026) : la page du site (mes_compat.js), en natif. Tests enregistrés sous le résultat du test
// (compat.tsx), clé AsyncStorage « ap.compat » synchronisée avec le compte : les deux personnes et leurs signes en images, l'indice,
// le score de chaque lecture, « Voir le détail » (le test se recalcule : compat.tsx?id=…), suppression, tri par date ou par indice.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, F, Note, Puce } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { supprimerTest, testsVisibles, type TestCompat } from '@/compat_tests';
import { pousser, surCompte } from '@/compte';
import { CHINOIS, ZODIAQUE } from '@/images';
import { textes as textesAstro } from '@/moteur/horoscope';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type TextesMC = Record<string, string> & { lect: Record<string, string> };
const UI_T = (ui as unknown as { mesCompat: Record<string, TextesMC> }).mesCompat;
const UI_P = (ui as unknown as { mesCompatPage: Record<string, { h1: string; lead: string }> }).mesCompatPage;
const ORDRE = ['zod', 'syn', 'chin', 'ved', 'bio', 'nom', 'vie'];
const K_TRI = 'ap.compat.tri';
const fmt = (s: string, ...v: (string | number)[]) => { let i = 0; return s.replace(/%s/g, () => String(v[i++] ?? '')); };

export default function MesCompat() {
  const { langue, compte } = useProfil();
  const t = UI_T[langue] || UI_T.fr, P = UI_P[langue] || UI_P.fr, TA = textesAstro(langue);
  const router = useRouter();
  const [tests, setTests] = useState<TestCompat[]>([]);
  const [tri, setTri] = useState<'date' | 'score'>('date');

  const charger = useCallback(() => { testsVisibles().then(setTests).catch(() => undefined); }, []);
  useFocusEffect(charger);
  useEffect(() => surCompte((e) => { if (e === 'donnees') charger(); }), [charger]);
  useEffect(() => { AsyncStorage.getItem(K_TRI).then((v) => { if (v === 'score') setTri('score'); }).catch(() => undefined); }, []);
  const changerTri = (v: 'date' | 'score') => { setTri(v); AsyncStorage.setItem(K_TRI, v).catch(() => undefined); };

  const date = (iso?: string, utc?: boolean) => {
    if (!iso) return '';
    const x = new Date(utc ? iso + 'T00:00:00Z' : iso); if (isNaN(x.getTime())) return iso;
    try {
      const s = x.toLocaleDateString(langue, { day: 'numeric', month: 'long', year: 'numeric', ...(utc ? { timeZone: 'UTC' } : {}) });
      return langue === 'fr' ? s.replace(/^1 /, '1er ') : s;
    } catch { return iso.slice(0, 10); }
  };
  const supprimer = (id: string) => {
    const faire = async () => { await supprimerTest(id); pousser(); charger(); };
    if (Platform.OS === 'web') { faire(); return; }
    Alert.alert(t.suppr, t.confirm, [{ text: '×', style: 'cancel' }, { text: t.suppr, style: 'destructive', onPress: () => { faire(); } }]);
  };

  const liste = [...tests].sort((p, q) => tri === 'score'
    ? (typeof q.s === 'number' ? q.s : -1) - (typeof p.s === 'number' ? p.s : -1)
    : String(q.m || '').localeCompare(String(p.m || '')));

  const personne = (x: TestCompat, i: 1 | 2) => {
    const p = i === 1 ? x.p1 : x.p2, z = x.z ? x.z[i - 1] : null, c = x.c ? x.c[i - 1] : null;
    const noms = [typeof z === 'number' ? TA.signes[z] : '', typeof c === 'number' ? TA.chinois.animaux[c] : ''].filter(Boolean);
    return (
      <View style={styles.personne}>
        <View style={styles.paire}>
          {typeof z === 'number' ? <Illustration image={ZODIAQUE[z]} taille={48} alt={TA.signes[z]} /> : null}
          {typeof c === 'number' ? <Illustration image={CHINOIS[c]} taille={48} alt={TA.chinois.animaux[c]} /> : null}
        </View>
        <Text style={styles.nom} numberOfLines={1}>{p?.n || (i === 1 ? t.p1 : t.p2)}</Text>
        {noms.length ? <Text style={styles.signes} numberOfLines={2}>{noms.join(' · ')}</Text> : null}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: P.h1 }} />
      <ScrollView contentContainerStyle={F.contenu}>
        <Text style={F.texte}>{P.lead}</Text>
        <Note>{compte ? t.avecCompte : t.horsCompte}</Note>
        {!liste.length ? (
          <>
            <Text style={F.texte}>{t.vide}</Text>
            <Bouton titre={t.faire} onPress={() => router.push('/compat')} />
          </>
        ) : (
          <>
            <Text style={styles.nb}>{liste.length === 1 ? t.un : fmt(t.n, liste.length)}</Text>
            <View style={styles.tri}>
              <Text style={styles.triTxt}>{t.tri}</Text>
              <Puce titre={t.recents} actif={tri === 'date'} onPress={() => changerTri('date')} />
              <Puce titre={t.score} actif={tri === 'score'} onPress={() => changerTri('score')} />
            </View>
            {liste.map((x) => (
              <View key={x.id} style={styles.carte}>
                <View style={styles.duo}>
                  {personne(x, 1)}
                  <Text style={styles.coeur}>♥</Text>
                  {personne(x, 2)}
                </View>
                {typeof x.s === 'number' ? (
                  <>
                    <View style={styles.indice}><Text style={styles.indiceTxt}>{t.indice}</Text><Text style={styles.pc}>{x.s} %</Text></View>
                    <View style={styles.jauge}><View style={[styles.jaugeBarre, { width: `${Math.max(0, Math.min(100, x.s))}%` as const }]} /></View>
                  </>
                ) : <Text style={styles.indiceTxt}>{t.sansIndice}</Text>}
                <View style={styles.lect}>
                  {ORDRE.filter((k) => x.r && typeof x.r[k] === 'number').map((k) => (
                    <Text key={k} style={styles.lectTxt}>{t.lect[k]} <Text style={styles.gras}>{x.r?.[k]}</Text></Text>
                  ))}
                </View>
                <Text style={styles.meta}>
                  {x.p1?.d && x.p2?.d ? fmt(t.dates, date(x.p1.d, true), date(x.p2.d, true)) + ' · ' : ''}{fmt(t.le, date(x.m))}
                </Text>
                <Bouton titre={t.detail} onPress={() => router.push({ pathname: '/compat', params: { id: x.id } })} />
                <Bouton titre={t.suppr} onPress={() => supprimer(x.id)} secondaire />
              </View>
            ))}
            <Bouton titre={t.faire} onPress={() => router.push('/compat')} secondaire />
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  nb: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 8 },
  tri: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginVertical: 8 },
  triTxt: { color: COULEURS.texteMuet, marginRight: 2 },
  carte: { borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 14, padding: 12, marginBottom: 12, backgroundColor: COULEURS.fond },
  duo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 10 },
  personne: { flex: 1, alignItems: 'center', gap: 3 },
  paire: { flexDirection: 'row', gap: 4 },
  nom: { fontSize: 15, fontWeight: '700', color: COULEURS.primaireFonce },
  signes: { fontSize: 12, color: COULEURS.texteMuet, textAlign: 'center' },
  coeur: { fontSize: 22, color: COULEURS.coeur, marginHorizontal: 4 },
  indice: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 },
  indiceTxt: { color: COULEURS.texte, marginTop: 10 },
  pc: { fontSize: 26, fontWeight: '800', color: COULEURS.primaire },
  jauge: { height: 8, borderRadius: 4, backgroundColor: COULEURS.fondDoux, overflow: 'hidden', marginTop: 4 },
  jaugeBarre: { height: 8, backgroundColor: COULEURS.primairePlein },
  lect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  lectTxt: { fontSize: 12, color: COULEURS.texte, borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  gras: { fontWeight: '700' },
  meta: { fontSize: 12, color: COULEURS.texteMuet, marginTop: 8 },
});
