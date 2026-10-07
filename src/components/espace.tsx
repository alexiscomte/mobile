// Briques communes des écrans de l'espace membre (07/10/2026, soir ; cahier specs/espace-membre-reduit-0710.md) : texte avec un lien
// à la place de « %s », invitation à se connecter (Se connecter / Créer un compte), pastille de présence, liste des connexions, dates.
// Tout texte venu d'un utilisateur ou du serveur est affiché tel quel dans un <Text> (jamais interprété).
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { Ligne } from '@/components/carte';
import { Bouton, F } from '@/components/form';
import { ResumeSignes } from '@/components/resume-signes';
import { AVEC_OIDC, connexionOidc } from '@/connexion';
import { fmt, estLangue } from '@/i18n';
import { CHINOIS, TUILES, VIGNETTES, type Img } from '@/images';
import type { Connexion } from '@/messages';
import { paysParCode } from '@/moteur/lieux';
import ui from '@/moteur/ui.json';
import { ouvrir } from '@/nav';
import { useProfil } from '@/profil';
import { url } from '@/site';
import { COULEURS } from '@/theme';

export type TX = Record<string, string>;
/** Textes de messages.js (messagerie, présence, historique), exportés par app_moteurs.py. */
export const UI_M = (ui as unknown as { messages: Record<string, TX> }).messages;
/** Textes d'espace.js (ongAstro, astroVos, aime…). */
export const UI_E = (ui as unknown as { espace: Record<string, TX> }).espace;
/** Textes des pages du site « Mon astrologie », « Mes outils », « Mon historique de connexion » (espace_membre.P : lead, intro et note
 *  avec %s = lien vers « Mes informations personnelles », h2). */
export type PageEspace = { lead: string; intro?: string; h2?: string; note?: string };
export const PAGES_ESPACE = (ui as unknown as { espacePages: Record<string, Record<string, PageEspace>> }).espacePages;
/** Cartes de « Mon astrologie » et « Mes outils » (espace_membre.CARTES) : clé, adresse de la page et libellé dans chaque langue. */
type CarteEspace = { c: string; u: Record<string, string>; t: Record<string, string> };
const CARTES_ESPACE = (ui as unknown as { espaceCartes: Record<string, CarteEspace[]> }).espaceCartes;
/** Écran natif de chaque carte (sinon la page du site dans la vue web) ; images et symboles des onglets Astro et Infos. */
const CIBLES: Record<string, { route?: string; params?: Record<string, string>; sf: string; image?: Img }> = {
  horoscope: { route: '/horoscope', sf: 'sparkles', image: TUILES.horoscope },
  chinois: { route: '/horoscope', sf: 'circle.lefthalf.filled', image: CHINOIS[0] },        // horoscope chinois du jour : même écran
  theme: { route: '/theme', sf: 'moon.stars.fill', image: TUILES.theme },
  biorythme: { route: '/biorythme', sf: 'waveform.path.ecg', image: TUILES.biorythme },
  vedique: { route: '/autres', params: { mode: 'vedique' }, sf: 'circle.hexagongrid.fill', image: VIGNETTES.vedique },
  maya: { route: '/autres', params: { mode: 'maya' }, sf: 'sun.haze.fill', image: VIGNETTES.maya },
  compatibilite: { route: '/compat', sf: 'heart.fill', image: TUILES.compat },
  'signe-chinois': { route: '/chinois', sf: 'hare.fill', image: CHINOIS[4] },
  lune: { route: '/lune', sf: 'moon.fill', image: VIGNETTES.lune },
  maternite: { route: '/maternite', sf: 'cross.case.fill', image: VIGNETTES.maternite },
  distance: { route: '/distance', sf: 'globe', image: VIGNETTES.distance },
  compteur: { route: '/compteur', sf: 'heart.circle.fill', image: VIGNETTES.compteur },
  noces: { sf: 'gift.fill', image: TUILES.mariage },                                        // pas d'écran natif : la page du site
};

