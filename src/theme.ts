// Couleurs de l'application : celles du site (assets/css/style.css, variables --color-*), en jetons qui suivent le réglage
// clair / sombre de l'iPhone (12/10/2026, recommandations d'Apple : « Dark Mode », couleurs sémantiques ; cahier
// C:\Claude\Claude\specs\appli-ios-apple-1210.md).
// - iOS : chaque jeton est une couleur dynamique native (DynamicColorIOS) : le système choisit la bonne valeur, y compris
//   « Augmenter le contraste » (valeurs CONTRASTE), sans re-rendu ; les StyleSheet.create des écrans restent statiques.
// - Web (aperçu) : variables CSS --ap-<jeton>, redéfinies sous prefers-color-scheme: dark.
// - Android : valeurs claires (app.json android.userInterfaceStyle = light).
// Quand une CHAÎNE est indispensable (thème de la navigation, rendu HTML des articles, page web injectée), utiliser
// useCouleurs(), qui renvoie la palette claire ou sombre selon le réglage du moment.
import { DynamicColorIOS, Platform, useColorScheme, type ColorValue } from 'react-native';

export const CLAIR = {
  primaire: '#580378',         // violet profond du logo : textes, liens, icônes, bordures actives
  primairePlein: '#580378',    // fond plein des boutons et bandeaux (texte blanc dessus)
  primaireFonce: '#3F0257',    // titres de section
  secondaire: '#5E60D8',       // pervenche
  secondaireFonce: '#3E40A8',
  coeur: '#D6001C',            // erreurs, actions destructives (texte)
  coeurPlein: '#D6001C',       // fond plein d'une action destructive (texte blanc dessus)
  coeurFond: '#FFF5F6',        // panneau de confirmation destructive
  orange: '#C96A12',
  bleu: '#3F6FA8',
  vert: '#4C7A1A',
  fond: '#FFFFFF',
  fondDoux: '#F2F3FF',         // cartes, champs de saisie
  fondMuet: '#F8F8FF',
  fondEleve: '#FFFFFF',        // listes déroulantes, cases posées sur le fond
  bordure: '#DADBF5',
  texte: '#221B2B',
  texteMuet: '#635B70',
  surPlein: '#FFFFFF',         // texte posé sur primairePlein / coeurPlein / tuiles colorées
  avertFond: '#FFF4E5',        // encadrés d'avertissement (santé, urgence)
  avertBord: '#F0C27A',
  avertTexte: '#7A4A00',
  bulleEquipe: '#EFE6F7',      // messages d'AffectionPlus dans la messagerie
  bulleEquipeBord: '#D8C4EA',
  hors: '#8D8A99',             // point « hors ligne » de la présence
  grille: '#ECEDFA',           // traits fins des graphiques
};

export type NomCouleur = keyof typeof CLAIR;

// mode sombre : fonds proches du noir des écrans iOS (systemBackground), violet éclairci pour garder un contraste AA (4,5:1)
// sur fond noir ; les fonds pleins (boutons) restent assez foncés pour le texte blanc
export const SOMBRE: Record<NomCouleur, string> = {
  primaire: '#C9A0F0',
  primairePlein: '#7B3FA8',
  primaireFonce: '#DCC2F5',
  secondaire: '#A3A5F7',
  secondaireFonce: '#C2C3FA',
  coeur: '#FF6B7A',
  coeurPlein: '#C8102E',
  coeurFond: '#3A0E14',
  orange: '#F0A04B',
  bleu: '#86B0E6',
  vert: '#8CC152',
  fond: '#000000',
  fondDoux: '#1C1A22',
  fondMuet: '#121016',
  fondEleve: '#232029',
  bordure: '#38333F',
  texte: '#F2EFF6',
  texteMuet: '#ABA3B8',
  surPlein: '#FFFFFF',
  avertFond: '#33240F',
  avertBord: '#6B4A1A',
  avertTexte: '#F5C98A',
  bulleEquipe: '#2E2140',
  bulleEquipeBord: '#4A3766',
  hors: '#8D8A99',
  grille: '#2A2633',
};

// « Augmenter le contraste » (Réglages > Accessibilité > Affichage) : textes secondaires et bordures plus marqués
const CONTRASTE: Partial<Record<NomCouleur, [string, string]>> = {
  texteMuet: ['#4A4356', '#CFC8DA'],
  bordure: ['#A9AAD6', '#5E5768'],
  primaire: ['#45025E', '#DDBEF7'],
  texte: ['#000000', '#FFFFFF'],
};

const NOMS = Object.keys(CLAIR) as NomCouleur[];

function jeton(n: NomCouleur): ColorValue {
  if (Platform.OS === 'ios') {
    const c = CONTRASTE[n];
    return DynamicColorIOS({ light: CLAIR[n], dark: SOMBRE[n], highContrastLight: c ? c[0] : undefined, highContrastDark: c ? c[1] : undefined });
  }
  if (Platform.OS === 'web') return 'var(--ap-' + n + ')';
  return CLAIR[n];
}

// Le type reste `string` pour les props qui l'exigent (couleur d'une tuile, d'un trait SVG) : sur iOS la valeur réelle est une
// couleur dynamique que React Native et react-native-svg comprennent (processColor) ; NE PAS la concaténer ni l'injecter dans
// du HTML (utiliser alors useCouleurs()).
export const COULEURS = Object.fromEntries(NOMS.map((n) => [n, jeton(n)])) as unknown as Record<NomCouleur, string>;

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('ap-couleurs')) {
  const vars = (p: Record<NomCouleur, string>) => NOMS.map((n) => '--ap-' + n + ':' + p[n]).join(';');
  const s = document.createElement('style');
  s.id = 'ap-couleurs';
  s.textContent = ':root{' + vars(CLAIR) + ';color-scheme:light dark}@media (prefers-color-scheme: dark){:root{' + vars(SOMBRE) + '}}';
  document.head.appendChild(s);
}

/** Palette en chaînes selon le réglage clair / sombre du moment (re-rendu au changement). */
export function useCouleurs(): Record<NomCouleur, string> & { sombre: boolean } {
  const sombre = useColorScheme() === 'dark' && Platform.OS !== 'android';
  return { ...(sombre ? SOMBRE : CLAIR), sombre };
}

// dégradés des tuiles (accueil du site : .section-card) : identiques en clair et en sombre (texte blanc sur couleur franche)
export const DEGRADES = {
  conseils: ['#5C8A1E', '#446818'],
  sante: ['#3F6FA8', '#2c5686'],
  sexualite: ['#7A1FA0', '#580378'],
  astro: ['#5E60D8', '#3E40A8'],
  jeux: ['#B85A08', '#8a4306'],
  compat: ['#8E1F6E', '#66154f'],
} as const;
