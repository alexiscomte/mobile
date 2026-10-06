// Sondages « Et vous ? », natifs : les 32 questions du site, vote anonyme (même API que le site), résultats en direct.
// « Mes sondages » (?mes=1 ou puce en tête) : seulement les sondages auxquels on a répondu, avec sa réponse (06/10/2026).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { F, Puce } from '@/components/form';
import { pousser, surCompte } from '@/compte';
import { TEXTES, type Langue } from '@/i18n';
import { TEXTES4 } from '@/i18n4';
import sondages from '@/moteur/sondages.json';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

type Sondage = { id: string; u: Record<string, string>; q: Record<string, string>; o: Record<string, string[]> };
type Resultat = { t: number[]; l: Record<string, number[]> };
const CAT = (sondages as { sondages: Sondage[] }).sondages;
const UI = (ui as { sondage: Record<string, Record<string, string>> }).sondage;
const MIN = 10;
const somme = (a: number[]) => a.reduce((x, y) => x + y, 0);
const fmt = (s: string, x: string | number) => s.replace('%s', String(x));

async function jeton(): Promise<string> {
  let j = await AsyncStorage.getItem('ap.sondage.jeton');
  if (!j) {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    j = Array.from({ length: 24 }, () => c[Math.floor(Math.random() * 64)]).join('');
    await AsyncStorage.setItem('ap.sondage.jeton', j);
  }
  return j;
}

function Barres({ opts, n, mien }: { opts: string[]; n: number[]; mien: number }) {
  const t = somme(n);
  return (
    <View style={{ gap: 8 }}>
      {opts.map((o, i) => {
        const pc = t ? Math.round(100 * n[i] / t) : 0;
        return (
          <View key={i}>
            <View style={styles.barreLigne}><Text style={[styles.lib, i === mien && styles.gras]}>{o}</Text><Text style={styles.pc}>{pc} %</Text></View>
            <View style={styles.barre}><View style={[styles.barreFond, { width: `${pc}%` as const, backgroundColor: i === mien ? COULEURS.primaire : COULEURS.secondaire }]} /></View>
          </View>
        );
      })}
    </View>
  );
}

function Item({ s, lg, t, res, vote, onVote, mes }: { s: Sondage; lg: Langue; t: Record<string, string>; res?: Resultat; vote: number | null; onVote: (c: number) => Promise<boolean>; mes?: boolean }) {
  const [onglet, setOnglet] = useState(0);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const opts = s.o[lg] || s.o.fr, q = s.q[lg] || s.q.fr;
  const total = res ? somme(res.t) : 0;
  const groupes = res ? [{ nom: t.tous, n: res.t }, ...(res.l[lg] && somme(res.l[lg]) >= MIN ? [{ nom: t.langue, n: res.l[lg] }] : [])] : [];
  const aVote = vote !== null && !ouvert;
  return (
    <View style={styles.item}>
      <Text style={styles.question}>{q}</Text>
      {mes && vote !== null && opts[vote] && t.mesRepondu ? <Text style={styles.repondu}>{fmt(t.mesRepondu, opts[vote])}</Text> : null}
      {aVote ? (
        <>
          {groupes.length > 1 ? (
            <View style={styles.onglets}>
              {groupes.map((g, i) => (
                <Pressable key={i} onPress={() => setOnglet(i)} style={[styles.onglet, i === onglet && styles.ongletActif]}>
                  <Text style={[styles.ongletTxt, i === onglet && styles.ongletTxtActif]}>{g.nom} · {fmt(t.votes, somme(g.n))}</Text>
                </Pressable>
              ))}
            </View>
          ) : <Text style={styles.nb}>{t.tous} · {fmt(t.votes, total)}</Text>}
          {groupes[onglet] ? <Barres opts={opts} n={groupes[onglet].n} mien={vote} /> : null}
          <Pressable onPress={() => setOuvert(true)}><Text style={styles.changer}>{t.changer}</Text></Pressable>
        </>
      ) : (
        <View style={{ gap: 8 }}>
          {total ? <Text style={styles.nb}>{t.tous} · {fmt(t.votes, total)}</Text> : <Text style={styles.nb}>{t.zero}</Text>}
          {opts.map((o, i) => (
            <Pressable key={i} disabled={attente} onPress={async () => { setAttente(true); setErreur(false); const ok = await onVote(i); setAttente(false); if (ok) setOuvert(false); else setErreur(true); }}
              style={({ pressed }) => [styles.choix, pressed && styles.presse]}>
              <Text style={styles.choixTxt}>{o}</Text>
            </Pressable>
          ))}
          {attente ? <ActivityIndicator color={COULEURS.primaire} /> : null}
          {erreur ? <Text style={styles.erreur}>{t.erreur}</Text> : null}
        </View>
      )}
    </View>
  );
}

