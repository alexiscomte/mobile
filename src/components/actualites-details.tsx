// Enfants d'un <details class="actu-plus"> : même libellé et mêmes cartes que le site,
// avec un état natif. Le renderer de l'article conserve le conteneur et ses ancres.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  TChildrenRenderer, useTNodeChildrenProps,
  type CustomRendererProps, type TBlock, type TNode,
} from 'react-native-render-html';

import { useCouleurs } from '@/theme';

// Une nouvelle valeur représente une demande, même si le lecteur choisit la
// même ancre après avoir refermé le bloc. Le contexte évite de recréer les renderers.
export const AncreActualitesContext = createContext<{ ancre: string }>({ ancre: '' });

function texteDuNoeud(noeud: TNode): string {
  return noeud.type === 'text' ? noeud.data : noeud.children.map(texteDuNoeud).join('');
}

function contientAncre(noeud: TNode, ancre: string): boolean {
  return noeud.attributes.id === ancre || noeud.children.some((enfant) => contientAncre(enfant, ancre));
}

type Props = CustomRendererProps<TBlock> & {
  langue: string;
  avantBasculer: () => void;
};

export function ActualitesDetails(props: Props) {
  const { tnode, langue, avantBasculer } = props;
  const demande = useContext(AncreActualitesContext);
  const { ancre } = demande;
  const enfants = useTNodeChildrenProps(props);
  const couleurs = useCouleurs();
  const summary = tnode.children.find((enfant) => enfant.tagName === 'summary');
  const libelle = summary ? texteDuNoeud(summary).replace(/\s+/g, ' ').trim() : '';
  const ancreDedans = !!ancre && contientAncre(tnode, ancre);
  const [ouvert, setOuvert] = useState(() => 'open' in tnode.attributes || ancreDedans);
  useEffect(() => {
    if (ancreDedans) setOuvert(true);
  }, [demande, ancreDedans]);

  // Un bloc incomplet ne doit pas rendre ses articles inaccessibles.
  if (!summary || !libelle) return <TChildrenRenderer {...enfants} />;
  const basculer = () => { avantBasculer(); setOuvert((valeur) => !valeur); };
  return (
    <>
      <Pressable accessible accessibilityRole="button" accessibilityLabel={libelle}
        accessibilityLanguage={langue} accessibilityState={{ expanded: ouvert }}
        onPress={basculer} style={({ pressed }) => [styles.bouton, pressed && styles.presse]}>
        <Text style={[styles.libelle, { color: couleurs.primaireFonce }]}>{libelle}</Text>
        <Text accessible={false} style={[styles.signe, { color: couleurs.primaireFonce }]}>{ouvert ? '−' : '+'}</Text>
      </Pressable>
      {ouvert ? <TChildrenRenderer {...enfants} tchildren={tnode.children.filter((enfant) => enfant !== summary)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  bouton: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  presse: { opacity: 0.7 },
  libelle: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  signe: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
});
