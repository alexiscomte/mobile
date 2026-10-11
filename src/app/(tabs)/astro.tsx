// Astro : tous les outils d'astrologie du site — en natif quand l'écran existe, sinon la page du site.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne } from '@/components/carte';
import { TEXTES } from '@/i18n';
import { CHINOIS, TUILES, VIGNETTES, ZODIAQUE, type Img } from '@/images';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, type Cle } from '@/site';
import { COULEURS } from '@/theme';

type Outil = { cle: Cle; sf: string; route?: string; params?: Record<string, string>; image?: Img };
const OUTILS: Outil[] = [
  { cle: 'horoscope', sf: 'sparkles', route: '/horoscope', image: TUILES.horoscope },
  { cle: 'signes', sf: 'sun.max.fill', route: '/signes', image: ZODIAQUE[4] },
  { cle: 'themeAstral', sf: 'moon.stars.fill', route: '/theme', image: TUILES.theme },
  { cle: 'compat', sf: 'heart.fill', route: '/compat', image: TUILES.compat },
  { cle: 'biorythme', sf: 'waveform.path.ecg', route: '/biorythme', image: TUILES.biorythme },
  { cle: 'signeChinois', sf: 'hare.fill', route: '/chinois', image: CHINOIS[4] },
  { cle: 'vedique', sf: 'circle.hexagongrid.fill', route: '/autres', params: { mode: 'vedique' }, image: VIGNETTES.vedique },
  { cle: 'maya', sf: 'sun.haze.fill', route: '/autres', params: { mode: 'maya' }, image: VIGNETTES.maya },
  { cle: 'lune', sf: 'moon.fill', route: '/lune', image: VIGNETTES.lune },
  { cle: 'amourSignes', sf: 'heart.text.square.fill', image: VIGNETTES['amour-signes'] },
  { cle: 'tarot', sf: 'rectangle.portrait.on.rectangle.portrait.fill', image: VIGNETTES.tarot },
  { cle: 'astrologie', sf: 'book.fill', image: VIGNETTES.astrologie },
];

export default function Astro() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre} accessibilityRole="header">{T.astroTitre}</Text>
        <Text style={styles.intro}>{T.astroIntro}</Text>
        {OUTILS.map(({ cle, sf, route, params, image }) => {
          const p = page(cle, langue);
          const aller = route
            ? () => router.push((params ? { pathname: route, params } : route) as never)
            : () => ouvrirCle(router, cle, langue);
          return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} image={image} onPress={aller} />;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 110 },
  titre: { fontSize: 34, lineHeight: 41, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 10 },
});
