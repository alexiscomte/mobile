// Plan d'entraînement callisthénique, natif : dix questions, puis le programme et les repères d'alimentation du site
// (moteur src/moteur/callisthenie.ts = assets/js/callisthenie.js du site, textes outils_txt.json).
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Bouton, Champ, Erreur, F, Note } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { Assiette } from '@/components/schemas';
import { EXERCICES } from '@/images';
import { consigne, dp, fmt, nom, nutrition, plan, QS, reposCle, textesCal, type Plan, type Reponses, type TextesCal } from '@/moteur/callisthenie';
import { useProfil } from '@/profil';
import { page } from '@/site';
import { COULEURS } from '@/theme';

function Choix({ titre, actif, onPress }: { titre: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.choix, actif && styles.choixActif, pressed && styles.presse]} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: actif }}>
      <Text style={[styles.choixTxt, actif && styles.choixTxtActif]}>{titre}</Text>
    </Pressable>
  );
}

// Illustration d'un exercice (posture, vue de profil) : vignette 3:2 à gauche du texte, en grand sur toute la largeur après un appui ;
// rien si l'exercice n'a pas d'image
function ImageExo({ id, grand, petit, onPress }: { id: string; grand: boolean; petit?: boolean; onPress: () => void }) {
  const image = EXERCICES[id];
  if (!image) return null;
  const largeur = grand ? 320 : petit ? 84 : 112;
  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" style={grand ? styles.exoImageGrand : styles.exoImage}>
      <Illustration image={image} taille={largeur} style={{ width: largeur, height: Math.round(largeur * 2 / 3) }} />
    </Pressable>
  );
}

function texteDuPlan(r: Reponses, T: TextesCal, P: Plan): string {
  const L: string[] = [T.plan.titre, fmt(T.plan.resume, [r.freq!, r.duree!, T.niv_nom[r.niv!], T.obj_nom[r.obj!]]) + (r.duo === 'duo' ? T.plan.resume_duo : ''), ''];
  P.seances.forEach((s) => {
    L.push(fmt(T.plan.seance, [s.jour, s.titre]));
    L.push(T.plan.echauffement + dp(T) + T.plan.ech.join(' ; '));
    L.push(T.plan.corps + (s.circuit ? ' — ' + fmt(T.plan.circuit, [s.series]) : ''));
    s.exos.forEach((e, i) => L.push(`${i + 1}. ${nom(T, e.id)}${e.duo ? ' (' + T.cat.duo + ')' : ''} — ${s.circuit ? e.charge : fmt(T.plan.series, [e.series, e.charge])}`));
    L.push(fmt(T.plan.repos, [T.plan[reposCle(s.circuit, r.obj!)]]));
    if (s.fin) L.push(fmt(T.plan.finisher, [fmt(T.plan.intervalles, [s.fin.n, nom(T, s.fin.id)])]));
    L.push(T.plan.retour + dp(T) + s.retour.map((id) => nom(T, id)).join(', '), '');
  });
  return L.join('\n');
}

