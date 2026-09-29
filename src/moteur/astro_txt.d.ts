// Types des textes d'astrologie du site (assets/js/astro_txt.js, copié par outils/gen/app_moteurs.py).
// Les clés connues sont typées ; le reste est accessible par index (les textes évoluent sur le site).
export type TextesAstro = {
  signes: string[];
  phases: string[];
  planetes: Record<string, string>;
  elements: string[];
  maisons: string[];
  soleil: string[]; lune: string[]; ascendant: string[]; mc: string[]; venus: string[]; mars: string[]; style: string[];
  intro_planete: Record<string, string>;
  aspects: Record<string, string>; aspect_txt: Record<string, string>;
  generation: string; retro: string;
  ui: Record<string, string>;
  chinois: { animaux: string[]; elements: string[]; portraits: string[]; elem_txt: string[]; trines: number[][] } & Record<string, unknown>;
  horoscope: { conseils: string[]; phase: string[]; mercure_retro: string } & Record<string, string | string[]>;
  [cle: string]: unknown;
};
export const ASTRO_TXT: Record<string, TextesAstro>;
