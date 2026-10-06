// Moi : prénom, date et heure de naissance, compte facultatif, langue, favoris, effacement. Sans compte, tout reste sur l'appareil.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne, Titre } from '@/components/carte';
import { Puce } from '@/components/form';
import { ResumeSignes } from '@/components/resume-signes';
import { LANGUES, NOMS_LANGUES, TEXTES, fmt, type Langue } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { TEXTES4 } from '@/i18n4';
import { toutTelecharger } from '@/moteur/contenu';
import ui from '@/moteur/ui.json';
import { ouvrir, ouvrirCle } from '@/nav';
import { useProfil, type Favori } from '@/profil';
import { page, SITE, url, urlPage } from '@/site';
import { COULEURS } from '@/theme';

const UI_COMPTE = (ui as { compte: Record<string, Record<string, string>> }).compte;
// sexe (textes du test de compatibilité du site) et page « Mes tests de compatibilité » (06/10/2026)
const UI_S = (ui as unknown as { compatS: Record<string, Record<string, string>> }).compatS;
const UI_MC = (ui as unknown as { mesCompatPage: Record<string, { h1: string; carte: string }> }).mesCompatPage;
const UI_SYN = (ui as unknown as { compatSyn: Record<string, { nomFam: string }> }).compatSyn;

function dateDe(s?: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(1990, 0, 1, 12);
}
function heureDe(s?: string): Date {
  const m = /^(\d{2}):(\d{2})/.exec(s || '');
  const d = new Date(2000, 0, 1, m ? +m[1] : 12, m ? +m[2] : 0);
  return d;
}
const pad = (n: number) => (n < 10 ? '0' : '') + n;
const isoDate = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const isoHeure = (d: Date) => pad(d.getHours()) + ':' + pad(d.getMinutes());

