// Un article du site, rendu en natif depuis le contenu hors ligne ; « Voir la version en ligne » ouvre la vue web.
// En haut de l'écran (09/10/2026, comme la barre du site) : le fil d'Ariane à gauche ; à DROITE, le pouce « j'aime » et son compteur
// (components/pouce.tsx), qui ajoute la page aux favoris, puis l'icône de partage natif (Share de react-native, à la place du « Partager »
// de la barre de titre).
// Adresse avec ancre (09/10/2026 ; grosses pages droits par pays, sections `<section id="mariage-civil">`) : `u` peut porter « #ancre »
// (résultat de recherche d'une section, lien d'une autre page, ancienne fiche redirigée par la table « r » de l'index) ; l'écran ouvre
// la page puis défile jusqu'à l'élément de cet id, et le sommaire de la page (« #regimes-matrimoniaux ») fait défiler sans changer
// d'écran. Le défilement suit les changements de hauteur (images) jusqu'à ce que le lecteur fasse défiler lui-même.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml, { type MixedStyleDeclaration } from 'react-native-render-html';

import { localiserImages } from '@/embarque';
import { CarteJourArticle } from '@/components/horoscope-carte';
import { ImageArticle } from '@/components/image-article';
import { Pouce } from '@/components/pouce';
import { TEXTES } from '@/i18n';
import { TEXTES2 } from '@/i18n2';
import { TEXTES3 } from '@/i18n3';
import { TEXTES5 } from '@/i18n5';
import { ancreDe, ancreRedirigee, article, cheminDe, type Article } from '@/moteur/contenu';
import { ouvrir } from '@/nav';
import { useProfil } from '@/profil';
import sondages from '@/moteur/sondages.json';
import { page, SITE, url, type Cle } from '@/site';
import { COULEURS, useCouleurs, type NomCouleur } from '@/theme';

const ROUTES: Record<string, string> = { horoscope: '/horoscope', biorythme: '/biorythme', theme: '/theme', jeu2: '/jeu2', qdj: '/qdj', sondages: '/sondages', scores: '/quiz',
  compat: '/compat', chinois: '/chinois', distance: '/distance', maternite: '/maternite', ovulation: '/ovulation', garde: '/garde', epoux: '/epoux' };
// conteneur generique div#outil : l'ecran natif se retrouve par la page du catalogue (02/10/2026 : plan callisthenique ; 12/10 : pension)
const OUTILS_PAGE: Cle[] = ['ovulation', 'maternite', 'compteur', 'epoux', 'garde', 'callisthenie', 'pension'];
const routeDePage = (u: string, lg: Parameters<typeof page>[1]) => { const k = OUTILS_PAGE.find((c) => page(c, lg).u === u); return k ? '/' + k : undefined; };
// pages « autres astrologies » (conteneur utres) : védique et maya ont leur écran (mode), la page de l'amour par signe chinois ouvre l'écran du signe chinois
const routeAutres = (u: string, lg: Parameters<typeof page>[1]) => (page('maya', lg).u === u ? '/autres?mode=maya' : page('vedique', lg).u === u ? '/autres?mode=vedique' : '/chinois');
const SONDAGES = (sondages as { sondages: { id: string; u: Record<string, string> }[] }).sondages;
// éléments de bloc qui peuvent porter l'id visé par une ancre (sections des grosses pages droits, titres, FAQ, sources, sommaire)
const BLOCS_ANCRE = ['section', 'h2', 'h3', 'h4', 'nav', 'details', 'p', 'ol', 'ul', 'table', 'figure', 'article'];

