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
import { Pouce } from '@/components/pouce';
import { TEXTES } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { ancreDe, ancreRedirigee, article, cheminDe, type Article } from '@/moteur/contenu';
import { ouvrir } from '@/nav';
import { useProfil } from '@/profil';
import sondages from '@/moteur/sondages.json';
import { page, SITE, url, type Cle } from '@/site';
import { COULEURS } from '@/theme';

const ROUTES: Record<string, string> = { horoscope: '/horoscope', biorythme: '/biorythme', theme: '/theme', jeu2: '/jeu2', qdj: '/qdj', sondages: '/sondages', scores: '/quiz',
  compat: '/compat', chinois: '/chinois', distance: '/distance', maternite: '/maternite', ovulation: '/ovulation', garde: '/garde', epoux: '/epoux' };
// conteneur generique div#outil : l'ecran natif se retrouve par la page du catalogue (02/10/2026 : plan callisthenique)
const OUTILS_PAGE: Cle[] = ['ovulation', 'maternite', 'compteur', 'epoux', 'garde', 'callisthenie'];
const routeDePage = (u: string, lg: Parameters<typeof page>[1]) => { const k = OUTILS_PAGE.find((c) => page(c, lg).u === u); return k ? '/' + k : undefined; };
const SONDAGES = (sondages as { sondages: { id: string; u: Record<string, string> }[] }).sondages;
// éléments de bloc qui peuvent porter l'id visé par une ancre (sections des grosses pages droits, titres, FAQ, sources, sommaire)
const BLOCS_ANCRE = ['section', 'h2', 'h3', 'h4', 'nav', 'details', 'p', 'ol', 'ul', 'table', 'figure', 'article'];

export default function EcranArticle() {
  const { u } = useLocalSearchParams<{ u: string }>();
  const { langue } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [a, setA] = useState<Article | null | undefined>(undefined);
  const chemin = (u || '').split('#')[0];                       // la page, sans l'ancre
  useEffect(() => { let actif = true; setA(undefined); if (chemin) article(langue, chemin).then((x) => { if (actif) setA(x); }, () => { if (actif) setA(null); }); return () => { actif = false; }; }, [chemin, langue]);

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
    r.div = ({ tnode, TDefaultRenderer, ...props }: any) => {
      const outil = tnode.attributes['data-app-outil'], quiz = tnode.attributes['data-app-quiz'];
      if (outil) {
        const route = ROUTES[outil] || (outil === 'outil' && chemin ? routeDePage(chemin, langue) : undefined);
        return (
          <Pressable onPress={() => (route ? router.push(route as never) : enLigne())} style={styles.marqueur}>
            <Text style={styles.marqueurTxt}>{route ? T3.ouvrirOutil : T3.enLigne} →</Text>
          </Pressable>
        );
      }
      if (quiz) {
        return (
          <Pressable onPress={() => router.push({ pathname: '/quiz', params: { id: quiz } })} style={styles.marqueur}>
            <Text style={styles.marqueurTxt}>{T3.faireQuiz} →</Text>
          </Pressable>
        );
      }
      return avecAncre({ tnode, TDefaultRenderer, ...props });
    };
    return r;
  }, [router, T3, chemin, langue, aller]); // eslint-disable-line react-hooks/exhaustive-deps

  const htmlLocal = useMemo(() => (a ? localiserImages(a.h) : ''), [a]);   // images du site : copies embarquées dans l'appli (hors ligne)
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
            <Pressable onPress={enLigne} style={styles.bouton}><Text style={styles.boutonTxt}>{T3.enLigne}</Text></Pressable>
          </View>
        ) : null}
        {a ? (
          <>
            {/* fil d'Ariane, puis à droite pouce « j'aime » (et compteur) et icône de partage natif : comme la barre du site (09/10/2026) */}
            <Pouce u={chemin} titre={a.h1 || a.t} fil={a.fil} partager={partager} libellePartage={T.partagerPage} />
            <Text style={styles.h1}>{a.h1 || a.t}</Text>
            {a.lead ? <Text style={styles.lead}>{a.lead}</Text> : null}
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: htmlLocal }}
              baseStyle={styles.html as MixedStyleDeclaration}
              tagsStyles={TAGS}
              classesStyles={CLASSES}
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
              <Pressable onPress={() => router.push('/sondages')} style={styles.marqueur}><Text style={styles.marqueurTxt}>{T3.etVous} →</Text></Pressable>
            ) : null}
            {a.maj ? <Text style={styles.maj}>{a.maj}</Text> : null}
            <Pressable onPress={enLigne} style={styles.boutonSec}><Text style={styles.boutonSecTxt}>{T3.enLigne}</Text></Pressable>
          </>
        ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const TAGS: Record<string, MixedStyleDeclaration> = {
  h2: { fontSize: 21, lineHeight: 28, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 18, marginBottom: 8 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 14, marginBottom: 6 },
  h4: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 10, marginBottom: 4 },
  p: { marginTop: 0, marginBottom: 10 },
  a: { color: COULEURS.secondaireFonce, textDecorationLine: 'underline' },
  li: { marginBottom: 4 },
  table: { borderWidth: 1, borderColor: COULEURS.bordure },
  th: { fontWeight: '700', backgroundColor: COULEURS.fondDoux, padding: 6 },
  td: { padding: 6, borderTopWidth: 1, borderColor: COULEURS.bordure },
  summary: { fontWeight: '700', color: COULEURS.primaireFonce },
  details: { backgroundColor: COULEURS.fondMuet, borderRadius: 8, padding: 10, marginBottom: 8 },
  img: { marginVertical: 8 },
  // photos qui illustrent les articles (site : photos_pages.py, 05/10/2026), avec leur légende
  figure: { marginTop: 6, marginBottom: 16, marginHorizontal: 0 },
  figcaption: { fontSize: 13, lineHeight: 18, color: COULEURS.texteMuet, textAlign: 'center', marginTop: 4 },
};
const CLASSES: Record<string, MixedStyleDeclaration> = {
  content: { marginBottom: 6 },
  lead: { fontSize: 17, color: COULEURS.texteMuet },
  card: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12, marginBottom: 10 },
  'card-grid': { marginBottom: 8 },
  'grille-titre': { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 16 },
  maj: { color: COULEURS.texteMuet, fontSize: 12 },
  'af-note': { color: COULEURS.texteMuet, fontSize: 13 },
  clean: { paddingLeft: 0 },
  'photo-article': { marginTop: 6, marginBottom: 16 },
};

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  html: { color: COULEURS.texte, fontSize: 16, lineHeight: 24 },
  h1: { fontSize: 26, lineHeight: 33, fontWeight: '800', color: COULEURS.primaire, marginBottom: 8 },
  lead: { fontSize: 17, lineHeight: 25, color: COULEURS.texteMuet, marginBottom: 14 },
  maj: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 10 },
  erreur: { color: COULEURS.coeur, marginBottom: 12 },
  marqueur: { backgroundColor: COULEURS.fondDoux, borderRadius: 10, padding: 12, marginVertical: 10, borderWidth: 1, borderColor: COULEURS.bordure },
  marqueurTxt: { color: COULEURS.primaire, fontWeight: '700' },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  boutonTxt: { color: '#fff', fontWeight: '700' },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 16 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600' },
});
