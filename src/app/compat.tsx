// Compatibilité amoureuse, native : les sept lectures du site (assets/js/compat.js) avec les textes du site (compat_txt.json).
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, Champ, ChampDate, ChampHeure, Erreur, F, Note } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { TEXTES } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { CHINOIS, ZODIAQUE } from '@/images';
import { compatibilite, plat, textesCompat, type Personne, type Resultat, type Section } from '@/moteur/compat';
import { signesDe, textes as textesAstro } from '@/moteur/horoscope';
import { ouvrirArticle, resoudre } from '@/nav';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

const dateUTC = (s: string): Date | null => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const heureNum = (s: string): number | null => { const m = /^(\d{2}):(\d{2})/.exec(s); return m ? +m[1] + +m[2] / 60 : null; };

function Bloc({ s, ui, lire, ouvrir }: { s: Section; ui: Record<string, string>; lire: string; ouvrir: (rel: string) => void }) {
  return (
    <View style={styles.bloc}>
      <Text style={F.h2}>{s.titre}</Text>
      <Text style={F.muet}>{s.intro}</Text>
      {s.lignes.map((l, i) => (
        <Text key={i} style={F.texte}>{l.gras ? <Text style={F.gras}>{l.gras} </Text> : null}{l.texte}</Text>
      ))}
      {s.tableau ? (
        <View style={styles.table}>
          {s.tableau.map((r, i) => (
            <View key={i} style={styles.tr}><Text style={styles.td}>{r[0]}</Text><Text style={styles.tdv}>{r[1]}</Text></View>
          ))}
        </View>
      ) : null}
      {s.verdict && (s.verdict.titre || s.verdict.texte) ? (
        <Text style={F.texte}>{s.verdict.titre ? <Text style={F.gras}>{s.verdict.titre}. </Text> : null}{s.verdict.texte}</Text>
      ) : null}
      {s.extra?.map((x, i) => <Note key={'x' + i}>{x}</Note>)}
      {s.score !== null ? (
        <View style={styles.scoreLigne}>
          <Text style={styles.scoreTxt}>{ui.score} : {s.score} {ui.score_sur}</Text>
          <View style={styles.jauge}><View style={[styles.jaugeBarre, { width: `${s.score}%` as const }]} /></View>
        </View>
      ) : null}
      <Note>{s.caveat}</Note>
      {s.lien ? <Pressable onPress={() => ouvrir(s.lien as string)}><Text style={F.lien}>→ {lire}</Text></Pressable> : null}
    </View>
  );
}

