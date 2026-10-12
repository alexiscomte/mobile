// Carte d'un signe du jour (zodiaque) ou d'un animal chinois du jour : image, nom, dates ou années, texte du jour, conseil.
// Rendue par l'écran natif /horoscope (horoscope.tsx) et, en ligne dans un article (article.tsx), par les pages « horoscope du jour
// par signe / par animal » du site, dont app_contenu.py marque la carte unique (data-app-sign / data-app-animal, 12/10/2026).
// Pressable quand `onPress` est donné (l'écran natif ouvre la page de contenu de la carte, si elle existe dans l'index).
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Illustration } from '@/components/illustration';
import type { Langue } from '@/i18n';
import { GLYPHES, TEXTES2 } from '@/i18n2';
import { TEXTES3 } from '@/i18n3';
import { CHINOIS as CHINOIS_IMG, ZODIAQUE, type Img } from '@/images';
import { chinoisDuJour, type TextesChinois } from '@/moteur/chinois';
import { ciel, entete, horoscope, textes } from '@/moteur/horoscope';
import ui from '@/moteur/ui.json';
import { COULEURS } from '@/theme';

const CHINOIS = (ui as unknown as { chinoisJour?: Record<string, TextesChinois> }).chinoisJour;
/** Textes de l'horoscope chinois du jour dans la langue (sinon en français), ou null si l'appli n'en a pas. */
export function textesChinois(lg: Langue): TextesChinois | null {
  return CHINOIS ? CHINOIS[lg] || CHINOIS.fr || null : null;
}
export const TITRE_CHINOIS: Record<string, string> = {
  fr: 'L’horoscope chinois du jour', en: 'Today’s Chinese horoscope', de: 'Das chinesische Tageshoroskop', es: 'El horóscopo chino del día',
  it: 'L’oroscopo cinese del giorno', pt: 'O horóscopo chinês do dia', nl: 'De Chinese daghoroscoop', pl: 'Chiński horoskop dnia', tr: 'Günün Çin burcu yorumu',
};

type CarteProps = {
  image: Img; titre: string; alt: string; sousTitre?: string; texte: string; conseil: string; langue: Langue;
  mienne?: boolean; onPress?: () => void;
};

/** La carte elle-même (présentation commune aux signes et aux animaux). */
export function HoroscopeCarte({ image, titre, alt, sousTitre, texte, conseil, langue, mienne, onPress }: CarteProps) {
  const T2 = TEXTES2[langue], T3 = TEXTES3[langue];
  const corps = (
    <>
      <View style={styles.carteTete}>
        <Illustration image={image} taille={56} alt={alt} />
        <Text style={[styles.carteTitre, styles.carteTitreTete]}>{titre}{sousTitre ? <Text style={styles.dates}> {sousTitre}</Text> : null}</Text>
      </View>
      <Text style={styles.texte}>{texte}</Text>
      <Text style={styles.conseil}>{T2.conseil} — <Text style={styles.italique}>{conseil}</Text></Text>
      {onPress ? <Text style={styles.lien}>{T3.lirePage} →</Text> : null}
    </>
  );
  if (!onPress) return <View style={[styles.carte, mienne && styles.carteMienne]}>{corps}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={alt + ', ' + T3.lirePage} onPress={onPress}
      style={({ pressed }) => [styles.carte, mienne && styles.carteMienne, pressed && styles.presse]}>
      {corps}
    </Pressable>
  );
}

/** Carte du jour d'un signe du zodiaque (0 = Bélier … 11 = Poissons), calculée sur l'appareil. */
export function CarteSigneJour({ signe, langue, dates, quand, mienne, onPress }: { signe: number; langue: Langue; dates?: string; quand?: Date; mienne?: boolean; onPress?: () => void }) {
  const maintenant = useMemo(() => quand || new Date(), [quand]);
  const c = useMemo(() => ciel(maintenant), [maintenant]);
  const TA = textes(langue);
  const h = horoscope(c, signe, langue);
  return (
    <HoroscopeCarte image={ZODIAQUE[signe]} titre={GLYPHES[signe] + ' ' + TA.signes[signe]} alt={TA.signes[signe]} sousTitre={dates} texte={h.phrases.join(' ')}
      conseil={h.conseil} langue={langue} mienne={mienne} onPress={onPress} />
  );
}

/** Carte du jour d'un animal chinois (0 = Rat … 11 = Cochon), calculée sur l'appareil ; rien si les textes manquent. */
export function CarteAnimalJour({ animal, langue, quand, mienne, onPress }: { animal: number; langue: Langue; quand?: Date; mienne?: boolean; onPress?: () => void }) {
  const maintenant = useMemo(() => quand || new Date(), [quand]);
  const TC = textesChinois(langue), TA = textes(langue);
  if (!TC) return null;
  const h = chinoisDuJour(TC, animal, maintenant);
  return (
    <HoroscopeCarte image={CHINOIS_IMG[animal]} titre={TA.chinois.animaux[animal]} alt={TA.chinois.animaux[animal]} sousTitre={TC.annees + ' ' + h.annees.join(', ') + '…'}
      texte={h.texte} conseil={h.conseil} langue={langue} mienne={mienne} onPress={onPress} />
  );
}

/** Carte du jour EN LIGNE dans un article (marqueur data-app-sign / data-app-animal) : l'en-tête du jour, puis la carte. */
export function CarteJourArticle({ signe, animal, dates, langue }: { signe?: number; animal?: number; dates?: string; langue: Langue }) {
  const maintenant = useMemo(() => new Date(), []);
  const c = useMemo(() => ciel(maintenant), [maintenant]);
  if (animal !== undefined) {
    const TC = textesChinois(langue);
    if (!TC) return null;
    return (
      <View style={styles.bloc}>
        <Text style={styles.entete}>{chinoisDuJour(TC, animal, maintenant).entete}</Text>
        <CarteAnimalJour animal={animal} langue={langue} quand={maintenant} />
      </View>
    );
  }
  if (signe === undefined) return null;
  return (
    <View style={styles.bloc}>
      <Text style={styles.entete}>{entete(c, langue, maintenant)}</Text>
      <CarteSigneJour signe={signe} langue={langue} dates={dates} quand={maintenant} />
    </View>
  );
}

export const stylesCarte = StyleSheet.create({
  entete: { color: COULEURS.texteMuet, fontSize: 14, marginBottom: 12 },
  carte: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: COULEURS.fondMuet },
  carteMienne: { borderColor: COULEURS.primaire, borderWidth: 2, backgroundColor: COULEURS.fondDoux },
  carteTitre: { fontSize: 18, fontWeight: '700', color: COULEURS.primaireFonce, marginBottom: 6 },
  carteTete: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  carteTitreTete: { flex: 1, marginBottom: 0 },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte },
  conseil: { marginTop: 8, fontSize: 14, color: COULEURS.secondaireFonce },
  italique: { fontStyle: 'italic' },
  dates: { fontSize: 12, fontWeight: '400', color: COULEURS.texteMuet },
  lien: { marginTop: 10, color: COULEURS.primaire, fontWeight: '600', fontSize: 14 },
  presse: { opacity: 0.8 },
  bloc: { marginVertical: 6 },
});
const styles = stylesCarte;
