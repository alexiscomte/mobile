// Annuaire « Comptes à suivre » (03/11/2026, specs/annuaire-comptes-payant.md) : comptes réseaux du membre, candidature pour une page (dans une langue du compte),
// statuts et justification. Règle App Store 3.1.1 : aucun prix, aucun lien d'achat, aucun appel à /payer ni /portail ; une fois accepté, le lien de paiement part
// par courriel, hors de l'appli, et le service payé hors appli est reconnu par GET /api/annuaire/etat. Sans compte : invitation à se connecter.
import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { candidater, enregistrerCompte, lireEtat, lirePages, retirerPage, RESEAUX, supprimerCompte, type CompteAnnuaire, type PageAnnuaire, type PageChoix, type Retour } from '@/annuaire-api';
import { Invitation } from '@/components/espace';
import { Bouton, Champ, F, fmt, Label, Puce } from '@/components/form';
import { oublierSession } from '@/compte';
import { LANGUES, NOMS_LANGUES, type Langue } from '@/i18n';
import { TEXTES8 } from '@/i18n8';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type T = (typeof TEXTES8)['fr'];
const PAGES_MONTREES = 20;
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function erreurDe(t: T, r: Retour): string {
  switch (r.erreur) {
    case 'url': case 'reseau': return r.statut === 0 ? t.e_reseau : t.e_url;
    case 'nom': return t.e_nom;
    case 'langue': case 'langue_pages': return t.e_langue;
    case 'limite': case 'limite_pages': return t.e_limite;
    case 'deja': return t.e_deja;
    case 'justification': return t.e_justif;
    case 'trop': return t.e_trop;
    default: return t.e_reseau;
  }
}
function libelleStatut(t: T, statut: string): string {
  switch (statut) {
    case 'a_payer': return t.st_a_payer;
    case 'attente_justification': return t.st_attente_justification;
    case 'actif': return t.st_actif;
    case 'refuse': return t.st_refuse;
    case 'inactif': return t.st_inactif;
    default: return t.st_attente_examen;
  }
}

