// Astro : tous les outils d'astrologie du site — en natif quand l'écran existe, sinon la page du site.
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

type Outil = { cle: Cle; sf: string; route?: string; params?: Record<string, string> };
const OUTILS: Outil[] = [
  { cle: 'horoscope', sf: 'sparkles', route: '/horoscope' },
  { cle: 'signes', sf: 'sun.max.fill', route: '/signes' },
  { cle: 'themeAstral', sf: 'moon.stars.fill', route: '/theme' },
  { cle: 'compat', sf: 'heart.fill', route: '/compat' },
  { cle: 'biorythme', sf: 'waveform.path.ecg', route: '/biorythme' },
  { cle: 'signeChinois', sf: 'hare.fill', route: '/chinois' },
  { cle: 'vedique', sf: 'circle.hexagongrid.fill', route: '/autres', params: { mode: 'vedique' } },
  { cle: 'maya', sf: 'sun.haze.fill', route: '/autres', params: { mode: 'maya' } },
  { cle: 'lune', sf: 'moon.fill', route: '/lune' },
  { cle: 'amourSignes', sf: 'heart.text.square.fill' },
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
        {OUTILS.map(({ cle, sf, route, params }) => {
          const p = page(cle, langue);
          const aller = route
            ? () => router.push((params ? { pathname: route, params } : route) as never)
            : () => ouvrirCle(router, cle, langue);
          return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} onPress={aller} />;
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