export default function EcranArticle() {
  const { u } = useLocalSearchParams<{ u: string }>();
  const { langue } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const chemin = (u || '').split('#')[0];                       // la page, sans l'ancre
  const [contenu, setContenu] = useState<{ langue: string; chemin: string; article: Article | null } | null>(null);
  const a = !chemin ? null : contenu?.langue === langue && contenu.chemin === chemin ? contenu.article : undefined;
  useEffect(() => {
    let actif = true;
    if (chemin) article(langue, chemin).then((x) => { if (actif) setContenu({ langue, chemin, article: x }); }, () => { if (actif) setContenu({ langue, chemin, article: null }); });
    return () => { actif = false; };
  }, [chemin, langue]);

  // ---- défilement jusqu'à l'ancre
  const defil = useRef<ScrollView>(null);
  const bloc = useRef<View>(null);                                // contenu de l'écran : repère des mesures
  const hautBloc = useRef(0);                                     // position du contenu dans la zone qui défile (marge du haut)
  const ancres = useRef<Record<string, View | null>>({});         // id -> vue de l'élément
  const cible = useRef('');
  const suivre = useRef(false);                                   // vrai jusqu'au premier geste du lecteur
  const aller = useCallback((anime: boolean) => {
    const v = cible.current ? ancres.current[cible.current] : null;
    if (!v || !bloc.current || !defil.current) return;
    v.measureLayout(bloc.current, (_x: number, y: number) => {
      defil.current?.scrollTo({ y: Math.max(0, hautBloc.current + y - 8), animated: anime });
    }, () => undefined);
  }, []);
  const viser = useCallback((ancre: string, anime: boolean) => {
    cible.current = ancre; suivre.current = true; aller(anime);
  }, [aller]);
  useEffect(() => {
    let actif = true;
    cible.current = ''; suivre.current = false;
    const ancre = ancreDe(u || '');
    if (ancre) { cible.current = ancre; suivre.current = true; }
    else if (chemin) ancreRedirigee(langue, chemin).then((x) => { if (actif && x) { cible.current = x; suivre.current = true; aller(false); } }, () => undefined);
    return () => { actif = false; };
  }, [u, chemin, langue, aller]);

  const sondage = useMemo(() => SONDAGES.find((s) => s.u[langue] === chemin), [chemin, langue]);
  // rubriques Santé et Sexualité (dossier de la page d'accueil de la rubrique) : mention « ne remplace pas un avis médical »
  // (règle 1.4.1 de l'App Store : contenu de santé), en bas de l'article
  const sante = useMemo(() => (['sante', 'sexualite'] as Cle[]).some((k) => { const d = page(k, langue).u.replace(/[^/]*$/, ''); return !!d && chemin.startsWith(d); }), [chemin, langue]);
  const enLigne = () => ouvrir(router, url(u), a ? a.t : '');
  const renderers = useMemo(() => {
    const avecAncre = ({ tnode, TDefaultRenderer, ...props }: any) => {
      const id: string | undefined = tnode.attributes && tnode.attributes.id;
      if (!id) return <TDefaultRenderer tnode={tnode} {...props} />;
      return (
        <View collapsable={false} ref={(v) => { ancres.current[id] = v; }}
          onLayout={() => { if (suivre.current && cible.current === id) aller(false); }}>
          <TDefaultRenderer tnode={tnode} {...props} />
        </View>
      );
    };
    const r: Record<string, any> = Object.fromEntries(BLOCS_ANCRE.map((t) => [t, avecAncre]));
    r.img = ImageArticle;
    r.div = ({ tnode, TDefaultRenderer, ...props }: any) => {
      const outil = tnode.attributes['data-app-outil'], quiz = tnode.attributes['data-app-quiz'];
      // pages « horoscope du jour par signe / par animal » (12/10/2026) : la carte native du jour, en ligne, à la place du lien
      // data-app-jour="1" : page « horoscope de demain » (J+1, textes au lendemain)
      const jour = outil === 'horoscope' ? Number(tnode.attributes['data-app-jour']) || 0 : 0;
      if (outil === 'horoscope' && (tnode.attributes['data-app-sign'] !== undefined || tnode.attributes['data-app-animal'] !== undefined)) {
        const s = tnode.attributes['data-app-sign'], an = tnode.attributes['data-app-animal'];
        return <CarteJourArticle signe={s !== undefined ? Number(s) : undefined} animal={an !== undefined ? Number(an) : undefined} dates={tnode.attributes['data-app-dates']} langue={langue} jour={jour} />;
      }
      if (outil) {
        const route = ROUTES[outil] || (outil === 'outil' && chemin ? routeDePage(chemin, langue) : undefined) || (outil === 'autres' && chemin ? routeAutres(chemin, langue) : undefined);
        const ouvrirRoute = () => (jour ? router.push({ pathname: '/horoscope', params: { jour: String(jour) } }) : router.push(route as never));
        return (
          <Pressable accessibilityRole="button" onPress={() => (route ? ouvrirRoute() : enLigne())} style={styles.marqueur}>
            <Text style={styles.marqueurTxt}>{route ? (jour ? TEXTES2[langue].voirDemain : T3.ouvrirOutil) : T3.enLigne} →</Text>
          </Pressable>
        );
      }
      if (quiz) {
        return (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/quiz', params: { id: quiz } })} style={styles.marqueur}>
            <Text style={styles.marqueurTxt}>{T3.faireQuiz} →</Text>
          </Pressable>
        );
      }
      return avecAncre({ tnode, TDefaultRenderer, ...props });
    };
    return r;
  }, [router, T3, chemin, langue, aller]); // eslint-disable-line react-hooks/exhaustive-deps

  const htmlLocal = useMemo(() => (a ? localiserImages(a.h) : ''), [a]);
  // rendu HTML : react-native-render-html veut des couleurs en chaînes (palette claire ou sombre selon le réglage de l'iPhone)
  const pal = useCouleurs();
  const rendu = useMemo(() => stylesHtml(pal), [pal.sombre]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!u) { router.back(); return null; }
  const partager = () => { Share.share({ message: (a ? a.t + ' ' : '') + SITE + u }).catch(() => undefined); };
  return (
    <>
      <Stack.Screen options={{ title: a ? a.t : '' }} />
      <ScrollView ref={defil} contentContainerStyle={styles.contenu}
        onScrollBeginDrag={() => { suivre.current = false; }}
        onContentSizeChange={() => { if (suivre.current) aller(false); }}>
        <View ref={bloc} collapsable={false} onLayout={(e) => { hautBloc.current = e.nativeEvent.layout.y; }}>
        {a === undefined ? <ActivityIndicator color={COULEURS.primaire} /> : null}
        {a === null ? (
          <View>
            <Text style={styles.erreur}>{T3.introuvable}</Text>
            <Pressable accessibilityRole="button" onPress={enLigne} style={styles.bouton}><Text style={styles.boutonTxt}>{T3.enLigne}</Text></Pressable>
          </View>
        ) : null}
        {a ? (
          <>
            {/* fil d'Ariane, puis à droite pouce « j'aime » (et compteur) et icône de partage natif : comme la barre du site (09/10/2026) */}
            <Pouce u={chemin} titre={a.h1 || a.t} fil={a.fil} partager={partager} libellePartage={T.partagerPage} />
            <Text style={styles.h1} accessibilityRole="header">{a.h1 || a.t}</Text>
            {a.lead ? <Text style={styles.lead}>{a.lead}</Text> : null}
            <RenderHtml
              contentWidth={Math.min(width, 760) - 32}
              source={{ html: htmlLocal }}
              baseStyle={rendu.base}
              tagsStyles={rendu.tags}
              classesStyles={rendu.classes}
              ignoredStyles={pal.sombre ? ['color', 'backgroundColor'] : undefined}
              renderers={renderers}
              renderersProps={{ a: { onPress: (_e: unknown, href: string) => {
                const rel = cheminDe(href), ancre = ancreDe(href);
                const ici = href.split('#')[0];
                // ancre de la page ouverte (sommaire « #regimes-matrimoniaux », lien rendu absolu vers la même page) : défiler sur place
                if (ancre && (!ici || ici === 'about:blank' || rel === chemin)) { viser(ancre, true); return; }
                if (rel) router.push({ pathname: '/article', params: { u: rel + (ancre ? '#' + ancre : '') } });
                else if (href.startsWith(SITE)) ouvrir(router, url(href.slice(SITE.length)), '');
                else Linking.openURL(href).catch(() => undefined);
              } } }}
              ignoredDomTags={['svg', 'form', 'input', 'button', 'select', 'textarea', 'iframe']}
              defaultTextProps={{ selectable: true }}
            />
            {sondage ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/sondages')} style={styles.marqueur}><Text style={styles.marqueurTxt}>{T3.etVous} →</Text></Pressable>
            ) : null}
            {sante ? <Text style={styles.avis}>{TEXTES5[langue].avisMedical}</Text> : null}
            {a.maj ? <Text style={styles.maj}>{a.maj}</Text> : null}
            <Pressable accessibilityRole="button" onPress={enLigne} style={styles.boutonSec}><Text style={styles.boutonSecTxt}>{T3.enLigne}</Text></Pressable>
          </>
        ) : null}
        </View>
      </ScrollView>
    </>
  );
}

