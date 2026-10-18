// Résumé « vos signes » : signe · signe chinois · ascendant (si connu) · forme du jour — même règle que le bandeau du site (espace.js).
// Depuis le 06/10/2026, deux médaillons (signe du zodiaque, animal chinois, images IA de src/images.ts) ouvrent la ligne.
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Illustration } from '@/components/illustration';
import { TEXTES2 } from '@/i18n2';
import { CHINOIS, ZODIAQUE } from '@/images';
import { biorythmes } from '@/moteur/biorythme';
import { signesDe, textes } from '@/moteur/horoscope';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

const NIVEAU = { bonne: 0, moyenne: 1, dure: 2, critique: 3 } as const;

export function ResumeSignes({ clair }: { clair?: boolean }) {
  const { langue, profil } = useProfil();
  const T2 = TEXTES2[langue], TA = textes(langue);
  const router = useRouter();
  const r = useMemo(() => {
    if (!profil.naissance) return null;
    const l = profil.naissance_lieu;
    const s = signesDe(profil.naissance, profil.heure, l ? l.lat : null, l ? l.lon : null);
    const b = biorythmes(profil.naissance, profil.heure);
    return s ? { s, forme: b ? NIVEAU[b.bilan] : -1 } : null;
  }, [profil]);
  if (!r) return null;
  const c = clair ? styles.clair : styles.sombre;
  return (
    <View style={styles.bloc}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/horoscope')} accessibilityHint={T2.tipHoroscope} style={styles.medaillons}>
        <Illustration image={ZODIAQUE[r.s.soleil]} taille={44} rond alt={TA.signes[r.s.soleil]} />
        <Illustration image={CHINOIS[r.s.chinois.animal]} taille={44} rond style={styles.second} alt={TA.chinois.animaux[r.s.chinois.animal]} />
      </Pressable>
      <View style={styles.ligne}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/horoscope')} accessibilityHint={T2.tipHoroscope} style={styles.lien}>
          <Text style={[styles.item, c]}>{TA.signes[r.s.soleil]} · {TA.chinois.animaux[r.s.chinois.animal]}{r.s.ascendant !== null ? ` · ${T2.ascendant.toLowerCase()} ${TA.signes[r.s.ascendant]}` : ''}</Text>
        </Pressable>
        {r.forme >= 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/biorythme')} accessibilityHint={T2.tipBio} style={styles.lien}>
            <Text style={[styles.item, c]}>· {T2.forme} : {T2.niveaux[r.forme]}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medaillons: { flexDirection: 'row', alignItems: 'center' },
  second: { marginLeft: -10, borderWidth: 2, borderColor: COULEURS.fondDoux },
  ligne: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  lien: { minHeight: 44, minWidth: 44, maxWidth: '100%', justifyContent: 'center' },
  item: { fontSize: 15, textDecorationLine: 'underline', fontWeight: '600' },
  sombre: { color: COULEURS.primaire },
  clair: { color: '#fff' },
});
