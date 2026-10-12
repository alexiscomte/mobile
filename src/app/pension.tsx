// Pension alimentaire indicative, natif : pays, revenu, enfants et mode de garde, puis l'estimation, le détail du calcul, le barème
// utilisé et les règles de l'enfant majeur, comme sur le site (moteur src/moteur/pension.ts = assets/js/pension.js, textes outils_txt.json).
// FR, UK, DE, NL calculés ; ES ordre de grandeur ; IT, PT, PL, TR : méthode et pratique seulement. Rien n'est envoyé.
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, Champ, Erreur, F, Note, Puce } from '@/components/form';
import { CALC, calcule, fmt, formateur, textesPension, valide, type Donnees, type Enfant, type Pays, type Resultat, type TextesPension } from '@/moteur/pension';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

const N_MAX: Partial<Record<Pays, number>> = { DE: 6, NL: 4, ES: 3 };
const entier = (s: string) => { const v = parseInt(s.replace(/\s/g, ''), 10); return isNaN(v) ? NaN : v; };

function Choix({ label, options, valeur, onChange }: { label: string; options: Record<string, string>; valeur: string; onChange: (k: string) => void }) {
  return (
    <>
      <Text style={F.label}>{label}</Text>
      <View style={F.puces}>{Object.entries(options).map(([k, lib]) => <Puce key={k} titre={lib} actif={valeur === k} onPress={() => onChange(k)} />)}</View>
    </>
  );
}

function Lien({ url, titre }: { url: string; titre: string }) {
  if (!url) return null;
  return <Pressable accessibilityRole="link" onPress={() => { Linking.openURL(url).catch(() => undefined); }} hitSlop={6}><Text style={F.lien}>{titre || url}</Text></Pressable>;
}

function Resultats({ p, n, R, T }: { p: Pays; n: number; R: Resultat | null; T: TextesPension }) {
  const { money } = formateur(T);
  const s = T.src[p];
  return (
    <View style={styles.res}>
      <Text style={F.h2} accessibilityRole="header">{T.ui.resultat} — {T.pays[p]}</Text>
      {!CALC[p] ? (
        <>
          <Text style={F.texte}>{T.ui.pas_calcul}</Text>
          <Text style={F.h3}>{T.ui.methode}</Text><Text style={F.texte}>{T.info[p].methode}</Text>
          <Text style={F.h3}>{T.ui.pratique}</Text><Text style={F.texte}>{T.info[p].pratique}</Text>
        </>
      ) : R && R.fourchette ? (
        <>
          {R.lo !== null && R.lo !== undefined && R.hi !== null && R.hi !== undefined ? (
            <Text style={styles.total}><Text style={styles.chiffre}>{money(R.lo, p)} – {money(R.hi, p)}</Text> {T.ui.par_enfant}</Text>
          ) : null}
          {R.lignes.map((l, i) => <Text key={i} style={styles.puce}>• {l}</Text>)}
        </>
      ) : R ? (
        <>
          {R.total > 0 ? (
            <>
              <Text style={styles.total}><Text style={styles.chiffre}>{money(R.total / n, p)}</Text> {T.ui.par_enfant} · <Text style={styles.chiffre}>{money(R.total, p)}</Text> {T.ui.total}</Text>
              <Text style={F.texte}>{fmt(T.ui.resume, [n, money(R.total / n, p), money(R.total, p)])}</Text>
            </>
          ) : <Text style={[F.texte, F.gras]}>{T.ui.zero}</Text>}
          <Text style={F.h3}>{T.ui.detail}</Text>
          {R.lignes.map((l, i) => <Text key={i} style={styles.puce}>{i + 1}. {l}</Text>)}
        </>
      ) : null}
      <Text style={F.h3}>{T.ui.source}</Text>
      <Text style={F.texte}>{s.nom} — {fmt(T.ui.etat, [s.date])}</Text>
      <Lien url={s.url} titre={s.url} />
      {s.sim ? <Text style={F.texte}><Text style={F.gras}>{T.ui.sim}</Text> — <Text style={F.lien} onPress={() => { Linking.openURL(s.sim).catch(() => undefined); }}>{s.sim_nom}</Text></Text> : null}
      <Text style={F.h3}>{T.ui.majeur}</Text><Text style={F.texte}>{T.majeur[p]}</Text>
      <Text style={F.h3}>{T.ui.ou}</Text><Text style={F.texte}>{T.ou[p]}</Text>
      <View style={styles.avert}><Text style={styles.avertTxt}>{T.ui.avert}</Text></View>
    </View>
  );
}

