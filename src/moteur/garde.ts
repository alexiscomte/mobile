// Calendrier de garde alternée : mêmes rythmes que le site (assets/js/garde.js), textes du site (outils_txt.json).
import type { Langue } from '../i18n';
import outils from './outils_txt.json';

export type TextesGarde = {
  rythme: string; r_sem: string; r_223: string; r_2255: string; r_we: string; debut: string; p1: string; p2: string; mois: string;
  go: string; manque: string; nuits: string; imprimer: string; ics: string; note: string; jours: string[]; chez: string;
};
const TXT = (outils as unknown as { garde: Record<string, TextesGarde> }).garde;
export const textesGarde = (lg: Langue): TextesGarde => TXT[lg] || TXT.en || TXT.fr;

export type Rythme = 'sem' | 'r223' | 'r2255' | 'we';
export const RYTHMES: Rythme[] = ['sem', 'r223', 'r2255', 'we'];
export const MOTIFS: Record<Rythme, number[] | null> = { sem: [7, 7], r223: [2, 2, 3, 2, 2, 3], r2255: [2, 2, 5, 5], we: null };

export const cle = (d: Date) => d.toISOString().slice(0, 10);
export const plusJours = (d: Date, n: number) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; };

/** Jour (clé AAAA-MM-JJ) -> 0 (parent 1) ou 1 (parent 2), par nuit. */
export function attribution(rythme: Rythme, debut: Date, jours: number): Record<string, 0 | 1> {
  const attrib: Record<string, 0 | 1> = {};
  const motif = MOTIFS[rythme];
  for (let i = 0; i < jours; i++) {
    const d = plusJours(debut, i); let qui: 0 | 1;
    if (motif) {
      const cyc = motif.reduce((a, b) => a + b, 0);
      const pos = i % cyc; let acc = 0, idx = 0;
      while (pos >= acc + motif[idx]) { acc += motif[idx]; idx++; }
      qui = (idx % 2) as 0 | 1;
    } else {
      // un week-end sur deux : vendredi et samedi (nuits) chez le parent 2 une semaine sur deux, le reste chez le parent 1
      const dow = (d.getUTCDay() + 6) % 7, sem = Math.floor(i / 7);
      qui = dow >= 4 && dow <= 5 && sem % 2 === 0 ? 1 : 0;
    }
    attrib[cle(d)] = qui;
  }
  return attrib;
}

export function compter(attrib: Record<string, 0 | 1>): [number, number] {
  let a = 0, b = 0;
  for (const k of Object.keys(attrib)) if (attrib[k] === 0) a++; else b++;
  return [a, b];
}

export type Case = { d: number; q?: 0 | 1 } | null;
/** Le mois (m : 0-11) en semaines de sept cases, lundi en tête. */
export function grille(annee: number, m: number, attrib: Record<string, 0 | 1>): Case[][] {
  const prem = new Date(Date.UTC(annee, m, 1)), fin = new Date(Date.UTC(annee, m + 1, 0));
  const cases: Case[] = [];
  const dec = (prem.getUTCDay() + 6) % 7;
  for (let k = 0; k < dec; k++) cases.push(null);
  for (let d = 1; d <= fin.getUTCDate(); d++) cases.push({ d, q: attrib[cle(new Date(Date.UTC(annee, m, d)))] });
  while (cases.length % 7 !== 0) cases.push(null);
  const semaines: Case[][] = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
}

/** Le calendrier au format iCalendar : un événement par période continue chez le même parent. */
export function ics(attrib: Record<string, 0 | 1>, noms: [string, string], debut: Date, jours: number, chez: string): string {
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AffectionPlus//garde//FR', 'CALSCALE:GREGORIAN'];
  let i = 0;
  while (i < jours) {
    const q = attrib[cle(plusJours(debut, i))]; let k = i;
    while (k < jours && attrib[cle(plusJours(debut, k))] === q) k++;
    const a = cle(plusJours(debut, i)).replace(/-/g, ''), b = cle(plusJours(debut, k)).replace(/-/g, '');
    lignes.push('BEGIN:VEVENT', 'UID:garde-' + a + '@affectionplus.com', 'DTSTAMP:' + cle(new Date()).replace(/-/g, '') + 'T000000Z',
      'DTSTART;VALUE=DATE:' + a, 'DTEND;VALUE=DATE:' + b, 'SUMMARY:' + chez + ' ' + noms[q], 'END:VEVENT');
    i = k;
  }
  lignes.push('END:VCALENDAR');
  return lignes.join('\r\n');
}
