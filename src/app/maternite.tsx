// Maternité la plus proche, natif (assets/js/maternite.js) : pays et ville (données du site) ou position du téléphone ;
// France = liste officielle DREES, ailleurs = OpenStreetMap.
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, Champ, F, fmt, Note } from '@/components/form';
import { TEXTES3 } from '@/i18n3';
import { chercherPays, chercherVille, listePays, villes, type PaysInfo, type Ville } from '@/moteur/lieux';
import { enFrance, prochesFR, prochesOSM, textesMaternite, type Etablissement } from '@/moteur/maternite';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

type Sortie = { fr: boolean; liste: Etablissement[]; note?: string };

export default function Maternite() {
  const { langue, profil } = useProfil();
  const T = textesMaternite(langue), T3 = TEXTES3[langue];
  const PAYS = useMemo(() => listePays(langue), [langue]);
  const res0 = profil.residence;
  const [pays, setPays] = useState<PaysInfo | null>(() => (res0 && res0.code ? PAYS.find((p) => p.code === res0.code) || null : null));
  const [qPays, setQPays] = useState(pays ? pays.nom : '');
  const [ville, setVille] = useState<{ nom: string; lat: number; lon: number } | null>(
    res0 && typeof res0.lat === 'number' && typeof res0.lon === 'number' ? { nom: res0.ville || '', lat: res0.lat, lon: res0.lon } : null);
  const [qVille, setQVille] = useState(ville ? ville.nom : '');
  const [liste, setListe] = useState<Ville[]>([]);
  const [msg, setMsg] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [out, setOut] = useState<Sortie | null>(null);

  useEffect(() => {
    let actif = true;
    setListe([]);
    if (pays) villes(pays.code).then((l) => { if (actif) setListe(l); }, () => {});
    return () => { actif = false; };
  }, [pays]);
  const sugPays = useMemo(() => (pays && qPays === pays.nom ? [] : chercherPays(PAYS, qPays)), [PAYS, qPays, pays]);
  const sugVille = useMemo(() => (ville && qVille === ville.nom ? [] : chercherVille(liste, qVille)), [liste, qVille, ville]);

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
  const go = () => {
    if (!pays) { setMsg(T.manque); return; }
    chercher(ville ? ville.lat : pays.lat, ville ? ville.lon : pays.lon, pays.code);
  };
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
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Text style={F.h2}>{T.ou}</Text>
        <Champ label={T3.pays} value={qPays} onChangeText={(v) => { setQPays(v); setPays(null); setVille(null); setQVille(''); }} autoCorrect={false} />
        {sugPays.length ? (
          <View style={F.suggestions}>
            {sugPays.map((p) => (
              <Pressable key={p.code} style={F.suggestion} onPress={() => { setPays(p); setQPays(p.nom); }}><Text style={F.suggestionTxt}>{p.nom}</Text></Pressable>
            ))}
          </View>
        ) : null}
        <Champ label={T3.ville} value={qVille} onChangeText={(v) => { setQVille(v); setVille(null); }} editable={!!pays} autoCorrect={false} />
        {sugVille.length ? (
          <View style={F.suggestions}>
            {sugVille.map((v) => (
              <Pressable key={v.nom + v.lat} style={F.suggestion} onPress={() => { setVille({ nom: v.nom, lat: v.lat, lon: v.lon }); setQVille(v.nom); }}>
                <Text style={F.suggestionTxt}>{v.nom}{v.cp ? ' (' + v.cp + ')' : ''}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Bouton titre={T.go} onPress={go} disabled={enCours} />
        <Bouton titre={T.position} onPress={position} secondaire disabled={enCours} />
        {msg ? <View style={styles.etat}>{enCours ? <ActivityIndicator color={COULEURS.primaire} /> : null}<Text style={styles.etatTxt}>{msg}</Text></View> : null}
        {out ? (
          <>
            <Text style={F.h2}>{out.fr ? fmt(T.resultats, out.liste.length) : T.osm_titre}</Text>
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
                    <Pressable onPress={() => itineraire(e.lat, e.lon)}><Text style={F.lien}>{T.itin}</Text></Pressable>
                    <Pressable onPress={() => carte(e.lat, e.lon)}><Text style={F.lien}>{T.carte}</Text></Pressable>
                    {e.site ? <Pressable onPress={() => Linking.openURL(e.site as string)}><Text style={F.lien}>site</Text></Pressable> : null}
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
  urgence: { backgroundColor: '#FFF3E0', borderRadius: 12, padding: 12, marginTop: 20 },
  urgenceTxt: { color: '#7A4A00', fontSize: 14, lineHeight: 20 },
});
