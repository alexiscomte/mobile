// Infos : recherche dans toutes les pages du site, puis les rubriques.
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne, Titre } from '@/components/carte';
import { TEXTES } from '@/i18n';
import { TUILES, VIGNETTES, type Img } from '@/images';
import { useProfil } from '@/profil';
import { chargerIndex, chercher, type Ligne as LigneIndex, type Resultat } from '@/recherche';
import { page, type Cle } from '@/site';
import { COULEURS } from '@/theme';

const RUBRIQUES: { cle: Cle; sf: string; image?: Img }[] = [
  { cle: 'maSituation', sf: 'signpost.right.fill', image: TUILES.situation },
  { cle: 'conseils', sf: 'heart.circle.fill', image: VIGNETTES.conseils },
  { cle: 'sante', sf: 'cross.case.fill', image: VIGNETTES.sante },
  { cle: 'sexualite', sf: 'flame.fill', image: VIGNETTES.sexualite },
  { cle: 'astrologie', sf: 'moon.stars.fill', image: VIGNETTES.astrologie },
  { cle: 'pays', sf: 'globe.europe.africa.fill', image: VIGNETTES.pays },
];
// les outils pratiques, tous en natif
const OUTILS: { cle: Cle; sf: string; route?: string; image?: Img }[] = [
  { cle: 'ovulation', sf: 'calendar.badge.clock', route: '/ovulation', image: VIGNETTES.ovulation },
  { cle: 'maternite', sf: 'cross.case.fill', route: '/maternite', image: VIGNETTES.maternite },
  { cle: 'callisthenie', sf: 'figure.strengthtraining.traditional', route: '/callisthenie', image: VIGNETTES.callisthenie },
  { cle: 'compteur', sf: 'heart.circle.fill', route: '/compteur', image: VIGNETTES.compteur },
  { cle: 'epoux', sf: 'textformat.abc', route: '/epoux', image: VIGNETTES.epoux },
  { cle: 'garde', sf: 'calendar', route: '/garde', image: VIGNETTES.garde },
  { cle: 'distance', sf: 'globe', route: '/distance', image: VIGNETTES.distance },
];

export default function Infos() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [index, setIndex] = useState<LigneIndex[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    let actif = true;
    setIndex(null); setErreur(false); setChargement(true);
    chargerIndex(langue).then((l) => { if (actif) { setIndex(l); setChargement(false); } }, () => { if (actif) { setErreur(true); setChargement(false); } });
    return () => { actif = false; };
  }, [langue]);

  const resultats = useMemo<Resultat[]>(() => (index && question.trim().length >= 2 ? chercher(index, question) : []), [index, question]);
  const enRecherche = question.trim().length >= 2;

  const entete = (
    <View>
      <Text style={styles.titre} accessibilityRole="header">{T.infosTitre}</Text>
      <Text style={styles.intro}>{T.infosIntro}</Text>
      <View style={styles.champ}>
        <TextInput
          style={styles.entree}
          value={question}
          onChangeText={setQuestion}
          placeholder={T.recherchePlaceholder}
          placeholderTextColor={COULEURS.texteMuet}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          onSubmitEditing={Keyboard.dismiss}
          accessibilityLabel={T.recherchePlaceholder}
          accessibilityRole="search"
        />
        {/* iOS a son propre bouton d'effacement (clearButtonMode) : le nôtre seulement ailleurs */}
        {question && Platform.OS !== 'ios' ? (
          <Pressable accessibilityRole="button" onPress={() => setQuestion('')} hitSlop={10} accessibilityLabel="×"><Text style={styles.effacer}>×</Text></Pressable>
        ) : null}
      </View>
      {chargement ? <View style={styles.etat}><ActivityIndicator color={COULEURS.primaire} /><Text style={styles.etatTxt}>{T.chargementIndex}</Text></View> : null}
      {erreur ? <Text style={styles.erreur}>{T.indexIndispo}</Text> : null}
      {enRecherche && index && !resultats.length ? <Text style={styles.etatTxt} accessibilityLiveRegion="polite">{T.aucunResultat}</Text> : null}
      {!enRecherche ? <Titre>{T.rubriques}</Titre> : <Titre>{T.resultats}</Titre>}
      {!enRecherche
        ? RUBRIQUES.map(({ cle, sf, image }) => {
            const p = page(cle, langue);
            return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} image={image} onPress={() => router.push({ pathname: '/article', params: { u: p.u } })} />;
          })
        : null}
      {!enRecherche ? <Titre>{T.vosOutils}</Titre> : null}
      {!enRecherche
        ? OUTILS.map(({ cle, sf, route, image }) => {
            const p = page(cle, langue);
            const aller = route ? () => router.push(route as never) : () => router.push({ pathname: '/article', params: { u: p.u } });
            return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} image={image} onPress={aller} />;
          })
        : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <FlatList
        data={enRecherche ? resultats : []}
        keyExtractor={(r) => r.u}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={entete}
        contentContainerStyle={styles.contenu}
        renderItem={({ item }) => (
          <Ligne titre={item.t} texte={item.fil ? item.fil + ' — ' + item.d : item.d} onPress={() => router.push({ pathname: '/article', params: { u: item.u } })} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 110 },
  titre: { fontSize: 34, lineHeight: 41, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 12 },
  champ: { flexDirection: 'row', alignItems: 'center', backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12 },
  entree: { flex: 1, fontSize: 17, paddingVertical: 12, color: COULEURS.texte },
  effacer: { fontSize: 22, color: COULEURS.texteMuet, paddingHorizontal: 6 },
  etat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  etatTxt: { color: COULEURS.texteMuet, marginTop: 8 },
  erreur: { color: COULEURS.coeur, marginTop: 8 },
});
