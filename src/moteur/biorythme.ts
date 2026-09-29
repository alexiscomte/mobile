// Biorythmes : même calcul que le site (assets/js/biomoi.js) — trois cycles (23, 28, 33 jours) depuis la naissance.
export const CYCLES = [
  { P: 23, k: 'phys', col: '#3F6FA8' },
  { P: 28, k: 'emo', col: '#C96A12' },
  { P: 33, k: 'intel', col: '#4C7A1A' },
] as const;
export type CleCycle = (typeof CYCLES)[number]['k'];
export type Categorie = 'haut' | 'creux' | 'critM' | 'critD' | 'montee' | 'descente' | 'remontee' | 'baisse';
export type EtatCycle = { P: number; k: CleCycle; col: string; v: number; monte: boolean; cat: Categorie; kz: number; kp: number };
export type Bilan = 'bonne' | 'moyenne' | 'dure' | 'critique';
const TAU = Math.PI * 2;

export function categorie(v: number, monte: boolean): Categorie {
  if (v > 0.7) return 'haut';
  if (v < -0.7) return 'creux';
  if (Math.abs(v) <= 0.2) return monte ? 'critM' : 'critD';
  if (v > 0) return monte ? 'montee' : 'descente';
  return monte ? 'remontee' : 'baisse';
}

/** Âge en jours (avec la fraction du jour) et état des trois cycles ; null si la date est absente ou future. */
export function biorythmes(naissance: string, heure?: string, maintenant: number = Date.now()): { age: number; etats: EtatCycle[]; bilan: Bilan } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(naissance || '');
  if (!m) return null;
  const hm = /^(\d{2}):(\d{2})/.exec(heure || '');
  const t0 = new Date(+m[1], +m[2] - 1, +m[3], hm ? +hm[1] : 0, hm ? +hm[2] : 0).getTime();
  if (!(t0 < maintenant)) return null;
  const age = (maintenant - t0) / 86400000;
  const etats: EtatCycle[] = [];
  let score = 0, ncrit = 0;
  for (const c of CYCLES) {
    const v = Math.sin(TAU * age / c.P), monte = Math.cos(TAU * age / c.P) > 0;
    const cat = categorie(v, monte);
    if (cat === 'critM' || cat === 'critD') ncrit++;
    score += v;
    const phase = age / c.P, nz = Math.floor(phase * 2) + 1, kz = nz * c.P / 2 - age;
    const np = Math.floor(phase - 0.25) + 1, kp = (np + 0.25) * c.P - age;
    etats.push({ P: c.P, k: c.k, col: c.col, v, monte, cat, kz, kp });
  }
  const moy = score / 3;
  const bilan: Bilan = ncrit >= 2 ? 'critique' : moy > 0.35 ? 'bonne' : moy < -0.35 ? 'dure' : 'moyenne';
  return { age, etats, bilan };
}

/** Points d'une courbe de -15 à +15 jours autour d'aujourd'hui : [décalage en jours, valeur -1..1]. */
export function courbe(age: number, P: number, pas = 0.25): [number, number][] {
  const pts: [number, number][] = [];
  for (let q = -15; q <= 15.001; q += pas) pts.push([q, Math.sin(TAU * (age + q) / P)]);
  return pts;
}
