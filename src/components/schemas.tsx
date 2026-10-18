// Schémas dessinés (react-native-svg), là où un dessin exact dit mieux qu'une photo (propositions des agents du 06/10/2026) :
// frise du cycle d'ovulation, rythme de garde alternée sur deux semaines, assiette des proportions, horloges du décalage horaire.
// Aucun texte traduit n'est dessiné dans les SVG (les légendes sont des <Text> React Native, dans la langue de l'appli).
import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { COULEURS } from '@/theme';

const LARGEUR_MAX = 600;
function largeurUtile(width: number) { return Math.min(width - 32, LARGEUR_MAX); }

/** Frise du cycle 1 : c cases (21 à 35) puis les cinq premiers jours du cycle suivant ; fenêtre fertile en pervenche clair, jour
 *  d'ovulation en violet, prochaines règles en rose (cases c + 1 à c + 5, même libellé que le résultat) ;
 *  ovulation = règles suivantes − 14 jours, donc case c − 13 (case 1 = premier jour des dernières règles) ; fenêtre = les six jours jusqu'à l'ovulation. */
export function FriseCycle({ c, legendes }: { c: number; legendes: { regles: string; fenetre: string; ovulation: string } }) {
  const { width } = useWindowDimensions();
  const n = c + 5;
  const W = largeurUtile(width), pas = W / n, h = 34, y0 = 14;
  const ovu = c - 13, fenetre = [ovu - 5, ovu];
  const couleur = (j: number) => (j === ovu ? COULEURS.primaire : j >= fenetre[0] && j <= fenetre[1] ? '#C9CBF0' : j > c ? '#F6D5DF' : COULEURS.fondMuet);
  return (
    <View style={styles.bloc} accessible accessibilityLabel={`${legendes.ovulation} : ${ovu}`}>
      <Svg width={W} height={y0 + h + 22}>
        {Array.from({ length: n }, (_, i) => i + 1).map((j) => (
          <React.Fragment key={j}>
            <Rect x={(j - 1) * pas + 1} y={y0} width={pas - 2} height={h} rx={4} fill={couleur(j)} stroke={COULEURS.bordure} strokeWidth={0.5} />
            {(j === 1 || j === ovu || j === c + 1 || (j % 7 === 0 && j < c && Math.abs(j - ovu) > 1)) && (pas >= 9 || j === ovu) ? (
              <SvgText x={(j - 1) * pas + pas / 2} y={y0 + h + 16} textAnchor="middle" fontSize="10" fill={j === ovu ? COULEURS.primaire : COULEURS.texteMuet} fontWeight={j === ovu ? '700' : '400'}>{String(j)}</SvgText>
            ) : null}
          </React.Fragment>
        ))}
        <Path d={`M${(ovu - 1) * pas + pas / 2 - 5} ${y0 - 3} l5 -8 l5 8 z`} fill={COULEURS.primaire} />
      </Svg>
      <View style={styles.legende}>
        <Pastille couleur="#F6D5DF" texte={legendes.regles} />
        <Pastille couleur="#C9CBF0" texte={legendes.fenetre} />
        <Pastille couleur={COULEURS.primaire} texte={legendes.ovulation} />
      </View>
    </View>
  );
}

/** Deux semaines d'un rythme de garde : 14 cases colorées par parent (mêmes couleurs que la grille du calendrier). motif : nombres de
 *  jours alternés ([7, 7], [2, 2, 3, 2, 2, 3], [2, 2, 5, 5]) ; null = un week-end sur deux (vendredi et samedi chez le parent 2). */
