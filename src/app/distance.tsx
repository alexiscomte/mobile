// Distance et différences, natif (assets/js/distance.js) : deux lieux de résidence -> distance, vol, décalage horaire du jour,
// repères culturels et fiches pays du site.
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, Erreur, F, Note } from '@/components/form';
import { ChoixLieu, type LieuChoisi } from '@/components/lieu';
import { TEXTES3 } from '@/i18n3';
import { rendu, textesDistance, type Rendu } from '@/moteur/distance';
import { ouvrir, ouvrirArticle } from '@/nav';
import { useProfil } from '@/profil';
import { page, url } from '@/site';
import { COULEURS } from '@/theme';

export default function Distance() {
  const { langue, profil } = useProfil();
  const T = textesDistance(langue), T3 = TEXTES3[langue];
  const router = useRouter();
  const r0 = profil.residence;
  const [a, setA] = useState<LieuChoisi | null>(r0 && r0.code && typeof r0.lat === 'number' && typeof r0.lon === 'number' ? { code: r0.code, nomPays: '', lat: r0.lat, lon: r0.lon, ville: r0.ville || null } : null);
  const [b, setB] = useState<LieuChoisi | null>(null);
  const [res, setRes] = useState<Rendu | null>(null);
  const [erreur, setErreur] = useState('');
  const hubPays = page('pays', langue).u.replace(/\.html$/, '/');

  const calculer = () => {
    if (!a || !b) { setErreur(T.manque); setRes(null); return; }
    setErreur('');
    const nom = (l: LieuChoisi) => (l.ville ? l.ville + ', ' : '') + l.nomPays;
    setRes(rendu(langue, { code: a.code, lat: a.lat, lon: a.lon, ville: a.ville, nom: nom(a) }, { code: b.code, lat: b.lat, lon: b.lon, ville: b.ville, nom: nom(b) }));
  };

  return (
    <>
      <Stack.Screen options={{ title: page('distance', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Text style={F.h2}>{T.p1}</Text>
        <ChoixLieu langue={langue} valeur={a} onChange={setA} labelPays={T3.pays} labelVille={T3.ville} />
        <Text style={F.h2}>{T.p2}</Text>
        <ChoixLieu langue={langue} valeur={b} onChange={setB} labelPays={T3.pays} labelVille={T3.ville} />
        <Bouton titre={T.go} onPress={calculer} />
        <Erreur>{erreur}</Erreur>
        {res ? (
          <View style={styles.res}>
            <Text style={[F.texte, F.gras]}>{res.distance}</Text>
            {res.trajet ? <Text style={F.texte}>{res.trajet}</Text> : null}
            <Text style={F.texte}>{res.decalage}</Text>
            <View style={F.encadre}><Text style={F.texte}>{res.bande}</Text></View>
            {res.pays ? (
              <>
                <Text style={F.h2}>{T.pays_titre}</Text>
                {res.pays.memes ? <Text style={F.texte}>{T.memes_pays}</Text> : null}
                {res.pays.table ? (
                  <View style={styles.table}>
                    {res.pays.table.map((l, i) => (
                      <View key={i} style={styles.tr}><Text style={styles.th}>{l[0]}</Text><Text style={styles.td}>{l[1]}</Text><Text style={styles.td}>{l[2]}</Text></View>
                    ))}
                  </View>
                ) : null}
                {res.pays.langue ? <Text style={F.texte}>{res.pays.langue}</Text> : null}
                {res.pays.religion ? <Text style={F.texte}>{res.pays.religion}</Text> : null}
                {res.pays.horsSite.map((h, i) => <Note key={i}>{h}</Note>)}
                {res.pays.fiches.map((f) => <Pressable key={f.slug} onPress={() => ouvrirArticle(router, hubPays + f.slug + '.html')}><Text style={F.lien}>→ {f.titre}</Text></Pressable>)}
                {res.pays.comparer ? (
                  <Pressable onPress={() => ouvrir(router, url(hubPays + (langue === 'fr' ? 'comparateur' : langue === 'de' ? 'vergleich' : 'comparator') + '.html?theme=mariage&a=' + res.pays!.comparer!.a + '&b=' + res.pays!.comparer!.b), res.pays!.comparer!.titre)}>
                    <Text style={F.lien}>→ {res.pays.comparer.titre}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            <Note>{res.note}</Note>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  res: { marginTop: 16 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 10, overflow: 'hidden', marginVertical: 8 },
  tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure, gap: 6 },
  th: { flex: 1, fontWeight: '700', color: COULEURS.primaireFonce, fontSize: 13 },
  td: { flex: 1.3, color: COULEURS.texte, fontSize: 13 },
});
