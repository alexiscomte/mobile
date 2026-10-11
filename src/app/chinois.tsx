// Quel est mon signe chinois ? natif : animal, élément, yin/yang, nouvel an, portrait, animaux compatibles (assets/js/chinois.js).
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Illustration } from '@/components/illustration';
import { TEXTES2 } from '@/i18n2';
import { CHINOIS } from '@/images';
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
    const tri = (C.trines.find((t) => t.includes(c.animal)) || []).filter((x) => x !== c.animal);
    return { c, ny, mo, tri, oppose: (c.animal + 6) % 12 };
  }, [profil, langue]); // eslint-disable-line react-hooks/exhaustive-deps
  const rep = (s: string, ...v: string[]) => v.reduce((a, x, i) => a.replace('%' + (i + 1), x), s);
  return (
    <>
      <Stack.Screen options={{ title: page('signeChinois', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {!r ? (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTxt}>{T2.sansDate}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/moi')}><Text style={styles.lien}>{T2.renseigner} →</Text></Pressable>
          </View>
        ) : (
          <>
            <Illustration image={CHINOIS[r.c.animal]} taille={220} style={styles.animal} alt={C.animaux[r.c.animal]} />
            <View style={styles.bandeau}>
              <Text style={styles.bandeauTxt}>{rep(String(U.chinois_res), C.animaux[r.c.animal], C.elements[r.c.element], r.c.yang ? U.yang : U.yin, String(r.c.year))}</Text>
            </View>
            <Text style={styles.texte}>{C.portraits[r.c.animal]} {C.elem_txt[r.c.element]}</Text>
            {r.mo <= 2 ? <Text style={styles.note}>{rep(String(U.nouvel_an), r.ny)}</Text> : null}
            <Text style={styles.sousTitre}>{U.compatibles}</Text>
            <View style={styles.rangee}>
              {r.tri.map((x) => (
                <View key={x} style={styles.vignette}>
                  <Illustration image={CHINOIS[x]} taille={84} alt={C.animaux[x]} />
                  <Text style={styles.vignetteTxt}>{C.animaux[x]}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.sousTitre}>{U.opposes}</Text>
            <View style={styles.rangee}>
              <View style={styles.vignette}>
                <Illustration image={CHINOIS[r.oppose]} taille={84} alt={C.animaux[r.oppose]} />
                <Text style={styles.vignetteTxt}>{C.animaux[r.oppose]}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/horoscope')} style={styles.boutonSec}><Text style={styles.boutonSecTxt}>{T2.lesDouze} →</Text></Pressable>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  bandeau: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, padding: 14, marginBottom: 14 },
  bandeauTxt: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 23 },
  lien: { color: '#fff', textDecorationLine: 'underline', marginTop: 8, fontWeight: '600' },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 10 },
  note: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 10 },
  gras: { fontWeight: '700' },
  animal: { alignSelf: 'center', marginBottom: 14 },
  sousTitre: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 6, marginBottom: 8 },
  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 10 },
  vignette: { alignItems: 'center', gap: 4 },
  vignetteTxt: { fontSize: 14, fontWeight: '600', color: COULEURS.texte },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
});
