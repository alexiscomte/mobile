// Mes messages (messagerie entre un membre et l'admin ; politique d'Alexis du 07/10/2026 au soir : « on ne va garder la messagerie que
// pour les communications avec l'admin », « on n'affiche pas les noms des autres utilisateurs »), comme la page « Mes messages » du site
// (assets/js/messages.js) :
// - sans compte : « Pour nous écrire, connectez-vous ou créez un compte » + Se connecter / Créer un compte, aucun formulaire ;
// - membre : formulaire « Nous écrire » sans adresse ni destinataire (tout fil va à l'admin), ses fils où l'interlocuteur est TOUJOURS
//   le texte fixe « AffectionPlus » (aucun nom de personne) avec sa présence, case « Recevoir une copie des messages par courriel » ;
// - admin : pas de formulaire ; par fil, nom donné, adresse et présence du membre, réponse (toujours dans la messagerie), clore /
//   rouvrir, bloc repliable « Informations administrateur » (numéro, adresse, date de création, dernières connexions avec IP, VPN
//   probable, fournisseur : GET /api/compte/historique?u=<compte>).
// « Enregistrer le brouillon » (07/10/2026 nuit, cahier specs/admin-cle-0710.md, pour tous) : à côté de « Envoyer », dans le formulaire du
// membre et dans chaque fil (membre et admin) ; le brouillon gardé sur le serveur revient dans le champ (GET /api/messages : brouillon_nouveau,
// brouillon de chaque fil) et s'efface à l'envoi ; celui d'un fil revient aussi après un rechargement de la liste si le champ est vide.
// Admin : « Réponses à valider (N) » ouvre la page de validation du site (admin/reponses.html, vue web avec la session) : la validation
// des réponses préparées reste sur le site ; N est gardé dans ap.compte.a_valider (entrée de l'onglet Moi, comme le menu du site).
// Textes : ui.json messages (messages.js du site, app_moteurs.py).
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Bouton, Champ, F } from '@/components/form';
import { Invitation, ListeConnexions, Pastille, Repliable, UI_M, dateHeure, dateJour, type TX } from '@/components/espace';
import { noterNonLus, oublierSession } from '@/compte';
import { erreur as vibrerErreur, succes } from '@/haptique';
import { fmt } from '@/i18n';
import { changerEtat, envoyer, fils as lireFils, garderBrouillon, historique, marquerLu, oublierTrace, preferenceMail, repondre, type Brouillon, type Connexion, type Fil, type Rep } from '@/messages';
import ui from '@/moteur/ui.json';
import { ouvrir } from '@/nav';
import { useProfil } from '@/profil';
import { url } from '@/site';
import { COULEURS } from '@/theme';

const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;

function erreur(t: TX, j: Rep): string {
  const e = j.erreur;
  return e === 'sujet' ? t.errSujet : e === 'texte' ? t.errTexte : e === 'trop' ? t.errTrop : (e === 'connexion' || e === 'session') ? t.sessionFinie : t.errReseau;
}

