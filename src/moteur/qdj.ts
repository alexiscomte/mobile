// Question et défi du jour : même règle que le site (assets/js/qdj.js) — numéro du jour depuis le 1er janvier 2026.
import type { Langue } from '../i18n';
import qdj from './qdj.json';
import sondages from './sondages.json';

const D = qdj as { nom: Record<string, string>; questions: Record<string, string[]>; defis: Record<string, string[]> };
const S = (sondages as { sondages: { id: string; u: Record<string, string>; q: Record<string, string>; o: Record<string, string[]> }[] }).sondages;
const ORIGINE = Date.UTC(2026, 0, 1);
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function numeroDuJour(d: Date = new Date()): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - ORIGINE) / 86400000);
}
export function questionDuJour(lg: Langue, extra = 0, d: Date = new Date()): string {
  const Q = D.questions[lg] || D.questions.fr;
  return Q[mod(numeroDuJour(d) + extra * 7, Q.length)];
}
export function defiDuJour(lg: Langue, d: Date = new Date()): string {
  const F = D.defis[lg] || D.defis.fr;
  return F[mod(numeroDuJour(d), F.length)];
}
export function nomQdj(lg: Langue): string { return D.nom[lg] || D.nom.fr; }

/** Le sondage du jour : même choix que l'accueil du site (jour civil, ordre du catalogue). */
export function sondageDuJour(lg: Langue) {
  const liste = S.filter((s) => s.q[lg] && s.u[lg]);
  if (!liste.length) return null;
  return liste[Math.floor(Date.now() / 86400000) % liste.length];
}