export default function Moi() {
  const { langue, profil, favoris, compte, setProfil, setLangue, effacer } = useProfil();
  const T = TEXTES[langue];
  const T4 = TEXTES4[langue];
  const TC = UI_COMPTE[langue] || UI_COMPTE.fr;
  const router = useRouter();
  const [prenom, setPrenom] = useState(profil.prenom || '');
  const [sexe, setSexe] = useState(profil.sexe || '');
  const [nom, setNom] = useState(profil.nom || '');
  const NF = (UI_SYN[langue] || UI_SYN.fr).nomFam;
  const TS = UI_S[langue] || UI_S.fr, MC = UI_MC[langue] || UI_MC.fr;
  const [naissance, setNaissance] = useState(profil.naissance || '');
  const [heure, setHeure] = useState(profil.heure || '');
  const [heureConnue, setHeureConnue] = useState(!!profil.heure);
  const [message, setMessage] = useState('');
  const [progression, setProgression] = useState<string>('');
  const T3 = TEXTES3[langue];
  const telecharger = async () => {
    setProgression(T3.telechargement);
    try { await toutTelecharger(langue, (f, t) => setProgression(T3.telechargement + ' ' + f + '/' + t)); setProgression(T3.horsLigneOk); }
    catch { setProgression(T.horsLigne); }
  };

  useEffect(() => { setPrenom(profil.prenom || ''); setSexe(profil.sexe || ''); setNom(profil.nom || ''); setNaissance(profil.naissance || ''); setHeure(profil.heure || ''); setHeureConnue(!!profil.heure); }, [profil]);

  const enregistrer = async () => {
    await setProfil({ ...profil, prenom: prenom.trim(), nom: nom.trim() || undefined, sexe: sexe || undefined, naissance: naissance || undefined, heure: heureConnue && heure ? heure : undefined });
    setMessage(T.enregistre); setTimeout(() => setMessage(''), 2000);
  };
  const confirmerEffacer = () => {
    if (Platform.OS === 'web') { effacer(); return; }
    Alert.alert(T.effacer, T.effacerConfirm + (compte ? '\n\n' + T4.effacerCompte : ''), [{ text: T.non, style: 'cancel' }, { text: T.oui, style: 'destructive', onPress: () => effacer() }]);
  };
  const natif = Platform.OS !== 'web';
  // favori = chemin du site (« /fr/….html ») : lu dans l'écran article (chemin relatif) ; un dossier (« / », « /fr/ » : index.html
  // ramené à « / » par espace.js) s'ouvre dans la vue web
  const lireFavori = (f: Favori) => {
    const rel = f.url.replace(/^\//, '');
    if (rel && !rel.endsWith('/')) router.push({ pathname: '/article', params: { u: rel } });
    else ouvrir(router, url(rel), f.titre);
  };

  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{T.moiTitre}</Text>
        <Text style={styles.intro}>{T.moiIntro}</Text>

        <Text style={styles.label}>{T.prenom}</Text>
        <TextInput style={styles.entree} value={prenom} onChangeText={setPrenom} maxLength={40} autoComplete="given-name" autoCapitalize="words" />

        <Text style={styles.label}>{NF}</Text>
        <TextInput style={styles.entree} value={nom} onChangeText={setNom} maxLength={60} autoComplete="family-name" autoCapitalize="words" />

        <Text style={styles.label}>{TS.sexe}</Text>
        <View style={styles.langues}>
          {([['', TS.np], ['f', TS.f], ['m', TS.m]] as [string, string][]).map(([v, t]) => (
            <Puce key={v || 'np'} titre={t} actif={sexe === v} onPress={() => setSexe(v)} />
          ))}
        </View>

        <Text style={styles.label}>{T.naissance}</Text>
        {natif ? (
          <DateTimePicker value={dateDe(naissance)} mode="date" display="compact" locale={langue} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
            onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setNaissance(isoDate(d)); }} style={styles.picker} />
        ) : (
          <TextInput style={styles.entree} value={naissance} onChangeText={setNaissance} placeholder="AAAA-MM-JJ" placeholderTextColor={COULEURS.texteMuet} />
        )}

        <View style={styles.ligneOption}>
          <Text style={styles.label}>{T.heure}</Text>
          <View style={styles.optionDroite}>
            <Text style={styles.optionTxt}>{heureConnue ? '' : T.heureInconnue}</Text>
            <Switch value={heureConnue} onValueChange={setHeureConnue} trackColor={{ true: COULEURS.secondaire }} />
          </View>
        </View>
        {heureConnue ? (natif ? (
          <DateTimePicker value={heureDe(heure)} mode="time" display="compact" locale={langue}
            onChange={(_e: DateTimePickerEvent, d?: Date) => { if (d) setHeure(isoHeure(d)); }} style={styles.picker} />
        ) : (
          <TextInput style={styles.entree} value={heure} onChangeText={setHeure} placeholder="HH:MM" placeholderTextColor={COULEURS.texteMuet} />
        )) : null}

        <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={enregistrer}>
          <Text style={styles.boutonTxt}>{T.enregistrer}</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.resume}><ResumeSignes /></View>

        <Text style={styles.label}>{T.lieuNaissance}</Text>
        <Text style={styles.aide}>{profil.naissance_lieu ? [profil.naissance_lieu.ville, profil.naissance_lieu.code].filter(Boolean).join(', ') : T.lieuNaissanceTxt}</Text>
        <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={() => ouvrir(router, urlPage('horoscope', langue), page('horoscope', langue).t, 'espace')}>
          <Text style={styles.boutonSecTxt}>{T.lieuBouton}</Text>
        </Pressable>

        <Titre>{TC.titre}</Titre>
        <Text style={styles.aide}>{compte ? fmt(TC.connecte, compte.courriel) : T4.compteTxt}</Text>
        <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={() => router.push('/compte')}>
          <Text style={styles.boutonSecTxt}>{compte ? T4.gerer : TC.connecter}</Text>
        </Pressable>

        <Titre>{T.langue}</Titre>
        <View style={styles.langues}>
          {LANGUES.map((lg: Langue) => (
            <Pressable key={lg} onPress={() => setLangue(lg)} style={[styles.langue, lg === langue && styles.langueActive]}>
              <Text style={[styles.langueTxt, lg === langue && styles.langueTxtActive]}>{NOMS_LANGUES[lg]}</Text>
            </Pressable>
          ))}
        </View>

        <Titre>{T.favoris}</Titre>
        {favoris.length ? favoris.map((f) => (
          <Ligne key={f.url} titre={f.titre} sf="star.fill" onPress={() => lireFavori(f)} />
        )) : <Text style={styles.aide}>{T.aucunFavori}</Text>}
        <Ligne titre={T4.mesSondages} texte={T4.mesSondagesTxt} sf="chart.bar.fill" onPress={() => router.push({ pathname: '/sondages', params: { mes: '1' } })} />
        <Ligne titre={MC.h1} texte={MC.carte} sf="heart.text.square.fill" onPress={() => router.push('/mes-compat')} />

        <Titre>{T.infos}</Titre>
        <Text style={styles.aide}>{T3.horsLigneTxt}</Text>
        <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={telecharger}>
          <Text style={styles.boutonSecTxt}>{T3.telecharger}</Text>
        </Pressable>
        {progression ? <Text style={styles.message}>{progression}</Text> : null}

        <Titre>{T.aPropos}</Titre>
        <Text style={styles.aide}>{T.aProposTxt}</Text>
        <Ligne titre={T.siteWeb} sf="safari" onPress={() => Linking.openURL(SITE + page('accueil', langue).u)} />
        <Ligne titre={T.newsletter} sf="envelope.fill" onPress={() => router.push('/newsletter')} />
        <Ligne titre={T.confidentialite} sf="lock.fill" onPress={() => ouvrirCle(router, 'confidentialite', langue)} />
        <Ligne titre={page('apropos', langue).t} sf="info.circle.fill" onPress={() => ouvrirCle(router, 'apropos', langue)} />

        <Pressable style={({ pressed }) => [styles.boutonDanger, pressed && styles.presse]} onPress={confirmerEffacer}>
          <Text style={styles.boutonDangerTxt}>{T.effacer}</Text>
        </Pressable>
        <Text style={styles.version}>{T.version} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 16, paddingBottom: 110 },
  titre: { fontSize: 28, fontWeight: '800', color: COULEURS.primaire },
  intro: { fontSize: 15, color: COULEURS.texteMuet, marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, marginTop: 14, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte },
  picker: { alignSelf: 'flex-start', marginLeft: -8 },
  ligneOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionDroite: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  optionTxt: { color: COULEURS.texteMuet },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600', fontSize: 15 },
  boutonDanger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 28 },
  boutonDangerTxt: { color: COULEURS.coeur, fontWeight: '600' },
  presse: { opacity: 0.8 },
  message: { color: COULEURS.vert, marginTop: 8, textAlign: 'center' },
  resume: { marginTop: 14, backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  aide: { color: COULEURS.texteMuet, fontSize: 14, lineHeight: 19 },
  langues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langue: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  langueActive: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  langueTxt: { color: COULEURS.texte },
  langueTxtActive: { color: '#fff', fontWeight: '600' },
  version: { color: COULEURS.texteMuet, textAlign: 'center', marginTop: 16, fontSize: 12 },
});
