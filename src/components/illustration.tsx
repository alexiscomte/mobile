// Images de l'application : illustrations IA embarquées (src/images.ts, générées par outils/gen/app_images.py) et images
// servies par le site (photos des articles, vignettes des questions), gardées en cache sur l'appareil par expo-image.
import { Image, type ImageSource } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Img } from '@/images';
import { COULEURS } from '@/theme';

type Source = Img | string | null;
const source = (s: Source): ImageSource | number | null => (typeof s === 'string' ? { uri: s } : s || null);

/** Illustration carrée aux coins arrondis (signe, animal…). Rien si l'image manque. */
export function Illustration({ image, taille = 96, rond, style, alt }: { image: Source; taille?: number; rond?: boolean; style?: StyleProp<ViewStyle>; alt?: string }) {
  const src = source(image);
  if (!src) return null;
  return (
    <View style={[{ width: taille, height: taille, borderRadius: rond ? taille / 2 : Math.round(taille * 0.18) }, styles.cadre, style]}>
      <Image source={src} style={styles.plein} contentFit="cover" transition={150} accessibilityLabel={alt} accessible={!!alt} />
    </View>
  );
}

/** Image en bandeau sur toute la largeur (rapport largeur / hauteur donné). Une image distante qui ne charge pas disparaît. */
export function Banniere({ image, ratio = 2.33, style, alt }: { image: Source; ratio?: number; style?: StyleProp<ViewStyle>; alt?: string }) {
  const [echec, setEchec] = useState(false);
  const src = source(image);
  if (!src || echec) return null;
  return (
    <View style={[styles.banniere, { aspectRatio: ratio }, style]}>
      <Image source={src} style={styles.plein} contentFit="cover" transition={200} cachePolicy="disk" onError={() => setEchec(true)} accessibilityLabel={alt} accessible={!!alt} />
    </View>
  );
}

/** Fond de tuile : la photo, puis un voile dégradé à la couleur de la tuile pour garder le texte lisible. */
export function FondTuile({ image, couleur, horizontal }: { image: Source; couleur: string; horizontal?: boolean }) {
  const src = source(image);
  if (!src) return null;
  return (
    <View style={styles.fond} pointerEvents="none">
      <Image source={src} style={styles.plein} contentFit="cover" contentPosition={horizontal ? 'right' : 'top'} />
      <Svg style={styles.plein} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {horizontal ? (
            <LinearGradient id="voile" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={couleur} stopOpacity={0.96} />
              <Stop offset="0.5" stopColor={couleur} stopOpacity={0.82} />
              <Stop offset="1" stopColor={couleur} stopOpacity={0.08} />
            </LinearGradient>
          ) : (
            <LinearGradient id="voile" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={couleur} stopOpacity={0.05} />
              <Stop offset="0.42" stopColor={couleur} stopOpacity={0.55} />
              <Stop offset="0.72" stopColor={couleur} stopOpacity={0.94} />
              <Stop offset="1" stopColor={couleur} stopOpacity={0.98} />
            </LinearGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile)" />
      </Svg>
    </View>
  );
}

const PLEIN = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
const styles = StyleSheet.create({
  cadre: { overflow: 'hidden', backgroundColor: COULEURS.fondDoux },
  plein: PLEIN,
  banniere: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: COULEURS.fondDoux, marginBottom: 12 },
  fond: { ...PLEIN, borderRadius: 16, overflow: 'hidden' },
});