export default function Sondages() {
  const { langue, compte } = useProfil();
  const lg: Langue = langue;
  const t = UI[lg] || UI.fr;
  const T4 = TEXTES4[lg];
  const { mes } = useLocalSearchParams<{ mes?: string }>();
  const [mesSeuls, setMesSeuls] = useState(mes === '1');
  const [res, setRes] = useState<Record<string, Resultat>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [chargement, setChargement] = useState(true);
  const [indispo, setIndispo] = useState(false);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(SITE + 'api/sondage/barometre', { cache: 'no-store' });
      const x = await r.json();
      if (x && x.ok) setRes(x.s || {}); else setIndispo(true);
    } catch { setIndispo(true); }
    setChargement(false);
  }, []);
  useEffect(() => {
    charger();
    const lireVotes = () => AsyncStorage.multiGet(CAT.map((s) => 'ap.sondage:' + s.id)).then((paires) => {
      const v: Record<string, number> = {};
      for (const [k, val] of paires) if (val !== null && /^\d+$/.test(val)) v[k.replace('ap.sondage:', '')] = +val;
      setVotes(v);
    }).catch(() => undefined);
    lireVotes();
    return surCompte((e) => { if (e === 'donnees') lireVotes(); });   // votes reçus du compte pendant que l'écran est ouvert
  }, [charger]);

  const voter = async (s: Sondage, c: number): Promise<boolean> => {
    try {
      const j = await jeton();
      const r = await fetch(SITE + 'api/sondage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ s: s.id, c, l: lg, p: '', j }) });
      const x = await r.json();
      if (!x || !x.ok) return false;
      await AsyncStorage.setItem('ap.sondage:' + s.id, String(c));
      pousser();   // compte connecté : le vote suit (le serveur le relie au jeton de vote du compte)
      setVotes((v) => ({ ...v, [s.id]: c }));
      setRes((prev) => ({ ...prev, [s.id]: { t: x.r.t, l: { ...(prev[s.id] ? prev[s.id].l : {}), [lg]: x.r.l } } }));
      return true;
    } catch { return false; }
  };

  const tous = CAT.filter((s) => s.q[lg]).map((s, i) => ({ s, i, n: res[s.id] ? somme(res[s.id].t) : 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
  const total = tous.reduce((x, y) => x + y.n, 0);
  const liste = mesSeuls ? tous.filter(({ s }) => votes[s.id] !== undefined) : tous;
  return (
    <>
      <Stack.Screen options={{ title: mesSeuls ? T4.mesSondages : t.tous ? (UI[lg] ? titre(lg) : 'Sondages') : 'Sondages' }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <View style={[F.puces, styles.puces]}>
          <Puce titre={t.mesTous || titre(lg)} actif={!mesSeuls} onPress={() => setMesSeuls(false)} />
          <Puce titre={T4.mesSondages} actif={mesSeuls} onPress={() => setMesSeuls(true)} />
        </View>
        {chargement ? <ActivityIndicator color={COULEURS.primaire} /> : null}
        {indispo ? <Text style={styles.erreur}>{t.indispo}</Text> : null}
        {!chargement ? <Text style={styles.total}>{total ? fmt(t.total, total) + ' · ' + t.maj : t.vide}</Text> : null}
        {mesSeuls && !liste.length ? (
          <View style={styles.vide}>
            <Text style={styles.videTxt}>{t.mesVide}</Text>
            {!compte ? <Text style={styles.total}>{fmt(T4.mesCompte, TEXTES[lg].moi)}</Text> : null}
          </View>
        ) : null}
        {liste.map(({ s }) => (
          <Item key={s.id} s={s} lg={lg} t={t} res={res[s.id]} vote={votes[s.id] ?? null} onVote={(c) => voter(s, c)} mes={mesSeuls} />
        ))}
      </ScrollView>
    </>
  );
}

function titre(lg: Langue): string {
  return { fr: 'Les sondages', en: 'The polls', de: 'Die Umfragen', es: 'Las encuestas', it: 'I sondaggi', pt: 'As sondagens', nl: 'De peilingen', pl: 'Ankiety', tr: 'Anketler' }[lg];
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  total: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 10 },
  item: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COULEURS.bordure, paddingVertical: 14 },
  question: { fontSize: 17, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 8, lineHeight: 23 },
  nb: { color: COULEURS.texteMuet, fontSize: 13, marginBottom: 6 },
  choix: { backgroundColor: COULEURS.fondMuet, borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 },
  choixTxt: { fontSize: 15, color: COULEURS.texte },
  presse: { opacity: 0.7 },
  erreur: { color: COULEURS.coeur, fontSize: 13 },
  onglets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  onglet: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ongletActif: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  ongletTxt: { fontSize: 12, color: COULEURS.texteMuet },
  ongletTxtActif: { color: '#fff' },
  barreLigne: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lib: { flex: 1, fontSize: 14, color: COULEURS.texte },
  gras: { fontWeight: '700' },
  pc: { fontWeight: '700', fontVariant: ['tabular-nums'], color: COULEURS.texte },
  barre: { height: 10, borderRadius: 5, backgroundColor: COULEURS.fondDoux, overflow: 'hidden', marginTop: 2 },
  barreFond: { height: '100%', borderRadius: 5 },
  changer: { color: COULEURS.secondaireFonce, textDecorationLine: 'underline', fontSize: 13, marginTop: 8 },
  puces: { marginBottom: 12 },
  repondu: { color: COULEURS.texte, fontSize: 14, marginBottom: 8 },
  vide: { paddingVertical: 14, gap: 8 },
  videTxt: { fontSize: 15, lineHeight: 21, color: COULEURS.texte },
});
