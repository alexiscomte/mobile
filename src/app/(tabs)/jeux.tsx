// Jeux : jouer à deux, question du jour, sondages, quiz et tests.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carte, Ligne, Titre } from '@/components/carte';
import { TEXTES } from '@/i18n';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, type Cle } from '@/site';
import { COULEURS, DEGRADES } from '@/theme';

const AUTRES: { cle: Cle; sf: string }[] = [
  { cle: 'tests', sf: 'checkmark.circle.fill' },
  { cle: 'scores', sf: 'trophy.fill' },
  { cle: 'attachement', sf: 'link' },
  { cle: 'coupleSolide', sf: 'shield.checkered' },
  { cle: 'compteur', sf: 'calendar' },
  { cle: 'quiz', sf: 'square.grid.2x2.fill' },
  { cle: 'jeux', sf: 'gamecontroller.fill' },
];

export default function Jeux() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  const go = (cle: Cle) => () => ouvrirCle(router, cle, langue);
  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>{T.jeuxTitre}</Text>
        <Text style={styles.intro}>{T.jeuxIntro}</Text>
        <View style={styles.grille}>
          <Carte large titre={page('jeu2', langue).t} texte={T.jeu2Txt} couleur={DEGRADES.jeux[0]} sf="person.2.fill" onPress={() => router.push('/jeu2')} />
          <Carte titre={page('qdj', langue).t} texte={T.questionDuJourTxt} couleur={DEGRADES.compat[0]} sf="bubble.left.and.bubble.right.fill" onPress={() => router.push('/qdj')} />
          <Carte titre={page('sondages', langue).t} texte={T.sondagesTxt} couleur={DEGRADES.sexualite[0]} sf="chart.bar.fill" onPress={() => router.push('/sondages')} />
        </View>
        <Titre>{page('quiz', langue).t}</Titre>
        {AUTRES.map(({ cle, sf }) => {
          const p = page(cle, langue);
          const natif = cle === 'tests' || cle === 'scores' || cle === 'quiz' ? () => router.push('/quiz') : cle === 'compteur' ? () => router.push('/compteur') : go(cle);
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
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 14 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
