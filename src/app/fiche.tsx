// Écran générique natif (ticket #162, 26/10/2026) : une page DÉCRITE EN JSON (p/<langue>.json, outils/gen/app_manifeste.py) — titres,
// paragraphes (avec liens), listes, tableaux, images —, rendue avec les composants de l'appli. Ces pages se mettent à jour avec le
// contenu, sans nouvelle version : le JSON ne contient que du texte et des adresses, jamais de code. Paramètre : `cle` (À propos,
// Confidentialité, et plus tard les pages des dossiers). Sans page JSON (aperçu web sans contenu), la version en ligne s'ouvre.
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, F } from '@/components/form';
import { imageLocale } from '@/embarque';
import { TEXTES3 } from '@/i18n3';
import { surNouveauContenu } from '@/maj/depot';
import { pageJson, type PageJson, type Segment } from '@/maj/pages';
import { cheminDe } from '@/moteur/contenu';
import { ouvrir, ouvrirArticle } from '@/nav';
import { useProfil } from '@/profil';
import { SITE, url } from '@/site';
import { COULEURS } from '@/theme';

export default function Fiche() {
  const { cle } = useLocalSearchParams<{ cle: string }>();
  const { langue } = useProfil();
  const T3 = TEXTES3[langue];
  const router = useRouter();
  const [page, setPage] = useState<PageJson | null | undefined>(undefined);
  const [version, setVersion] = useState(0);
  useEffect(() => surNouveauContenu(() => setVersion((v) => v + 1)), []);
  useEffect(() => {
    let actif = true;
    pageJson(langue, cle || '').then((p) => { if (actif) setPage(p); }, () => { if (actif) setPage(null); });
    return () => { actif = false; };
  }, [langue, cle, version]);

  const suivre = (u: string, texte: string) => {
    const chemin = cheminDe(u);
    if (chemin) ouvrirArticle(router, chemin + (u.includes('#') ? u.slice(u.indexOf('#')) : ''));
    else if (u.startsWith(SITE)) ouvrir(router, u, texte);
    else if (/^(https?:|mailto:|tel:)/.test(u)) Linking.openURL(u).catch(() => undefined);
  };
  const segments = (s: Segment[], cle2: string) => s.map((x, i) => x.u
    ? <Text key={cle2 + i} style={styles.lien} accessibilityRole="link" onPress={() => suivre(x.u as string, x.texte)}>{x.texte}</Text>
    : <Text key={cle2 + i}>{x.texte}</Text>);

  if (page === null) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={F.contenu}><Text style={F.texte}>{T3.introuvable}</Text></View>
      </>
    );
  }
  if (!page) return <Stack.Screen options={{ title: '' }} />;
  return (
    <>
      <Stack.Screen options={{ title: page.titre }} />
      <ScrollView contentContainerStyle={F.contenu}>
        <Text style={styles.h1} accessibilityRole="header">{page.titre}</Text>
        {page.lead ? <Text style={styles.lead}>{page.lead}</Text> : null}
        {page.blocs.map((b, i) => {
          const k = 'b' + i;
          switch (b.type) {
            case 'titre':
              return <Text key={k} style={b.niveau <= 2 ? styles.h2 : styles.h3} accessibilityRole="header">{b.texte}</Text>;
            case 'paragraphe':
              return <Text key={k} style={styles.p}>{segments(b.segments || [], k)}</Text>;
            case 'liste':
              return (
                <View key={k} style={styles.liste}>
                  {(b.elements || []).map((e, j) => (
                    <View key={k + j} style={styles.element}>
                      <Text style={styles.puce} importantForAccessibility="no">{b.ordonnee ? (j + 1) + '.' : '•'}</Text>
                      <Text style={[styles.p, styles.flex]}>{segments(e, k + j)}</Text>
                    </View>
                  ))}
                </View>
              );
            case 'tableau':
              // tableau étroit (deux ou trois colonnes au plus, comme les pages du site) : une carte par ligne, l'en-tête devant chaque cellule
              return (
                <View key={k} style={styles.tableau}>
                  {(b.lignes || []).map((l, j) => (
                    <View key={k + j} style={styles.rangee}>
                      {l.map((c, n) => (
                        <Text key={n} style={n === 0 ? styles.celluleTete : styles.cellule}>
                          {b.entetes && b.entetes[n] && n > 0 ? <Text style={styles.entete}>{b.entetes[n] + ' : '}</Text> : null}{c}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            case 'image':
              return (
                <View key={k} style={styles.figure}>
                  <Image source={{ uri: imageLocale(b.src) }} style={[styles.image, { aspectRatio: b.ratio || 1.5 }]} contentFit="cover"
                    accessibilityLabel={b.alt} accessible={!!b.alt} />
                  {b.legende ? <Text style={F.muet}>{b.legende}</Text> : null}
                </View>
              );
            default:
              return null;      // type inconnu (page prévue pour une version plus récente) : ignoré
          }
        })}
        {page.maj ? <Text style={[F.muet, styles.maj]}>{page.maj}</Text> : null}
        <View style={styles.bouton}><Bouton titre={T3.enLigne} secondaire onPress={() => ouvrir(router, url(page.u), page.titre)} /></View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  h1: { color: COULEURS.primaireFonce, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  lead: { color: COULEURS.texte, fontSize: 17, lineHeight: 24, marginBottom: 8 },
  h2: { color: COULEURS.primaireFonce, fontSize: 20, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  h3: { color: COULEURS.primaire, fontSize: 17, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  p: { color: COULEURS.texte, fontSize: 16, lineHeight: 24, marginBottom: 8 },
  lien: { color: COULEURS.secondaire, textDecorationLine: 'underline' },
  liste: { marginBottom: 8 },
  element: { flexDirection: 'row', gap: 8 },
  puce: { color: COULEURS.primaire, fontSize: 16, lineHeight: 24, minWidth: 16 },
  flex: { flex: 1 },
  tableau: { borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  rangee: { padding: 10, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure, backgroundColor: COULEURS.fondMuet },
  celluleTete: { color: COULEURS.primaireFonce, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  cellule: { color: COULEURS.texte, fontSize: 15, lineHeight: 21 },
  entete: { fontWeight: '600', color: COULEURS.texteMuet },
  figure: { marginVertical: 8, gap: 4 },
  image: { width: '100%', borderRadius: 12, backgroundColor: COULEURS.fondDoux },
  maj: { marginTop: 12 },
  bouton: { marginTop: 16 },
});
