// Pouce « j'aime » d'un article (07/10/2026, soir ; cahier specs/espace-membre-reduit-0710.md, point 7), comme le bloc <!--POUCE-->
// du site (pouce.py, espace.js installerPouce) : bouton (contour au repos, plein sur fond violet quand la page est aimée) et compteur à
// côté, rien d'affiché à 0, jamais un lien (aucune liste de personnes). Toucher = j'aime, et la page entre dans les favoris
// (ap.favoris, synchronisés avec le compte) ; nouveau toucher = je n'aime plus, elle en sort. L'état de départ est celui des favoris,
// puis celui du serveur, qui fait foi (relu à la connexion et à la déconnexion). Icône : Material Icons « thumb_up » (Apache 2.0).
// Depuis le 09/10/2026 (comme la barre du site) : en HAUT de l'écran de l'article, sur la ligne du fil d'Ariane, le fil à gauche, le pouce
// (et son compteur) puis l'icône de partage natif (Share de react-native, prop « partager ») collés à DROITE (Alexis : « totalement sur la
// droite ») ; le message bref (« Page ajoutée aux favoris ») prend un instant la place du fil, sans décaler l'article ni les boutons.
// IconePartage sert aussi à la barre de titre de page.tsx (en haut à droite).
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { annoncerIOS } from '@/accessibilite';
import { basculerAime, cheminAime, lireAime } from '@/aime';
import { UI_E } from '@/components/espace';
import { fmt } from '@/i18n';
import { useProfil } from '@/profil';
import { choix, succes } from '@/haptique';
import { COULEURS } from '@/theme';

const POUCE = 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z';

/** Partage système sur iOS ; ailleurs, icône du site (« share-2 » de Feather Icons, licence MIT). */
export function IconePartage({ couleur = COULEURS.primaire, taille = 17 }: { couleur?: string; taille?: number }) {
  if (Platform.OS === 'ios') return <SymbolView name="square.and.arrow.up" tintColor={couleur} size={taille} />;
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Circle cx={18} cy={5} r={3} fill="none" stroke={couleur} strokeWidth={1.7} />
      <Circle cx={6} cy={12} r={3} fill="none" stroke={couleur} strokeWidth={1.7} />
      <Circle cx={18} cy={19} r={3} fill="none" stroke={couleur} strokeWidth={1.7} />
      <Path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" fill="none" stroke={couleur} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

type Props = {
  u: string;
  titre: string;
  /** fil d'Ariane, à gauche des deux boutons (comme sur le site) */
  fil?: string;
  /** partage natif de la page ; sans lui, pas d'icône */
  partager?: () => void;
  /** nom accessible de l'icône de partage (TEXTES.partagerPage) */
  libellePartage?: string;
};

export function Pouce({ u, titre, fil, partager, libellePartage }: Props) {
  const { langue, favoris, setFavoris, compte } = useProfil();
  const E = UI_E[langue] || UI_E.fr;
  const p = cheminAime(u);
  const favRef = useRef(favoris);
  useLayoutEffect(() => { favRef.current = favoris; }, [favoris]);
  const [moi, setMoi] = useState(() => favoris.some((f) => f.url === p));
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState('');
  const seq = useRef(0);
  const enCours = useRef(false);
  const session = compte ? compte.session : '';

  /** La page entre dans les favoris (oui) ou en sort ; vrai si la liste a changé. */
  const favori = useCallback(async (oui: boolean) => {
    const f = favRef.current, dedans = f.some((x) => x.url === p);
    if (oui === dedans) return false;
    await setFavoris(oui ? [{ url: p, titre: titre.replace(/\s+/g, ' ').trim().slice(0, 120), lang: langue, date: new Date().toISOString().slice(0, 10) }, ...f]
      : f.filter((x) => x.url !== p));
    return true;
  }, [p, titre, langue, setFavoris]);

  useEffect(() => {        // état du serveur ; relu quand la session change (connexion, déconnexion)
    let actif = true;
    const s = ++seq.current;
    lireAime(p).then((e) => { if (actif && e && s === seq.current) { setMoi(e.moi); setN(e.n); } }).catch(() => undefined);
    return () => { actif = false; };
  }, [p, session]);

  useEffect(() => {        // message bref (« Page ajoutée aux favoris »), effacé après 2,2 s
    if (!msg) return;
    annoncerIOS(msg);
    const m = setTimeout(() => setMsg(''), 2200);
    return () => clearTimeout(m);
  }, [msg]);

  const toucher = async () => {
    if (enCours.current) return;
    enCours.current = true; seq.current++;                 // une lecture en cours ne repassera pas par-dessus
    const oui = !moi;
    setMoi(oui); setMsg(oui ? E.ajoute : E.retire);       // tout de suite, sans attendre le serveur
    if (oui) succes(); else choix();
    await favori(oui);
    const e = await basculerAime(p).catch(() => null);
    enCours.current = false;
    if (!e) return;                                         // hors ligne, plafond : l'état local reste
    setMoi(e.moi); setN(e.n);
    if (e.moi !== oui && await favori(e.moi)) setMsg(e.moi ? E.ajoute : E.retire);   // le serveur fait foi
  };

  return (
    <View style={styles.ligne}>
      {/* à gauche : le fil d'Ariane (ou, un instant, le message) ; sinon un espace qui pousse les boutons à droite */}
      {msg ? <Text style={styles.msg} accessibilityLiveRegion="polite" numberOfLines={2}>{msg}</Text>
        : fil ? <Text style={styles.fil} numberOfLines={2}>{fil}</Text> : <View style={styles.espace} />}
      <Pressable onPress={() => { toucher(); }} hitSlop={8} accessibilityRole="togglebutton" accessibilityState={{ checked: moi }}
        accessibilityLabel={E.aime} style={({ pressed }) => [styles.bouton, moi && styles.boutonAime, pressed && styles.presse]}>
        <Svg width={17} height={17} viewBox="0 0 24 24">
          <Path d={POUCE} fill={moi ? '#fff' : 'none'} stroke={moi ? 'none' : COULEURS.primaire} strokeWidth={1.7} strokeLinejoin="round" />
        </Svg>
      </Pressable>
      {n > 0 ? <Text style={styles.n} accessibilityLabel={fmt(E.aimeN, n)}>{String(n)}</Text> : null}
      {partager ? (
        <Pressable onPress={partager} hitSlop={8} accessibilityRole="button" accessibilityLabel={libellePartage}
          style={({ pressed }) => [styles.bouton, pressed && styles.presse]}>
          <IconePartage />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, minHeight: 32 },
  bouton: { width: 38, height: 32, borderRadius: 999, borderWidth: 1, borderColor: COULEURS.bordure, backgroundColor: COULEURS.fondEleve, alignItems: 'center', justifyContent: 'center' },
  boutonAime: { backgroundColor: COULEURS.primairePlein, borderColor: COULEURS.primairePlein },
  presse: { opacity: 0.75 },
  n: { fontSize: 14, fontWeight: '600', color: COULEURS.texteMuet, marginLeft: -3 },
  fil: { flex: 1, flexShrink: 1, color: COULEURS.texteMuet, fontSize: 12, marginRight: 2 },
  msg: { flex: 1, flexShrink: 1, fontSize: 13, color: COULEURS.vert, marginRight: 2 },
  espace: { flex: 1 },
});
