// Un article du site, rendu en natif depuis le contenu hors ligne ; « Voir la version en ligne » ouvre la vue web.
// En haut de l'écran (09/10/2026, comme la barre du site) : le pouce « j'aime » et son compteur (components/pouce.tsx), qui ajoute la page
// aux favoris, l'icône de partage natif (Share de react-native, à la place du « Partager » de la barre de titre) et le fil d'Ariane.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml, { type MixedStyleDeclaration } from 'react-native-render-html';

import { Pouce } from '@/components/pouce';
import { TEXTES } from '@/i18n';
import { TEXTES3 } from '@/i18n3';
import { article, cheminDe, type Article } from '@/moteur/contenu';
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

export default function EcranArticle() {
  const { u } = useLocalSearchParams<{ u: string }>();
  const { langue } = useProfil();
  const T = TEXTES[langue], T3 = TEXTES3[langue];
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [a, setA] = useState<Article | null | undefined>(undefined);
  useEffect(() => { let actif = true; setA(undefined); if (u) article(langue, u).then((x) => { if (actif) setA(x); }, () => { if (actif) setA(null); }); return () => { actif = false; }; }, [u, langue]);

  const sondage = useMemo(() => SONDAGES.find((s) => s.u[langue] === u), [u, langue]);
  const enLigne = () => ouvrir(router, url(u), a ? a.t : '');
  const renderers = useMemo(() => ({
    div: ({ tnode, TDefaultRenderer, ...props }: any) => {
      const outil = tnode.attributes['data-app-outil'], quiz = tnode.attributes['data-app-quiz'];
      if (outil) {
        const route = ROUTES[outil] || (outil === 'outil' && u ? routeDePage(u, langue) : undefined);
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
      return <TDefaultRenderer tnode={tnode} {...props} />;
    },
  }), [router, T3, u, langue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!u) { router.back(); return null; }
  const partager = () => { Share.share({ message: (a ? a.t + ' ' : '') + SITE + u }).catch(() => undefined); };
  return (
    <>
      <Stack.Screen options={{ title: a ? a.t : '' }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {a === undefined ? <ActivityIndicator color={COULEURS.primaire} /> : null}
        {a === null ? (
          <View>
            <Text style={styles.erreur}>{T3.introuvable}</Text>
            <Pressable onPress={enLigne} style={styles.bouton}><Text style={styles.boutonTxt}>{T3.enLigne}</Text></Pressable>
          </View>
        ) : null}
        {a ? (
          <>
            {/* pouce « j'aime » et compteur, icône de partage natif, fil d'Ariane : comme la barre en tête du fil d'Ariane du site (09/10/2026) */}
            <Pouce u={u} titre={a.h1 || a.t} fil={a.fil} partager={partager} libellePartage={T.partagerPage} />
            <Text style={styles.h1}>{a.h1 || a.t}</Text>
            {a.lead ? <Text style={styles.lead}>{a.lead}</Text> : null}
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: a.h }}
              baseStyle={styles.html as MixedStyleDeclaration}
              tagsStyles={TAGS}
              classesStyles={CLASSES}
              renderers={renderers}
              renderersProps={{ a: { onPress: (_e: unknown, href: string) => {
                const rel = cheminDe(href);
                if (rel) router.push({ pathname: '/article', params: { u: rel } });
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
  h1:{ fontSize: 26, lineHeight: 33, fontWeight: '800', color: COULEURS.primaire, marginBottom: 8 },
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