/** Écrans « Mon astrologie » et « Mes outils » (pages du site espace_membre.py) : chapeau, intro avec le lien vers « Mes informations
 *  personnelles », rappel des signes (astro : si la date de naissance est connue, sinon invitation), puis les cartes. */
export function PageCartes({ onglet }: { onglet: 'astro' | 'outils' }) {
  const { langue, profil } = useProfil();
  const router = useRouter();
  const E = UI_E[langue] || UI_E.fr;
  const P = (PAGES_ESPACE[onglet] || {})[langue] || PAGES_ESPACE[onglet].fr;
  const versInfos = () => router.push('/mes-infos');
  return (
    <>
      <Stack.Screen options={{ title: onglet === 'astro' ? E.ongAstro : E.ongOutils }} />
      <ScrollView contentContainerStyle={F.contenu}>
        <Text style={styles.lead}>{P.lead}</Text>
        {P.intro ? <TexteLien texte={P.intro} lien={E.ongInfos} onPress={versInfos} /> : null}
        {onglet === 'astro' ? (
          profil.naissance ? (
            <View style={F.encadre}>
              <Text style={[F.texte, F.gras]}>{E.astroVos}</Text>
              <ResumeSignes />
            </View>
          ) : <View style={F.encadre}><TexteLien texte={E.astroSans} lien={E.ongInfos} onPress={versInfos} /></View>
        ) : null}
        {P.h2 ? <Text style={F.h2}>{P.h2}</Text> : null}
        {(CARTES_ESPACE[onglet] || []).map((k) => {
          const u = k.u[langue], titre = k.t[langue] || k.t.fr, c = CIBLES[k.c];
          if (!u) return null;                                // page absente dans cette langue : carte omise, comme sur le site
          const aller = c && c.route
            ? () => router.push((c.params ? { pathname: c.route, params: c.params } : c.route) as never)
            : () => ouvrir(router, url(u), titre);
          return <Ligne key={k.c} titre={titre} sf={c ? c.sf : 'link'} image={c ? c.image : undefined} onPress={aller} />;
        })}
      </ScrollView>
    </>
  );
}

