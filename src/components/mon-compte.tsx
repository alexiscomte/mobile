// « Mon compte » de l'écran « Mes informations personnelles » (07/10/2026 nuit, cahier specs/espace-membre-retouches-0710.md, décisions 2,
// 3 et 7), comme l'encadré de compte.js monter() sur le site. Connecté : « Changer mon mot de passe » (écran à part, /mot-de-passe) et
// « Supprimer mon compte » avec un panneau de confirmation en place (texte du site, [Oui, supprimer définitivement mon compte] en rouge,
// [Annuler] ; le focus va sur Annuler, Échap ou Annuler referment et rendent le focus au bouton) ; plus de « Connecté : … », de date de
// synchronisation, de « Synchroniser maintenant » ni de « Se déconnecter » (l'onglet Moi a le nom et « Se déconnecter »). La
// synchronisation est automatique (compte.ts) : un échec durable (3 envois de suite) est dit ici discrètement (syncKo). Sans compte :
// « Se connecter » / « Créer un compte » seulement (le texte qui précède dit pourquoi). Textes : ui.json compte et espace (site).
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { F } from '@/components/form';
import { ECHEC_DURABLE, echecsSynchro, supprimer, surCompte } from '@/compte';
import { connexionOidc, ecranNatif } from '@/connexion';
import { TEXTES4 } from '@/i18n4';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_C = (ui as unknown as { compte: Record<string, TX> }).compte;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;

/** Texte qui suit le formulaire de « Mes informations personnelles », selon l'état (infosCompte / infosLocal d'espace.js) ; sans compte,
 *  la première phrase du site (« … restent dans ce navigateur. ») devient « … restent sur cet appareil. » (i18n4 infosIci). */
export function texteInfos(langue: string, connecte: boolean): string {
  const E = UI_E[langue] || UI_E.fr;
  if (connecte) return E.infosCompte;
  const ici = (TEXTES4 as Record<string, { infosIci: string }>)[langue]?.infosIci;
  const reste = E.infosLocal.replace(/^[^.!?]*[.!?]\s+/, '');
  return ici && reste !== E.infosLocal ? ici + ' ' + reste : E.infosLocal;
}

/** Focus clavier (aperçu web) ou du lecteur d'écran (iOS) sur un élément. */
export function focaliser(x: unknown) {
  if (!x) return;
  if (Platform.OS === 'web') { try { (x as { focus?: () => void }).focus?.(); } catch { /* rien */ } return; }
  try { AccessibilityInfo.sendAccessibilityEvent(x as Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0], 'focus'); } catch { /* rien */ }
}
/** Annonce un message au lecteur d'écran (iOS) ; sur le web, la zone accessibilityLiveRegion s'en charge. */
function annoncer(t: string) { if (Platform.OS !== 'web') { try { AccessibilityInfo.announceForAccessibility(t); } catch { /* rien */ } } }

type Doc = { addEventListener: (t: string, f: (e: { key: string; preventDefault: () => void }) => void) => void;
  removeEventListener: (t: string, f: (e: { key: string; preventDefault: () => void }) => void) => void };