// styles du HTML des articles ; en mode sombre, les couleurs écrites dans le HTML du site (style="color:…") sont ignorées
function stylesHtml(C: Record<NomCouleur, string>) {
const base: MixedStyleDeclaration = { color: C.texte, fontSize: 16, lineHeight: 24 };
const tags: Record<string, MixedStyleDeclaration> = {
  h2: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: C.primaireFonce, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: C.primaireFonce, marginTop: 14, marginBottom: 6 },
  h4: { fontSize: 16, fontWeight: '700', color: C.primaireFonce, marginTop: 10, marginBottom: 4 },
  p: { marginTop: 0, marginBottom: 10 },
  a: { color: C.secondaireFonce, textDecorationLine: 'underline' },
  li: { marginBottom: 4 },
  table: { borderWidth: 1, borderColor: C.bordure },
  th: { fontWeight: '700', backgroundColor: C.fondDoux, padding: 6 },
  td: { padding: 6, borderTopWidth: 1, borderColor: C.bordure },
  summary: { fontWeight: '700', color: C.primaireFonce },
  details: { backgroundColor: C.fondMuet, borderRadius: 8, padding: 10, marginBottom: 8 },
  img: { marginVertical: 8 },
  // photos qui illustrent les articles (site : photos_pages.py, 05/10/2026), avec leur légende
  figure: { marginTop: 6, marginBottom: 16, marginHorizontal: 0 },
  figcaption: { fontSize: 13, lineHeight: 18, color: C.texteMuet, textAlign: 'center', marginTop: 4 },
};
const classes: Record<string, MixedStyleDeclaration> = {
  content: { marginBottom: 6 },
  lead: { fontSize: 17, color: C.texteMuet },
  card: { backgroundColor: C.fondDoux, borderRadius: 12, padding: 12, marginBottom: 10 },
  'card-grid': { marginBottom: 8 },
  'grille-titre': { fontSize: 20, fontWeight: '700', color: C.primaireFonce, marginTop: 16 },
  maj: { color: C.texteMuet, fontSize: 12 },
  'af-note': { color: C.texteMuet, fontSize: 13 },
  clean: { paddingLeft: 0 },
  'photo-article': { marginTop: 6, marginBottom: 16 },
};
return { base, tags, classes };
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  h1: { fontSize: 26, lineHeight: 33, fontWeight: '800', color: COULEURS.primaire, marginBottom: 8 },
  lead: { fontSize: 17, lineHeight: 25, color: COULEURS.texteMuet, marginBottom: 14 },
  maj: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 10 },
  avis: { backgroundColor: COULEURS.avertFond, color: COULEURS.avertTexte, borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 20, marginTop: 12, overflow: 'hidden' },
  erreur: { color: COULEURS.coeur, marginBottom: 12 },
  marqueur: { backgroundColor: COULEURS.fondDoux, borderRadius: 10, padding: 12, marginVertical: 10, borderWidth: 1, borderColor: COULEURS.bordure },
  marqueurTxt: { color: COULEURS.primaire, fontWeight: '700' },
  bouton: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTxt: { color: '#fff', fontWeight: '700' },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 16 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
});
