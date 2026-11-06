// Annuaire « Comptes à suivre » (03/11/2026, specs/annuaire-comptes-payant.md ; Android : 04/11/2026) : comptes réseaux du membre, candidature pour une page (dans une langue du compte),
// statuts et justification. Parcours final (Alexis, 04/11/2026, annuaire-offre-decision.md) : on s'abonne d'abord, à tout moment, sans contrôle ; l'abonné ajoute autant de liens
// que sa formule a de places, chacun jugé dès la soumission. Sur iOS et Android, achat intégré de l'App Store / Google Play (annuaire-achat.ts), jamais de lien vers Stripe ni vers la boutique du site ;
// ailleurs, pas de vente. Sans compte : invitation à se connecter.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ACHAT_POSSIBLE, acheter, gererAbonnement, lireOffres, ouvrirAchats, restaurer, type Offre } from '@/annuaire-achat';
import { candidater, enregistrerCompte, enregistrerVeille, lireEtat, lirePages, lireVeille, retirerPage, RESEAUX, supprimerCompte, type CompteAnnuaire, type PageAnnuaire, type PageChoix, type Retour } from '@/annuaire-api';
import { PRODUITS_ANNUAIRE } from '@/annuaire-produits';
import { Invitation } from '@/components/espace';
import { Bouton, Champ, F, fmt, Label, Puce } from '@/components/form';
import { oublierSession } from '@/compte';
import { LANGUES, NOMS_LANGUES, type Langue } from '@/i18n';
import { ouvrirArticle } from '@/nav';
import { TEXTES8 } from '@/i18n8';
import { TEXTES9 } from '@/i18n9';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

type T = (typeof TEXTES8)['fr'];
const PAGES_MONTREES = 20;
const CONDITIONS: Record<Langue, string> = { fr: 'conditions.html', en: 'terms.html', de: 'nutzungsbedingungen.html', es: 'condiciones.html', it: 'condizioni.html', pt: 'condicoes.html', nl: 'voorwaarden.html', pl: 'regulamin.html', tr: 'kosullar.html' };
const CONFIDENTIALITE: Record<Langue, string> = { fr: 'confidentialite.html', en: 'privacy.html', de: 'datenschutz.html', es: 'privacidad.html', it: 'privacy.html', pt: 'privacidade.html', nl: 'privacy.html', pl: 'prywatnosc.html', tr: 'gizlilik.html' };
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const dateLisible = (iso: string | null | undefined, lg: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? d.toLocaleString(lg, { dateStyle: 'long', timeStyle: 'short' }) : ''; };