export default function Pension() {
  const { langue } = useProfil();
  const T = textesPension(langue);
  const [pays, setPays] = useState<Pays>(T ? T.ordre[0] : 'FR');
  const [rev, setRev] = useState('');
  const [revA, setRevA] = useState('');
  const [gezin, setGezin] = useState('');
  const [n, setN] = useState('1');
  const [garde, setGarde] = useState('classique');
  const [autres, setAutres] = useState('0');
  const [nuits, setNuits] = useState('0');
  const [actif, setActif] = useState('oui');
  const [zorg, setZorg] = useState('1');
  const [custodia, setCustodia] = useState('mono');
  const [enfants, setEnfants] = useState<{ age: string; statut: string }[]>([{ age: '', statut: 'foyer' }]);
  const [erreur, setErreur] = useState('');
  const [res, setRes] = useState<{ p: Pays; n: number; R: Resultat | null } | null>(null);

  const nb = useMemo(() => Math.min(N_MAX[pays] || 12, Math.max(1, entier(n) || 1)), [n, pays]);
  const lignesEnfants = useMemo(() => { const out = enfants.slice(0, nb); while (out.length < nb) out.push({ age: '', statut: 'foyer' }); return out; }, [enfants, nb]);
  const changerPays = (p: Pays) => { setPays(p); setRes(null); setErreur(''); };
  const majEnfant = (k: number, champ: 'age' | 'statut', v: string) => { const e = lignesEnfants.map((x) => ({ ...x })); e[k][champ] = v; setEnfants(e); };

  if (!T) return null;
  const dev = (p: Pays, label: string) => label + ' (' + T.dev[p] + ')';

  const calculer = () => {
    if (!CALC[pays]) { setErreur(''); setRes({ p: pays, n: nb, R: null }); return; }
    const d: Donnees = { rev: entier(rev), n: nb, revA: entier(revA), gezin: entier(gezin), garde: garde as Donnees['garde'], autres: entier(autres) || 0, nuits, actif, zorg, custodia };
    if (pays === 'DE') d.enfants = lignesEnfants.map((e): Enfant => ({ age: entier(e.age), statut: e.statut }));
    if (pays === 'NL') { if (isNaN(d.gezin!) || isNaN(d.revA!)) { setErreur(T.ui.manque); setRes(null); return; } }
    if (pays === 'ES') { if (isNaN(d.revA!)) d.revA = 0; }
    if (!valide(pays, d)) { setErreur(T.ui.manque); setRes(null); return; }
    setErreur('');
    setRes({ p: pays, n: nb, R: calcule(pays, d, T) });
  };
  const recommencer = () => { setRes(null); setErreur(''); };

  const paysOpts: Record<string, string> = {};
  T.ordre.forEach((c) => { paysOpts[c] = T.pays[c]; });
  const ouiNon = { oui: T.ui.oui, non: T.ui.non };

  return (
    <>
      <Stack.Screen options={{ title: page('pension', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Choix label={T.ui.pays} options={paysOpts} valeur={pays} onChange={(k) => changerPays(k as Pays)} />
        {pays === 'FR' ? (
          <>
            <Champ label={dev(pays, T.ui.revenu)} value={rev} onChangeText={setRev} keyboardType="number-pad" maxLength={6} />
            <Champ label={T.ui.enfants} value={n} onChangeText={setN} keyboardType="number-pad" maxLength={2} />
            <Choix label={T.fr.garde} options={T.fr.g} valeur={garde} onChange={setGarde} />
          </>
        ) : pays === 'UK' ? (
          <>
            <Champ label={dev(pays, T.uk.revenu)} value={rev} onChangeText={setRev} keyboardType="number-pad" maxLength={5} />
            <Champ label={T.ui.enfants} value={n} onChangeText={setN} keyboardType="number-pad" maxLength={2} />
            <Choix label={T.uk.autres} options={T.uk.o_autres} valeur={autres} onChange={setAutres} />
            <Choix label={T.uk.nuits} options={T.uk.o_nuits} valeur={nuits} onChange={setNuits} />
          </>
        ) : pays === 'DE' ? (
          <>
            <Champ label={dev(pays, T.ui.revenu)} value={rev} onChangeText={setRev} keyboardType="number-pad" maxLength={6} />
            <Champ label={T.ui.enfants} value={n} onChangeText={setN} keyboardType="number-pad" maxLength={1} />
            <Choix label={T.de.actif} options={ouiNon} valeur={actif} onChange={setActif} />
            {lignesEnfants.map((e, k) => (
              <View key={k} style={F.encadre}>
                <Text style={[F.texte, F.gras]}>{fmt(T.ui.enfant_n, [k + 1])}</Text>
                <Champ label={T.ui.age} value={e.age} onChangeText={(v) => majEnfant(k, 'age', v)} keyboardType="number-pad" maxLength={2} />
                <Choix label={T.de.statut} options={T.de.o_statut} valeur={e.statut} onChange={(v) => majEnfant(k, 'statut', v)} />
              </View>
            ))}
          </>
        ) : pays === 'NL' ? (
          <>
            <Champ label={dev(pays, T.nl.gezin)} value={gezin} onChangeText={setGezin} keyboardType="number-pad" maxLength={6} />
            <Champ label={T.ui.enfants} value={n} onChangeText={setN} keyboardType="number-pad" maxLength={1} />
            <Champ label={dev(pays, T.nl.a)} value={revA} onChangeText={setRevA} keyboardType="number-pad" maxLength={6} />
            <Champ label={dev(pays, T.nl.b)} value={rev} onChangeText={setRev} keyboardType="number-pad" maxLength={6} />
            <Choix label={T.nl.zorg} options={T.nl.o_zorg} valeur={zorg} onChange={setZorg} />
          </>
        ) : pays === 'ES' ? (
          <>
            <Champ label={dev(pays, T.ui.revenu)} value={rev} onChangeText={setRev} keyboardType="number-pad" maxLength={6} />
            <Champ label={dev(pays, T.ui.revenu_autre)} value={revA} onChangeText={setRevA} keyboardType="number-pad" maxLength={6} />
            <Champ label={T.ui.enfants} value={n} onChangeText={setN} keyboardType="number-pad" maxLength={1} />
            <Choix label={T.es.custodia} options={T.es.o_custodia} valeur={custodia} onChange={setCustodia} />
          </>
        ) : null}
        <Bouton titre={T.ui.go} onPress={calculer} />
        <Erreur>{erreur}</Erreur>
        <Note>{T.ui.note}</Note>
        {res ? (
          <>
            <Resultats p={res.p} n={res.n} R={res.R} T={T} />
            <Bouton titre={T.ui.recommencer} onPress={recommencer} secondaire />
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  res: { marginTop: 8 },
  total: { fontSize: 17, lineHeight: 26, color: COULEURS.texte, marginBottom: 8 },
  chiffre: { fontSize: 22, fontWeight: '800', color: COULEURS.primaireFonce },
  puce: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginLeft: 6, marginBottom: 4 },
  avert: { backgroundColor: COULEURS.avertFond, borderRadius: 10, padding: 12, marginTop: 14, marginBottom: 10 },
  avertTxt: { color: COULEURS.avertTexte, fontSize: 14, lineHeight: 20 },
});
