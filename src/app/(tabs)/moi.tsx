// Moi = accueil de l'espace membre (Alexis, 07/10/2026 ; menu regroupé le soir, cahier specs/espace-membre-reduit-0710.md, point 8),
// comme le menu de l'icône « Mes infos » du site : « Se connecter » (ou le nom de la personne, sinon son adresse, qui mène à « Mes
// informations personnelles » ; vu par elle seule) en tête, puis les mêmes entrées (table MENU d'espace.js : depuis le 07/10/2026 nuit,
// cahier specs/espace-membre-retouches-0710.md, décisions 6 et 7, Mes informations personnelles, Mes messages, Mes favoris, Mes outils ;
// Mes sondages, Mes compatibilités et Mon historique de connexion sont des cartes de Mes outils, « Mon astrologie » y est fusionnée)
// vers les écrans natifs, avec le nombre de favoris et de messages non lus, puis « Se déconnecter » ; langue, lecture hors ligne,
// à propos, effacement ; « Suivez-nous sur les réseaux sociaux » en français. Plus de « Gérer mon compte » : mot de passe et
// suppression du compte sont dans « Mes informations personnelles » (encadré « Mon compte »). Sans compte, tout reste sur l'appareil.
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ligne, Titre } from '@/components/carte';
import { deconnecter } from '@/compte';
import { AVEC_OIDC, connexionOidc, marquerInvite } from '@/connexion';
import { LANGUES, NOMS_LANGUES, TEXTES, fmt, type Langue } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { TEXTES4 } from '@/i18n4';
import { toutTelecharger } from '@/moteur/contenu';
import ui from '@/moteur/ui.json';
import { ouvrir, ouvrirCle } from '@/nav';
import { useProfil } from '@/profil';
import { page, SITE, url } from '@/site';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_COMPTE = (ui as { compte: Record<string, TX> }).compte;
const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
const RESEAUX = (ui as unknown as { reseaux: { titre: TX; texte: TX; liens: [string, string][] } }).reseaux;
// menu de l'icône « Mes infos » du site (espace_menu.py) : mêmes entrées, mêmes libellés ; ici chaque entrée ouvre son écran natif
const MENU = (ui as unknown as { menu: { c: string; t: TX; u: TX; k?: number }[] }).menu;
type Cible = { route: string; params?: Record<string, string> } | null;   // null : la page du site dans la vue web
const ECRANS: Record<string, { sf: string; cible: Cible }> = {
  infos: { sf: 'person.text.rectangle.fill', cible: { route: '/mes-infos' } },
  messages: { sf: 'bubble.left.and.bubble.right.fill', cible: { route: '/messages' } },
  favoris: { sf: 'hand.thumbsup.fill', cible: { route: '/favoris' } },
  outils: { sf: 'wrench.and.screwdriver.fill', cible: { route: '/outils' } },
};

