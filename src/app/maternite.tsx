// Maternité la plus proche, natif (assets/js/maternite.js) : pays et ville (données du site) ou position du téléphone ;
// France = liste officielle DREES, ailleurs = OpenStreetMap.
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, F, fmt, Note } from '@/components/form';
import { ChoixLieu, type LieuChoisi } from '@/components/lieu';
import { TEXTES3 } from '@/i18n3';
import { enFrance, prochesFR, prochesOSM, textesMaternite, type Etablissement } from '@/moteur/maternite';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

type Sortie = { fr: boolean; liste: Etablissement[]; note?: string };

export default function Maternite() {
  const { langue, profil } = useProfil();
  const T = textesMaternite(langue), T3 = TEXTES3[langue];
  const r0 = profil.residence;
  const [lieu, setLieu] = useState<LieuChoisi | null>(r0 && r0.code && typeof r0.lat === 'number' && typeof r0.lon === 'number' ? { code: r0.code, nomPays: '', lat: r0.lat, lon: r0.lon, ville: r0.ville || null } : null);
  const [msg, setMsg] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [out, setOut] = useState<Sortie | null>(null);

  const chercher = async (lat: number, lon: number, code: string | null) => {
    setOut(null); setMsg(T.cherche); setEnCours(true);
    try {
      if (enFrance(lat, lon, code)) setOut({ fr: true, liste: prochesFR(lat, lon) });
      else {
        const r = await prochesOSM(lat, lon, langue);
        setOut({ fr: false, liste: r.liste, note: r.total ? (r.nbMat ? T.osm_badge : fmt(T.osm_aucun, 150)) : fmt(T.osm_rien, 150) });
      }
      setMsg('');
    } catch { setMsg(T.osm_erreur); }
    setEnCours(false);
  };
  const go = () => { if (!lieu) { setMsg(T.manque); return; } chercher(lieu.lat, lieu.lon, lieu.code); };
  const position = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setMsg(T.geoloc_non); return; }
      setMsg(T.cherche);
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      chercher(p.coords.latitude, p.coords.longitude, null);
    } catch { setMsg(T.geoloc_non); }
  };
  const itineraire = (lat: number, lon: number) => Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon);
  const carte = (lat: number, lon: number) => Linking.openURL('https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=13/' + lat + '/' + lon);
  const nb = (n: number) => n.toLocaleString(langue);

  return (
    <>
      <Stack.Screen options={{ title: page('maternite', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={F.h2} accessibilityRole="header">{T.ou}</Text>
        <ChoixLieu langue={langue} valeur={lieu} onChange={setLieu} labelPays={T3.pays} labelVille={T3.ville} />
        <Bouton titre={T.go} onPress={go} disabled={enCours} />
        <Bouton titre={T.position} onPress={position} secondaire disabled={enCours} />
        {msg ? <View style={styles.etat}>{enCours ? <ActivityIndicator color={COULEURS.primaire} /> : null}<Text style={styles.etatTxt}>{msg}</Text></View> : null}
        {out ? (
          <>
            <Text style={F.h2} accessibilityRole="header">{out.fr ? fmt(T.resultats, out.liste.length) : T.osm_titre}</Text>
            {out.note ? <View style={F.encadre}><Text style={F.texte}>{out.note}</Text></View> : null}
            {out.liste.map((e, i) => (
              <View key={i} style={F.ligne}>
                <Text style={styles.km}>{Math.round(e.km)} {T.km}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nom}>{e.nom}{e.mat ? <Text style={styles.badge}>  {T.osm_mat}</Text> : null}</Text>
                  {out.fr ? (
                    <>
                      <Text style={styles.meta}>{e.ville}{e.adresse ? ' (' + e.adresse + ')' : ''}</Text>
                      <Text style={styles.meta}><Text style={styles.badge}>{T.type} {e.type}</Text> {T.types[e.type || ''] || ''} · {T[e.statut || ''] || e.statut}{e.acc ? ' · ' + fmt(T.acc, nb(e.acc)) : ''}</Text>
                    </>
                  ) : (
                    <Text style={styles.meta}>{[e.adresse, e.tel].filter(Boolean).join(' · ')}</Text>
                  )}
                  <View style={styles.liens}>
                    <Pressable accessibilityRole="button" onPress={() => itineraire(e.lat, e.lon)}><Text style={F.lien}>{T.itin}</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => carte(e.lat, e.lon)}><Text style={F.lien}>{T.carte}</Text></Pressable>
                    {e.site ? <Pressable accessibilityRole="button" onPress={() => Linking.openURL(e.site as string)}><Text style={F.lien}>site</Text></Pressable> : null}
                  </View>
                </View>
              </View>
            ))}
            <Note>{out.fr ? T.fr_source : T.osm_source + ' ' + T.partout}</Note>
          </>
        ) : null}
        <View style={styles.urgence}><Text style={styles.urgenceTxt}>{T.urgence}</Text></View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  etat: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  etatTxt: { color: COULEURS.texteMuet },
  km: { width: 62, fontWeight: '700', color: COULEURS.primaire, fontVariant: ['tabular-nums'] },
  nom: { fontSize: 15, fontWeight: '600', color: COULEURS.texte },
  badge: { color: COULEURS.secondaire, fontWeight: '700', fontSize: 12 },
  meta: { fontSize: 13, color: COULEURS.texteMuet, marginTop: 2 },
  liens: { flexDirection: 'row', gap: 14, marginTop: 4 },
  urgence: { backgroundColor: COULEURS.avertFond, borderRadius: 12, padding: 12, marginTop: 20 },
  urgenceTxt: { color: COULEURS.avertTexte, fontSize: 14, lineHeight: 20 },
});
