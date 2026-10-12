// Horoscope du jour, natif : positions réelles du jour (moteur du site), vos signes en premier.
// Les cartes (components/horoscope-carte.tsx, 12/10/2026) ouvrent la page « horoscope du jour » du signe ou de l'animal dans l'appli
// (article hors ligne), quand l'index du contenu la connaît (tables hs / ha écrites par app_contenu.py) ; sinon elles ne sont pas pressables.
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CarteAnimalJour, CarteSigneJour, textesChinois, TITRE_CHINOIS } from '@/components/horoscope-carte';
import { Illustration } from '@/components/illustration';
import { TEXTES } from '@/i18n';
import { GLYPHES, TEXTES2 } from '@/i18n2';
import { CHINOIS as CHINOIS_IMG, ZODIAQUE } from '@/images';
import { chinoisDuJour } from '@/moteur/chinois';
import { pagesHoroscope } from '@/moteur/contenu';
import { ciel, entete, signesDe, textes } from '@/moteur/horoscope';
import { ouvrirArticle } from '@/nav';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

export default function Horoscope() {
  const { langue, profil } = useProfil();
  const T = TEXTES[langue], T2 = TEXTES2[langue], TA = textes(langue);
  const router = useRouter();
  const [tous, setTous] = useState(false);
  const maintenant = useMemo(() => new Date(), []);
  const c = useMemo(() => ciel(maintenant), [maintenant]);
  const miens = useMemo(() => {
    if (!profil.naissance) return null;
    const l = profil.naissance_lieu;
    return signesDe(profil.naissance, profil.heure, l ? l.lat : null, l ? l.lon : null);
  }, [profil]);
  const enAvant = miens ? [miens.soleil, ...(miens.ascendant !== null && miens.ascendant !== miens.soleil ? [miens.ascendant] : [])] : [];
  const liste = miens && !tous ? enAvant : Array.from({ length: 12 }, (_, i) => i);
  // pages de contenu de chaque carte (index hors ligne) : la carte s'ouvre sur sa page quand elle existe
  const [pages, setPages] = useState<{ signes: Record<number, string>; animaux: Record<number, string> }>({ signes: {}, animaux: {} });
  useEffect(() => { let actif = true; pagesHoroscope(langue).then((p) => { if (actif) setPages(p); }, () => undefined); return () => { actif = false; }; }, [langue]);
  const lien = (u?: string) => (u ? () => ouvrirArticle(router, u) : undefined);
  const TC = textesChinois(langue);

  return (
    <>
      <Stack.Screen options={{ title: T.horoscopeDuJour }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.entete}>{entete(c, langue, maintenant)}</Text>

        {miens ? (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTitre}>{T2.mesSignes}</Text>
            <View style={styles.mesImages}>
              <Illustration image={ZODIAQUE[miens.soleil]} taille={92} alt={TA.signes[miens.soleil]} />
              <Illustration image={CHINOIS_IMG[miens.chinois.animal]} taille={92} alt={TA.chinois.animaux[miens.chinois.animal]} />
              {miens.ascendant !== null && miens.ascendant !== miens.soleil ? <Illustration image={ZODIAQUE[miens.ascendant]} taille={92} alt={TA.signes[miens.ascendant]} /> : null}
            </View>
            <Text style={styles.bandeauTxt}>
              {T2.votreSigne} : <Text style={styles.gras}>{GLYPHES[miens.soleil]} {TA.signes[miens.soleil]}</Text>
              {'  ·  '}{T2.signeChinois} : <Text style={styles.gras}>{TA.chinois.animaux[miens.chinois.animal]}</Text> ({TA.chinois.elements[miens.chinois.element]})
              {miens.ascendant !== null ? <Text>{'  ·  '}{T2.ascendant} : <Text style={styles.gras}>{TA.signes[miens.ascendant]}</Text></Text> : null}
            </Text>
          </View>
        ) : (
          <View style={styles.bandeau}>
            <Text style={styles.bandeauTxt}>{T2.sansDate}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/moi')} style={styles.lien}><Text style={styles.lienTxt}>{T2.renseigner} →</Text></Pressable>
          </View>
        )}

        {miens ? (
          <Pressable accessibilityRole="button" onPress={() => setTous((v) => !v)} style={({ pressed }) => [styles.bouton, pressed && styles.presse]}>
            <Text style={styles.boutonTxt}>{tous ? T2.masquerAutres : T2.autresSignes}</Text>
          </Pressable>
        ) : null}

        {liste.map((s) => (
          <CarteSigneJour key={s} signe={s} langue={langue} quand={maintenant} mienne={enAvant.includes(s)} onPress={lien(pages.signes[s])} />
        ))}
        {TC ? (() => {
          const animaux = miens && !tous ? [miens.chinois.animal] : Array.from({ length: 12 }, (_, i) => i);
          const premier = chinoisDuJour(TC, 0, maintenant);
          return (
            <>
              <Text style={styles.sectionTitre} accessibilityRole="header">{TITRE_CHINOIS[langue] || TITRE_CHINOIS.fr}</Text>
              <Text style={styles.entete}>{premier.entete}</Text>
              {animaux.map((a) => (
                <CarteAnimalJour key={'c' + a} animal={a} langue={langue} quand={maintenant} mienne={!!miens && miens.chinois.animal === a} onPress={lien(pages.animaux[a])} />
              ))}
            </>
          );
        })() : null}
        <Text style={styles.note}>{T2.calculSurAppareil}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  entete: { color: COULEURS.texteMuet, fontSize: 14, marginBottom: 12 },
  bandeau: { backgroundColor: COULEURS.primairePlein, borderRadius: 12, padding: 14, marginBottom: 12 },
  bandeauTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bandeauTxt: { color: '#fff', fontSize: 15, lineHeight: 22 },
  gras: { fontWeight: '700' },
  lien: { marginTop: 8 }, lienTxt: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600' },
  bouton: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  boutonTxt: { color: COULEURS.primaire, fontWeight: '600' },
  presse: { opacity: 0.8 },
  mesImages: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sectionTitre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 14, marginBottom: 4 },
  note: { color: COULEURS.texteMuet, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