/** Bloc « Informations administrateur » d'un fil (vue de l'admin seulement), chargé à la première ouverture. */
function BlocAdmin({ f, t, lg, sessionFinie }: { f: Fil; t: TX; lg: string; sessionFinie: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<{ compte?: { id?: number; courriel?: string; cree?: string }; liste: Connexion[] } | null>(null);
  const [msg, setMsg] = useState('');
  const basculer = () => {
    const o = !ouvert; setOuvert(o);
    if (!o || etat || !f.compte_id) return;
    setMsg(t.charge);
    historique(f.compte_id).then((j) => {
      if (j.statut === 401) { sessionFinie(); return; }
      if (!j.ok) { setMsg(erreur(t, j as unknown as Rep)); return; }
      setMsg(''); setEtat({ compte: j.compte, liste: j.connexions });
    });
  };
  const k = etat?.compte || {};
  return (
    <Repliable titre={t.infosAdmin} ouvert={ouvert} basculer={basculer}>
      {!f.compte_id ? <Text style={F.texte} selectable>{(f.courriel || '') + ' — ' + t.sansCompte + ', ' + t.nonVerifieAdmin}</Text> : null}
      {msg ? <Text style={F.muet}>{msg}</Text> : null}
      {etat ? (
        <>
          <Text style={F.texte} selectable>
            {fmt(t.compteNo, String(k.id !== undefined ? k.id : f.compte_id)) + ' · ' + (k.courriel || f.courriel || '') + (k.cree ? ' · ' + fmt(t.compteCree, dateJour(k.cree, lg)) : '')}
          </Text>
          <Text style={F.h3} accessibilityRole="header">{t.connexionsTitre}</Text>
          <ListeConnexions liste={etat.liste} admin lg={lg} />
        </>
      ) : null}
    </Repliable>
  );
}

/** Un fil : en-tête (interlocuteur et présence, état, date), messages en bulles, réponse ; pour l'admin, clôture et bloc d'informations. */
function CarteFil({ f, admin, t, lg, recharger, sessionFinie }: { f: Fil; admin: boolean; t: TX; lg: string; recharger: () => void; sessionFinie: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState(f.brouillon?.texte || '');      // son brouillon de ce fil, rechargé
  const [noteB, setNoteB] = useState(f.brouillon?.maj ? fmt(t.brouillonDu, dateHeure(f.brouillon.maj, lg)) : '');
  const [statut, setStatut] = useState('');
  const [occupe, setOccupe] = useState(false);                         // envoi ou enregistrement en cours (boutons désactivés, comme le site)
  const [nonLu, setNonLu] = useState(f.non_lu);
  const [ajouts, setAjouts] = useState<Fil['messages']>([]);       // réponses envoyées d'ici, en attendant le prochain chargement
  useEffect(() => { setAjouts([]); setNonLu(f.non_lu); }, [f.messages, f.non_lu]);
  // brouillon relu à chaque rechargement de la liste (retour sur l'écran, autre appareil : nouvel objet) : repris seulement si le champ est
  // vide, comme messages.js qui redessine les fils ; un texte en cours de saisie n'est jamais écrasé
  useEffect(() => {
    const b = f.brouillon;
    if (!b || !b.texte || texte.trim()) return;
    setTexte(b.texte); setNoteB(b.maj ? fmt(t.brouillonDu, dateHeure(b.maj, lg)) : '');
  }, [f.brouillon]);   // eslint-disable-line react-hooks/exhaustive-deps
  const ETATS: TX = { ouvert: t.etatOuvert, repondu: t.etatRepondu, clos: t.etatClos };
  const basculer = () => {
    const o = !ouvert; setOuvert(o);
    if (o && nonLu) { setNonLu(false); marquerLu(f.id).then((j) => { if (j.ok && typeof j.non_lus === 'number') noterNonLus(j.non_lus).catch(() => undefined); }); }
  };
  const envoyerReponse = async () => {
    const x = texte.trim();
    if (x.length < 2) { setStatut(t.errTexte); return; }
    setStatut('…'); setOccupe(true);
    const j = await repondre(f.id, x);
    setOccupe(false);
    if (j.statut === 401) { sessionFinie(); return; }
    if (!j.ok) { setStatut(erreur(t, j)); return; }
    succes();
    setTexte(''); setNoteB('');                    // le serveur a effacé le brouillon de ce fil
    setStatut(t.repEnvoyee + (admin && j.mailDemande ? ' ' + (j.mail ? t.mailEnvoye : t.mailNon) : ''));
    setAjouts((a) => [...a, { auteur: admin ? 'admin' : 'membre', texte: x, cree: new Date().toISOString() }]);
  };
  const enregistrer = async () => {
    setStatut('…'); setOccupe(true);
    const j = await garderBrouillon({ fil: f.id, texte });
    setOccupe(false);
    if (j.statut === 401) { sessionFinie(); return; }
    if (!j.ok) { setStatut(erreur(t, j)); return; }
    setNoteB(''); setStatut(j.id ? t.brouillonOk : t.brouillonVide);
  };
  return (
    <View style={[styles.fil, nonLu && styles.filNonLu]}>
      <Pressable onPress={basculer} accessibilityRole="button" accessibilityState={{ expanded: ouvert }}>
        <Text style={styles.sujet}>{f.sujet}{nonLu ? <Text style={styles.badge}>{'  ' + t.nouveau + ' '}</Text> : null}</Text>
        {admin ? (
          // nom donné par le membre et adresse de son compte : vus par l'admin seulement
          <Text style={styles.info} selectable>{(f.nom ? f.nom + ' · ' : '') + (f.courriel || '') + (f.invite ? ' (' + t.sansCompte + ', ' + t.nonVerifieAdmin + ')' : '') + ' · ' + (f.langue || '').toUpperCase()}</Text>
        ) : (
          // pour le membre, l'interlocuteur est toujours « AffectionPlus » (jamais un nom de personne)
          <Text style={styles.info}>{t.equipe}</Text>
        )}
        {!(admin && f.invite) ? <Pastille enLigne={f.en_ligne} derniere={f.derniere} lg={lg} /> : null}
        <Text style={styles.info}>{(ETATS[f.etat] || t.etatOuvert) + ' · ' + dateHeure(f.maj, lg)}</Text>
      </Pressable>
      {ouvert ? (
        <View>
          {admin ? <BlocAdmin f={f} t={t} lg={lg} sessionFinie={sessionFinie} /> : null}
          {[...f.messages, ...ajouts].map((m, i) => {
            const deLui = m.auteur === 'admin';
            const qui = deLui ? t.equipe : m.verifie === false ? (admin ? t.nonVerifieAdmin : t.nonVerifie) : admin ? '' : t.vous;
            return (
              <View key={(m.id || 0) + '-' + i} style={[styles.bulle, deLui ? styles.equipe : styles.membre]}>
                <Text style={styles.meta}>{(qui ? qui + ' · ' : '') + dateHeure(m.cree, lg)}</Text>
                <Text style={styles.texte} selectable>{m.texte}</Text>
              </View>
            );
          })}
          <Text style={F.label}>{t.repondre}</Text>
          <TextInput style={styles.zone} value={texte} onChangeText={setTexte} multiline maxLength={5000} textAlignVertical="top" accessibilityLabel={t.repondre} />
          {noteB ? <Text style={F.muet}>{noteB}</Text> : null}
          <Bouton titre={t.envoyerRep} onPress={envoyerReponse} disabled={occupe} />
          <Bouton titre={t.brouillon} secondaire onPress={() => { enregistrer(); }} disabled={occupe} />
          {admin ? (
            <Bouton titre={f.etat === 'clos' ? t.rouvrir : t.clore} secondaire
              onPress={() => { changerEtat(f.id, f.etat === 'clos' ? 'ouvert' : 'clos').then((j) => { if (j.ok) recharger(); else setStatut(erreur(t, j)); }); }} />
          ) : null}
          {statut ? <Text style={styles.statut} accessibilityLiveRegion="polite">{statut}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function Messages() {
  const { langue, profil, compte } = useProfil();
  const t = UI_M[langue] || UI_M.fr;
  const nomProfil = [profil.prenom, profil.nom].filter(Boolean).join(' ').trim().slice(0, 80);
  const [nom, setNom] = useState(nomProfil);
  const [sujet, setSujet] = useState('');
  const [texte, setTexte] = useState('');
  const [statut, setStatut] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [liste, setListe] = useState<Fil[] | null>(null);
  const [erreurListe, setErreurListe] = useState('');
  const [admin, setAdmin] = useState(!!compte?.admin);
  const [mail, setMail] = useState(false);
  const [noteMail, setNoteMail] = useState('');
  const [nonLusSeuls, setNonLusSeuls] = useState(false);
  const [fin, setFin] = useState(false);       // session refusée par le serveur : l'invitation le dit
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);   // brouillon du nouveau message gardé sur le serveur
  const [noteB, setNoteB] = useState('');
  const [rafraichit, setRafraichit] = useState(false);   // tirer vers le bas : fils relus
  const router = useRouter();
  const session = compte ? compte.session : '';

  useEffect(() => { oublierTrace(); }, []);
  useEffect(() => { if (session) setFin(false); }, [session]);
  // appareil partagé (08/10/2026) : connexion faite sur cet écran (Invitation) → « Votre nom » suit le profil du compte qui se connecte
  // (les données d'un autre compte ont été remplacées : le nom posé à l'ouverture de l'écran était le sien), tant que la personne ne l'a
  // pas changé ici ; une nouvelle session repart du profil
  const nomTouche = useRef(false);
  useEffect(() => { nomTouche.current = false; }, [session]);
  useEffect(() => { if (!nomTouche.current) setNom(nomProfil); }, [nomProfil, session]);
  const changerNom = useCallback((v: string) => { nomTouche.current = true; setNom(v); }, []);

  const sessionFinie = useCallback(() => { setFin(true); oublierSession(session).catch(() => undefined); }, [session]);

  const recharger = useCallback(async () => {
    if (!session) { setListe(null); return; }
    const r = await lireFils();
    if (r.statut === 401) { sessionFinie(); return; }
    if (!r.ok) { setErreurListe(erreur(t, r as unknown as Rep)); setListe([]); return; }
    setErreurListe(''); setListe(r.fils); setAdmin(r.admin); setMail(r.mail); setBrouillon(r.brouillonNouveau);
    // badge de Mes messages et, pour l'admin, nombre de « Réponses à valider » de l'onglet Moi (comme messages.js : ap.compte.a_valider)
    noterNonLus(r.fils.filter((f) => f.non_lu).length, r.admin, r.admin ? r.fils.filter((f) => f.a_valider).length : undefined).catch(() => undefined);
  }, [session, sessionFinie, t]);
  useFocusEffect(useCallback(() => { recharger(); }, [recharger]));
  // brouillon du nouveau message (cet appareil ou un autre) : repris seulement si la personne n'a encore rien écrit
  useEffect(() => {
    if (!brouillon || sujet.trim() || texte.trim()) return;
    setSujet(brouillon.sujet || ''); setTexte(brouillon.texte || '');
    setNoteB(brouillon.maj ? fmt(t.brouillonDu, dateHeure(brouillon.maj, langue)) : '');
  }, [brouillon]);   // eslint-disable-line react-hooks/exhaustive-deps

  const enregistrer = async () => {
    setStatut('…'); setEnvoi(true);
    const j = await garderBrouillon({ sujet: sujet.trim(), texte });
    setEnvoi(false);
    if (j.statut === 401) { setStatut(''); sessionFinie(); return; }
    if (!j.ok) { setStatut(erreur(t, j)); return; }
    setNoteB(''); setStatut(j.id ? t.brouillonOk : t.brouillonVide);
  };

  const envoyerMessage = async () => {
    const s = sujet.trim(), x = texte.trim();
    if (!s) { setStatut(t.errSujet); return; }
    if (x.length < 2) { setStatut(t.errTexte); return; }
    setEnvoi(true); setStatut('…');
    const j = await envoyer({ nom: nom.trim(), sujet: s, texte: x, langue });
    setEnvoi(false);
    if (j.statut === 401) { setStatut(''); sessionFinie(); return; }
    if (j.statut === 403 && j.erreur === 'admin') { setStatut(t.adminEcrire); return; }
    if (!j.ok) { vibrerErreur(); setStatut(erreur(t, j)); return; }
    succes();
    setSujet(''); setTexte(''); setNoteB(''); setBrouillon(null);     // le serveur a effacé le brouillon du nouveau message
    setStatut(t.envoye);
    recharger();
  };
  const changerMail = (v: boolean) => {
    setMail(v); setNoteMail('');
    preferenceMail(v).then((r) => { if (!r.ok) { setMail(!v); setNoteMail(erreur(t, r)); } });
  };

  const visibles = (liste || []).filter((f) => !nonLusSeuls || f.non_lu);
  const aValider = admin ? (liste || []).filter((f) => f.a_valider).length : 0;     // réponses préparées : page de validation du site
  return (
    <>
      <Stack.Screen options={{ title: (UI_E[langue] || UI_E.fr).ongMessages }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive"
        refreshControl={compte ? <RefreshControl refreshing={rafraichit} tintColor={COULEURS.primaire} onRefresh={() => { setRafraichit(true); recharger().finally(() => setRafraichit(false)); }} /> : undefined}>
        {!compte ? (
          <>
            <Text style={F.h2} accessibilityRole="header">{t.ecrire}</Text>
            <Invitation texte={fin ? t.sessionFinie : t.connecteSeul} lg={langue} />
          </>
        ) : !admin ? (
          <>
            <Text style={F.h2} accessibilityRole="header">{t.ecrire}</Text>
            <Champ label={t.nom} value={nom} onChangeText={changerNom} maxLength={80} autoComplete="name" />
            <Champ label={t.sujet} value={sujet} onChangeText={setSujet} maxLength={150} />
            <Text style={F.label}>{t.message}</Text>
            <TextInput style={styles.zone} value={texte} onChangeText={setTexte} multiline maxLength={5000} textAlignVertical="top" accessibilityLabel={t.message} />
            {noteB ? <Text style={F.muet}>{noteB}</Text> : null}
            <Bouton titre={t.envoyer} onPress={envoyerMessage} disabled={envoi} />
            <Bouton titre={t.brouillon} secondaire onPress={() => { enregistrer(); }} disabled={envoi} />
            {statut ? <Text style={styles.statut} accessibilityLiveRegion="polite">{statut}</Text> : null}
            <Text style={[F.muet, styles.note]}>{t.confid}</Text>
          </>
        ) : null}

        {compte ? (
          <>
            <Text style={F.h2} accessibilityRole="header">{admin ? t.boite : t.vosFils}</Text>
            {aValider ? <Bouton titre={fmt(t.aValider, String(aValider))} onPress={() => ouvrir(router, url('admin/reponses.html'), fmt(t.aValider, String(aValider)))} /> : null}
            <View style={styles.option}>
              <Text style={[F.texte, styles.flex]}>{admin ? t.nonLusSeuls : t.prefMail}</Text>
              <Switch value={admin ? nonLusSeuls : mail} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={admin ? t.nonLusSeuls : t.prefMail}
                onValueChange={(v) => { if (admin) setNonLusSeuls(v); else changerMail(v); }} />
            </View>
            {noteMail ? <Text style={F.muet}>{noteMail}</Text> : null}
            {liste === null ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
            {erreurListe ? <Text style={styles.statut}>{erreurListe}</Text> : null}
            {liste && !visibles.length && !erreurListe ? <Text style={F.muet}>{t.aucun}</Text> : null}
            {visibles.map((f) => <CarteFil key={f.id} f={f} admin={admin} t={t} lg={langue} recharger={recharger} sessionFinie={sessionFinie} />)}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  zone: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12, minHeight: 120, fontSize: 16, color: COULEURS.texte },
  statut: { marginTop: 10, color: COULEURS.primaireFonce, fontWeight: '600' },
  note: { marginTop: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  flex: { flex: 1 },
  attente: { marginTop: 14 },
  fil: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 12, padding: 12, marginBottom: 10, gap: 3 },
  filNonLu: { borderColor: COULEURS.primaire, borderWidth: 2 },
  sujet: { fontWeight: '700', color: COULEURS.primaire, fontSize: 16 },
  badge: { color: COULEURS.coeur, fontSize: 12, fontWeight: '700' },
  info: { color: COULEURS.texteMuet, fontSize: 13 },
  bulle: { borderRadius: 12, padding: 10, marginTop: 8, maxWidth: '92%' },
  membre: { backgroundColor: COULEURS.fondDoux, alignSelf: 'flex-end' },
  equipe: { backgroundColor: COULEURS.bulleEquipe, borderColor: COULEURS.bulleEquipeBord, borderWidth: 1, alignSelf: 'flex-start' },
  meta: { color: COULEURS.texteMuet, fontSize: 12, marginBottom: 4 },
  texte: { color: COULEURS.texte, fontSize: 15, lineHeight: 21 },
});
