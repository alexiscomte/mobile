// Horoscope du jour, natif : positions réelles du jour (moteur du site), vos signes en premier.
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Illustration } from '@/components/illustration';
import { TEXTES } from '@/i18n';
import { GLYPHES, TEXTES2 } from '@/i18n2';
import { CHINOIS as CHINOIS_IMG, ZODIAQUE } from '@/images';
import { chinoisDuJour, type TextesChinois } from '@/moteur/chinois';
import { ciel, entete, horoscope, signesDe, textes } from '@/moteur/horoscope';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';

const CHINOIS = (ui as unknown as { chinoisJour: Record<string, TextesChinois> }).chinoisJour;
const TITRE_CH: Record<string, string> = {
  fr: 'L’horoscope chinois du jour', en: 'Today’s Chinese horoscope', de: 'Das chinesische Tageshoroskop', es: 'El horóscopo chino del día',
  it: 'L’oroscopo cinese del giorno', pt: 'O horóscopo chinês do dia', nl: 'De Chinese daghoroscoop', pl: 'Chiński horoskop dnia', tr: 'Günün Çin burcu yorumu',
};
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
            <Pressable onPress={() => router.push('/(tabs)/moi')} style={styles.lien}><Text style={styles.lienTxt}>{T2.renseigner} →</Text></Pressable>
          </View>
        )}

        {miens ? (
          <Pressable onPress={() => setTous((v) => !v)} style={({ pressed }) => [styles.bouton, pressed && styles.presse]}>
            <Text style={styles.boutonTxt}>{tous ? T2.masquerAutres : T2.autresSignes}</Text>
          </Pressable>
        ) : null}

        {liste.map((s) => {
          const h = horoscope(c, s, langue);
          const mien = enAvant.includes(s);
          return (
            <View key={s} style={[styles.carte, mien && styles.carteMienne]}>
              <View style={styles.carteTete}>
                <Illustration image={ZODIAQUE[s]} taille={56} alt={TA.signes[s]} />
                <Text style={[styles.carteTitre, styles.carteTitreTete]}>{GLYPHES[s]} {TA.signes[s]}</Text>
              </View>
              <Text style={styles.texte}>{h.phrases.join(' ')}</Text>
              <Text style={styles.conseil}>{T2.conseil} — <Text style={styles.italique}>{h.conseil}</Text></Text>
            </View>
          );
        })}
        {CHINOIS ? (() => {
          const TC = CHINOIS[langue] || CHINOIS.fr;
          const animaux = miens && !tous ? [miens.chinois.animal] : Array.from({ length: 12 }, (_, i) => i);
          const premier = chinoisDuJour(TC, 0, maintenant);
          return (
            <>
              <Text style={styles.sectionTitre}>{TITRE_CH[langue] || TITRE_CH.fr}</Text>
              <Text style={styles.entete}>{premier.entete}</Text>
              {animaux.map((a) => {
                const h = chinoisDuJour(TC, a, maintenant);
                const mien = !!miens && miens.chinois.animal === a;
                return (
                  <View key={'c' + a} style={[styles.carte, mien && styles.carteMienne]}>
                    <View style={styles.carteTete}>
                      <Illustration image={CHINOIS_IMG[a]} taille={56} alt={TA.chinois.animaux[a]} />
                      <Text style={[styles.carteTitre, styles.carteTitreTete]}>{TA.chinois.animaux[a]} <Text style={styles.dates}>{TC.annees} {h.annees.join(', ')}…</Text></Text>
                    </View>
                    <Text style={styles.texte}>{h.texte}</Text>
                    <Text style={styles.conseil}>{T2.conseil} — <Text style={styles.italique}>{h.conseil}</Text></Text>
                  </View>
                );
              })}
            </>
          );
        })() : null}
        <Text style={styles.note}>{T2.calculSurAppareil}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  entete: { color: COULEURS.texteMuet, fontSize: 14, marginBottom: 12 },
  bandeau: { backgroundColor: COULEURS.primaire, borderRadius: 12, padding: 14, marginBottom: 12 },
  bandeauTitre: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bandeauTxt: { color: '#fff', fontSize: 15, lineHeight: 22 },
  gras: { fontWeight: '700' },
  lien: { marginTop: 8 }, lienTxt: { color: '#fff', textDecorationLine: 'underline', fontWeight: '600' },
  bouton: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  boutonTxt: { color: COULEURS.primaire, fontWeight: '600' },
  presse: { opacity: 0.8 },
  carte: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: COULEURS.fondMuet },
  carteMienne: { borderColor: COULEURS.primaire, borderWidth: 2, backgroundColor: COULEURS.fondDoux },
  carteTitre: { fontSize: 18, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 6 },
  carteTete: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  carteTitreTete: { flex: 1, marginBottom: 0 },
  mesImages: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte },
  conseil: { marginTop: 8, fontSize: 14, color: COULEURS.secondaireFonce },
  italique: { fontStyle: 'italic' },
  sectionTitre: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 14, marginBottom: 4 },
  dates: { fontSize: 12, fontWeight: '400', color: COULEURS.texteMuet },
  note: { color: COULEURS.texteMuet, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
