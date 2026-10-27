// Comparaison native hors ligne ; les références externes ne s'ouvrent qu'à la demande.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Bouton, Champ, F, Note } from '@/components/form';
import { donneesComparateur, langueComparateur, themeInitial, type EntreePays, type Comparateur } from '@/moteur/comparateur';
import { ouvrirArticle } from '@/nav';
import { useProfil } from '@/profil';
import { SITE } from '@/site';
import { useCouleurs } from '@/theme';

const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
function Choix({ label, valeur, options, onChange }: { label: string; valeur: string; options: [string, string][]; onChange: (v: string) => void }) {
  const [ouvert, setOuvert] = useState(false), [q, setQ] = useState('');
  const choix = options.find(([id]) => id === valeur);
  const visibles = options.filter(([, nom]) => normaliser(nom).includes(normaliser(q)));
  return <View>
    <Bouton titre={label + (choix ? ' : ' + choix[1] : '')} secondaire onPress={() => setOuvert(!ouvert)} />
    {ouvert ? <View>
      <Champ label={label} value={q} onChangeText={setQ} autoCorrect={false} />
      <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {visibles.map(([id, nom]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: id === valeur }}
          style={F.suggestion} onPress={() => { onChange(id); setOuvert(false); setQ(''); }}><Text style={F.suggestionTxt}>{nom}</Text></Pressable>)}
      </ScrollView>
    </View> : null}
  </View>;
}

export default function ComparateurPays() {
  const params = useLocalSearchParams<{ lg?: string; theme?: string; a?: string; b?: string }>();
  const { langue } = useProfil();
  const lg = langueComparateur(params.lg) ? params.lg : langue;
  // Nouvelle langue ou nouveau favori : ne jamais réemployer les slugs d'une autre langue.
  return <Comparaison key={[lg, params.theme, params.a, params.b].join(':')} d={donneesComparateur(lg)} initial={params} />;
}

function Comparaison({ d, initial }: { d: Comparateur; initial: { theme?: string; a?: string; b?: string } }) {
  const router = useRouter(), C = useCouleurs();
  const { width } = useWindowDimensions();
  const largeur = Math.min(width, 760) - 32, colonne = (largeur - 20) / 2;
  const [tid, setTid] = useState(themeInitial(d, initial.theme, initial.a));
  const [a, setA] = useState(d.pays.some(([id]) => id === initial.a) ? initial.a! : '');
  const [b, setB] = useState(d.pays.some(([id]) => id === initial.b) ? initial.b! : '');
  const T = d.ui, theme = d.themes.find((t) => t.id === tid);
  const A = theme?.rows.find((r) => r.cid === a), B = theme?.rows.find((r) => r.cid === b);
  const nom = (id: string) => d.pays.find(([k]) => k === id)?.[1] || id;
  const liens = (_e: unknown, href: string) => {
    if (href.startsWith(SITE) && /\.html(?:[?#]|$)/.test(href)) ouvrirArticle(router, href.slice(SITE.length));
    else if (/^(https?:|mailto:|tel:)/i.test(href)) Linking.openURL(href).catch(() => undefined);
  };
  const texte = (h: string, taille = largeur) => <RenderHtml contentWidth={taille} source={{ html: h }}
    baseStyle={{ color: C.texte, fontSize: 15, lineHeight: 22 }}
    tagsStyles={{ p: { marginTop: 0, marginBottom: 6 }, a: { color: C.secondaireFonce, textDecorationLine: 'underline' } }}
    renderersProps={{ a: { onPress: liens } }} ignoredDomTags={['img', 'script', 'style', 'iframe', 'form', 'input', 'button', 'select']}
    defaultTextProps={{ selectable: true }} />;
  const paire = (gauche?: string, droite?: string) => <View style={{ flexDirection: 'row', gap: 20 }}>
    <View style={{ width: colonne }}>{texte(gauche || T.none, colonne)}</View>
    <View style={{ width: colonne }}>{texte(droite || T.none, colonne)}</View>
  </View>;
  const references = (r: EntreePays | undefined, id: string) => {
    const refs = (r?.sources || []).map((i) => d.references[i]).filter((s): s is [string, string, string] => !!s);
    return <View style={F.encadre}>
    <Text style={F.h3}>{nom(id)}</Text>
    {r ? <>
      <Pressable accessibilityRole="button" onPress={() => ouvrirArticle(router, r.u)}><Text style={F.lien}>{T.open}</Text></Pressable>
      {r.maj ? <Text style={F.muet}>{T.date} : {r.maj}</Text> : null}
      {refs.length ? <Text style={F.h3}>{T.references}</Text> : null}
      {refs.map(([titre, url, note], i) => <View key={i} style={{ marginBottom: 8 }}>
        {url ? <Pressable accessibilityRole="link" onPress={() => liens(null, url)}>{texte(titre)}</Pressable> : texte(titre)}
        {note ? texte(note) : null}
      </View>)}
    </> : <Note>{T.none}</Note>}
  </View>;
  };
  const labels = [...new Set([...(A?.f || []), ...(B?.f || [])].map(([l]) => l))];
  return <>
    <Stack.Screen options={{ title: T.title }} />
    <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Note>{T.offline}</Note>
      <Choix label={T.theme} valeur={tid} options={d.themes.map((t) => [t.id, t.titre])} onChange={setTid} />
      <Choix label={T.a} valeur={a} options={d.pays} onChange={setA} />
      <Choix label={T.b} valeur={b} options={d.pays} onChange={setB} />
      {!theme || !a || !b || a === b ? <Note>{T.empty}</Note> : <View accessibilityLiveRegion="polite">
        <Text style={F.h2}>{theme.titre}</Text>
        <View style={{ flexDirection: 'row', gap: 20, marginVertical: 8 }}>
          <Text style={[F.gras, F.texte, { width: colonne }]}>{nom(a)}</Text>
          <Text style={[F.gras, F.texte, { width: colonne }]}>{nom(b)}</Text>
        </View>
        <Text style={F.h3}>{T.summary}</Text>
        {paire(A?.r, B?.r)}
        {labels.map((label) => <View key={label} style={{ borderTopWidth: 1, borderColor: C.bordure, paddingVertical: 10 }}>
          {texte('<strong>' + label + '</strong>')}
          {paire(A?.f.find(([l]) => l === label)?.[1], B?.f.find(([l]) => l === label)?.[1])}
        </View>)}
        {references(A, a)}{references(B, b)}
      </View>}
      <Note>{T.note}</Note>
      {texte(T.extra)}
    </ScrollView>
  </>;
}
