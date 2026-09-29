// Les autres astrologies : signe védique (sidéral, rashi lunaire, nakshatra) et signe maya (tzolk'in),
// mêmes calculs que le site (assets/js/autres.js) ; textes du site (ui.json, clé autres, 9 langues).
import type { Langue } from '../i18n';
import { ASTRO } from './astro';
import ui from './ui.json';

export type TextesAutres = { nak: string[]; maya: string[]; ui: Record<string, string> };
const TX = (ui as unknown as { autres: Record<string, TextesAutres> }).autres;
export const textesAutres = (lg: Langue): TextesAutres => TX[lg] || TX.en || TX.fr;

export const NAK = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
export const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
export const MAYA = ['Imix', "Ik'", "Ak'b'al", "K'an", 'Chikchan', 'Kimi', "Manik'", 'Lamat', 'Muluk', 'Ok', 'Chuwen', "Eb'", "B'en", 'Ix', 'Men', "K'ib'", "Kab'an", "Etz'nab'", 'Kawak', 'Ajaw'];
export const AZT = ['Cipactli', 'Ehecatl', 'Calli', 'Cuetzpalin', 'Coatl', 'Miquiztli', 'Mazatl', 'Tochtli', 'Atl', 'Itzcuintli', 'Ozomatli', 'Malinalli', 'Acatl', 'Ocelotl', 'Cuauhtli', 'Cozcacuauhtli', 'Ollin', 'Tecpatl', 'Quiahuitl', 'Xochitl'];

export const ayanamsa = (j: number) => 23.853 + 1.39697 * (j - 2451545.0) / 36525;

export type Vedique = { ayan: number; sun: number; moon: number; nak: number; pada: number; asc?: number };
export function vedic(j: number, lat?: number | null, lon?: number | null): Vedique {
  const ay = ayanamsa(j);
  const sun = ASTRO.norm(ASTRO.sunLon(j) - ay), moon = ASTRO.norm(ASTRO.moonLon(j) - ay);
  const nak = Math.floor(moon / (360 / 27)), pada = Math.floor((moon % (360 / 27)) / (360 / 108)) + 1;
  const out: Vedique = { ayan: ay, sun, moon, nak, pada };
  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat)) out.asc = ASTRO.norm(ASTRO.angles(j, lat, lon).asc - ay);
  return out;
}

export function maya(y: number, m: number, d: number): { number: number; sign: number } {
  const jdn = Math.floor(ASTRO.jd(y, m, d, 12) + 0.5);
  const n = ((jdn - 584283 + 3) % 13 + 13) % 13 + 1, k = ((jdn - 584283 + 19) % 20 + 20) % 20;
  return { number: n, sign: k };
}
