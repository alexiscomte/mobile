// Types du moteur astronomique du site (assets/js/astro.js, copié par outils/gen/app_moteurs.py).
export type Planete = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';
export type TypeAspect = 'conj' | 'opp' | 'tri' | 'sq' | 'sex';
export type Position = { lon: number; retro: boolean; house?: number };
export type Aspect = { a: Planete; b: Planete; type: TypeAspect; orb: number };
export type Carte = { jd: number; planets: Record<Planete, Position>; order: Planete[]; asc?: number; mc?: number; aspects: Aspect[] };
export type Phase = { angle: number; illum: number; idx: number; waxing: boolean };
export type Chinois = { year: number; animal: number; element: number; yang: boolean };

export const ASTRO: {
  jd(y: number, m: number, d: number, h?: number): number;
  jdFromDate(dt: Date): number;
  jdToDate(j: number): Date;
  sunLon(j: number): number;
  moonLon(j: number): number;
  planetLon(name: Planete, j: number): number;
  retrograde(name: Planete, j: number): boolean;
  angles(j: number, lat: number, lon: number): { asc: number; mc: number; ramc: number; eps: number };
  sign(lon: number): number;
  degIn(lon: number): number;
  fmtDeg(lon: number): string;
  house(lon: number, asc: number): number;
  phase(j: number): Phase;
  nextPhase(j: number, target: number): number | null;
  chineseNewYear(y: number): number;
  chinese(y: number, m: number, d: number): Chinois;
  aspect(a: number, b: number): { type: TypeAspect; orb: number; exact: number } | null;
  chart(j: number, lat?: number, lon?: number): Carte;
  obliquity(j: number): number;
  gmst(j: number): number;
  norm(x: number): number;
  PLANETS: Planete[];
};
