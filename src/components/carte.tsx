// Tuiles et lignes de liste de l'application (couleurs du site, symbole SF sur iOS).
import { SymbolView, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COULEURS } from '@/theme';

type CarteProps = { titre: string; texte?: string; couleur: string; sf: string; onPress: () => void; large?: boolean };

export function Carte({ titre, texte, couleur, sf, onPress, large }: CarteProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.carte, { backgroundColor: couleur }, large && styles.large, pressed && styles.pressee]}>
      <SymbolView name={sf as SFSymbol} tintColor="#fff" size={26} fallback={<Text style={styles.puce}>◆</Text>} />
      <Text style={styles.carteTitre} numberOfLines={3}>{titre}</Text>
      {texte ? <Text style={styles.carteTexte} numberOfLines={3}>{texte}</Text> : null}
    </Pressable>
  );
}

type LigneProps = { titre: string; texte?: string; sf?: string; onPress: () => void };

export function Ligne({ titre, texte, sf, onPress }: LigneProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.ligne, pressed && styles.pressee]}>
      {sf ? (
        <View style={styles.ligneIcone}>
          <SymbolView name={sf as SFSymbol} tintColor={COULEURS.primaire} size={22} fallback={<Text style={{ color: COULEURS.primaire }}>◆</Text>} />
        </View>
      ) : null}
      <View style={styles.ligneTextes}>
        <Text style={styles.ligneTitre}>{titre}</Text>
        {texte ? <Text style={styles.ligneTexte} numberOfLines={2}>{texte}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitre}>{children}</Text>;
}

const styles = StyleSheet.create({
  carte: { width: '48%', minHeight: 132, borderRadius: 16, padding: 14, gap: 6, justifyContent: 'flex-start' },
  large: { width: '100%', minHeight: 110 },
  pressee: { opacity: 0.8 },
  puce: { color: '#fff', fontSize: 20 },
  carteTitre: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  carteTexte: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 17 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  ligneIcone: { width: 36, height: 36, borderRadius: 10, backgroundColor: COULEURS.fondDoux, alignItems: 'center', justifyContent: 'center' },
  ligneTextes: { flex: 1, gap: 2 },
  ligneTitre: { fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  ligneTexte: { fontSize: 13, color: COULEURS.texteMuet, lineHeight: 17 },
  chevron: { fontSize: 24, color: COULEURS.texteMuet, marginLeft: 4 },
  sectionTitre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 10 },
});