export default function Compat() {
  const { langue, profil } = useProfil();
  const { t: T, u: base } = textesCompat(langue);
  const U = T.ui, T1 = TEXTES[langue], T3 = TEXTES3[langue];
  const router = useRouter();
  const lonRef = profil.naissance_lieu?.lon ?? profil.residence?.lon;
  const tz = typeof lonRef === 'number' ? Math.round(lonRef / 15) : 0;
  const [n1, setN1] = useState(profil.prenom || '');
  const [d1, setD1] = useState(profil.naissance || '');
  const [h1, setH1] = useState(profil.heure || '');
  const [n2, setN2] = useState('');
  const [d2, setD2] = useState('');
  const [h2, setH2] = useState('');
  const [res, setRes] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState('');

  const calculer = () => {
    const a = dateUTC(d1), b = dateUTC(d2), dates = !!(a && b), noms = !!(plat(n1) && plat(n2));
    if (!dates && !noms) { setErreur(U.manque); setRes(null); return; }
    setErreur('');
    const p: Personne = { n: n1.trim() || U.p1, d: a || new Date(0), h: heureNum(h1), tz };
    const q: Personne = { n: n2.trim() || U.p2, d: b || new Date(0), h: heureNum(h2), tz };
    setRes(compatibilite(langue, p, q, dates, noms));
  };
  const ouvrir = (rel: string) => ouvrirArticle(router, resoudre(base, rel));

  return (
    <>
      <Stack.Screen options={{ title: page('compat', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        {!res ? (
          <>
            <Text style={F.h2}>{U.p1}</Text>
            <Champ label={U.prenom} value={n1} onChangeText={setN1} maxLength={40} autoCapitalize="words" />
            <ChampDate label={U.date} value={d1} onChange={setD1} langue={langue} max={new Date()} />
            <ChampHeure label={U.heure} inconnue={T1.heureInconnue} value={h1} onChange={setH1} langue={langue} />
            <Text style={F.h2}>{U.p2}</Text>
            <Champ label={U.prenom} value={n2} onChangeText={setN2} maxLength={40} autoCapitalize="words" />
            <ChampDate label={U.date} value={d2} onChange={setD2} langue={langue} max={new Date()} />
            <ChampHeure label={U.heure} inconnue={T1.heureInconnue} value={h2} onChange={setH2} langue={langue} />
            <Bouton titre={U.go} onPress={calculer} />
            <Erreur>{erreur}</Erreur>
            <Note>{U.note}</Note>
          </>
        ) : (
          <>
            {res.total !== null ? (
              <View style={styles.total}>
                <Text style={styles.totalTitre}>{U.total}</Text>
                <Text style={styles.totalNombre}>{res.total} <Text style={styles.totalSur}>{U.score_sur}</Text></Text>
                <Text style={styles.totalTxt}>{U.total_txt}</Text>
              </View>
            ) : null}
            {(() => {
              // les signes des deux personnes en images (zodiaque et animal chinois), quand les deux dates sont données
              const s1 = signesDe(d1), s2 = signesDe(d2);
              if (!s1 || !s2) return null;
              const TA = textesAstro(langue);
              const duo = (nom: string, s: NonNullable<typeof s1>) => (
                <View style={styles.personne}>
                  <View style={styles.paire}>
                    <Illustration image={ZODIAQUE[s.soleil]} taille={68} alt={TA.signes[s.soleil]} />
                    <Illustration image={CHINOIS[s.chinois.animal]} taille={68} alt={TA.chinois.animaux[s.chinois.animal]} />
                  </View>
                  <Text style={styles.personneNom} numberOfLines={1}>{nom}</Text>
                  <Text style={styles.personneSignes} numberOfLines={2}>{TA.signes[s.soleil]} · {TA.chinois.animaux[s.chinois.animal]}</Text>
                </View>
              );
              return (
                <View style={styles.duo}>
                  {duo(n1.trim() || U.p1, s1)}
                  <Text style={styles.coeur}>♥</Text>
                  {duo(n2.trim() || U.p2, s2)}
                </View>
              );
            })()}
            {res.avis.map((a, i) => <Note key={i}>{a}</Note>)}
            {res.sections.map((s, i) => <Bloc key={i} s={s} ui={U} lire={T3.lirePage} ouvrir={ouvrir} />)}
            <Text style={F.h2}>{T.fin.titre}</Text>
            <Text style={F.texte}>{T.fin.texte}</Text>
            {T.fin.liens.map(([t, u]) => <Pressable key={u} onPress={() => ouvrir(u)}><Text style={F.lien}>→ {t}</Text></Pressable>)}
            <Bouton titre={U.refaire} onPress={() => setRes(null)} secondaire />
            <Note>{U.note}</Note>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: 6 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 10, overflow: 'hidden', marginVertical: 6 },
  tr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  td: { color: COULEURS.texte, flex: 1 },
  tdv: { color: COULEURS.primaireFonce, fontWeight: '700', fontVariant: ['tabular-nums'] },
  scoreLigne: { marginTop: 4 },
  scoreTxt: { color: COULEURS.primaireFonce, fontWeight: '700', marginBottom: 4 },
  jauge: { height: 8, borderRadius: 4, backgroundColor: COULEURS.fondDoux, overflow: 'hidden' },
  jaugeBarre: { height: 8, backgroundColor: COULEURS.secondaire },
  total: { backgroundColor: COULEURS.primaire, borderRadius: 12, padding: 14, marginBottom: 8 },
  totalTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  totalNombre: { color: '#fff', fontSize: 40, fontWeight: '800' },
  totalSur: { fontSize: 16, fontWeight: '400' },
  totalTxt: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginTop: 4 },
  duo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COULEURS.fondDoux, borderRadius: 14, padding: 12, marginBottom: 10 },
  personne: { flex: 1, alignItems: 'center', gap: 4 },
  paire: { flexDirection: 'row', gap: 6 },
  personneNom: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce },
  personneSignes: { fontSize: 12, color: COULEURS.texteMuet, textAlign: 'center' },
  coeur: { fontSize: 26, color: COULEURS.coeur, marginHorizontal: 6 },
});