export default function Moi() {
  const { langue, profil, favoris, compte, setLangue, effacer } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue], T4 = TEXTES4[langue];
  const TC = UI_COMPTE[langue] || UI_COMPTE.fr, E = UI_E[langue] || UI_E.fr;
  const router = useRouter();
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [progression, setProgression] = useState('');

  const seConnecter = useCallback(async () => {
    const r = await connexionOidc(langue);
    // réussite : le nom remplace « Se connecter » en tête, pas de message « Vous êtes connecté » en plus (revue du 07/10/2026 nuit)
    if (r === 'ok') setMsg(null);
    else if (r === 'invite') setMsg({ t: TC.invitePasse, ok: true });
    else if (r === 'echec') setMsg({ t: TC.oidcKo, ok: false });
  }, [langue, TC]);
  const seDeconnecter = async () => {
    await deconnecter();
    marquerInvite();   // pas de connexion proposée d'office juste après, pendant ce lancement (comme l'écran du compte)
    setMsg({ t: TC.deconnecte, ok: true });
  };

  const telecharger = async () => {
    setProgression(T3.telechargement);
    try { await toutTelecharger(langue, (f, t) => setProgression(T3.telechargement + ' ' + f + '/' + t)); setProgression(T3.horsLigneOk); }
    catch { setProgression(T.horsLigne); }
  };
  const confirmerEffacer = () => {
    if (Platform.OS === 'web') { effacer(); return; }
    Alert.alert(T.effacer, T.effacerConfirm + (compte ? '\n\n' + T4.effacerCompte : ''), [{ text: T.non, style: 'cancel' }, { text: T.oui, style: 'destructive', onPress: () => effacer() }]);
  };

  return (
    <SafeAreaView style={styles.fond} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        <Text style={styles.titre}>{E.espTitre}</Text>

        {compte ? (
          <View style={styles.etat}>
            <View style={[styles.pastille, { backgroundColor: COULEURS.vert }]} />
            {/* le nom (sinon l'adresse) de la personne, vu par elle seule, mène à « Mes informations personnelles » (menu du site) */}
            <Pressable style={styles.flex} onPress={() => router.push('/mes-infos')} accessibilityRole="link">
              <Text style={styles.etatTxt} numberOfLines={2}>{[profil.prenom, profil.nom].filter(Boolean).join(' ').trim() || compte.courriel}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={({ pressed }) => [styles.connexion, pressed && styles.presse]} onPress={AVEC_OIDC ? seConnecter : () => router.push('/compte')} accessibilityRole="button">
            <Text style={styles.connexionTxt}>{E.seConnecter}</Text>
          </Pressable>
        )}
        {msg ? <Text style={[styles.message, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
        <View style={styles.separateur} />

        {MENU.map((m) => {
          const e = ECRANS[m.c]; const u = m.u[langue];
          if (!e || !u || (m.k && !compte)) return null;            // « k » : seulement avec un compte connecté
          const n = m.c === 'favoris' ? favoris.length : m.c === 'messages' ? (compte?.messages_non_lus || 0) : 0;
          const aller = () => {
            if (!e.cible) { ouvrir(router, url(u), m.t[langue] || m.t.fr); return; }
            // routes typées : les écrans du menu existent tous (_layout.tsx) ; la cible vient d'une table fixe
            router.push((e.cible.params ? { pathname: e.cible.route, params: e.cible.params } : e.cible.route) as never);
          };
          return <Ligne key={m.c} titre={m.t[langue] || m.t.fr} texte={n ? String(n) : undefined} sf={e.sf} onPress={aller} />;
        })}
        {compte ? <Ligne titre={E.seDeconnecter} sf="rectangle.portrait.and.arrow.right" onPress={() => { seDeconnecter(); }} /> : null}

        <Titre>{T.langue}</Titre>
        <View style={styles.langues}>
          {LANGUES.map((lg: Langue) => (
            <Pressable key={lg} onPress={() => setLangue(lg)} style={[styles.langue, lg === langue && styles.langueActive]}>
              <Text style={[styles.langueTxt, lg === langue && styles.langueTxtActive]}>{NOMS_LANGUES[lg]}</Text>
            </Pressable>
          ))}
        </View>

        <Titre>{T.infos}</Titre>
        <Text style={styles.aide}>{T3.horsLigneTxt}</Text>
        <Pressable style={({ pressed }) => [styles.boutonSec, pressed && styles.presse]} onPress={telecharger}>
          <Text style={styles.boutonSecTxt}>{T3.telecharger}</Text>
        </Pressable>
        {progression ? <Text style={styles.progression}>{progression}</Text> : null}

        <Titre>{T.aPropos}</Titre>
        <Text style={styles.aide}>{T.aProposTxt}</Text>
        <Ligne titre={T.siteWeb} sf="safari" onPress={() => Linking.openURL(SITE + page('accueil', langue).u)} />
        <Ligne titre={T.confidentialite} sf="lock.fill" onPress={() => ouvrirCle(router, 'confidentialite', langue)} />
        <Ligne titre={page('apropos', langue).t} sf="info.circle.fill" onPress={() => ouvrirCle(router, 'apropos', langue)} />

        {langue === 'fr' ? (
          // « Suivez-nous sur les réseaux sociaux » : en français seulement (demande d'Alexis), mêmes comptes que le site (footer.SOCIAL)
          <>
            <Titre>{RESEAUX.titre.fr}</Titre>
            <Text style={styles.aide}>{RESEAUX.texte.fr}</Text>
            <View style={styles.reseaux}>
              {RESEAUX.liens.map(([nom, lien]) => (
                <Pressable key={lien} onPress={() => { Linking.openURL(lien).catch(() => undefined); }} style={({ pressed }) => [styles.reseau, pressed && styles.presse]} accessibilityRole="link">
                  <Text style={styles.reseauTxt}>{nom}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Pressable style={({ pressed }) => [styles.boutonDanger, pressed && styles.presse]} onPress={confirmerEffacer}>
          <Text style={styles.boutonDangerTxt}>{T.effacer}</Text>
        </Pressable>
        <Text style={styles.version}>{T.version} 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 16, paddingBottom: 110 },
  titre: { fontSize: 28, fontWeight: '800', color: COULEURS.primaire, marginBottom: 10 },
  etat: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  pastille: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  etatTxt: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, textDecorationLine: 'underline' },
  connexion: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  connexionTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  separateur: { height: StyleSheet.hairlineWidth, backgroundColor: COULEURS.bordure, marginVertical: 12 },
  message: { marginTop: 8, fontSize: 14, lineHeight: 19 },
  aide: { color: COULEURS.texteMuet, fontSize: 14, lineHeight: 19 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600', fontSize: 15 },
  progression: { color: COULEURS.vert, marginTop: 8, textAlign: 'center' },
  boutonDanger: { borderWidth: 1, borderColor: COULEURS.coeur, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 28 },
  boutonDangerTxt: { color: COULEURS.coeur, fontWeight: '600' },
  presse: { opacity: 0.8 },
  langues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langue: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  langueActive: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  langueTxt: { color: COULEURS.texte },
  langueTxtActive: { color: '#fff', fontWeight: '600' },
  reseaux: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reseau: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  reseauTxt: { color: COULEURS.secondaire, fontWeight: '600', fontSize: 14 },
  version: { color: COULEURS.texteMuet, textAlign: 'center', marginTop: 16, fontSize: 12 },
});
