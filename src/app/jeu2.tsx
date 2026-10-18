// « Nous connaissons-nous ? », natif : mêmes questions, même API et même règle que le site (assets/js/jeu2.js).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Illustration } from '@/components/illustration';
import { pousser } from '@/compte';
import type { Langue } from '@/i18n';
import { JEU2 } from '@/images';
import jeu2 from '@/moteur/jeu2.json';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { page, SITE } from '@/site';
import { COULEURS } from '@/theme';

type Q = [string, string[]];
const D = jeu2 as unknown as { nom: Record<string, string>; questions: Record<string, Q>[] };
const UI = (ui as { jeu2: Record<string, Record<string, string>>; jeu2Page: Record<string, { h1: string; etapes: string[]; prive: string }> });
const CLE = 'ap.jeu2';
const fmt = (s: string, ...v: (string | number)[]) => { let i = 0; return s.replace(/%[sd]/g, () => String(v[i++] ?? '')); };
const LOCAL: Record<Langue, { code: string; rejoindre: string; ou: string }> = {
  fr: { code: 'Code d’invitation reçu', rejoindre: 'Rejoindre la partie', ou: 'ou' }, en: { code: 'Invitation code received', rejoindre: 'Join the game', ou: 'or' },
  de: { code: 'Erhaltener Einladungscode', rejoindre: 'Spiel beitreten', ou: 'oder' }, es: { code: 'Código de invitación recibido', rejoindre: 'Unirse a la partida', ou: 'o' },
  it: { code: 'Codice d’invito ricevuto', rejoindre: 'Unisciti alla partita', ou: 'oppure' }, pt: { code: 'Código de convite recebido', rejoindre: 'Entrar no jogo', ou: 'ou' },
  nl: { code: 'Ontvangen uitnodigingscode', rejoindre: 'Meedoen', ou: 'of' }, pl: { code: 'Otrzymany kod zaproszenia', rejoindre: 'Dołącz do gry', ou: 'lub' },
  tr: { code: 'Alınan davet kodu', rejoindre: 'Oyuna katıl', ou: 'ya da' },
};
type Partie = { code: string; j: string; role: string; t: number };
type EtatApi = { ok: boolean; etat: 'attente' | 'en_cours' | 'fini'; moi: number; joueurs: { prenom: string; fini: boolean }[]; resultats?: { moi: number[][]; devine: number[][] }; erreur?: string };