export default function Annuaire() {
  const { langue, compte } = useProfil();
  const t = TEXTES8[langue] || TEXTES8.fr;
  const session = compte ? compte.session : '';
  const [comptes, setComptes] = useState<CompteAnnuaire[] | null>(null);
  const [actif, setActif] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [ajout, setAjout] = useState(false);

  const charger = useCallback(async () => {
    if (!session) { setComptes(null); return; }
    const e = await lireEtat();
    if (e.statut === 401) { await oublierSession(session); return; }
    if (!e.ok) { setComptes([]); setMsg({ t: e.erreur === 'trop' ? t.e_trop : t.e_reseau, ok: false }); return; }
    setComptes(e.comptes); setActif(e.actif);
  }, [session, t]);
  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  // résultat d'une action : message, puis état relu sur le serveur ; rend true si elle a réussi
  const apres = useCallback(async (r: Retour, succes?: string) => {
    setMsg(r.ok ? (succes ? { t: succes, ok: true } : null) : { t: erreurDe(t, r), ok: false });
    if (r.ok) await charger();
    return r.ok;
  }, [t, charger]);

  return (
    <>
      <Stack.Screen options={{ title: t.menu }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={styles.lead}>{t.intro}</Text>
        <Text style={styles.h2} accessibilityRole="header">{t.avantagesTitre}</Text>
        <Text style={styles.puce}>• {t.avantage1}</Text>
        <Text style={styles.puce}>• {t.avantage2}</Text>
        {!compte ? <Invitation texte={t.connecter} lg={langue} /> : (
          <>
            {actif ? <Text style={styles.actif}>{t.actif}</Text> : null}
            {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
            <Text style={styles.h2} accessibilityRole="header">{t.mesComptes}</Text>
            {comptes === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
            {comptes && !comptes.length ? <Text style={styles.muet}>{t.aucunCompte}</Text> : null}
            {(comptes || []).map((c) => <CarteCompte key={c.id} c={c} t={t} apres={apres} />)}
            {ajout
              ? <FormulaireCompte t={t} langue={langue} apres={async (r) => { const ok = await apres(r); if (ok) setAjout(false); return ok; }} annuler={() => setAjout(false)} />
              : <View style={styles.bouton}><Bouton titre={t.ajouter} onPress={() => { setMsg(null); setAjout(true); }} /></View>}
          </>
        )}
      </ScrollView>
    </>
  );
}

function FormulaireCompte({ t, langue, apres, annuler }: { t: T; langue: Langue; apres: (r: Retour) => Promise<boolean>; annuler: () => void }) {
  const [reseau, setReseau] = useState(RESEAUX[0][0]);
  const [url, setUrl] = useState('');
  const [nom, setNom] = useState('');
  const [langues, setLangues] = useState<string[]>([langue]);
  const [envoi, setEnvoi] = useState(false);
  const basculer = (l: string) => setLangues((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]));
  const envoyer = async () => {
    setEnvoi(true);
    await apres(await enregistrerCompte(reseau, url.trim(), nom.trim(), langues));
    setEnvoi(false);
  };
  return (
    <View style={styles.carte}>
      <Label>{t.reseau}</Label>
      <View style={F.puces}>{RESEAUX.map(([k, n]) => <Puce key={k} titre={n} actif={reseau === k} onPress={() => setReseau(k)} />)}</View>
      <Champ label={t.url} value={url} onChangeText={setUrl} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false} textContentType="URL" />
      <Champ label={t.nom} value={nom} onChangeText={setNom} maxLength={120} />
      <Label>{t.langues}</Label>
      <View style={F.puces}>{LANGUES.map((l: Langue) => <Puce key={l} titre={NOMS_LANGUES[l]} actif={langues.includes(l)} onPress={() => basculer(l)} />)}</View>
      <View style={styles.bouton}><Bouton titre={t.enregistrer} onPress={envoyer} disabled={envoi || !url.trim() || !nom.trim() || !langues.length} /></View>
      <View style={styles.bouton}><Bouton titre={t.annuler} secondaire onPress={annuler} disabled={envoi} /></View>
    </View>
  );
}

function CarteCompte({ c, t, apres }: { c: CompteAnnuaire; t: T; apres: (r: Retour, succes?: string) => Promise<boolean> }) {
  const [candidature, setCandidature] = useState(false);
  const nomReseau = (RESEAUX.find(([k]) => k === c.reseau) || [c.reseau, c.reseau])[1];
  const supprimer = () => Alert.alert(t.confirmer, c.nom, [
    { text: t.annuler, style: 'cancel' },
    { text: t.supprimer, style: 'destructive', onPress: () => { supprimerCompte(c.id).then((r) => apres(r)); } },
  ]);
  return (
    <View style={styles.carte}>
      <Text style={styles.h3} accessibilityRole="header">{c.nom}</Text>
      <Text style={styles.muet}>{nomReseau} · {c.langues.map((l) => NOMS_LANGUES[l as Langue] || l).join(', ')}</Text>
      <Text accessibilityRole="link" style={styles.lien} onPress={() => { Linking.openURL(c.url).catch(() => undefined); }}>{c.url}</Text>
      {c.pages.map((p) => <LignePage key={p.id} compte={c} p={p} t={t} apres={apres} />)}
      {candidature
        ? <Candidature c={c} t={t} apres={async (r) => { const ok = await apres(r, t.recu); if (ok) setCandidature(false); return ok; }} annuler={() => setCandidature(false)} />
        : <View style={styles.bouton}><Bouton titre={t.proposerPage} onPress={() => setCandidature(true)} /></View>}
      <View style={styles.bouton}><Bouton titre={t.supprimer} secondaire onPress={supprimer} /></View>
    </View>
  );
}

function LignePage({ compte: c, p, t, apres }: { compte: CompteAnnuaire; p: PageAnnuaire; t: T; apres: (r: Retour, succes?: string) => Promise<boolean> }) {
  const [justification, setJustification] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const justifier = async () => {
    setEnvoi(true);
    await apres(await candidater(c.id, p.page, justification.trim()), t.recu);
    setEnvoi(false);
  };
  return (
    <View style={styles.page}>
      <Text style={styles.pageTitre}>{p.page}</Text>
      <Text style={[styles.statut, p.statut === 'refuse' && { color: COULEURS.coeur }]}>{libelleStatut(t, p.statut)}</Text>
      {p.note && (p.statut === 'attente_justification' || p.statut === 'refuse') ? <Text style={styles.muet}>{fmt(t.avis, p.note)}</Text> : null}
      {p.statut === 'attente_justification' ? (
        <>
          <Champ label={t.justif} value={justification} onChangeText={setJustification} multiline maxLength={1000} />
          <View style={styles.bouton}><Bouton titre={t.justifEnvoyer} onPress={justifier} disabled={envoi || !justification.trim()} /></View>
        </>
      ) : null}
      {p.statut !== 'refuse' && p.statut !== 'inactif' ? <View style={styles.bouton}><Bouton titre={t.retirer} secondaire onPress={() => { retirerPage(p.id).then((r) => apres(r)); }} /></View> : null}
    </View>
  );
}

function Candidature({ c, t, apres, annuler }: { c: CompteAnnuaire; t: T; apres: (r: Retour) => Promise<boolean>; annuler: () => void }) {
  const [lg, setLg] = useState(c.langues[0] || 'fr');
  const [pages, setPages] = useState<PageChoix[] | null>(null);
  const [q, setQ] = useState('');
  const [choix, setChoix] = useState<PageChoix | null>(null);
  const [justification, setJustification] = useState('');
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    let vivant = true;
    setPages(null); setChoix(null);
    lirePages(lg).then((x) => { if (vivant) setPages(x); }).catch(() => { if (vivant) setPages([]); });
    return () => { vivant = false; };
  }, [lg]);
  // uniquement les pages de la langue choisie, parmi les langues du compte (le serveur refuse les autres)
  const trouvees = useMemo(() => {
    const m = normaliser(q.trim());
    return (pages || []).filter((p) => !m || normaliser(p.titre + ' ' + p.sujet + ' ' + p.page).includes(m)).slice(0, PAGES_MONTREES);
  }, [pages, q]);
  const envoyer = async () => {
    if (!choix) return;
    setEnvoi(true);
    await apres(await candidater(c.id, choix.page, justification.trim() || undefined));
    setEnvoi(false);
  };
  return (
    <View style={styles.page}>
      {c.langues.length > 1 ? (
        <>
          <Label>{t.langueDePage}</Label>
          <View style={F.puces}>{c.langues.map((l) => <Puce key={l} titre={NOMS_LANGUES[l as Langue] || l} actif={lg === l} onPress={() => setLg(l)} />)}</View>
        </>
      ) : null}
      <Champ label={t.chercher} value={q} onChangeText={setQ} autoCorrect={false} />
      {pages === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
      {pages && !trouvees.length ? <Text style={styles.muet}>{t.aucunePage}</Text> : null}
      {trouvees.map((p) => (
        <Pressable key={p.page} accessibilityRole="button" accessibilityState={{ selected: !!choix && choix.page === p.page }} onPress={() => setChoix(p)}
          style={({ pressed }) => [styles.choix, !!choix && choix.page === p.page && styles.choixActif, pressed && F.presse]}>
          <Text style={[styles.choixTxt, !!choix && choix.page === p.page && styles.choixTxtActif]}>{p.titre || p.page}</Text>
        </Pressable>
      ))}
      <Champ label={t.justifOption} value={justification} onChangeText={setJustification} multiline maxLength={1000} />
      <View style={styles.bouton}><Bouton titre={t.envoyer} onPress={envoyer} disabled={envoi || !choix} /></View>
      <View style={styles.bouton}><Bouton titre={t.annuler} secondaire onPress={annuler} disabled={envoi} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 24, color: COULEURS.texteMuet, marginBottom: 6 },
  h2: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 17, fontWeight: '700', color: COULEURS.texte },
  puce: { fontSize: 16, lineHeight: 23, color: COULEURS.texte, marginBottom: 4 },
  actif: { marginTop: 14, color: COULEURS.vert, fontWeight: '700', fontSize: 16 },
  msg: { marginTop: 12, fontWeight: '600', fontSize: 15 },
  muet: { color: COULEURS.texteMuet, fontSize: 15, marginTop: 4 },
  attente: { marginTop: 14 },
  bouton: { marginTop: 10 },
  carte: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 12, padding: 14, marginTop: 12, backgroundColor: COULEURS.fond },
  lien: { color: COULEURS.primaire, marginTop: 4, fontSize: 15, textDecorationLine: 'underline' },
  page: { borderTopWidth: 1, borderTopColor: COULEURS.bordure, marginTop: 12, paddingTop: 10 },
  pageTitre: { color: COULEURS.texte, fontSize: 14 },
  statut: { color: COULEURS.primaireFonce, fontWeight: '600', fontSize: 15, marginTop: 4 },
  choix: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 10, padding: 11, minHeight: 44, justifyContent: 'center', marginTop: 8 },
  choixActif: { backgroundColor: COULEURS.primairePlein, borderColor: COULEURS.primairePlein },
  choixTxt: { color: COULEURS.texte, fontSize: 15 },
  choixTxtActif: { color: '#fff', fontWeight: '600' },
});
