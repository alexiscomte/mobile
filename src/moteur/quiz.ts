// Moteur de questionnaires : même règle que le site (assets/js/quiz.js). Deux modes : « qcm » (corrigé tout de suite, score)
// et « test » (points par clé, questions conditionnelles, résultat selon des règles). Données : assets/data/quiz-<langue>.json
// du site (outils/gen/app_quiz.py), chargées ici et gardées 24 h. Scores gardés sur l'appareil (clé apq:<id>, comme le site).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Langue } from '../i18n';
import { SITE } from '../site';

export type Cond = [string, string, number | string];
export type Reponse = { t: string; p?: Record<string, number>; n?: string; ok?: boolean };
// img : image d'illustration servie par le site (chemin relatif à SITE, posé par outils/gen/app_quiz.py d'après quiz_images.py)
export type Question = { q: string; aide?: string; r: Reponse[]; si?: Cond[]; exp?: string; lien?: string; img?: string };
export type ResultatTest = { titre: string; corps: string; si?: Cond[]; img?: string };
export type BilanQcm = { min: number; titre: string; corps: string; img?: string };
export type Donnees = {
  mode?: string; questions: Question[]; resultats?: ResultatTest[]; bilans?: BilanQcm[];
  retenu?: string; note?: string; refaire?: string; retour?: string; suivant?: string; resultat?: string; juste?: string; errone?: string; revoir?: string;
};
export type Quiz = { id: string; u: string; t: string; m: 'qcm' | 'test'; d: Donnees; img?: string };
export type Score = { s: number; n: number; d: string; t: string; u: string };

const memoire: Partial<Record<Langue, Quiz[]>> = {};
const DUREE = 24 * 3600 * 1000;

export async function chargerQuiz(lg: Langue): Promise<Quiz[]> {
  if (memoire[lg]) return memoire[lg] as Quiz[];
  const cle = 'ap.quiz.' + lg;
  try {
    const brut = await AsyncStorage.getItem(cle);
    if (brut) { const { t, quiz } = JSON.parse(brut); if (Date.now() - t < DUREE && Array.isArray(quiz)) { memoire[lg] = quiz; return quiz; } }
  } catch { /* cache illisible */ }
  const r = await fetch(SITE + 'assets/data/quiz-' + lg + '.json');
  if (!r.ok) throw new Error('quiz ' + r.status);
  const quiz = ((await r.json()) as { quiz: Quiz[] }).quiz;
  memoire[lg] = quiz;
  AsyncStorage.setItem(cle, JSON.stringify({ t: Date.now(), quiz })).catch(() => undefined);
  return quiz;
}

/** Une règle (question ou résultat) s'applique-t-elle au score ? (conditions « si », dont « @max ») */
export function teste(regle: { si?: Cond[] }, score: Record<string, number>): boolean {
  for (const c of regle.si || []) {
    const v = score[c[0]] || 0;
    if (c[0] === '@max') {
      let meilleur: string | null = null, ex = false;
      for (const k of Object.keys(score)) {
        if (meilleur === null || score[k] > score[meilleur]) { meilleur = k; ex = false; }
        else if (meilleur !== k && score[k] === score[meilleur]) ex = true;
      }
      if (meilleur !== c[2] || ex) return false;
      continue;
    }
    const n = Number(c[2]);
    if (c[1] === '>=' && !(v >= n)) return false;
    if (c[1] === '<=' && !(v <= n)) return false;
    if (c[1] === '>' && !(v > n)) return false;
    if (c[1] === '<' && !(v < n)) return false;
    if (c[1] === '==' && !(v === n)) return false;
  }
  return true;
}

export function resultatTest(d: Donnees, score: Record<string, number>): ResultatTest {
  const rs = d.resultats || [];
  return rs.find((r) => teste(r, score)) || rs[rs.length - 1];
}

export function bilanQcm(d: Donnees, bons: number): BilanQcm {
  const bs = d.bilans || [];
  let lot = bs[0];
  for (const b of bs) if (bons >= b.min) lot = b;
  return lot;
}

/** Texte lisible d'un fragment HTML du site (les corrections et résultats contiennent des balises). */
export function texteHtml(h: string): string {
  return String(h || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '’').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&middot;/g, '·').replace(/&hellip;/g, '…').replace(/&rarr;/g, '→')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function lireScores(): Promise<Record<string, Score>> {
  const cles = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('apq:'));
  const out: Record<string, Score> = {};
  for (const [k, v] of await AsyncStorage.multiGet(cles)) { try { if (v) out[k.slice(4)] = JSON.parse(v); } catch { /* rien */ } }
  return out;
}
export async function memoriserScore(id: string, s: number, n: number, t: string, u: string) {
  await AsyncStorage.setItem('apq:' + id, JSON.stringify({ s, n, d: new Date().toISOString().slice(0, 10), t, u }));
}
