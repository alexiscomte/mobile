// Vie d'époux ou d'épouse selon le prénom : même numérologie que le site (assets/js/epoux.js), textes du site (outils_txt.json).
import type { Langue } from '../i18n';
import outils from './outils_txt.json';

export type TextesEpoux = {
  prenom: string; autre: string; go: string; manque: string; expr: string; expr_t: string; intime: string; intime_t: string;
  real: string; real_t: string; couple: string; lettres: string; maitre: string; note: string; partager: string; copie: string;
  N: Record<string, string[]>; C: Record<string, string>;
};
const TXT = (outils as unknown as { epoux: Record<string, TextesEpoux> }).epoux;
export const textesEpoux = (lg: Langue): TextesEpoux => TXT[lg] || TXT.en || TXT.fr;

const VOY = 'AEIOUY';
export function norm(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}
const val = (c: string) => ((c.charCodeAt(0) - 65) % 9) + 1;
const somme = (n: number) => String(n).split('').reduce((a, d) => a + parseInt(d, 10), 0);
export function reduire(n: number): number {
  while (n > 9 && n !== 11 && n !== 22) n = somme(n);
  return n;
}
export type Nombres = { lettres: string; expr: number; intime: number; real: number };
export function nombres(p: string): Nombres {
  const s = norm(p); let e = 0, i = 0, r = 0;
  for (const c of s) { const v = val(c); e += v; if (VOY.includes(c)) i += v; else r += v; }
  return { lettres: s, expr: reduire(e), intime: reduire(i), real: reduire(r) };
}
export function nombreCouple(a: number, b: number): number {
  let c = a + b; while (c > 9) c = somme(c);
  return c;
}
export function libelle(T: TextesEpoux, n: number): string {
  return n + (n === 11 || n === 22 ? ' (' + T.maitre + ')' : '');
}
export type Lecture = { prenom: string; lettres: string; blocs: { titre: string; sous: string; texte: string }[] };
export function lecture(T: TextesEpoux, p: string): Lecture {
  const n = nombres(p), N = (k: number) => T.N[String(k)] || T.N['1'];
  return { prenom: p, lettres: n.lettres.split('').join(' '), blocs: [
      { titre: T.expr + ' : ' + libelle(T, n.expr), sous: T.expr_t, texte: N(n.expr)[0] },
      { titre: T.intime + ' : ' + libelle(T, n.intime), sous: T.intime_t, texte: N(n.intime)[1] },
      { titre: T.real + ' : ' + libelle(T, n.real), sous: T.real_t, texte: N(n.real)[2] },
    ] };
}