async function api(methode: string, chemin: string, corps?: unknown): Promise<{ ok: boolean; statut: number } & Record<string, unknown>> {
  const r = await fetch(SITE + 'api/jeu' + chemin, { method: methode, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: corps ? JSON.stringify(corps) : undefined, cache: 'no-store' });
  const x = await r.json().catch(() => ({ ok: false }));
  return { ...x, statut: r.status };
}
async function parties(): Promise<Partie[]> { try { const p = JSON.parse((await AsyncStorage.getItem(CLE)) || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } }
async function garderPartie(p: Partie) { const l = (await parties()).filter((x) => x.code !== p.code); l.unshift(p); await AsyncStorage.setItem(CLE, JSON.stringify(l.slice(0, 20))); pousser(); }
async function oublierPartie(code: string) { await AsyncStorage.setItem(CLE, JSON.stringify((await parties()).filter((x) => x.code !== code))); pousser(); }

type Mode = { m: 'accueil' } | { m: 'invite'; code: string; hote: string } | { m: 'quiz'; autre: string; suite: (moi: number[], devine: number[]) => void } | { m: 'suivi'; code: string; j: string } | { m: 'erreur'; msg: string };

export default function Jeu2() {
  const { langue, profil } = useProfil();
  const lg: Langue = langue;
  const t = UI.jeu2[lg] || UI.jeu2.fr, L = LOCAL[lg], Q = D.questions.map((q) => q[lg] || q.fr), N = Q.length;
  const params = useLocalSearchParams<{ code?: string }>();
  const [mode, setMode] = useState<Mode>({ m: 'accueil' });
  const [mesParties, setMesParties] = useState<Partie[]>([]);
  const [prenom, setPrenom] = useState(profil.prenom || '');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [attente, setAttente] = useState(false);
  const [etat, setEtat] = useState<EtatApi | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { parties().then(setMesParties); }, [mode]);
  useEffect(() => { if (params.code) invitation(String(params.code).toUpperCase()); }, [params.code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);

  const erreur = (msg?: string) => setMode({ m: 'erreur', msg: msg || t.erreur });

  const suivre = useCallback(async (code: string, j: string) => {
    if (minuteur.current) clearTimeout(minuteur.current);
    setMode({ m: 'suivi', code, j });
    try {
      const x = (await api('GET', '?code=' + encodeURIComponent(code) + '&j=' + encodeURIComponent(j))) as unknown as EtatApi & { statut: number };
      if (!x.ok) { if (x.statut === 404) { await oublierPartie(code); erreur(t.introuvable); } else erreur(); return; }
      setEtat(x);
      if (x.etat !== 'fini') minuteur.current = setTimeout(() => suivre(code, j), 6000);
    } catch { erreur(); }
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  async function invitation(code: string) {
    const deja = (await parties()).find((p) => p.code === code);
    if (deja) { suivre(deja.code, deja.j); return; }
    setAttente(true);
    const x = await api('GET', '/invitation?code=' + encodeURIComponent(code)).catch(() => null);
    setAttente(false);
    if (!x || !x.ok) { erreur(t.introuvable); return; }
    if (!x.libre) { erreur(t.complet); return; }
    setMode({ m: 'invite', code, hote: String(x.hote || '') });
  }

  const commencer = (autre: string, suite: (moi: number[], devine: number[]) => void) => setMode({ m: 'quiz', autre, suite });

  const creer = () => commencer('', async (moi, devine) => {
    setAttente(true);
    try {
      const x = await api('POST', '', { l: lg, prenom: prenom.trim() });
      if (!x.ok) throw new Error();
      const code = String(x.code), j = String(x.j);
      await garderPartie({ code, j, role: 'hote', t: Date.now() });
      const y = await api('POST', '/reponses', { code, j, moi, devine });
      if (!y.ok) throw new Error();
      setAttente(false); suivre(code, j);
    } catch { setAttente(false); erreur(); }
  });

  const rejoindre = (code: string, hote: string) => commencer(hote, async (moi, devine) => {
    setAttente(true);
    try {
      const x = await api('POST', '/rejoindre', { code, prenom: prenom.trim() });
      if (!x.ok) { setAttente(false); erreur(x.erreur === 'complet' ? t.complet : undefined); return; }
      const j = String(x.j);
      await garderPartie({ code, j, role: 'invite', t: Date.now() });
      const y = await api('POST', '/reponses', { code, j, moi, devine });
      if (!y.ok) throw new Error();
      setAttente(false); suivre(code, j);
    } catch { setAttente(false); erreur(); }
  });

  const lienInvitation = (code: string) => SITE + page('jeu2', lg).u + '#code=' + code;

  if (attente) return <View style={styles.centre}><ActivityIndicator color={COULEURS.primaire} /><Text style={styles.muet}>{t.envoi}</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: D.nom[lg] || D.nom.fr }} />
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        {mode.m === 'erreur' ? (
          <>
            <Text style={styles.erreur}>{mode.msg}</Text>
            <Bouton titre={t.rejouer} onPress={() => setMode({ m: 'accueil' })} />
          </>
        ) : null}

        {mode.m === 'accueil' ? (
          <>
            <Text style={styles.intro}>{t.intro}</Text>
            <Text style={styles.label}>{t.prenom}</Text>
            <TextInput style={styles.entree} value={prenom} onChangeText={setPrenom} maxLength={30} autoCapitalize="words" />
            <Bouton titre={t.commencer} onPress={creer} />
            <Text style={[styles.muet, { textAlign: 'center', marginVertical: 10 }]}>{L.ou}</Text>
            <Text style={styles.label}>{L.code}</Text>
            <TextInput style={styles.entree} value={codeSaisi} onChangeText={(v) => setCodeSaisi(v.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6))} autoCapitalize="characters" autoCorrect={false} maxLength={6} />
            <Bouton secondaire titre={L.rejoindre} onPress={() => { if (codeSaisi.length === 6) invitation(codeSaisi); }} />
            {mesParties.length ? (
              <>
                <Text style={styles.sousTitre}>{t.mes_parties}</Text>
                {mesParties.map((p) => (
                  <Pressable accessibilityRole="button" key={p.code} onPress={() => suivre(p.code, p.j)} style={styles.partie}>
                    <Text style={styles.partieTxt}>{fmt(t.partie_du, new Date(p.t).toLocaleDateString(lg))} · {p.code}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            <Text style={styles.sousTitre}>{UI.jeu2Page[lg]?.h1}</Text>
            {(UI.jeu2Page[lg] || UI.jeu2Page.fr).etapes.map((e, i) => <Text key={i} style={styles.etape}>{i + 1}. {e}</Text>)}
            <Text style={styles.muet}>{(UI.jeu2Page[lg] || UI.jeu2Page.fr).prive}</Text>
          </>
        ) : null}

        {mode.m === 'invite' ? (
          <>
            <Text style={styles.question}>{mode.hote ? fmt(t.invite_par, mode.hote) : t.invite_anonyme}</Text>
            <Text style={styles.intro}>{fmt(t.intro_invite, mode.hote || t.partenaire)}</Text>
            <Text style={styles.label}>{t.prenom}</Text>
            <TextInput style={styles.entree} value={prenom} onChangeText={setPrenom} maxLength={30} autoCapitalize="words" />
            <Bouton titre={t.commencer} onPress={() => rejoindre(mode.code, mode.hote)} />
          </>
        ) : null}

        {mode.m === 'quiz' ? <Questionnaire Q={Q} N={N} t={t} autre={mode.autre} suite={mode.suite} /> : null}

        {mode.m === 'suivi' && etat && etat.etat !== 'fini' ? (
          <>
            {etat.moi === 0 && etat.joueurs.length < 2 ? (
              <>
                <Text style={styles.sousTitre}>{t.inviter}</Text>
                <Text style={styles.intro}>{t.inviter_txt}</Text>
                <Text selectable style={styles.lien}>{lienInvitation(mode.code)}</Text>
                <Text style={styles.code}>{mode.code}</Text>
                <Bouton titre={t.partager} onPress={() => Share.share(Platform.OS === 'ios'
                  ? { message: fmt(t.invitation_txt, etat.joueurs[0].prenom || ''), url: lienInvitation(mode.code) }
                  : { message: fmt(t.invitation_txt, etat.joueurs[0].prenom || '') + ' ' + lienInvitation(mode.code) }).catch(() => undefined)} />
              </>
            ) : null}
            <Text style={styles.attente}>{fmt(t.attente, (etat.joueurs[1 - etat.moi] && etat.joueurs[1 - etat.moi].prenom) || t.partenaire)}</Text>
            <ActivityIndicator color={COULEURS.primaire} />
          </>
        ) : null}

        {mode.m === 'suivi' && etat && etat.etat === 'fini' && etat.resultats ? (
          <Resultats Q={Q} N={N} t={t} x={etat} onNouveau={() => { setEtat(null); setMode({ m: 'accueil' }); }} />
        ) : null}
      </ScrollView>
    </>
  );
}

function Bouton({ titre, onPress, secondaire }: { titre: string; onPress: () => void; secondaire?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [secondaire ? styles.boutonSec : styles.bouton, pressed && styles.presse]}>
      <Text style={secondaire ? styles.boutonSecTxt : styles.boutonTxt}>{titre}</Text>
    </Pressable>
  );
}

function Questionnaire({ Q, N, t, autre, suite }: { Q: Q[]; N: number; t: Record<string, string>; autre: string; suite: (moi: number[], devine: number[]) => void }) {
  const [k, setK] = useState(0);
  const [moi, setMoi] = useState<number[]>([]);
  const [devine, setDevine] = useState<number[]>([]);
  const [pause, setPause] = useState(false);
  const surMoi = k < N, i = surMoi ? k : k - N, q = Q[i];
  if (pause) return (
    <>
      <Text style={styles.question}>{fmt(t.a_lui, autre || t.partenaire)}</Text>
      <Bouton titre={t.continuer} onPress={() => setPause(false)} />
    </>
  );
  const choisir = (c: number) => {
    const m = [...moi], d = [...devine];
    if (surMoi) m[i] = c; else d[i] = c;
    setMoi(m); setDevine(d);
    const k2 = k + 1;
    if (k2 === N) { setK(k2); setPause(true); return; }
    if (k2 === 2 * N) { suite(m, d); return; }
    setK(k2);
  };
  return (
    <>
      <View style={styles.prog}><View style={[styles.progFond, { width: `${Math.round(100 * k / (2 * N))}%` as const }]} /></View>
      <Text style={styles.muet}>{surMoi ? t.sur_moi : fmt(t.sur_autre, autre || t.partenaire)} · {i + 1}/{N}</Text>
      <Text style={styles.question}>{q[0]}</Text>
      {q[1].map((o, c) => (
        <Pressable accessibilityRole="button" key={c} onPress={() => choisir(c)} style={({ pressed }) => [styles.choix, pressed && styles.presse]}><Text style={styles.choixTxt}>{o}</Text></Pressable>
      ))}
      {k > 0 ? <Pressable accessibilityRole="button" onPress={() => { if (k === N) setPause(false); setK(k - 1); }}><Text style={styles.retour}>{t.precedent}</Text></Pressable> : null}
    </>
  );
}

function Resultats({ Q, N, t, x, onNouveau }: { Q: Q[]; N: number; t: Record<string, string>; x: EtatApi; onNouveau: () => void }) {
  const R = x.resultats!, J = x.joueurs, moi = x.moi, lui = 1 - moi;
  const nom = (i: number) => J[i].prenom || (i === moi ? t.vous : t.partenaire);
  const score = (qui: number, sur: number) => { let n = 0; for (let i = 0; i < N; i++) if (R.devine[qui][i] === R.moi[sur][i]) n++; return n; };
  const s1 = score(moi, lui), s2 = score(lui, moi), pc = Math.round(100 * (s1 + s2) / (2 * N));
  const palier = pc >= 80 ? 'v80' : pc >= 60 ? 'v60' : pc >= 40 ? 'v40' : 'v0';
  const verdict = t[palier];
  return (
    <>
      {/* une scène de couple accordée au palier du verdict (src/images.ts, JEU2) */}
      <Illustration image={JEU2[palier]} taille={300} style={styles.verdictImage} />
      <Text style={styles.score}>{pc} %</Text>
      <Text style={[styles.muet, { textAlign: 'center' }]}>{t.ensemble}</Text>
      <Text style={styles.verdict}>{verdict}</Text>
      <Text style={styles.etape}>{fmt(t.a_devine, nom(moi), s1, N, nom(lui))}</Text>
      <Text style={styles.etape}>{fmt(t.a_devine, nom(lui), s2, N, nom(moi))}</Text>
      <Bouton titre={t.partager} onPress={() => Share.share({ message: fmt(t.partage_txt, pc) }).catch(() => undefined)} />
      <Bouton secondaire titre={t.rejouer} onPress={onNouveau} />
      <Text style={styles.sousTitre}>{t.detail}</Text>
      {Q.map((q, i) => {
        const o = q[1], c1 = R.devine[lui][i] === R.moi[moi][i], c2 = R.devine[moi][i] === R.moi[lui][i];
        return (
          <View key={i} style={styles.detail}>
            <Text style={styles.detailQ}>{q[0]}</Text>
            <Text style={styles.detailL}><Text style={styles.gras}>{nom(moi)}</Text> : {o[R.moi[moi][i]]}  <Text style={c1 ? styles.ok : styles.ko}>{c1 ? '✓' : '✗'} {fmt(t.pensait, nom(lui), o[R.devine[lui][i]])}</Text></Text>
            <Text style={styles.detailL}><Text style={styles.gras}>{nom(lui)}</Text> : {o[R.moi[lui][i]]}  <Text style={c2 ? styles.ok : styles.ko}>{c2 ? '✓' : '✗'} {fmt(t.pensait, nom(moi), o[R.devine[moi][i]])}</Text></Text>
          </View>
        );
      })}
      <Text style={styles.muet}>{t.a_discuter}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COULEURS.fond },
  intro: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: COULEURS.texte, marginTop: 8, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte, marginBottom: 10 },
  bouton: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 6 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
  presse: { opacity: 0.8 },
  muet: { color: COULEURS.texteMuet, fontSize: 13, lineHeight: 18 },
  sousTitre: { fontSize: 17, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 6 },
  etape: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 4 },
  partie: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  partieTxt: { color: COULEURS.secondaireFonce, textDecorationLine: 'underline' },
  question: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: COULEURS.primaireFonce, marginVertical: 10 },
  choix: { backgroundColor: COULEURS.fondMuet, borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
  choixTxt: { fontSize: 16, color: COULEURS.texte },
  retour: { color: COULEURS.secondaireFonce, textDecorationLine: 'underline', marginTop: 6 },
  prog: { height: 6, borderRadius: 3, backgroundColor: COULEURS.fondDoux, overflow: 'hidden', marginBottom: 8 },
  progFond: { height: '100%', backgroundColor: COULEURS.primairePlein },
  lien: { color: COULEURS.secondaireFonce, fontSize: 13, marginVertical: 6 },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 4, color: COULEURS.primaire, textAlign: 'center', marginVertical: 8 },
  attente: { color: COULEURS.texteMuet, fontStyle: 'italic', textAlign: 'center', marginVertical: 12 },
  erreur: { color: COULEURS.coeur, fontSize: 15, marginBottom: 10 },
  score: { fontSize: 52, fontWeight: '800', color: COULEURS.primaire, textAlign: 'center', marginTop: 10 },
  verdict: { fontSize: 17, fontWeight: '600', textAlign: 'center', color: COULEURS.texte, marginVertical: 10 },
  verdictImage: { width: '100%', aspectRatio: 1.5, height: undefined, alignSelf: 'center', marginBottom: 12 },
  detail: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  detailQ: { fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 2 },
  detailL: { fontSize: 14, lineHeight: 20, color: COULEURS.texte },
  gras: { fontWeight: '700' },
  ok: { color: COULEURS.vert }, ko: { color: COULEURS.coeur },
});
