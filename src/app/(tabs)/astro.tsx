// Astro : tous les outils d'astrologie du site.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne } from '@/components/carte';
import { TEXTES } from '@/i18n';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, type Cle } from '@/site';
import { COULEURS } from '@/theme';

const OUTILS: { cle: Cle; sf: string }[] = [
  { cle: 'horoscope', sf: 'sparkles' },
  { cle: 'themeAstral', sf: 'moon.stars.fill' },
  { cle: 'compat', sf: 'heart.fill' },
  { cle: 'biorythme', sf: 'waveform.path.ecg' },
  { cle: 'signeChinois', sf: 'hare.fill' },
  { cle: 'amourSignes', sf: 'heart.text.square.fill' },
  { cle: 'lune', sf: 'moon.fill' },
  { cle: 'tarot', sf: 'rectangle.portrait.on.rectangle.portrait.fill' },
  { cle: 'astrologie', sf: 'book.fill' },
];

export default function Astro() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>{T.astroTitre}</Text>
        <Text style={styles.intro}>{T.astroIntro}</Text>
        {OUTILS.map(({ cle, sf }) => {
          const p = page(cle, langue);
          const natifs: Partial<Record<Cle, string>> = { horoscope: '/horoscope', biorythme: '/biorythme', themeAstral: '/theme', signeChinois: '/chinois', lune: '/lune' };
          const route = natifs[cle];
          const natif = route ? () => router.push(route as never) : () => ouvrirCle(router, cle, langue);
          return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} onPress={natif} />;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 16, paddingBottom: 110 },
  titre: { fontSize: 28, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 10 },
});