export function MonCompte() {
  const { langue, compte } = useProfil();
  const router = useRouter();
  const t = UI_C[langue] || UI_C.fr;
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [echecs, setEchecs] = useState(echecsSynchro());
  const refSuppr = useRef<View>(null), refNon = useRef<View>(null), refMsg = useRef<Text>(null);
  const garderMsg = useRef(false);
  const session = compte ? compte.session : '';

  useEffect(() => surCompte((e) => { if (e === 'sync') setEchecs(echecsSynchro()); }), []);
  // la session change (connexion, déconnexion depuis l'onglet Moi, session expirée) : panneau refermé, ancien message effacé
  // (sauf « Compte supprimé. », qui doit rester affiché)
  useEffect(() => {
    setOuvert(false);
    if (garderMsg.current) garderMsg.current = false; else setMsg(null);
  }, [session]);

  const fermer = (rendre: boolean) => { setOuvert(false); if (rendre) setTimeout(() => focaliser(refSuppr.current), 0); };
  const basculer = () => {
    if (ouvert) { fermer(false); return; }
    setMsg(null); setOuvert(true);
    setTimeout(() => focaliser(refNon.current), 50);     // le focus va sur « Annuler »
  };
  // Échap = Annuler (aperçu web ; sur iPhone, le geste « retour » du lecteur d'écran ferme aussi le panneau)
  useEffect(() => {
    if (!ouvert || Platform.OS !== 'web') return;
    const doc = (globalThis as unknown as { document?: Doc }).document;
    if (!doc) return;
    const f = (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); fermer(true); } };
    doc.addEventListener('keydown', f);
    return () => doc.removeEventListener('keydown', f);
  }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmer = async () => {
    setOccupe(true); setMsg({ t: '…', ok: true });
    garderMsg.current = true;                            // la session va disparaître : le message doit rester
    const r = await supprimer();
    setOccupe(false);
    // session déjà fermée (401 : expirée, mot de passe changé ailleurs) : rien n'a été supprimé ; le compte est oublié sur l'appareil
    // et le message invite à se reconnecter (revue du 07/10/2026 nuit : avant, « Compte supprimé. » s'affichait à tort)
    if (r.ok || r.erreur === 'session') {
      const texte = r.ok ? t.supprime : t.supprSession;
      setOuvert(false); setMsg({ t: texte, ok: !!r.ok }); annoncer(texte);
      setTimeout(() => focaliser(refMsg.current), 50);
      return;
    }
    garderMsg.current = false;
    setMsg({ t: r.erreur === 'trop' ? t.trop : t.reseau, ok: false });
  };

  const seConnecter = async (ecran?: string) => {
    // aperçu web (pas de service commun), ou iPhone avec Se connecter avec Apple (règle 4.8, 12/10/2026) : l'écran natif du compte
    if (await ecranNatif()) { router.push('/compte'); return; }
    setMsg(null);
    const r = await connexionOidc(langue, ecran);
    // réussite : l'encadré « Mon compte » et le texte « enregistrées dans votre compte » le montrent ; pas de « Vous êtes connecté »
    // (revue du 07/10/2026 nuit : l'information « connecté » est dans l'onglet Moi)
    if (r === 'invite') setMsg({ t: t.invitePasse, ok: true });
    else if (r === 'echec') setMsg({ t: t.oidcKo, ok: false });
  };

  const message = msg ? (
    <Text ref={refMsg} style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite"
      accessibilityRole={msg.ok ? undefined : 'alert'}>{msg.t}</Text>
  ) : null;

  if (!compte) {
    return (
      <View style={styles.sans}>
        <Pressable style={({ pressed }) => [F.bouton, pressed && F.presse]} onPress={() => { seConnecter(); }} accessibilityRole="button">
          <Text style={F.boutonTxt}>{t.seConnecter}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [F.boutonSec, pressed && F.presse]} onPress={() => { seConnecter('inscription'); }} accessibilityRole="button">
          <Text style={F.boutonSecTxt}>{t.creerCompte}</Text>
        </Pressable>
        {message}
      </View>
    );
  }

  return (
    <View style={F.encadre}>
      <Text style={[F.h3, styles.titre]} accessibilityRole="header">{t.titre}</Text>
      <Pressable style={({ pressed }) => [F.boutonSec, pressed && F.presse]} onPress={() => router.push('/mot-de-passe')} accessibilityRole="link">
        <Text style={F.boutonSecTxt}>{t.mdpChanger}</Text>
      </Pressable>
      <Pressable ref={refSuppr} disabled={occupe} style={({ pressed }) => [styles.danger, (pressed || occupe) && F.presse]} onPress={basculer}
        accessibilityRole="button" accessibilityState={{ expanded: ouvert, disabled: occupe }} aria-expanded={ouvert}>
        <Text style={styles.dangerTxt}>{t.supprimer}</Text>
      </Pressable>
      {ouvert ? (
        <View style={styles.panneau} onAccessibilityEscape={() => fermer(true)}>
          <Text style={[F.texte, styles.panneauTxt]}>{t.supprTexte}</Text>
          <Pressable disabled={occupe} style={({ pressed }) => [styles.oui, (pressed || occupe) && F.presse]} onPress={() => { confirmer(); }}
            accessibilityRole="button" accessibilityState={{ disabled: occupe }}>
            <Text style={styles.ouiTxt}>{t.supprOui}</Text>
          </Pressable>
          <Pressable ref={refNon} disabled={occupe} style={({ pressed }) => [F.boutonSec, (pressed || occupe) && F.presse]} onPress={() => fermer(true)}
            accessibilityRole="button">
            <Text style={F.boutonSecTxt}>{t.annuler}</Text>
          </Pressable>
        </View>
      ) : null}
      {echecs >= ECHEC_DURABLE && !msg ? <Text style={[F.muet, styles.syncKo]}>{t.syncKo}</Text> : null}
      {message}
    </View>
  );
}

const styles = StyleSheet.create({
  sans: { marginTop: 4 },
  titre: { marginTop: 0 },
  danger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  dangerTxt: { color: COULEURS.coeur, fontWeight: '600', fontSize: 15 },
  panneau: { marginTop: 10, borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, padding: 12, backgroundColor: COULEURS.coeurFond },
  panneauTxt: { marginBottom: 2 },
  oui: { backgroundColor: COULEURS.coeurPlein, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', marginTop: 10 },
  ouiTxt: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  syncKo: { marginTop: 10 },
  msg: { marginTop: 12, fontSize: 15, lineHeight: 21 },
});
