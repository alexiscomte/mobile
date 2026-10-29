// Accueil : bonjour, la date, les outils du jour.
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carte, Titre } from '@/components/carte';
import { ResumeSignes } from '@/components/resume-signes';
import { useTabTopClearance } from '@/hooks/use-tab-top-clearance';
import { fmt, TEXTES } from '@/i18n';
import { TUILES } from '@/images';
import { questionDuJour, sondageDuJour } from '@/moteur/qdj';
import { ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS, DEGRADES } from '@/theme';

export default function Accueil() {
  const paddingTop = useTabTopClearance();
  const { langue, profil } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  const date = new Date().toLocaleDateString(langue, { weekday: 'long', day: 'numeric', month: 'long' });
  const sondage = sondageDuJour(langue);
  const go = (cle: Parameters<typeof page>[0], ancre?: string) => () => ouvrirCle(router, cle, langue, ancre);
  return (
    <SafeAreaView style={[styles.fond, { paddingTop }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.bonjour} accessibilityRole="header">{profil.prenom ? fmt(T.bonjourPrenom, profil.prenom) : T.bonjour}</Text>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.resume}><ResumeSignes /></View>

        <View style={styles.grille}>
          <Carte large titre={T.horoscopeDuJour} texte={T.horoscopeDuJourTxt} couleur={DEGRADES.astro[0]} sf="sparkles" image={TUILES.horoscope} onPress={() => router.push('/horoscope')} />
          <Carte large titre={T.questionDuJour} texte={questionDuJour(langue)} couleur={DEGRADES.jeux[0]} sf="bubble.left.and.bubble.right.fill" image={TUILES.qdj} onPress={() => router.push('/qdj')} />
          {sondage ? <Carte large titre={page('sondages', langue).t} texte={sondage.q[langue] || sondage.q.fr} couleur={DEGRADES.sexualite[0]} sf="chart.bar.fill" image={TUILES.sondages} onPress={() => router.push('/sondages')} /> : null}
          <Carte large titre={page('seTenirAJour', langue).t} texte={page('seTenirAJour', langue).d} couleur={DEGRADES.conseils[1]} sf="bell.fill" onPress={go('seTenirAJour')} />
        </View>

        <Titre>{T.vosOutils}</Titre>
        <View style={styles.grille}>
          <Carte titre={page('compat', langue).t} texte={T.compatTxt} couleur={DEGRADES.compat[0]} sf="heart.fill" image={TUILES.compat} onPress={() => router.push('/compat')} />
          <Carte titre={page('jeu2', langue).t} texte={T.jeu2Txt} couleur={DEGRADES.jeux[0]} sf="person.2.fill" image={TUILES.jeu2} onPress={() => router.push('/jeu2')} />
          <Carte titre={page('themeAstral', langue).t} texte={T.themeTxt} couleur={DEGRADES.astro[0]} sf="moon.stars.fill" image={TUILES.theme} onPress={() => router.push('/theme')} />
          <Carte titre={page('biorythme', langue).t} texte={T.bioTxt} couleur={DEGRADES.sante[0]} sf="waveform.path.ecg" image={TUILES.biorythme} onPress={() => router.push('/biorythme')} />
          <Carte titre={page('jeux', langue).t} texte={T.jeuxIntro} couleur={DEGRADES.sexualite[0]} sf="gamecontroller.fill" image={TUILES.jeux} onPress={() => router.push('/(tabs)/jeux')} />
          <Carte titre={page('quiz', langue).t} texte={T.quizTxt} couleur={DEGRADES.conseils[0]} sf="questionmark.circle.fill" image={TUILES.quiz} onPress={go('quiz')} />
        </View>

        {/* étapes de la vie de couple : mêmes tuiles que l'accueil du site (accueil_etapes.py, 01/10/2026), pages du catalogue */}
        <Titre>{T.etapes}</Titre>
        <View style={styles.grille}>
          <Carte titre={T.etapeRencontre} texte={page('rencontreEnLigne', langue).d} couleur={DEGRADES.compat[0]} sf="heart.circle.fill" image={TUILES.rencontre} onPress={go('rencontreEnLigne')} />
          <Carte titre={T.etapeMariage} texte={page('mariage', langue).d} couleur={DEGRADES.conseils[0]} sf="gift.fill" image={TUILES.mariage} onPress={go('mariage')} />
          <Carte titre={T.etapeFamille} texte={page('famille', langue).d} couleur={DEGRADES.sante[0]} sf="figure.2.and.child.holdinghands" image={TUILES.famille} onPress={go('famille')} />
          <Carte titre={T.etapeDivorce} texte={page('separation', langue).d} couleur={DEGRADES.jeux[0]} sf="heart.slash.fill" image={TUILES.separation} onPress={go('separation')} />
        </View>

        <Titre>{T.commencerIci}</Titre>
        <View style={styles.grille}>
          <Carte large titre={page('maSituation', langue).t} texte={T.commencerIciTxt} couleur={DEGRADES.sexualite[1]} sf="signpost.right.fill" image={TUILES.situation} onPress={go('maSituation')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 110 },
  bonjour: { fontSize: 34, lineHeight: 41, fontWeight: '800', color: COULEURS.primaire },
  date: { fontSize: 15, color: COULEURS.texteMuet, textTransform: 'capitalize', marginBottom: 6 },
  resume: { marginBottom: 14 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
