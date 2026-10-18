// Jeux : jouer à deux, question du jour, sondages (et « Mes sondages »), quiz et tests.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carte, Ligne, Titre } from '@/components/carte';
import { useTabTopClearance } from '@/hooks/use-tab-top-clearance';
import { TEXTES } from '@/i18n';
import { TEXTES4 } from '@/i18n4';
import { TUILES, VIGNETTES, type Img } from '@/images';
import { questionDuJour, sondageDuJour } from '@/moteur/qdj';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, type Cle } from '@/site';
import { COULEURS, DEGRADES } from '@/theme';

const AUTRES: { cle: Cle; sf: string; image?: Img }[] = [
  { cle: 'tests', sf: 'checkmark.circle.fill', image: VIGNETTES.tests },
  { cle: 'scores', sf: 'trophy.fill', image: VIGNETTES.scores },
  { cle: 'attachement', sf: 'link', image: VIGNETTES.attachement },
  { cle: 'coupleSolide', sf: 'shield.checkered', image: VIGNETTES['couple-solide'] },
  { cle: 'compteur', sf: 'calendar', image: VIGNETTES.compteur },
  { cle: 'quiz', sf: 'square.grid.2x2.fill', image: VIGNETTES.quiz },
  { cle: 'jeux', sf: 'gamecontroller.fill', image: VIGNETTES.jeux },
];

export default function Jeux() {
  const paddingTop = useTabTopClearance();
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const T4 = TEXTES4[langue];
  const router = useRouter();
  const go = (cle: Cle) => () => ouvrirCle(router, cle, langue);
  const sondage = sondageDuJour(langue);
  return (
    <SafeAreaView style={[styles.fond, { paddingTop }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre} accessibilityRole="header">{T.jeuxTitre}</Text>
        <Text style={styles.intro}>{T.jeuxIntro}</Text>
        <View style={styles.grille}>
          <Carte large titre={page('jeu2', langue).t} texte={T.jeu2Txt} couleur={DEGRADES.jeux[0]} sf="person.2.fill" image={TUILES.jeu2} onPress={() => router.push('/jeu2')} />
          <Carte titre={page('qdj', langue).t} texte={questionDuJour(langue)} couleur={DEGRADES.compat[0]} sf="bubble.left.and.bubble.right.fill" image={TUILES.qdj} onPress={() => router.push('/qdj')} />
          <Carte titre={page('sondages', langue).t} texte={sondage ? sondage.q[langue] || sondage.q.fr : T.sondagesTxt} couleur={DEGRADES.sexualite[0]} sf="chart.bar.fill" image={TUILES.sondages} onPress={() => router.push('/sondages')} />
        </View>
        <Ligne titre={T4.mesSondages} texte={T4.mesSondagesTxt} sf="chart.bar.fill" image={VIGNETTES['mes-sondages']} onPress={() => router.push({ pathname: '/sondages', params: { mes: '1' } })} />
        <Titre>{page('quiz', langue).t}</Titre>
        {AUTRES.map(({ cle, sf, image }) => {
          const p = page(cle, langue);
          const natif = cle === 'tests' || cle === 'scores' || cle === 'quiz' ? () => router.push('/quiz') : cle === 'compteur' ? () => router.push('/compteur') : go(cle);
          return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} image={image} onPress={natif} />;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 110 },
  titre: { fontSize: 34, lineHeight: 41, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 14 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
