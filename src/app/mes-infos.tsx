// Mes informations personnelles (espace membre, 07/10/2026) : le formulaire de l'onglet Moi, plus l'adresse électronique, les lieux de
// naissance et de résidence (choix natif, comme lieu.js du site) et la case « Abonnement à la newsletter » (comme espace.js) :
// connecté = abonnement direct (compte.ts lettre) ; sans compte = double opt-in (lettre.ts abonnerInvite, avec la preuve anti-robot de
// robot.ts préparée dès qu'on approche l'adresse ou la case, 07/10/2026 nuit). Sans compte, tout reste ici.
// Ordre (07/10/2026 nuit, cahier specs/espace-membre-retouches-0710.md, décisions 2, 3 et 7 ; comme espace.js monterEspace) : d'abord le
// FORMULAIRE, puis le rappel des signes (date connue), puis le texte selon l'état (infosCompte / infosLocal du site), puis « Mon compte »
// (components/mon-compte.tsx : Changer mon mot de passe, Supprimer mon compte avec confirmation ; sans compte, Se connecter / Créer un
// compte). Plus de « Connecté : … », de synchronisation à la main ni de « Se déconnecter » ici (l'onglet Moi les a).
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { F, Puce } from '@/components/form';
import { ChoixLieu, type LieuChoisi } from '@/components/lieu';
import { MonCompte, texteInfos } from '@/components/mon-compte';
import { ResumeSignes } from '@/components/resume-signes';
import { lettre } from '@/compte';
import { TEXTES, fmt } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { abonnerInvite, oublierInvite, useLettre } from '@/lettre';
import ui from '@/moteur/ui.json';
import { useProfil, type Lieu } from '@/profil';
import { preparerRobot } from '@/robot';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
const UI_S = (ui as unknown as { compatS: Record<string, TX> }).compatS;
const UI_SYN = (ui as unknown as { compatSyn: Record<string, { nomFam: string }> }).compatSyn;
const UI_R = (ui as unknown as { robot?: Record<string, TX> }).robot || {};
/** Preuve anti-robot impossible : texte de robot.js du site selon la raison (comme espace.js erreurLettre → APROBOT.message). */
function texteRobot(lg: string, raison?: string): string | undefined {
  const R = UI_R[lg] || UI_R.fr || {};
  return raison === 'trop' ? R.trop : raison === 'reseau' ? R.reseau : R.ko;
}

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
const cleLieu = (l?: Lieu): string => (l && l.code ? l.code + '|' + (l.ville || '') : '');
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
    // lieux aussi (appareil partagé, 08/10/2026) : après une connexion qui a remplacé les données d'un autre compte, ses lieux affichés
    // seraient restés et « Enregistrer » les aurait donnés au compte connecté
    setLieuN(versChoix(profil.naissance_lieu)); setLieuR(versChoix(profil.residence));
  }, [profil]);

  const enregistrer = async () => {
    const c = courriel.trim().toLowerCase();
    await setProfil({ ...profil, prenom: prenom.trim(), nom: nom.trim() || undefined, sexe: sexe || undefined, naissance: naissance || undefined,
      heure: heureConnue && heure ? heure : undefined, courriel: c && RX_COURRIEL.test(c) ? c : undefined,
      naissance_lieu: versLieu(lieuN), residence: versLieu(lieuR) });
    setMessage(T.enregistre); setTimeout(() => setMessage(''), 2000);
  };

  // sans compte, cocher la case inscrit par courriel : la preuve anti-robot (robot.ts) se prépare dès qu'on approche l'adresse ou la case
  // (comme espace.js brancherCaseLettre : focus / pointerdown), pas à chaque affichage de l'écran
  const preparer = () => { if (!compte && !etat) preparerRobot(); };
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
        // preuve anti-robot impossible (calcul, réseau, plafond du défi) : texte de robot.js (comme espace.js erreurLettre)
        setNoteLettre(d.ok ? (d.etat === 'attente' ? fmt(E.newsAttente, c) : fmt(E.newsAbonne, c))
          : d.robot ? (texteRobot(langue, d.robot) || E.newsErreur) : E.newsErreur);
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
        {/* clé = lieu du profil : ChoixLieu ne relit pas sa valeur après le montage ; remonté quand le profil change (connexion d'un
            autre compte, enregistrement), jamais pendant la saisie */}
        <ChoixLieu key={'n' + cleLieu(profil.naissance_lieu)} langue={langue} valeur={lieuN} onChange={setLieuN} labelPays={T3.pays} labelVille={T3.ville} />
        <Text style={styles.label}>{E.lieuR}</Text>
        <ChoixLieu key={'r' + cleLieu(profil.residence)} langue={langue} valeur={lieuR} onChange={setLieuR} labelPays={T3.pays} labelVille={T3.ville} />

        <Text style={styles.label}>{E.newsAdresse}</Text>
        <TextInput style={styles.entree} value={courriel} onChangeText={setCourriel} maxLength={254} keyboardType="email-address" autoCapitalize="none"
          autoCorrect={false} autoComplete="email" textContentType="emailAddress" onFocus={preparer} />
        <View style={styles.ligneOption}>
          <Text style={[styles.label, styles.flex]}>{E.newsCase}</Text>
          <Switch value={!!etat} disabled={occupe} onValueChange={basculerLettre} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={E.newsCase}
            onTouchStart={preparer} />
        </View>
        <Text style={styles.aide}>{note}</Text>

        <Pressable style={({ pressed }) => [styles.bouton, pressed && styles.presse]} onPress={enregistrer} accessibilityRole="button">
          <Text style={styles.boutonTxt}>{T.enregistrer}</Text>
        </Pressable>
        {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
        {profil.naissance ? <View style={styles.resume}><ResumeSignes /></View> : null}

        {/* le texte vient APRÈS le formulaire (décision 2), puis l'encadré du compte */}
        <Text style={[F.texte, styles.explic]}>{texteInfos(langue, !!compte)}</Text>
        <MonCompte />
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
  bouton: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 22 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  presse: { opacity: 0.8 },
  message: { color: COULEURS.vert, marginTop: 8, textAlign: 'center' },
  resume: { marginTop: 14, backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  explic: { marginTop: 22, color: COULEURS.texteMuet },
});
