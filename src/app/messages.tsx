// Mes messages (messagerie interne, Alexis 07/10/2026), comme la page « Mes messages » du site (messages.js) : formulaire « Nous écrire »,
// fils du membre connecté avec les réponses et la préférence « recevoir aussi par courriel » ; boîte du compte ADMIN (réponse par la
// messagerie, par courriel ou les deux ; clore un fil) ; sans compte, un avertissement (la réponse arrive par courriel) et la trace des
// messages envoyés depuis l'appareil. Textes : ui.json messages (messages.js du site).
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import { noterNonLus, tirer } from '@/compte';
import { AVEC_OIDC, connexionOidc } from '@/connexion';
import { fmt } from '@/i18n';
import { changerEtat, envoyer, fils as lireFils, lireTrace, marquerLu, preferenceMail, repondre, type Fil, type Rep, type Trace } from '@/messages';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_M = (ui as unknown as { messages: Record<string, TX> }).messages;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
const RX_COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function dateTexte(iso: string, lg: string): string {
  try { return new Date(iso).toLocaleString(lg, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso.slice(0, 16); }
}
function erreur(t: TX, j: Rep): string {
  const e = j.erreur;
  return e === 'courriel' ? t.errCourriel : e === 'sujet' ? t.errSujet : e === 'texte' ? t.errTexte : e === 'trop' ? t.errTrop : t.errReseau;
}

/** Un fil : messages en bulles, réponse ; pour l'admin, choix du canal et clôture. */
function CarteFil({ f, admin, t, lg, recharger }: { f: Fil; admin: boolean; t: TX; lg: string; recharger: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [canal, setCanal] = useState(f.invite ? 'mail' : 'interne');
  const [statut, setStatut] = useState('');
  const [nonLu, setNonLu] = useState(f.non_lu);
  const ETATS: TX = { ouvert: t.etatOuvert, repondu: t.etatRepondu, clos: t.etatClos };
  const basculer = () => {
    const o = !ouvert; setOuvert(o);
    if (o && nonLu) { setNonLu(false); marquerLu(f.id).then((j) => { if (j.ok && typeof j.non_lus === 'number') noterNonLus(j.non_lus).catch(() => undefined); }); }
  };
  const envoyerReponse = async () => {
    if (texte.trim().length < 2) { setStatut(t.errTexte); return; }
    setStatut('…');
    const j = await repondre(f.id, texte.trim(), admin ? canal : undefined);
    if (!j.ok) { setStatut(erreur(t, j)); return; }
    setTexte('');
    setStatut(t.repEnvoyee + (admin && j.mailDemande ? ' ' + (j.mail ? t.mailEnvoye : t.mailNon) : ''));
    recharger();
  };
  return (
    <View style={[styles.fil, nonLu && styles.filNonLu]}>
      <Pressable onPress={basculer} accessibilityRole="button" accessibilityState={{ expanded: ouvert }}>
        <Text style={styles.sujet}>{f.sujet}{nonLu ? '  ' : ''}{nonLu ? <Text style={styles.badge}> {t.nouveau} </Text> : null}</Text>
        <Text style={styles.info}>
          {admin ? (f.nom ? f.nom + ' · ' : '') + (f.courriel || '') + (f.invite ? ' (' + t.sansCompte + ', ' + t.nonVerifieAdmin + ')' : '') + ' · ' + (f.langue || '').toUpperCase() + ' · ' : ''}
          {(ETATS[f.etat] || t.etatOuvert) + ' · ' + dateTexte(f.maj, lg)}
        </Text>
      </Pressable>
      {ouvert ? (
        <View>
          {f.messages.map((m, i) => (
            <View key={m.id || i} style={[styles.bulle, m.auteur === 'admin' ? styles.equipe : styles.membre]}>
              <Text style={styles.meta}>{(m.auteur === 'admin' ? t.equipe + ' · ' : m.verifie === false ? (admin ? t.nonVerifieAdmin : t.nonVerifie) + ' · ' : admin ? '' : t.vous + ' · ') + dateTexte(m.cree, lg)}</Text>
              <Text style={styles.texte} selectable>{m.texte}</Text>
            </View>
          ))}
          {f.id ? (
            <>
              <Text style={F.label}>{t.repondre}</Text>
              <TextInput style={styles.zone} value={texte} onChangeText={setTexte} multiline maxLength={5000} textAlignVertical="top" />
              {admin ? (
                <View style={styles.canaux}>
                  <Text style={F.muet}>{t.canal} :</Text>
                  {(['interne', 'mail', 'deux'] as const).map((k) => {
                    const lib = k === 'interne' ? t.canalInterne : k === 'mail' ? t.canalMail : t.canalDeux;
                    const off = !!f.invite && k === 'interne';
                    return (
                      <Pressable key={k} disabled={off} onPress={() => setCanal(k)} style={[styles.puce, canal === k && styles.puceActive, off && styles.puceOff]} accessibilityRole="radio" accessibilityState={{ checked: canal === k, disabled: off }}>
                        <Text style={[styles.puceTxt, canal === k && styles.puceTxtActive]}>{lib}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <Bouton titre={t.envoyerRep} onPress={envoyerReponse} />
              {admin ? <Bouton titre={f.etat === 'clos' ? t.rouvrir : t.clore} secondaire onPress={() => { changerEtat(f.id, f.etat === 'clos' ? 'ouvert' : 'clos').then(recharger); }} /> : null}
              {statut ? <Text style={styles.statut}>{statut}</Text> : null}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function Messages() {
  const { langue, profil, compte } = useProfil();
  const t = UI_M[langue] || UI_M.fr;
  const [nom, setNom] = useState(profil.prenom || '');
  const [courriel, setCourriel] = useState(profil.courriel || '');
  const [sujet, setSujet] = useState('');
  const [texte, setTexte] = useState('');
  const [statut, setStatut] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [liste, setListe] = useState<Fil[] | null>(null);
  const [admin, setAdmin] = useState(false);
  const [mail, setMail] = useState(false);
  const [nonLusSeuls, setNonLusSeuls] = useState(false);
  const [trace, setTrace] = useState<Trace[]>([]);

  const recharger = useCallback(async () => {
    if (!compte) { setListe(null); setTrace(await lireTrace()); return; }
    const r = await lireFils();
    if (!r.ok) { setListe([]); return; }
    setListe(r.fils); setAdmin(r.admin); setMail(r.mail);
    noterNonLus(r.fils.filter((f) => f.non_lu).length, r.admin).catch(() => undefined);
  }, [compte]);
  useFocusEffect(useCallback(() => { recharger(); }, [recharger]));

  const envoyerMessage = async () => {
    const c = courriel.trim().toLowerCase();
    if (!compte && !RX_COURRIEL.test(c)) { setStatut(t.errCourriel); return; }
    if (!sujet.trim()) { setStatut(t.errSujet); return; }
    if (texte.trim().length < 2) { setStatut(t.errTexte); return; }
    setEnvoi(true); setStatut('…');
    const j = await envoyer({ nom: nom.trim(), courriel: compte ? '' : c, sujet: sujet.trim(), texte: texte.trim(), langue });
    setEnvoi(false);
    if (j.statut === 401 && compte) { await tirer(); setStatut(t.sessionFinie); return; }   // session expirée : le compte est oublié, formulaire d'invité
    if (!j.ok) { setStatut(erreur(t, j)); return; }
    setSujet(''); setTexte('');
    setStatut(compte ? t.envoye : fmt(t.envoyeInvite, c));
    recharger();
  };

  const visibles = (liste || []).filter((f) => !nonLusSeuls || f.non_lu);
  return (
    <>
      <Stack.Screen options={{ title: (UI_E[langue] || UI_E.fr).ongMessages }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        {!admin ? (
          <>
            <Text style={F.h2}>{t.ecrire}</Text>
            {!compte ? (
              <View style={styles.avert}>
                <Text style={styles.avertTxt}>{t.avertInvite}</Text>
                {AVEC_OIDC ? <Bouton titre={t.seConnecter} secondaire onPress={() => { connexionOidc(langue).then(() => recharger()); }} /> : null}
              </View>
            ) : null}
            <Champ label={t.nom} value={nom} onChangeText={setNom} maxLength={80} autoComplete="name" />
            {!compte ? (
              <Champ label={t.courriel} value={courriel} onChangeText={setCourriel} maxLength={254} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
            ) : null}
            <Champ label={t.sujet} value={sujet} onChangeText={setSujet} maxLength={150} />
            <Text style={F.label}>{t.message}</Text>
            <TextInput style={styles.zone} value={texte} onChangeText={setTexte} multiline maxLength={5000} textAlignVertical="top" />
            <Bouton titre={t.envoyer} onPress={envoyerMessage} disabled={envoi} />
            {statut ? <Text style={styles.statut}>{statut}</Text> : null}
            <Text style={[F.muet, styles.note]}>{t.confid}</Text>
          </>
        ) : null}

        {compte ? (
          <>
            <Text style={F.h2}>{admin ? t.boite : t.vosFils}</Text>
            <View style={styles.option}>
              <Text style={[F.texte, styles.flex]}>{admin ? t.nonLusSeuls : t.prefMail}</Text>
              <Switch value={admin ? nonLusSeuls : mail} trackColor={{ true: COULEURS.secondaire }}
                onValueChange={(v) => { if (admin) setNonLusSeuls(v); else { setMail(v); preferenceMail(v); } }} />
            </View>
            {liste === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
            {liste && !visibles.length ? <Text style={F.muet}>{t.aucun}</Text> : null}
            {visibles.map((f) => <CarteFil key={f.id} f={f} admin={admin} t={t} lg={langue} recharger={recharger} />)}
          </>
        ) : trace.length ? (
          <>
            <Text style={F.h2}>{t.trace}</Text>
            {trace.map((x, i) => (
              <CarteFil key={i} f={{ id: 0, sujet: x.sujet, nom: '', etat: 'ouvert', cree: x.date, maj: x.date, non_lu: false, messages: [{ auteur: 'membre', texte: x.texte, cree: x.date }] }}
                admin={false} t={t} lg={langue} recharger={() => undefined} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  avert: { backgroundColor: '#fff4e5', borderColor: '#f0c27a', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  avertTxt: { color: '#6b4300', fontWeight: '600', fontSize: 15, lineHeight: 20 },
  zone: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12, minHeight: 120, fontSize: 16, color: COULEURS.texte },
  statut: { marginTop: 10, color: COULEURS.primaireFonce, fontWeight: '600' },
  note: { marginTop: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  attente: { marginTop: 14 },
  fil: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 12, padding: 12, marginBottom: 10 },
  filNonLu: { borderColor: COULEURS.primaire, borderWidth: 2 },
  sujet: { fontWeight: '700', color: COULEURS.primaire, fontSize: 16 },
  badge: { color: '#fff', backgroundColor: COULEURS.coeur, fontSize: 12, fontWeight: '700' },
  info: { color: COULEURS.texteMuet, fontSize: 13, marginTop: 3 },
  bulle: { borderRadius: 12, padding: 10, marginTop: 8, maxWidth: '92%' },
  membre: { backgroundColor: COULEURS.fondDoux, alignSelf: 'flex-end' },
  equipe: { backgroundColor: '#efe6f7', borderColor: '#d8c4ea', borderWidth: 1, alignSelf: 'flex-start' },
  meta: { color: COULEURS.texteMuet, fontSize: 12, marginBottom: 4 },
  texte: { color: COULEURS.texte, fontSize: 15, lineHeight: 21 },
  canaux: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  puce: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  puceActive: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  puceOff: { opacity: 0.4 },
  puceTxt: { color: COULEURS.texte },
  puceTxtActive: { color: '#fff', fontWeight: '600' },
});