export function FriseGarde({ motif, jours, couleurs, noms, langue }: { motif: number[] | null; jours: string[]; couleurs: string[]; noms: [string, string]; langue: string }) {
  const { width, fontScale } = useWindowDimensions();
  const largeur = largeurUtile(width);
  const largeurGrille = Math.max(largeur, 7 * 44 * fontScale);
  const joursComplets = jours.map((_, i) => new Date(Date.UTC(2026, 0, 5 + i)).toLocaleDateString(langue, { weekday: 'long', timeZone: 'UTC' }));
  const qui: number[] = [];
  if (motif) {
    const cyc = motif.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 14; i++) { const pos = i % cyc; let acc = 0, idx = 0; while (pos >= acc + motif[idx]) { acc += motif[idx]; idx++; } qui.push(idx % 2); }
  } else {
    for (let i = 0; i < 14; i++) { const dow = i % 7, sem = Math.floor(i / 7); qui.push(dow >= 4 && dow <= 5 && sem % 2 === 0 ? 1 : 0); }
  }
  return (
    <View style={styles.bloc}>
      <ScrollView horizontal style={{ width: largeur }} contentContainerStyle={styles.friseContenu}>
        <View style={[styles.friseSemaines, { width: largeurGrille }]}>
          {[0, 1].map((semaine) => (
            <View key={semaine} style={styles.friseSemaine}>
              {qui.slice(semaine * 7, semaine * 7 + 7).map((q, i) => (
                <View key={i} style={[styles.friseJour, { backgroundColor: couleurs[q] }]}
                  accessible accessibilityRole="text" accessibilityLanguage={langue} accessibilityLabel={`${joursComplets[i]}, ${noms[q]}`}>
                  <Text style={styles.friseTexte}>{jours[i]}</Text>
                  <Text style={[styles.friseTexte, styles.friseNumero]}>{q + 1}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.friseLegende, { width: largeur }]}>
        {noms.map((nom, i) => (
          <View key={i} style={styles.friseParent} accessible accessibilityLanguage={langue} accessibilityLabel={`${i + 1}, ${nom}`}>
            <View style={[styles.friseRepere, { backgroundColor: couleurs[i] }]}>
              <Text style={[styles.friseTexte, styles.friseNumero]}>{i + 1}</Text>
            </View>
            <Text style={styles.friseNom}>{nom}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Assiette vue de dessus : secteurs (angle en degrés, couleur), à partir de midi, dans le sens des aiguilles. */
export function Assiette({ secteurs, taille = 120 }: { secteurs: { angle: number; couleur: string }[]; taille?: number }) {
  const r = taille / 2 - 4, cx = taille / 2, cy = taille / 2;
  let a0 = -90;
  const parts: React.ReactNode[] = [];
  for (const [i, s] of secteurs.entries()) {
    const a1 = a0 + s.angle;
    const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    const d = s.angle >= 360 ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0` : `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${s.angle > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
    a0 = a1;
    parts.push(<Path key={i} d={d} fill={s.couleur} stroke="#fff" strokeWidth={2} />);
  }
  return (
    <Svg width={taille} height={taille}>
      <Circle cx={cx} cy={cy} r={r + 3} fill="#fff" stroke={COULEURS.bordure} strokeWidth={1.5} />
      {parts}
    </Svg>
  );
}

/** Deux horloges : l'heure chez vous (20 h) et chez l'autre (20 h + décalage), avec fond jour ou nuit. */
export function Horloges({ decalage, noms }: { decalage: number; noms: [string, string] }) {
  const { width } = useWindowDimensions();
  const W = largeurUtile(width), r = 36;
  const cadran = (cx: number, heure: number) => {
    const h = ((heure % 24) + 24) % 24, nuit = h < 7 || h >= 20;
    const ah = ((h % 12) / 12) * 360 - 90, am = ((h % 1) * 360) - 90;
    const pt = (a: number, l: number) => [cx + l * Math.cos((a * Math.PI) / 180), 50 + l * Math.sin((a * Math.PI) / 180)];
    const [hx, hy] = pt(ah, r * 0.55), [mx, my] = pt(am, r * 0.8);
    return (
      <React.Fragment key={cx}>
        <Circle cx={cx} cy={50} r={r} fill={nuit ? '#2B2140' : '#FFF8E7'} stroke={COULEURS.primaireFonce} strokeWidth={2} />
        {Array.from({ length: 12 }, (_, i) => { const [x1, y1] = pt(i * 30 - 90, r - 5), [x2, y2] = pt(i * 30 - 90, r - (i % 3 ? 2 : 1)); return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={nuit ? '#D9D4EA' : COULEURS.primaireFonce} strokeWidth={i % 3 ? 1 : 2} />; })}
        <Line x1={cx} y1={50} x2={hx} y2={hy} stroke={nuit ? '#fff' : COULEURS.primaireFonce} strokeWidth={3} strokeLinecap="round" />
        <Line x1={cx} y1={50} x2={mx} y2={my} stroke={nuit ? '#fff' : COULEURS.primaireFonce} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={cx} cy={50} r={2.5} fill={COULEURS.coeur} />
      </React.Fragment>
    );
  };
  return (
    <View style={styles.bloc}>
      <Svg width={W} height={100}>
        {cadran(W / 4, 20)}
        {cadran((3 * W) / 4, 20 + decalage)}
      </Svg>
      <View style={styles.deuxNoms}>
        <Text style={styles.nom} numberOfLines={1}>{noms[0]}</Text>
        <Text style={styles.nom} numberOfLines={1}>{noms[1]}</Text>
      </View>
    </View>
  );
}

function Pastille({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <View style={styles.pastille}>
      <View style={[styles.point, { backgroundColor: couleur }]} />
      <Text style={styles.pastilleTxt}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { alignItems: 'center', marginVertical: 8 },
  legende: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  pastille: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  point: { width: 12, height: 12, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure },
  pastilleTxt: { fontSize: 12, color: COULEURS.texteMuet },
  deuxNoms: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 2 },
  nom: { fontSize: 13, fontWeight: '600', color: COULEURS.primaireFonce, maxWidth: '45%' },
  friseContenu: { paddingBottom: 6 },
  friseSemaines: { gap: 4 },
  friseSemaine: { flexDirection: 'row', gap: 4 },
  friseJour: { flex: 1, minWidth: 0, alignItems: 'center', padding: 4, gap: 4, borderRadius: 4 },
  friseTexte: { fontSize: 13, color: '#221B2B', textAlign: 'center' },
  friseNumero: { fontWeight: '700' },
  friseLegende: { gap: 8, marginTop: 6 },
  friseParent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friseRepere: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  friseNom: { flex: 1, fontSize: 15, color: COULEURS.texte },
});
