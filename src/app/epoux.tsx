// Vie d'époux ou d'épouse selon le prénom, natif : numérologie des prénoms (assets/js/epoux.js), textes du site.
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';

import { Bouton, Champ, Erreur, F, Note } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { COUPLE } from '@/images';
import { lecture, nombreCouple, nombres, norm, textesEpoux, type Lecture } from '@/moteur/epoux';
import { useProfil } from '@/profil';
import { page, SITE } from '@/site';

function Bloc({ l, lettres }: { l: Lecture; lettres: string }) {
  return (
    <View>
      <Text style={F.h2}>{l.prenom}</Text>
      <Text style={F.muet}>{lettres.replace('%s', l.lettres)}</Text>
      {l.blocs.map((b, i) => (
        <View key={i}>
          <Text style={F.h3}>{b.titre}</Text>
          <Text style={F.texte}><Text style={F.gras}>{b.sous}.</Text> {b.texte}</Text>
        </View>
      ))}
    </View>
  );
}

export default function Epoux() {
  const { langue, profil } = useProfil();
  const T = textesEpoux(langue);
  const [p, setP] = useState(profil.prenom || '');
  const [a, setA] = useState('');
  const [res, setRes] = useState<{ l1: Lecture | null; l2: Lecture | null; c: number | null } | null>(null);
  const [erreur, setErreur] = useState('');

  const calcul = () => {
    const pp = p.trim(), aa = a.trim();
    if (!norm(pp) && !norm(aa)) { setErreur(T.manque); setRes(null); return; }
    setErreur('');
    const l1 = norm(pp) ? lecture(T, pp) : null, l2 = norm(aa) ? lecture(T, aa) : null;
    setRes({ l1, l2, c: l1 && l2 ? nombreCouple(nombres(pp).expr, nombres(aa).expr) : null });
  };
  const partager = () => {
    const url = SITE + page('epoux', langue).u + '?p=' + encodeURIComponent(p.trim()) + (a.trim() ? '&a=' + encodeURIComponent(a.trim()) : '');
    Share.share({ message: url, url }).catch(() => {});
  };

  return (
    <>
      <Stack.Screen options={{ title: page('epoux', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled">
        <Champ label={T.prenom} value={p} onChangeText={setP} maxLength={40} autoCapitalize="words" />
        <Champ label={T.autre} value={a} onChangeText={setA} maxLength={40} autoCapitalize="words" />
        <Bouton titre={T.go} onPress={calcul} />
        <Erreur>{erreur}</Erreur>
        <Note>{T.note}</Note>
        {res ? (
          <>
            {res.l1 ? <Bloc l={res.l1} lettres={T.lettres} /> : null}
            {res.l2 ? <Bloc l={res.l2} lettres={T.lettres} /> : null}
            {res.c !== null ? (
              <>
                <Text style={F.h2}>{T.couple} : {res.c}</Text>
                {/* le portrait du couple en image (src/images.ts, COUPLE, une scène par nombre) */}
                <Illustration image={COUPLE[String(res.c)]} taille={300} style={{ width: '100%', aspectRatio: 1.5, height: undefined, marginBottom: 10 }} />
                <Text style={F.texte}>{T.C[String(res.c)] || ''}</Text>
              </>
            ) : null}
            <Bouton titre={T.partager} onPress={partager} secondaire />
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
