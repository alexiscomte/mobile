// Les autres astrologies, natif (assets/js/autres.js) : signe védique (mode=vedique) ou signe maya (mode=maya),
// à partir des infos personnelles.
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Bandeau, F, fmt, Note } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { MAYA as MAYA_IMG } from '@/images';
import { TEXTES2 } from '@/i18n2';
import { ASTRO } from '@/moteur/astro';
import { AZT, MAYA, maya, NAK, RASHI, textesAutres, vedic } from '@/moteur/autres';
import { textes } from '@/moteur/horoscope';
import { useProfil } from '@/profil';
import { page } from '@/site';

export default function Autres() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const estMaya = mode === 'maya';
  const { langue, profil } = useProfil();
  const T = textes(langue), U = T.ui, X = textesAutres(langue), T2 = TEXTES2[langue];
  const router = useRouter();
  const r = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profil.naissance || '');
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const h = /^(\d{2}):(\d{2})/.exec(profil.heure || '');
    const l = profil.naissance_lieu;
    const lat = l && typeof l.lat === 'number' ? l.lat : null, lon = l && typeof l.lon === 'number' ? l.lon : null;
    const dec = lon !== null ? Math.round(lon / 15) : 0;
    const jd = ASTRO.jd(y, mo, d, (h ? +h[1] + +h[2] / 60 : 12) - dec);
    return { v: vedic(jd, h ? lat : null, lon), my: maya(y, mo, d), known: !!h };
  }, [profil]);
  const sid = (lon: number) => RASHI[ASTRO.sign(lon)] + ' (' + T.signes[ASTRO.sign(lon)] + ') ' + ASTRO.fmtDeg(lon);

  return (
    <>
      <Stack.Screen options={{ title: page(estMaya ? 'maya' : 'vedique', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu}>
        {!r ? (
          <Bandeau texte={T2.sansDate} lien={T2.renseigner} onPress={() => router.push('/(tabs)/moi')} />
        ) : estMaya ? (
          <>
            <Text style={F.h2}>{X.ui.titre_m}</Text>
            {/* le signe du jour maya en image (src/images.ts, MAYA, une scène par signe) */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}><Illustration image={MAYA_IMG[String(r.my.sign)]} taille={160} alt={MAYA[r.my.sign]} /></View>
            <Text style={[F.texte, F.gras]}>{fmt(X.ui.maya_res, r.my.number, MAYA[r.my.sign], X.maya[r.my.sign])}</Text>
            <Text style={F.texte}>{fmt(X.ui.azt, AZT[r.my.sign])}</Text>
            <Note>{X.ui.maya_note}</Note>
            <Note>{U.precision}</Note>
          </>
        ) : (
          <>
            <Text style={F.h2}>{X.ui.titre_v}</Text>
            <Text style={F.texte}><Text style={F.gras}>{X.ui.soleil}</Text> : {sid(r.v.sun)}</Text>
            <Text style={F.texte}><Text style={F.gras}>{X.ui.lune}</Text> : {sid(r.v.moon)}</Text>
            <Text style={F.texte}><Text style={F.gras}>{X.ui.nak}</Text> : {NAK[r.v.nak]}, {X.ui.pada} {r.v.pada} — {X.nak[r.v.nak]}</Text>
            {typeof r.v.asc === 'number' ? <Text style={F.texte}><Text style={F.gras}>{X.ui.asc}</Text> : {sid(r.v.asc)}</Text> : null}
            <Text style={F.texte}><Text style={F.gras}>{X.ui.ayan}</Text> : {r.v.ayan.toFixed(2)}°</Text>
            {!r.known ? <Note>{U.sans_heure}</Note> : null}
            <Note>{X.ui.note}</Note>
            <Note>{U.precision}</Note>
          </>
        )}
      </ScrollView>
    </>
  );
}
