// Tuiles et lignes de liste de l'application (couleurs du site, symbole SF sur iOS).
import { SymbolView, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FondTuile, Illustration } from '@/components/illustration';
import type { Img } from '@/images';
import { COULEURS } from '@/theme';

// image : photo de fond (src/images.ts, TUILES) sous un voile à la couleur de la tuile ; le texte se place alors en bas (tuile
// étroite) ou à gauche (tuile large), et le symbole laisse la place à la photo
type CarteProps = { titre: string; texte?: string; couleur: string; sf: string; onPress: () => void; large?: boolean; image?: Img };

export function Carte({ titre, texte, couleur, sf, onPress, large, image }: CarteProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texte ? titre + ', ' + texte : titre}
      style={({ pressed }) => [styles.carte, { backgroundColor: couleur }, large && styles.large, image ? (large ? styles.largeImage : styles.avecImage) : null, pressed && styles.pressee]}>
      {image ? <FondTuile image={image} couleur={couleur} horizontal={large} /> : (
        <SymbolView name={sf as SFSymbol} tintColor="#fff" size={26} fallback={<Text style={styles.puce}>◆</Text>} />
      )}
      <Text style={[styles.carteTitre, image && large ? styles.texteGauche : null]} numberOfLines={3}>{titre}</Text>
      {texte ? <Text style={[styles.carteTexte, image && large ? styles.texteGauche : null]} numberOfLines={3}>{texte}</Text> : null}
    </Pressable>
  );
}

type LigneProps = { titre: string; texte?: string; sf?: string; onPress: () => void; image?: Img };

export function Ligne({ titre, texte, sf, onPress, image }: LigneProps) {
  return (
    // VoiceOver lit « titre, texte, bouton » (le chevron décoratif est ignoré)
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={texte ? titre + ', ' + texte : titre} style={({ pressed }) => [styles.ligne, pressed && styles.pressee]}>
      {image ? <Illustration image={image} taille={52} /> : sf ? (
        <View style={styles.ligneIcone}>
          <SymbolView name={sf as SFSymbol} tintColor={COULEURS.primaire} size={22} fallback={<Text style={{ color: COULEURS.primaire }}>◆</Text>} />
        </View>
      ) : null}
      <View style={styles.ligneTextes}>
        <Text style={styles.ligneTitre}>{titre}</Text>
        {texte ? <Text style={styles.ligneTexte} numberOfLines={2}>{texte}</Text> : null}
      </View>
      <Text style={styles.chevron} importantForAccessibility="no" accessibilityElementsHidden>›</Text>
    </Pressable>
  );
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitre} accessibilityRole="header">{children}</Text>;
}

const styles = StyleSheet.create({
  carte: { width: '48%', minHeight: 132, borderRadius: 16, padding: 14, gap: 6, justifyContent: 'flex-start' },
  large: { width: '100%', minHeight: 110 },
  avecImage: { minHeight: 168, justifyContent: 'flex-end', overflow: 'hidden' },
  largeImage: { minHeight: 124, justifyContent: 'center', overflow: 'hidden' },
  texteGauche: { maxWidth: '64%' },
  pressee: { opacity: 0.7 },
  puce: { color: '#fff', fontSize: 20 },
  carteTitre: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  carteTexte: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 17 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  ligneIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: COULEURS.fondDoux, alignItems: 'center', justifyContent: 'center' },
  ligneTextes: { flex: 1, gap: 2 },
  ligneTitre: { fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  ligneTexte: { fontSize: 13, color: COULEURS.texteMuet, lineHeight: 17 },
  chevron: { fontSize: 24, color: COULEURS.texteMuet, marginLeft: 4 },
  sectionTitre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 10 },
});
