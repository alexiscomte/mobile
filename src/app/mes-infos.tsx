// Mes informations personnelles (espace membre, 07/10/2026) : le formulaire de l'onglet Moi, plus l'adresse électronique, les lieux de
// naissance et de résidence (choix natif, comme lieu.js du site) et la case « Abonnement à la newsletter » (comme espace.js) :
// connecté = abonnement direct (compte.ts lettre) ; sans compte = double opt-in (lettre.ts abonnerInvite). Sans compte, tout reste ici.
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Puce } from '@/components/form';
import { ChoixLieu, type LieuChoisi } from '@/components/lieu';
import { ResumeSignes } from '@/components/resume-signes';
import { lettre } from '@/compte';
import { TEXTES, fmt } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { abonnerInvite, oublierInvite, useLettre } from '@/lettre';
import ui from '@/moteur/ui.json';
import { useProfil, type Lieu } from '@/profil';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
const UI_S = (ui as unknown as { compatS: Record<string, TX> }).compatS;
const UI_SYN = (ui as unknown as { compatSyn: Record<string, { nomFam: string }> }).compatSyn;

function dateDe(s?: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(1990, 0, 1, 12);
}
function heureDe(s?: string): Date {
  const m = /^(\d{2}):(\d{2})/.exec(s || '');
  return new Date(2000, 0, 1, m ? +m[1] : 12, m ? +m[2] : 0);
}
const pad = (n: number) => (n < 10 ? '0' : '') + n;
const isoDate = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const isoHeure = (d: Date) => pad(d.getHours()) + ':' + pad(d.getMinutes());
const versChoix = (l?: Lieu): LieuChoisi | null => (l && l.code ? { code: l.code, nomPays: '', lat: l.lat ?? 0, lon: l.lon ?? 0, ville: l.ville ?? null } : null);
const versLieu = (l: LieuChoisi | null): Lieu | undefined => (l ? { code: l.code, ville: l.ville, lat: l.lat, lon: l.lon } : undefined);
const RX_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function MesInfos() {
  const { langue, profil, compte, setProfil } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue];
  const E = UI_E[langue] || UI_E.fr, TS = UI_S[langue] || UI_S.fr, NF = (UI_SYN[langue] || UI_SYN.fr).nomFam;
  const [prenom, setPrenom] = useState(profil.prenom || '');
  const [nom, setNom] = useState(profil.nom || '');
  const [sexe, setSexe] = useState(profil.sexe || '');
  const [naissance, setNaissance] = useState(profil.naissance || '');
  const [heure, setHeure] = useState(profil.heure || '');
  const [heureConnue, setHeureConnue] = useState(!!profil.heure);
  const [courriel, setCourriel] = useState(profil.courriel || '');
  const [lieuN, setLieuN] = useState<LieuChoisi | null>(versChoix(profil.naissance_lieu));
  const [lieuR, setLieuR] = useState<LieuChoisi | null>(versChoix(profil.residence));
  const [message, setMessage] = useState('');
  const { etat, courriel: courrielLettre, recharger } = useLettre(compte);
  const [noteLettre, setNoteLettre] = useState('');
  const [occupe, setOccupe] = useState(false);
  const natif = Platform.OS !== 'web';

  useEffect(() => {
    setPrenom(profil.prenom || ''); setNom(profil.nom || ''); setSexe(profil.sexe || ''); setNaissance(profil.naissance || '');
    setHeure(profil.heure || ''); setHeureConnue(!!profil.heure); setCourriel(profil.courriel || '');
  }, [profil]);

  const enregistrer = async () => {
    const c = courriel.trim().toLowerCase();
    await setProfil({ ...profil, prenom: prenom.trim(), nom: nom.trim() || undefined, sexe: sexe || undefined, naissance: naissance || undefined,
      heure: heureConnue && heure ? heure : undefined, courriel: c && RX_COURRIEL.test(c) ? c : undefined,
      naissance_lieu: versLieu(lieuN), residence: versLieu(lieuR) });
    setMessage(T.enregistre); setTimeout(() => setMessage(''), 2000);
  };

  const note = noteLettre || (etat === 'confirme' ? fmt(E.newsAbonne, courrielLettre) : etat === 'attente' ? fmt(E.newsAttente, courrielLettre) : E.newsCaseNote);
  const basculerLettre = async (oui: boolean) => {
    setOccupe(true); setNoteLettre('…');
    try {
      if (compte) {
        const j = await lettre(oui, langue);
        setNoteLettre(j.ok ? (oui ? fmt(E.newsAbonne, compte.courriel) : E.newsDesabonne) : E.newsErreur);
      } else if (oui) {
        const c = courriel.trim().toLowerCase();
        if (!RX_COURRIEL.test(c)) { setNoteLettre(E.newsSansCourriel); return; }
        const d = await abonnerInvite(c, langue);
        setNoteLettre(d.ok ? (d.etat === 'attente' ? fmt(E.newsAttente, c) : fmt(E.newsAbonne, c)) : E.newsErreur);
      } else if (etat === 'attente') {
        await oublierInvite(); setNoteLettre(E.newsCaseNote);
      } else {
        setNoteLettre(E.newsInviteDesab);    // sans compte : le lien au bas de chaque lettre
      }
    } finally {
      await recharger(); setOccupe(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: E.ongInfos }} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{T.prenom}</Text>
        <TextInput style={styles.entree} value={prenom} onChangeText={setPrenom} maxLength={40} autoComplete="given-name" autoCapitalize="words" />
        <Text style={styles.label}>{NF}</Text>
        <TextInput style={styles.entree} value={nom} onChangeText={setNom} maxLength={60} autoComplete="family-name" autoCapitalize="words" />
        <Text style={styles.label}>{TS.sexe}</Text>
        <View style={styles.puces}>
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

        <Text style={styles.label}>{T.lieuNaissance}</Text>
        <ChoixLieu langue={langue} valeur={lieuN} onChange={setLieuN} labelPays={T3.pays} labelVille={T3.ville} />
        <Text style={styles.label}>{E.lieuR}</Text>
        <ChoixLieu langue={langue} valeur={lieuR} onChange={setLieuR} labelPays={T3.pays} labelVille={T3.ville} />

        <Text style={styles.label}>{E.newsAdresse}</Text>
        <TextInput style={styles.entree} value={courriel} onChangeText={setCourriel} maxLength={254} keyboardType="email-address" autoCapitalize="none"
          autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
        <View style={styles.ligneOption}>
          <Text style={[styles.label, styles.flex]}>{E.newsCase}</Text>
          <Switch value={!!etat} disabled={occupe} onValueChange={basculerLettre} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={E.newsCase} />
        </View>
        <Text style={styles.aide}>{note}</Text>

        <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={enregistrer}>
          <Text style={styles.boutonTxt}>{T.enregistrer}</Text>
        </Pressable>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.resume}><ResumeSignes /></View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, marginTop: 14, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte },
  picker: { alignSelf: 'flex-start', marginLeft: -8 },
  ligneOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  optionDroite: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  optionTxt: { color: COULEURS.texteMuet },
  flex: { flex: 1 },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aide: { color: COULEURS.texteMuet, fontSize: 14, lineHeight: 19 },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 22 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  presse: { opacity: 0.8 },
  message: { color: COULEURS.vert, marginTop: 8, textAlign: 'center' },
  resume: { marginTop: 14, backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
});
