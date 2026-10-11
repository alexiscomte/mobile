// Signe solaire, signe lunaire et ascendant, natif (assets/js/signes.js) : à partir des infos personnelles (date, heure, lieu).
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Bandeau, Bouton, F, fmt, Note } from '@/components/form';
import { Illustration } from '@/components/illustration';
import { TEXTES } from '@/i18n';
import { TEXTES2 } from '@/i18n2';
import { ZODIAQUE } from '@/images';
import { ASTRO } from '@/moteur/astro';
import { textes } from '@/moteur/horoscope';
import { ouvrir } from '@/nav';
import { useProfil } from '@/profil';
import { page, urlPage } from '@/site';

export default function Signes() {
  const { langue, profil } = useProfil();
  const T = textes(langue), U = T.ui, T1 = TEXTES[langue], T2 = TEXTES2[langue];
  const router = useRouter();
  const r = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profil.naissance || '');
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const h = /^(\d{2}):(\d{2})/.exec(profil.heure || '');
    const l = profil.naissance_lieu;
    const lat = l && typeof l.lat === 'number' ? l.lat : null, lon = l && typeof l.lon === 'number' ? l.lon : null;
    const lieu = lat !== null && lon !== null;
    const dec = lieu ? Math.round((lon as number) / 15) : 0;
    const known = !!h;
    const hh = h ? +h[1] + +h[2] / 60 : 12;
    const jd = ASTRO.jd(y, mo, d, hh - dec);
    const sun = ASTRO.sunLon(jd), moon = ASTRO.moonLon(jd);
    const m1 = ASTRO.sign(ASTRO.moonLon(ASTRO.jd(y, mo, d, 0 - dec))), m2 = ASTRO.sign(ASTRO.moonLon(ASTRO.jd(y, mo, d, 24 - dec)));
    let asc: number | null = null, mc: number | null = null, bascule: number | null = null;
    if (known && lieu) {
      const an = ASTRO.angles(jd, lat as number, lon as number);
      asc = an.asc; mc = an.mc;
      const s0 = ASTRO.sign(asc);
      const sm = ASTRO.sign(ASTRO.angles(jd - 15 / 1440, lat as number, lon as number).asc), sp = ASTRO.sign(ASTRO.angles(jd + 15 / 1440, lat as number, lon as number).asc);
      if (sm !== s0) bascule = sm; else if (sp !== s0) bascule = sp;
    }
    return { sun, moon, m1, m2, luneSure: known || m1 === m2, known, lieu, asc, mc, bascule };
  }, [profil]);
  const ligne = (lab: string, lon: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <Illustration image={ZODIAQUE[ASTRO.sign(lon)]} taille={64} alt={T.signes[ASTRO.sign(lon)]} />
      <Text style={[F.texte, { flex: 1, marginBottom: 0 }]}><Text style={F.gras}>{lab}</Text> : {T.signes[ASTRO.sign(lon)]} {ASTRO.fmtDeg(lon)}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: page('signes', langue).t }} />
      <ScrollView contentContainerStyle={F.contenu}>
        {!r ? (
          <Bandeau texte={T2.sansDate} lien={T2.renseigner} onPress={() => router.push('/(tabs)/moi')} />
        ) : (
          <>
            {ligne(U.soleil, r.sun)}
            {r.luneSure ? ligne(U.lune_s, r.moon) : (
              <Text style={F.texte}><Text style={F.gras}>{U.lune_s}</Text> : {fmt(U.lune_change, T.signes[r.m1], T.signes[r.m2])}</Text>
            )}
            {r.asc !== null && r.mc !== null ? (
              <>
                {ligne(U.asc, r.asc)}
                {ligne(U.mc, r.mc)}
                {r.bascule !== null ? <View style={F.encadre}><Text style={F.texte}>{fmt(U.bascule, T.signes[r.bascule])}</Text></View> : null}
              </>
            ) : null}
            {!r.known ? <Note>{U.sans_heure}</Note> : null}
            {r.known && !r.lieu ? (
              <View style={F.encadre}>
                <Text style={F.texte}>{T1.lieuNaissanceTxt}</Text>
                <Pressable accessibilityRole="button" onPress={() => ouvrir(router, urlPage('horoscope', langue), page('horoscope', langue).t, 'espace')}><Text style={F.lien}>{T1.lieuBouton}</Text></Pressable>
              </View>
            ) : null}
            <Text style={F.h2} accessibilityRole="header">{U.lecture || ''}</Text>
            <Text style={F.texte}><Text style={F.gras}>{U.soleil}</Text> — {T.soleil[ASTRO.sign(r.sun)]}</Text>
            {r.luneSure ? <Text style={F.texte}><Text style={F.gras}>{U.lune_s}</Text> — {T.lune[ASTRO.sign(r.moon)]}</Text> : null}
            {r.asc !== null ? <Text style={F.texte}><Text style={F.gras}>{U.asc}</Text> — {T.ascendant[ASTRO.sign(r.asc)]}</Text> : null}
            <Bouton titre={U.theme} onPress={() => router.push('/theme')} />
            <Bouton titre={U.compat} onPress={() => router.push('/compat')} secondaire />
            <Note>{U.precision}</Note>
          </>
        )}
      </ScrollView>
    </>
  );
}