/** Date et heure courtes dans la langue (ex. « 7 oct. 2026, 21:04 »). */
export function dateHeure(iso: string | null | undefined, lg: string): string {
  const s = String(iso || '');
  try {
    const x = new Date(s);
    if (isNaN(x.getTime())) return s;
    return x.toLocaleString(lg, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return s.slice(0, 16); }
}
/** Jour seul : « AAAA-MM-JJ » (présence, heure de Paris) ou date ISO complète. */
export function dateJour(iso: string | null | undefined, lg: string): string {
  const s = String(iso || '');
  try {
    const x = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
    if (isNaN(x.getTime())) return s;
    return x.toLocaleDateString(lg, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return s; }
}
/** Nom du pays dans la langue (pays.json du site), sinon le nom donné par le serveur, sinon le code. */
export function nomPays(code: string | null | undefined, nom: string | null | undefined, lg: string): string {
  if (!code) return nom || '—';
  const p = estLangue(lg) ? paysParCode(code, lg) : null;
  return p ? p.nom : nom || code;
}

/** Un texte dont « %s » devient un lien (ex. « … indiquez-les une fois dans %s. »). */
export function TexteLien({ texte, lien, onPress, style }: { texte: string; lien: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  const i = texte.indexOf('%s');
  if (i < 0) return <Text style={[F.texte, style]}>{texte}</Text>;
  return (
    <Text style={[F.texte, style]}>
      {texte.slice(0, i)}
      <Text style={styles.lien} onPress={onPress} accessibilityRole="link">{lien}</Text>
      {texte.slice(i + 2)}
    </Text>
  );
}

/** « Pour nous écrire, connectez-vous… » (ou autre texte) avec les boutons Se connecter / Créer un compte (service commun). */
export function Invitation({ texte, lg, apres }: { texte: string; lg: string; apres?: () => void }) {
  const t = UI_M[lg] || UI_M.fr;
  const router = useRouter();
  const aller = (ecran?: string) => {
    if (!AVEC_OIDC) { router.push('/compte'); return; }       // aperçu web : pas de service commun, l'écran du compte
    connexionOidc(lg, ecran).then(() => { if (apres) apres(); }).catch(() => undefined);
  };
  return (
    <View style={styles.avert} accessibilityRole="summary">
      <Text style={styles.avertTxt}>{texte}</Text>
      <Bouton titre={t.seConnecter} onPress={() => aller()} />
      <Bouton titre={t.creerCompte} secondaire onPress={() => aller('inscription')} />
    </View>
  );
}

/** Pastille « En ligne » ou « Hors ligne — dernière connexion le … » de l'interlocuteur. */
export function Pastille({ enLigne, derniere, lg }: { enLigne?: boolean; derniere?: string | null; lg: string }) {
  const t = UI_M[lg] || UI_M.fr;
  const txt = enLigne ? t.enLigne : derniere ? fmt(t.derniere, dateJour(derniere, lg)) : t.horsLigne;
  return (
    <View style={styles.pastille}>
      <View style={[styles.point, { backgroundColor: enLigne ? COULEURS.vert : '#8d8a99' }]} />
      <Text style={styles.pastilleTxt}>{txt}</Text>
    </View>
  );
}

/** Dernières connexions : date, pays, navigateur ; pour l'admin, adresse IP, VPN probable et fournisseur (jamais montrés au membre :
 *  le serveur ne les lui envoie pas). */
export function ListeConnexions({ liste, admin, lg }: { liste: Connexion[]; admin: boolean; lg: string }) {
  const t = UI_M[lg] || UI_M.fr;
  if (!liste.length) return <Text style={F.muet}>{t.aucuneConnexion}</Text>;
  return (
    <View>
      {liste.map((x, i) => (
        <View key={i} style={styles.connexion}>
          <Text style={styles.quand}>{dateHeure(x.quand, lg)}</Text>
          <Text style={F.texte}>{nomPays(x.pays, x.pays_nom, lg) + ' · ' + (x.navigateur || '—')}</Text>
          {admin ? (
            <Text style={F.muet} selectable>
              {t.colIp + ' : ' + (x.ip || '—') + ' · ' + t.colVpn + ' : ' + (x.vpn === null || x.vpn === undefined ? '—' : x.vpn ? t.oui : t.non) +
                ' · ' + t.colFour + ' : ' + (x.fournisseur || '—')}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Rubrique repliable (titre + contenu affiché à l'ouverture). */
export function Repliable({ titre, ouvert, basculer, children }: { titre: string; ouvert: boolean; basculer: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.repliable}>
      <Pressable onPress={basculer} accessibilityRole="button" accessibilityState={{ expanded: ouvert }} hitSlop={6}>
        <Text style={styles.repliableTitre}>{(ouvert ? '▾ ' : '▸ ') + titre}</Text>
      </Pressable>
      {ouvert ? <View style={styles.repliableCorps}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 24, color: COULEURS.texteMuet, marginBottom: 10 },
  lien: { color: COULEURS.primaire, textDecorationLine: 'underline', fontWeight: '600' },
  avert: { backgroundColor: '#fff4e5', borderColor: '#f0c27a', borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 8 },
  avertTxt: { color: '#6b4300', fontWeight: '600', fontSize: 15, lineHeight: 20 },
  pastille: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  point: { width: 9, height: 9, borderRadius: 5 },
  pastilleTxt: { color: COULEURS.texteMuet, fontSize: 13 },
  connexion: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  quand: { fontWeight: '700', color: COULEURS.primaireFonce, fontSize: 14, marginBottom: 2 },
  repliable: { marginTop: 8, backgroundColor: COULEURS.fondMuet, borderRadius: 10, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure },
  repliableTitre: { color: COULEURS.primaire, fontWeight: '700', fontSize: 14 },
  repliableCorps: { marginTop: 8 },
});
