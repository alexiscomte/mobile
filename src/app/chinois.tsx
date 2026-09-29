// Quel est mon signe chinois ? natif : animal, élément, yin/yang, nouvel an, portrait, animaux compatibles (assets/js/chinois.js).
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TEXTES2 } from '@/i18n2';
import { ASTRO } from '@/moteur/astro';
import { textes } from '@/moteur/horoscope';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

export default function Chinois() {
  const { langue, profil } = useProfil();
  const T = textes(langue), U = T.ui, C = T.chinois, T2 = TEXTES2[langue];
  const router = useRouter();
  const r = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profil.naissance || '');
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const c = ASTRO.chinese(y, mo, d);
    const ny = ASTRO.jdToDate(ASTRO.chineseNewYear(y) + 0.5).toLocaleDateString(langue, { day: 'numeric', month: 'long', year: 'numeric' });
    const tri = (C.trines.find((t) => t.includes(c.animal)) || []).filter((x) => x !== c.animal).map((x) => C.animaux[x]);
    return { c, ny, mo, tri, oppose: C.animaux[(c.animal + 6) % 12] };
  }, [profil, langue]); // eslint-disable-line react-hooks/exhaustive-deps
  const rep = (s: string, ...v: string[]) => v.reduce((a, x, i) => a.replace('%' + (i + 1), x), s);
  return (
    <>
      <Stack.Screen options={{ title: page('signeChinois', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {!r ? (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTxt}>{T2.sansDate}</Text>
            <Pressable onPress={() => router.push('/(tabs)/moi')}><Text style={styles.lien}>{T2.renseigner} →</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.bandeau}>
              <Text style={styles.bandeauTxt}>{rep(String(U.chinois_res), C.animaux[r.c.animal], C.elements[r.c.element], r.c.yang ? U.yang : U.yin, String(r.c.year))}</Text>
            </View>
            <Text style={styles.texte}>{C.portraits[r.c.animal]} {C.elem_txt[r.c.element]}</Text>
            {r.mo <= 2 ? <Text style={styles.note}>{rep(String(U.nouvel_an), r.ny)}</Text> : null}
            <Text style={styles.texte}><Text style={styles.gras}>{U.compatibles}</Text> : {r.tri.join(', ')}. <Text style={styles.gras}>{U.opposes}</Text> : {r.oppose}.</Text>
            <Pressable onPress={() => router.push('/horoscope')} style={styles.boutonSec}><Text style={styles.boutonSecTxt}>{T2.lesDouze} →</Text></Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  bandeau: { backgroundColor: COULEURS.primaire, borderRadius: 12, padding: 14, marginBottom: 14 },
  bandeauTxt: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 23 },
  lien: { color: '#fff', textDecorationLine: 'underline', marginTop: 8, fontWeight: '600' },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 10 },
  note: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 10 },
  gras: { fontWeight: '700' },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
});
