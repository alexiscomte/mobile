// Quiz et tests, natifs : la liste (avec vos scores), puis le questionnaire (paramètre id).
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Banniere, Illustration } from '@/components/illustration';
import { TEXTES, type Langue } from '@/i18n';
import { ARCHETYPES } from '@/images';
import { bilanQcm, chargerQuiz, lireScores, memoriserScore, resultatTest, teste, texteHtml, type Quiz, type Reponse, type Score } from '@/moteur/quiz';
import { useProfil } from '@/profil';
import { imageLocale } from '@/embarque';
import { page, SITE } from '@/site';
import { choix, erreur as vibrerErreur, succes } from '@/haptique';
import { COULEURS } from '@/theme';

export default function EcranQuiz() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [liste, setListe] = useState<Quiz[] | null>(null);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let actif = true;
    chargerQuiz(langue).then((l) => { if (actif) setListe(l); }, () => { if (actif) setErreur(true); });
    lireScores().then((s) => { if (actif) setScores(s); });
    return () => { actif = false; };
  }, [langue, id]);

  const quiz = useMemo(() => (liste && id ? liste.find((q) => q.id === id) : undefined), [liste, id]);
  if (id && quiz) return <Jeu quiz={quiz} langue={langue} onFin={() => lireScores().then(setScores)} />;

  const parPage = new Map<string, Quiz[]>();
  for (const q of liste || []) { const l = parPage.get(q.u) || []; l.push(q); parPage.set(q.u, l); }
  return (
    <>
      <Stack.Screen options={{ title: page('quiz', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {!liste && !erreur ? <ActivityIndicator color={COULEURS.primaire} /> : null}
        {erreur ? <Text style={styles.erreur}>{T.horsLigne}</Text> : null}
        {[...parPage.entries()].map(([u, qs]) => (
          <View key={u} style={styles.groupe}>
            <Text style={styles.groupeTitre}>{qs[0].t}</Text>
            {qs.map((q) => {
              const sc = scores[q.id];
              return (
                <Pressable accessibilityRole="button" key={q.id} onPress={() => router.push({ pathname: '/quiz', params: { id: q.id } })} style={({ pressed }) => [styles.ligne, pressed && styles.presse]}>
                  <Text style={styles.ligneTxt}>{q.m === 'qcm' ? 'QCM' : 'Test'} · {q.d.questions.length} {q.m === 'qcm' && sc ? `· ${sc.s}/${sc.n}` : ''}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function Jeu({ quiz, langue, onFin }: { quiz: Quiz; langue: string; onFin: () => void }) {
  const d = quiz.d, qcm = quiz.m === 'qcm';
  const [i, setI] = useState(0);
  const [bons, setBons] = useState(0);
  const [rates, setRates] = useState<string[]>([]);
  const [correction, setCorrection] = useState<{ juste: boolean; exp: string } | null>(null);
  const [score, setScore] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string[]>([]);
  const [pile, setPile] = useState<{ i: number; rep: Reponse }[]>([]);
  const [fini, setFini] = useState(false);
  const utile = (k: number, sc: Record<string, number>) => { while (k < d.questions.length && !teste(d.questions[k], sc)) k++; return k; };
  useEffect(() => { if (!qcm) setI(utile(0, {})); }, [quiz]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fini && qcm) memoriserScore(quiz.id, bons, d.questions.length, quiz.t, SITE + quiz.u).then(onFin); }, [fini]); // eslint-disable-line react-hooks/exhaustive-deps

  const recommencer = () => { setI(qcm ? 0 : utile(0, {})); setBons(0); setRates([]); setCorrection(null); setScore({}); setNotes([]); setPile([]); setFini(false); };
  const q = d.questions[i];

  if (fini) {
    if (qcm) {
      const lot = bilanQcm(d, bons);
      return (
        <Ecran titre={quiz.t}>
          <Text style={styles.score}>{bons} / {d.questions.length}</Text>
          {lot.img ? <Banniere image={imageLocale(SITE + lot.img)} ratio={1.5} /> : null}
          <Text style={styles.resTitre}>{texteHtml(lot.titre)}</Text>
          <Text style={styles.texte}>{texteHtml(lot.corps)}</Text>
          {rates.length ? <><Text style={styles.sousTitre}>{texteHtml(d.revoir || '')}</Text>{rates.map((r, k) => <Text key={k} style={styles.texte}>• {texteHtml(r)}</Text>)}</> : null}
          <Bouton titre={texteHtml(d.refaire || '↻')} onPress={recommencer} />
          <Bouton secondaire titre="↗" label={(TEXTES[langue as Langue] || TEXTES.fr).partagerPage} onPress={() => Share.share({ message: `${bons}/${d.questions.length} — ${quiz.t} — ${SITE}${quiz.u}` }).catch(() => undefined)} />
          <Text style={styles.note}>{texteHtml(d.note || '')}</Text>
        </Ecran>
      );
    }
    const r = resultatTest(d, score);
    // l'animal du test d'archétype est embarqué (src/images.ts) ; les autres résultats ont une image servie par le site
    const cle = (r.si || []).find((c) => c[0] === '@max');
    const animal = quiz.id.startsWith('qarch') && cle ? ARCHETYPES[String(cle[2])] : undefined;
    return (
      <Ecran titre={quiz.t}>
        {animal ? <Illustration image={animal} taille={240} style={styles.animal} /> : r.img ? <Banniere image={imageLocale(SITE + r.img)} ratio={1.5} /> : null}
        <Text style={styles.resTitre}>{texteHtml(r.titre)}</Text>
        <Text style={styles.texte}>{texteHtml(r.corps)}</Text>
        {notes.length && d.retenu ? <><Text style={styles.sousTitre}>{texteHtml(d.retenu)}</Text>{notes.map((n, k) => <Text key={k} style={styles.texte}>• {texteHtml(n)}</Text>)}</> : null}
        <Bouton titre={texteHtml(d.refaire || '↻')} onPress={recommencer} />
        <Text style={styles.note}>{texteHtml(d.note || '')}</Text>
      </Ecran>
    );
  }
  if (!q) return <Ecran titre={quiz.t}><ActivityIndicator color={COULEURS.primaire} /></Ecran>;

  if (qcm) {
    return (
      <Ecran titre={quiz.t}>
        <Text style={styles.etape}>{i + 1} / {d.questions.length}</Text>
        {q.img ? <Banniere key={q.img} image={imageLocale(SITE + q.img)} /> : null}
        <Text style={styles.question}>{texteHtml(q.q)}</Text>
        {correction ? (
          <>
            <Text style={[styles.verdict, correction.juste ? styles.bon : styles.faux]} accessibilityLiveRegion="polite">{texteHtml(correction.juste ? d.juste || '✓' : d.errone || '✗')}</Text>
            <Text style={styles.texte}>{correction.exp}</Text>
            <Bouton titre={texteHtml(i + 1 >= d.questions.length ? d.resultat || '→' : d.suivant || '→')} onPress={() => { setCorrection(null); if (i + 1 >= d.questions.length) setFini(true); else setI(i + 1); }} />
          </>
        ) : q.r.map((r, k) => (
          <Pressable accessibilityRole="button" key={k} style={({ pressed }) => [styles.choix, pressed && styles.presse]} onPress={() => {
            if (r.ok) { succes(); setBons(bons + 1); } else { vibrerErreur(); setRates([...rates, q.lien || q.q]); }
            setCorrection({ juste: !!r.ok, exp: texteHtml(q.exp || '') });
          }}><Text style={styles.choixTxt}>{texteHtml(r.t)}</Text></Pressable>
        ))}
      </Ecran>
    );
  }
  return (
    <Ecran titre={quiz.t}>
      <Text style={styles.etape}>{pile.length + 1}</Text>
      {q.img ? <Banniere key={q.img} image={imageLocale(SITE + q.img)} /> : null}
      <Text style={styles.question}>{texteHtml(q.q)}</Text>
      {q.aide ? <Text style={styles.aide}>{texteHtml(q.aide)}</Text> : null}
      {q.r.map((r, k) => (
        <Pressable accessibilityRole="button" key={k} style={({ pressed }) => [styles.choix, pressed && styles.presse]} onPress={() => {
          choix(); const sc = { ...score }; for (const c of Object.keys(r.p || {})) sc[c] = (sc[c] || 0) + (r.p as Record<string, number>)[c];
          const nt = r.n ? [...notes, r.n] : notes;
          setScore(sc); setNotes(nt); setPile([...pile, { i, rep: r }]);
          const k2 = utile(i + 1, sc);
          if (k2 >= d.questions.length) setFini(true); else setI(k2);
        }}><Text style={styles.choixTxt}>{texteHtml(r.t)}</Text></Pressable>
      ))}
      {pile.length ? <Pressable accessibilityRole="button" onPress={() => {
        const last = pile[pile.length - 1]; const sc = { ...score };
        for (const c of Object.keys(last.rep.p || {})) sc[c] -= (last.rep.p as Record<string, number>)[c];
        if (last.rep.n) { const nt = [...notes]; nt.splice(nt.lastIndexOf(last.rep.n), 1); setNotes(nt); }
        setScore(sc); setPile(pile.slice(0, -1)); setI(last.i);
      }}><Text style={styles.retour}>{texteHtml(d.retour || '←')}</Text></Pressable> : null}
    </Ecran>
  );
}

function Ecran({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (<><Stack.Screen options={{ title: titre }} /><ScrollView contentContainerStyle={styles.contenu}>{children}</ScrollView></>);
}
function Bouton({ titre, onPress, secondaire, label }: { titre: string; onPress: () => void; secondaire?: boolean; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [secondaire ? styles.boutonSec : styles.bouton, pressed && styles.presse]}>
      <Text style={secondaire ? styles.boutonSecTxt : styles.boutonTxt}>{titre}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  erreur: { color: COULEURS.coeur },
  groupe: { marginBottom: 14 },
  groupeTitre: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 4 },
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  ligneTxt: { fontSize: 15, color: COULEURS.texte },
  chevron: { fontSize: 22, color: COULEURS.texteMuet },
  presse: { opacity: 0.8 },
  etape: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 6 },
  question: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 12 },
  aide: { color: COULEURS.texteMuet, marginBottom: 10, fontSize: 14 },
  choix: { backgroundColor: COULEURS.fondMuet, borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  choixTxt: { fontSize: 16, color: COULEURS.texte, lineHeight: 22 },
  verdict: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  bon: { color: COULEURS.vert }, faux: { color: COULEURS.coeur },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 10 },
  score: { fontSize: 44, fontWeight: '800', color: COULEURS.primaire, textAlign: 'center', marginVertical: 8 },
  animal: { alignSelf: 'center', marginBottom: 14 },
  resTitre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 8 },
  sousTitre: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 10, marginBottom: 6 },
  note: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 12 },
  retour: { color: COULEURS.secondaireFonce, textDecorationLine: 'underline', marginTop: 8 },
  bouton: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
});
