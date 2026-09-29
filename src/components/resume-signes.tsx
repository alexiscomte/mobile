// Résumé « vos signes » : signe · signe chinois · ascendant (si connu) · forme du jour — même règle que le bandeau du site (espace.js).
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TEXTES2 } from '@/i18n2';
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
    <View style={styles.ligne}>
      <Pressable onPress={() => router.push('/horoscope')} accessibilityHint={T2.tipHoroscope}>
        <Text style={[styles.item, c]}>{TA.signes[r.s.soleil]} · {TA.chinois.animaux[r.s.chinois.animal]}{r.s.ascendant !== null ? ` · ${T2.ascendant.toLowerCase()} ${TA.signes[r.s.ascendant]}` : ''}</Text>
      </Pressable>
      {r.forme >= 0 ? (
        <Pressable onPress={() => router.push('/biorythme')} accessibilityHint={T2.tipBio}>
          <Text style={[styles.item, c]}>· {T2.forme} : {T2.niveaux[r.forme]}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  item: { fontSize: 15, textDecorationLine: 'underline', fontWeight: '600' },
  sombre: { color: COULEURS.primaire },
  clair: { color: '#fff' },
});
