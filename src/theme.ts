// Couleurs de l'application : celles du site (assets/css/style.css, variables --color-*).
export const COULEURS = {
  primaire: '#580378',         // violet profond du logo
  primaireFonce: '#3F0257',
  secondaire: '#5E60D8',       // pervenche
  secondaireFonce: '#3E40A8',
  coeur: '#D6001C',
  orange: '#C96A12',
  bleu: '#3F6FA8',
  vert: '#4C7A1A',
  fond: '#FFFFFF',
  fondDoux: '#F2F3FF',
  fondMuet: '#F8F8FF',
  bordure: '#DADBF5',
  texte: '#221B2B',
  texteMuet: '#635B70',
};

// dégradés des tuiles (accueil du site : .section-card)
export const DEGRADES = {
  conseils: ['#5C8A1E', '#446818'],
  sante: ['#3F6FA8', '#2c5686'],
  sexualite: ['#7A1FA0', '#580378'],
  astro: ['#5E60D8', '#3E40A8'],
  jeux: ['#B85A08', '#8a4306'],
  compat: ['#8E1F6E', '#66154f'],
} as const;
