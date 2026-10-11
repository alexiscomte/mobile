// Mes favoris (espace membre, 07/10/2026), comme la page « Mes favoris » du site (espace.js rendreFavoris) : les pages aimées d'un
// toucher sur le pouce (en haut des articles, components/pouce.tsx ; sur le site, en tête du fil d'Ariane depuis le 09/10/2026 ; l'étoile
// a disparu le 07/10 au soir), de la plus récente à la plus ancienne ; lecture dans l'écran article, retrait, liste vidée.
// Synchronisés avec le compte.
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, F } from '@/components/form';
import { TEXTES } from '@/i18n';
import ui from '@/moteur/ui.json';
import { ouvrir } from '@/nav';
import { useProfil, type Favori } from '@/profil';
import { url } from '@/site';
import { COULEURS } from '@/theme';

const UI_E = (ui as unknown as { espace: Record<string, Record<string, string>> }).espace;
const UI_C = (ui as unknown as { compte: Record<string, Record<string, string>> }).compte;

function dateCourte(iso: string | undefined, lg: string): string {
  if (!iso) return '';
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(lg, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return iso; }
}

export default function Favoris() {
  const { langue, favoris, setFavoris } = useProfil();
  const T = TEXTES[langue], E = UI_E[langue] || UI_E.fr;
  const router = useRouter();
  // favori = chemin du site (« /fr/….html ») : lu dans l'écran article ; un dossier (« /fr/ ») s'ouvre dans la vue web
  const lire = (f: Favori) => {
    const rel = f.url.replace(/^\//, '');
    if (rel && !rel.endsWith('/')) router.push({ pathname: '/article', params: { u: rel } });
    else ouvrir(router, url(rel), f.titre);
  };
  return (
    <>
      <Stack.Screen options={{ title: E.ongFavoris }} />
      <ScrollView contentContainerStyle={F.contenu}>
        <Text style={F.texte}>{E.favIntro}</Text>
        {favoris.length ? favoris.map((f) => (
          <View key={f.url} style={styles.ligne}>
            <Pressable style={({ pressed }) => [styles.lien, pressed && F.presse]} onPress={() => lire(f)} accessibilityRole="link">
              <Text style={styles.titre}>{f.titre || f.url}</Text>
              <Text style={styles.meta}>{(f.lang || '').toUpperCase()}{f.date ? ' · ' + dateCourte(f.date, langue) : ''}</Text>
            </Pressable>
            <Pressable onPress={() => setFavoris(favoris.filter((x) => x.url !== f.url))} hitSlop={10} accessibilityRole="button" accessibilityLabel={E.supprimer}>
              <Text style={styles.retirer}>×</Text>
            </Pressable>
          </View>
        )) : <Text style={[F.muet, styles.vide]}>{T.aucunFavori}</Text>}
        {/* vider la liste : action destructive, confirmée par une alerte « Annuler / Vider » sur l'iPhone (recommandation d'Apple) */}
        {favoris.length ? <Bouton titre={E.vider} secondaire onPress={() => {
          if (Platform.OS === 'web') { setFavoris([]); return; }
          Alert.alert(E.vider, '', [{ text: (UI_C[langue] || UI_C.fr).annuler, style: 'cancel' }, { text: E.vider, style: 'destructive', onPress: () => { setFavoris([]); } }]);
        }} /> : null}
        <Text style={[F.muet, styles.note]}>{E.note}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  lien: { flex: 1 },
  titre: { color: COULEURS.secondaire, fontSize: 16, fontWeight: '600' },
  meta: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 2 },
  retirer: { color: COULEURS.texteMuet, fontSize: 26, lineHeight: 28, paddingHorizontal: 6 },
  vide: { marginTop: 12 },
  note: { marginTop: 18 },
});