export default function Callisthenie() {
  const { langue } = useProfil();
  const T = textesCal(langue);
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState<Reponses>({});
  const [corps, setCorps] = useState<{ sexe?: string; age: string; taille: string; poids: string }>({ age: '', taille: '', poids: '' });
  const [erreur, setErreur] = useState('');
  const [grand, setGrand] = useState<string | null>(null);     // exercice dont l'image est affichée en grand
  const fini = etape >= QS.length;
  const P = useMemo(() => (fini ? plan(r, T) : null), [fini, r, T]);
  const N = useMemo(() => (fini ? nutrition(r, T) : null), [fini, r, T]);
  const q = QS[Math.min(etape, QS.length - 1)];

  const repondre = (cle: string, v: string) => { setR({ ...r, [cle]: v }); setErreur(''); setEtape(etape + 1); };
  const validerCorps = () => {
    const a = parseInt(corps.age, 10), t = parseInt(corps.taille, 10), p = parseFloat(corps.poids.replace(',', '.'));
    if (!corps.sexe || !(a >= 16 && a <= 90) || !(t >= 140 && t <= 220) || !(p >= 40 && p <= 200)) { setErreur(T.ui.mesures_invalides); return; }
    setR({ ...r, sexe: corps.sexe, age: a, taille: t, poids: p }); setErreur(''); setEtape(etape + 1);
  };
  const passer = () => { const { sexe, age, taille, poids, ...reste } = r; void sexe; void age; void taille; void poids; setR(reste); setErreur(''); setEtape(etape + 1); };
  const recommencer = () => { setR({}); setCorps({ age: '', taille: '', poids: '' }); setErreur(''); setEtape(0); };

  return (
    <>
      <Stack.Screen options={{ title: page('callisthenie', langue).t }} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {!fini ? (
          <View>
            <Text style={styles.etape}>{fmt(T.ui.etape, [etape + 1, QS.length])}</Text>
            <Text style={styles.question}>{T.q[q].t}</Text>
            {q === 'corps' ? (
              <View>
                <Text style={F.label}>{T.q.corps.sexe}</Text>
                <View style={styles.rangee}>
                  {(['f', 'h', 'x'] as const).map((v) => <Choix key={v} titre={T.q.corps[v]} actif={corps.sexe === v} onPress={() => setCorps({ ...corps, sexe: v })} />)}
                </View>
                <Champ label={T.q.corps.age} value={corps.age} onChangeText={(x) => setCorps({ ...corps, age: x })} keyboardType="number-pad" maxLength={2} />
                <Champ label={T.q.corps.taille} value={corps.taille} onChangeText={(x) => setCorps({ ...corps, taille: x })} keyboardType="number-pad" maxLength={3} />
                <Champ label={T.q.corps.poids} value={corps.poids} onChangeText={(x) => setCorps({ ...corps, poids: x })} keyboardType="decimal-pad" maxLength={5} />
                <Note>{T.q.corps.aide}</Note>
                <Erreur>{erreur}</Erreur>
                <Bouton titre={T.ui.suivant} onPress={validerCorps} />
                <Bouton titre={T.ui.passer} onPress={passer} secondaire />
              </View>
            ) : (
              <View>
                {Object.entries(T.q[q].o).map(([k, lib]) => <Choix key={k} titre={lib} actif={r[q as keyof Reponses] === k} onPress={() => repondre(q, k)} />)}
              </View>
            )}
            {etape > 0 ? <Bouton titre={T.ui.retour} onPress={() => { setErreur(''); setEtape(etape - 1); }} secondaire /> : null}
            <Note>{T.ui.note}</Note>
          </View>
        ) : P && N ? (
          <View>
            <Text style={styles.titre}>{T.plan.titre}</Text>
            <Text style={styles.p}>{fmt(T.plan.resume, [r.freq!, r.duree!, T.niv_nom[r.niv!], T.obj_nom[r.obj!]])}{r.duo === 'duo' ? T.plan.resume_duo : ''}</Text>
            {P.seances.map((s, i) => (
              <View key={i} style={styles.seance}>
                <Text style={styles.h3}>{fmt(T.plan.seance, [s.jour, s.titre])}</Text>
                <Text style={styles.sous}>{T.plan.echauffement}</Text>
                {T.plan.ech.map((x, k) => <Text key={k} style={styles.puce}>• {x}</Text>)}
                <Text style={styles.sous}>{T.plan.corps}{s.circuit ? ' — ' + fmt(T.plan.circuit, [s.series]) : ''}</Text>
                {s.exos.map((e, k) => (
                  <View key={k} style={styles.exo}>
                    {/* illustration de la posture (src/images.ts, EXERCICES, une par exercice) ; appui = en grand */}
                    <ImageExo id={e.id} grand={grand === e.id} onPress={() => setGrand(grand === e.id ? null : e.id)} />
                    <View style={styles.exoTextes}>
                      <Text style={styles.exoNom}>{k + 1}. {nom(T, e.id)}{e.duo ? <Text style={styles.badge}>  {T.cat.duo.toUpperCase()}</Text> : null} — <Text style={styles.charge}>{s.circuit ? e.charge : fmt(T.plan.series, [e.series, e.charge])}</Text></Text>
                      <Text style={styles.consigne}>{consigne(T, e.id)}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.p}>{fmt(T.plan.repos, [T.plan[reposCle(s.circuit, r.obj!)]])}</Text>
                {s.fin ? (() => { const fin = s.fin; return (
                  <View style={styles.exo}>
                    <ImageExo id={fin.id} grand={grand === fin.id} onPress={() => setGrand(grand === fin.id ? null : fin.id)} />
                    <Text style={[styles.p, styles.exoTextes]}>{fmt(T.plan.finisher, [fmt(T.plan.intervalles, [fin.n, nom(T, fin.id)])])}</Text>
                  </View>
                ); })() : null}
                <Text style={styles.p}><Text style={styles.gras}>{T.plan.retour}</Text> — {T.plan.retour_duree}{dp(T)}{s.retour.map((id) => nom(T, id)).join(', ')}.</Text>
                <View style={styles.retourImages}>
                  {s.retour.map((id) => <ImageExo key={id} id={id} petit grand={grand === id} onPress={() => setGrand(grand === id ? null : id)} />)}
                </View>
              </View>
            ))}
            <Text style={styles.h3}>{T.plan.progression}</Text>
            <Text style={styles.p}>{T.plan.prog_regle}</Text>
            {P.prog.map((p, k) => (
              <View key={k} style={styles.progLigne}>
                <ImageExo id={p[1]} petit grand={grand === 'prog-' + p[1]} onPress={() => setGrand(grand === 'prog-' + p[1] ? null : 'prog-' + p[1])} />
                <Text style={[styles.puce, styles.exoTextes]}>• {fmt(T.plan.prog_vers, [nom(T, p[0]), nom(T, p[1])])}</Text>
              </View>
            ))}
            <Text style={styles.h3}>{T.plan.semaines}</Text>
            {T.plan.sem.map((x, k) => <Text key={k} style={styles.puce}>{k + 1}. {x}</Text>)}
            {r.duo === 'duo' ? <><Text style={styles.h3}>{T.plan.duo_titre}</Text><Text style={styles.p}>{T.plan.duo_note}</Text></> : null}
            {r.gene !== 'aucun' ? <><Text style={styles.h3}>{T.plan.gene_titre}</Text><Text style={styles.p}>{T.plan.gene[r.gene!]}</Text></> : null}
            <Text style={styles.h3}>{T.plan.conseils_titre}</Text>
            {T.plan.conseils.map((x, k) => <Text key={k} style={styles.puce}>• {x}</Text>)}
            <Text style={styles.titre}>{T.nut.titre}</Text>
            {N.kcal ? (
              <>
                <Text style={styles.p}>{fmt(T.nut.kcal, [N.kcal, N.cible!])} {T.nut.kcal_detail[r.obj!]}.</Text>
                <Text style={styles.p}>{fmt(T.nut.prot, [N.prot!, N.gkg_txt!])} {fmt(T.nut.eau, N.eau!)}</Text>
              </>
            ) : <Text style={styles.p}>{T.nut.sans_mesures}</Text>}
            <Text style={styles.h3}>{T.nut.assiette_titre}</Text>
            {/* assiette des proportions selon l'objectif (schéma exact, components/schemas.tsx) : moitié légumes, un quart protéines,
                un quart féculents ; en trois tiers pour la prise de muscle */}
            <View style={styles.assiette}>
              <Assiette secteurs={r.obj === 'muscle'
                ? [{ angle: 120, couleur: '#9DBF8A' }, { angle: 120, couleur: '#D8A0A0' }, { angle: 120, couleur: '#E3C27A' }]
                : [{ angle: 180, couleur: '#9DBF8A' }, { angle: 90, couleur: '#D8A0A0' }, { angle: 90, couleur: '#E3C27A' }]} taille={110} />
              <Text style={[styles.p, styles.exoTextes]}>{T.nut.assiette[r.obj!]}</Text>
            </View>
            <Text style={styles.h3}>{T.nut.sources_titre}</Text><Text style={styles.p}>{T.nut.sources[r.regime!]}</Text>
            <Text style={styles.h3}>{T.nut.journee}</Text><Text style={styles.p}>{T.nut.portions[N.bande]}</Text>
            {T.nut.repas.map((rep, k) => <Text key={k} style={styles.puce}><Text style={styles.gras}>{rep}</Text>{dp(T)}{T.nut.menus[r.regime!][k]}</Text>)}
            <Text style={styles.p}>{T.nut.timing}</Text>
            <Text style={styles.h3}>{T.nut.sommeil_titre}</Text><Text style={styles.p}>{T.nut.sommeil[r.sommeil!]}</Text>
            <View style={styles.avert}><Text style={styles.avertTxt}>{T.avert}</Text></View>
            <Bouton titre={T.ui.imprimer} onPress={() => { Share.share({ message: texteDuPlan(r, T, P) }).catch(() => undefined); }} />
            <Bouton titre={T.ui.recommencer} onPress={recommencer} secondaire />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  etape: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: COULEURS.texteMuet, marginBottom: 6 },
  question: { fontSize: 19, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 12 },
  rangee: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  choix: { backgroundColor: COULEURS.fondEleve, borderWidth: 1.5, borderColor: COULEURS.bordure, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 9 },
  choixActif: { borderColor: COULEURS.primaire, backgroundColor: COULEURS.fondDoux },
  choixTxt: { fontSize: 16, color: COULEURS.texte, lineHeight: 22 },
  choixTxtActif: { color: COULEURS.primaireFonce, fontWeight: '600' },
  presse: { opacity: 0.8 },
  titre: { fontSize: 22, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 17, fontWeight: '700', color: COULEURS.primaire, marginTop: 16, marginBottom: 6 },
  sous: { fontWeight: '700', color: COULEURS.texte, marginTop: 10, marginBottom: 4 },
  p: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 6 },
  puce: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginLeft: 6, marginBottom: 2 },
  gras: { fontWeight: '700' },
  seance: { backgroundColor: COULEURS.fondMuet, borderRadius: 12, padding: 12, marginTop: 10 },
  exo: { marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 },
  exoTextes: { flex: 1, minWidth: 160 },
  exoImage: { borderRadius: 10, overflow: 'hidden' },
  exoImageGrand: { width: '100%', alignItems: 'center', borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  retourImages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  progLigne: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  assiette: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  exoNom: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, fontWeight: '700' },
  charge: { fontWeight: '400' },
  consigne: { fontSize: 13, lineHeight: 18, color: COULEURS.texteMuet },
  badge: { fontSize: 11, fontWeight: '700', color: COULEURS.coeur },
  avert: { backgroundColor: COULEURS.avertFond, borderRadius: 10, padding: 12, marginTop: 14, marginBottom: 10 },
  avertTxt: { color: COULEURS.avertTexte, fontSize: 14, lineHeight: 20 },
});
