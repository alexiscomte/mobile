// Infos : recherche dans toutes les pages du site, puis les rubriques.
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne, Titre } from '@/components/carte';
import { TEXTES } from '@/i18n';
import { useProfil } from '@/profil';
import { chargerIndex, chercher, type Ligne as LigneIndex, type Resultat } from '@/recherche';
import { page, type Cle } from '@/site';
import { COULEURS } from '@/theme';

const RUBRIQUES: { cle: Cle; sf: string }[] = [
  { cle: 'maSituation', sf: 'signpost.right.fill' },
  { cle: 'conseils', sf: 'heart.circle.fill' },
  { cle: 'sante', sf: 'cross.case.fill' },
  { cle: 'sexualite', sf: 'flame.fill' },
  { cle: 'astrologie', sf: 'moon.stars.fill' },
  { cle: 'pays', sf: 'globe.europe.africa.fill' },
];
// les outils pratiques, en natif (article du site pour « distance et différences », dont les textes n'existent qu'en fr/en/de)
const OUTILS: { cle: Cle; sf: string; route?: string }[] = [
  { cle: 'ovulation', sf: 'calendar.badge.clock', route: '/ovulation' },
  { cle: 'maternite', sf: 'cross.case.fill', route: '/maternite' },
  { cle: 'compteur', sf: 'heart.circle.fill', route: '/compteur' },
  { cle: 'epoux', sf: 'textformat.abc', route: '/epoux' },
  { cle: 'garde', sf: 'calendar', route: '/garde' },
  { cle: 'distance', sf: 'globe' },
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
      <Text style={styles.titre}>{T.infosTitre}</Text>
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
        />
        {question ? (
          <Pressable onPress={() => setQuestion('')} hitSlop={10} accessibilityLabel="×"><Text style={styles.effacer}>×</Text></Pressable>
        ) : null}
      </View>
      {chargement ? <View style={styles.etat}><ActivityIndicator color={COULEURS.primaire} /><Text style={styles.etatTxt}>{T.chargementIndex}</Text></View> : null}
      {erreur ? <Text style={styles.erreur}>{T.indexIndispo}</Text> : null}
      {enRecherche && index && !resultats.length ? <Text style={styles.etatTxt}>{T.aucunResultat}</Text> : null}
      {!enRecherche ? <Titre>{T.rubriques}</Titre> : <Titre>{T.resultats}</Titre>}
      {!enRecherche
        ? RUBRIQUES.map(({ cle, sf }) => {
            const p = page(cle, langue);
            return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} onPress={() => router.push({ pathname: '/article', params: { u: p.u } })} />;
          })
        : null}
      {!enRecherche ? <Titre>{T.vosOutils}</Titre> : null}
      {!enRecherche
        ? OUTILS.map(({ cle, sf, route }) => {
            const p = page(cle, langue);
            const aller = route ? () => router.push(route as never) : () => router.push({ pathname: '/article', params: { u: p.u } });
            return <Ligne key={cle} titre={p.t} texte={p.d} sf={sf} onPress={aller} />;
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
  contenu: { padding: 16, paddingBottom: 110 },
  titre: { fontSize: 28, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 12 },
  champ: { flexDirection: 'row', alignItems: 'center', backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12 },
  entree: { flex: 1, fontSize: 17, paddingVertical: 12, color: COULEURS.texte },
  effacer: { fontSize: 22, color: COULEURS.texteMuet, paddingHorizontal: 6 },
  etat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  etatTxt: { color: COULEURS.texteMuet, marginTop: 8 },
  erreur: { color: COULEURS.coeur, marginTop: 8 },
});