function erreurDe(t: T, r: Retour, lg: string): string {
  switch (r.erreur) {
    case 'attente': case 'bloque': return r.date ? fmt(t.e_attente, dateLisible(r.date, lg)) : t.e_trop;
    case 'places': return t.placesPleines;
    case 'abonnement': return t.sansAbo;
    case 'url': case 'reseau': return r.statut === 0 ? t.e_reseau : t.e_url;
    case 'nom': return t.e_nom;
    case 'langue': case 'langue_pages': return t.e_langue;
    case 'limite': case 'limite_pages': return t.e_limite;
    case 'deja': return t.e_deja;
    case 'justification': return t.e_justif;
    case 'banni': return t.e_banni;
    case 'doublon': return t.e_doublon;
    case 'trop': return t.e_trop;
    default: return t.e_reseau;
  }
}
function libelleStatut(t: T, statut: string): string {
  switch (statut) {
    case 'a_justifier': return t.st_a_justifier;
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
  const [source, setSource] = useState('');
  const [pagesPayees, setPagesPayees] = useState(0);
  const [pagesUtilisees, setPagesUtilisees] = useState(0);
  const [jetonApple, setJetonApple] = useState('');

  const charger = useCallback(async () => {
    if (!session) { setComptes(null); return; }
    const e = await lireEtat();
    if (e.statut === 401) { await oublierSession(session); return; }
    if (!e.ok) { setComptes([]); setMsg({ t: e.erreur === 'trop' ? t.e_trop : t.e_reseau, ok: false }); return; }
    setComptes(e.comptes); setActif(e.actif); setSource(e.source); setPagesPayees(e.pagesPayees); setPagesUtilisees(e.pagesUtilisees); setJetonApple(e.jetonApple);
  }, [session, t]);
  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  // résultat d'une action : message, puis état relu sur le serveur ; rend true si elle a réussi
  const apres = useCallback(async (r: Retour, succes?: string) => {
    setMsg(r.ok ? (succes ? { t: succes, ok: true } : null) : { t: erreurDe(t, r, langue), ok: false });
    if (r.ok) await charger();
    return r.ok;
  }, [t, langue, charger]);

  // écoute StoreKit tant que l'écran est ouvert : achat, et transactions restées ouvertes que StoreKit représente
  useEffect(() => {
    if (!session || !ACHAT_POSSIBLE) return undefined;
    let fermer: (() => void) | null = null, vivant = true;
    ouvrirAchats(
      (enregistre) => { setMsg({ t: enregistre ? t.merci : t.e_enregistrement, ok: enregistre }); if (enregistre) charger(); },
      () => setMsg({ t: t.e_achat, ok: false }),
    ).then((f) => { if (vivant) fermer = f; else f(); }).catch(() => undefined);
    return () => { vivant = false; if (fermer) fermer(); };
  }, [session, t, charger]);

  const toutes = (comptes || []).flatMap((c) => c.pages);
  const sourceLocale = Platform.OS === 'android' ? 'google' : 'apple';
  const gereSite = actif && source !== sourceLocale;
  const skuActuel = actif && source === sourceLocale ? PRODUITS_ANNUAIRE.find((p) => p.pages === pagesPayees)?.id : undefined;
  const places = Math.max(0, pagesPayees - pagesUtilisees);
  const enExamen = toutes.some((p) => p.statut === 'attente_examen');
  // examen en cours : le job du Mac répond en quelques minutes, l'écran se relit toutes les 30 s
  useEffect(() => {
    if (!enExamen) return undefined;
    const m = setInterval(() => { charger(); }, 30000);
    return () => clearInterval(m);
  }, [enExamen, charger]);

  return (
    <>
      {/* titre court : « Annuaire des comptes à suivre » est tronqué dans une fenêtre iPad étroite et l'audit de contraste échoue sur le titre tronqué */}
      <Stack.Screen options={{ title: t.proposer }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <Text style={styles.lead}>{t.intro}</Text>
        <Text style={styles.h2} accessibilityRole="header">{t.avantagesTitre}</Text>
        <Text style={styles.puce}>• {t.avantagePub}</Text>
        <Text style={styles.puce}>• {t.avantageLiens}</Text>
        {[TEXTES9[langue].abo1, TEXTES9[langue].abo2, TEXTES9[langue].abo3].map((x) => <Text key={x} style={styles.puce}>• {x}</Text>)}
        {!compte ? <Invitation texte={t.connecter} lg={langue} /> : (
          <>
            {actif ? <Text style={styles.actif}>{t.actif}</Text> : null}
            {msg ? <Text style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
            {ACHAT_POSSIBLE && gereSite ? <Text style={styles.muet}>{t.gereSite}</Text> : null}
            {ACHAT_POSSIBLE && !gereSite ? <OffreApple key={source + pagesPayees + '/' + pagesUtilisees} t={t} occupees={pagesUtilisees} actuelle={actif ? pagesPayees : 0} jeton={jetonApple} setMsg={setMsg} /> : null}
            {ACHAT_POSSIBLE && !gereSite ? <GestionApple t={t} langue={langue} afficher skuActuel={skuActuel} setMsg={setMsg} recharger={charger} /> : null}
            {actif ? <CarteVeille t={t} langue={langue} setMsg={setMsg} /> : null}
            <Text style={styles.h2} accessibilityRole="header">{t.mesComptes}</Text>
            {actif ? <Text style={styles.statut}>{places ? fmt(t.places, places) : t.placesPleines}</Text> : <Text style={styles.muet}>{t.sansAbo}</Text>}
            {comptes === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
            {comptes && !comptes.length && actif ? <Text style={styles.muet}>{t.aucunCompte}</Text> : null}
            {(comptes || []).map((c) => <CarteCompte key={c.id} c={c} t={t} langue={langue} peutAjouter={actif && places > 0} apres={apres} />)}
            {/* sans abonnement : pas de formulaire de lien (on paie d'abord) */}
            {!actif ? null : ajout
              ? <FormulaireCompte t={t} langue={langue} apres={async (r) => { const ok = await apres(r); if (ok) setAjout(false); return ok; }} annuler={() => setAjout(false)} />
              : <View style={styles.bouton}><Bouton titre={t.ajouter} onPress={() => { setMsg(null); setAjout(true); }} /></View>}
          </>
        )}
      </ScrollView>
    </>
  );
}

// Offre proposée à tout moment, sans page acceptée requise : toutes les formules, la plus petite utile présélectionnée ; désactivées : la formule en cours et celles trop petites pour
// les pages occupées (retirer des pages d'abord). Prix localisé d'Apple, durée et renouvellement automatique (règle 3.1.2)
function OffreApple({ t, occupees, actuelle, jeton, setMsg }: { t: T; occupees: number; actuelle: number; jeton: string; setMsg: (m: { t: string; ok: boolean } | null) => void }) {
  const [offres, setOffres] = useState<Offre[] | null>(null);
  const [choix, setChoix] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const permise = useCallback((o: Offre) => o.pages >= occupees && o.pages !== actuelle, [occupees, actuelle]);
  useEffect(() => {
    if (!jeton) return undefined;
    let vivant = true;
    lireOffres().then((o) => { if (vivant) { const d = o.find((x) => permise(x) && x.pages > actuelle) || o.find(permise); setOffres(o); setChoix(d ? d.id : ''); } }).catch(() => { if (vivant) setOffres([]); });
    return () => { vivant = false; };
  }, [jeton, actuelle, permise]);
  const retenue = (offres || []).find((o) => o.id === choix);
  const payer = async () => {
    setEnvoi(true); setMsg(null);
    try { await acheter(choix, jeton, retenue?.offerToken); } catch { /* le refus ou l'annulation arrive par l'écoute d'erreurs */ }
    setEnvoi(false);
  };
  return (
    <View style={styles.carte}>
      <Text style={styles.h3} accessibilityRole="header">{t.formules}</Text>
      {occupees > 0 ? <Text style={styles.muet}>{fmt(t.offrePages, occupees)}</Text> : null}
      {!jeton ? <Text style={styles.muet}>{t.offreIndispo}</Text> : (
        <>
          {offres === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
          {offres && !offres.length ? <Text style={styles.muet}>{t.offreIndispo}</Text> : null}
          {offres && offres.length ? (
            <>
              {offres.map((o) => {
                const enCours = o.pages === actuelle, tropPetite = o.pages < occupees;
                return (
                  <Pressable key={o.id} accessibilityRole="radio" accessibilityState={{ checked: o.id === choix, disabled: !permise(o) }} disabled={!permise(o)} onPress={() => setChoix(o.id)}
                    style={({ pressed }) => [styles.choix, o.id === choix && styles.choixCoche, !permise(o) && styles.choixInactif, pressed && F.presse]}>
                    <Text style={styles.formuleNom}>{o.nom || (o.pages === 1 ? t.unePage : fmt(t.jusque, o.pages))}</Text>
                    <Text style={styles.offrePrix}>{fmt(t.offrePrix, o.prix)}</Text>
                    <Text style={styles.muet}>{o.pages === 1 ? t.unePage : fmt(t.jusque, o.pages)}</Text>
                    {enCours ? <Text style={styles.muet}>{t.formuleActuelle}</Text> : tropPetite ? <Text style={styles.muet}>{t.retirerDabord}</Text> : null}
                  </Pressable>
                );
              })}
              <Text style={[styles.muet, styles.duree]}>{t.offreDuree}</Text>
              {retenue ? <View style={styles.bouton}><Bouton titre={t.sabonner} label={t.sabonner + ', ' + (retenue.nom || '') + ', ' + fmt(t.offrePrix, retenue.prix)} onPress={payer} disabled={envoi} /></View> : null}
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function GestionApple({ t, langue, afficher, skuActuel, setMsg, recharger }: { t: T; langue: Langue; afficher: boolean; skuActuel?: string; setMsg: (m: { t: string; ok: boolean } | null) => void; recharger: () => Promise<void> }) {
  const [envoi, setEnvoi] = useState(false);
  if (!afficher) return null;
  const rest = async () => {
    setEnvoi(true); setMsg(null);
    try {
      const n = await restaurer();
      setMsg(n === null ? { t: t.e_enregistrement, ok: false } : { t: n ? t.restaure : t.rienRestaurer, ok: !!n });
      if (n) await recharger();
    } catch { setMsg({ t: t.e_achat, ok: false }); }
    setEnvoi(false);
  };
  return (
    <View>
      <View style={styles.bouton}><Bouton titre={t.restaurer} secondaire onPress={rest} disabled={envoi} /></View>
      <View style={styles.bouton}><Bouton titre={t.gerer} secondaire onPress={() => { gererAbonnement(skuActuel).catch(() => setMsg({ t: t.e_reseau, ok: false })); }} /></View>
      <Text style={styles.liens}>
        <Text accessibilityRole="link" style={styles.lien} onPress={() => { Linking.openURL(SITE + langue + '/' + CONDITIONS[langue]).catch(() => undefined); }}>{t.conditions}</Text>
        {'  ·  '}
        <Text accessibilityRole="link" style={styles.lien} onPress={() => { Linking.openURL(SITE + langue + '/' + CONFIDENTIALITE[langue]).catch(() => undefined); }}>{t.confidentialite}</Text>
      </Text>
    </View>
  );
}

function CarteVeille({ t, langue, setMsg }: { t: T; langue: Langue; setMsg: (m: { t: string; ok: boolean } | null) => void }) {
  const [courriel, setCourriel] = useState('');
  const [quot, setQuot] = useState(false);
  const [rech, setRech] = useState(false);
  const [pret, setPret] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    let vivant = true;
    lireVeille().then((v) => {
      if (vivant && v.ok) { setCourriel(v.courriel); setQuot(v.quotidienne); setRech(v.recherche); setThemes(v.themes); setPret(true); }
    }).catch(() => undefined);
    return () => { vivant = false; };
  }, []);
  const sauver = async () => {
    setEnvoi(true); setMsg(null);
    const r = await enregistrerVeille(quot, rech, themes, langue);
    setMsg(r.ok ? { t: t.veilleOk, ok: true } : { t: t.e_reseau, ok: false });
    setEnvoi(false);
  };
  return (
    <View style={styles.carte}>
      <Text style={styles.h3} accessibilityRole="header">{t.veilleTitre}</Text>
      {courriel ? <Text style={styles.muet}>{fmt(t.veilleCourriel, courriel)}</Text> : null}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: quot }} onPress={() => setQuot((x) => !x)}
        style={({ pressed }) => [styles.choix, quot && styles.choixCoche, pressed && F.presse]}>
        <Text style={styles.formuleNom}>{(quot ? '✓ ' : '') + t.veilleQuot}</Text>
      </Pressable>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rech }} onPress={() => setRech((x) => !x)}
        style={({ pressed }) => [styles.choix, rech && styles.choixCoche, pressed && F.presse]}>
        <Text style={styles.formuleNom}>{(rech ? '✓ ' : '') + t.veilleRech}</Text>
      </Pressable>
      <View style={styles.bouton}><Bouton titre={t.veilleEnregistrer} onPress={sauver} disabled={envoi || !pret} /></View>
    </View>
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
      <View style={F.puces}>{RESEAUX.map(([k, n]) => <Puce key={k} titre={n} actif={reseau === k} onPress={() => setReseau(k)} />)}<Puce titre={t.site} actif={reseau === 'site'} onPress={() => setReseau('site')} /></View>
      {reseau === 'site' ? <Text style={styles.muet}>{t.aideSite}</Text> : null}
      <Champ label={t.url} value={url} onChangeText={setUrl} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false} textContentType="URL" />
      <Champ label={t.nom} value={nom} onChangeText={setNom} maxLength={120} />
      <Label>{t.langues}</Label>
      <View style={F.puces}>{LANGUES.map((l: Langue) => <Puce key={l} titre={NOMS_LANGUES[l]} actif={langues.includes(l)} onPress={() => basculer(l)} />)}</View>
      <View style={styles.bouton}><Bouton titre={t.enregistrer} onPress={envoyer} disabled={envoi || !url.trim() || !nom.trim() || !langues.length} /></View>
      <View style={styles.bouton}><Bouton titre={t.annuler} secondaire onPress={annuler} disabled={envoi} /></View>
    </View>
  );
}

function CarteCompte({ c, t, langue, peutAjouter, apres }: { c: CompteAnnuaire; t: T; langue: Langue; peutAjouter: boolean; apres: (r: Retour, succes?: string) => Promise<boolean> }) {
  const [candidature, setCandidature] = useState(false);
  const nomReseau = c.reseau === 'site' ? t.site : (RESEAUX.find(([k]) => k === c.reseau) || [c.reseau, c.reseau])[1];
  const supprimer = () => Alert.alert(t.confirmer, c.nom, [
    { text: t.annuler, style: 'cancel' },
    { text: t.supprimer, style: 'destructive', onPress: () => { supprimerCompte(c.id).then((r) => apres(r)); } },
  ]);
  return (
    <View style={styles.carte}>
      <Text style={styles.h3} accessibilityRole="header">{c.nom}</Text>
      <Text style={styles.muet}>{nomReseau} · {c.langues.map((l) => NOMS_LANGUES[l as Langue] || l).join(', ')}</Text>
      <Text accessibilityRole="link" style={styles.lien} onPress={() => { Linking.openURL(c.url).catch(() => undefined); }}>{c.url}</Text>
      {c.pages.map((p) => <LignePage key={p.id} compte={c} p={p} t={t} langue={langue} apres={apres} />)}
      {candidature
        ? <Candidature c={c} t={t} apres={async (r) => { const ok = await apres(r, t.recu); if (ok) setCandidature(false); return ok; }} annuler={() => setCandidature(false)} />
        : peutAjouter ? <View style={styles.bouton}><Bouton titre={t.proposerPage} onPress={() => setCandidature(true)} /></View> : null}
      <View style={styles.bouton}><Bouton titre={t.supprimer} secondaire onPress={supprimer} /></View>
    </View>
  );
}

function LignePage({ compte: c, p, t, langue, apres }: { compte: CompteAnnuaire; p: PageAnnuaire & { titre?: string }; t: T; langue: Langue; apres: (r: Retour, succes?: string) => Promise<boolean> }) {
  const router = useRouter();
  const [justification, setJustification] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const justifier = async () => {
    setEnvoi(true);
    await apres(await candidater(c.id, p.page, justification.trim()), t.recu);
    setEnvoi(false);
  };
  return (
    <View style={styles.page}>
      {p.statut === 'actif'
        ? <Text accessibilityRole="link" style={[styles.pageTitre, styles.lien]} onPress={() => ouvrirArticle(router, p.page)}>{p.titre || p.page}</Text>
        : <Text style={styles.pageTitre}>{p.titre || p.page}</Text>}
      <Text style={[styles.statut, p.statut === 'refuse' && { color: COULEURS.coeur }]}>{libelleStatut(t, p.statut)}</Text>
      {p.statut === 'refuse' && p.resoumettre_apres ? <Text style={styles.muet}>{fmt(t.refuseDate, dateLisible(p.resoumettre_apres, langue))}</Text> : null}
      {p.note && (p.statut === 'a_justifier' || p.statut === 'attente_justification' || p.statut === 'refuse') ? <Text style={styles.muet}>{fmt(t.avis, p.note)}</Text> : null}
      {p.statut === 'a_justifier' || p.statut === 'attente_justification' ? (
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
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    let vivant = true;
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
    await apres(await candidater(c.id, choix.page));
    setEnvoi(false);
  };
  return (
    <View style={styles.page}>
      {c.langues.length > 1 ? (
        <>
          <Label>{t.langueDePage}</Label>
          <View style={F.puces}>{c.langues.map((l) => <Puce key={l} titre={NOMS_LANGUES[l as Langue] || l} actif={lg === l} onPress={() => { if (l !== lg) { setPages(null); setChoix(null); setLg(l); } }} />)}</View>
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
  offreNom: { color: COULEURS.texte, fontSize: 16, fontWeight: '600', marginTop: 8 },
  offrePrix: { color: COULEURS.primaireFonce, fontSize: 20, fontWeight: '700', marginTop: 4 },
  liens: { marginTop: 12, textAlign: 'center' },
  lien: { color: COULEURS.primaire, marginTop: 4, fontSize: 15, textDecorationLine: 'underline' },
  page: { borderTopWidth: 1, borderTopColor: COULEURS.bordure, marginTop: 12, paddingTop: 10 },
  pageTitre: { color: COULEURS.texte, fontSize: 14 },
  statut: { color: COULEURS.primaireFonce, fontWeight: '600', fontSize: 15, marginTop: 4 },
  choix: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 10, padding: 11, minHeight: 44, justifyContent: 'center', marginTop: 8 },
  choixInactif: { opacity: 0.55 },
  choixCoche: { borderColor: COULEURS.primaire, borderWidth: 2 },
  formuleNom: { color: COULEURS.texte, fontSize: 16, fontWeight: '600' },
  duree: { marginTop: 10 },
  choixActif: { backgroundColor: COULEURS.primairePlein, borderColor: COULEURS.primairePlein },
  choixTxt: { color: COULEURS.texte, fontSize: 15 },
  choixTxtActif: { color: '#fff', fontWeight: '600' },
});
