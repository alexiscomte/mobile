// Maternité la plus proche : France = liste DREES 2024 du site (maternites_fr.json), ailleurs = OpenStreetMap (Overpass),
// mêmes règles que le site (assets/js/maternite.js) ; textes du site (outils_txt.json).
import type { Langue } from '../i18n';
import { km } from './lieux';
import mat from './maternites_fr.json';
import outils from './outils_txt.json';

export type TextesMaternite = Record<string, string> & { types: Record<string, string>; premiers?: string[] };
const TXT = (outils as unknown as { maternite: Record<string, TextesMaternite> }).maternite;
export const textesMaternite = (lg: Langue): TextesMaternite => TXT[lg] || TXT.en || TXT.fr;

// colonnes : nom, type (1, 2a, 2b, 3), statut (pub, priv, pnl), accouchements/an, ville, code postal, adresse, lat, lon
type MatFR = [string, string, string, number, string, string, string, number, number];
const FR = mat as unknown as MatFR[];

export type Etablissement = {
  nom: string; km: number; lat: number; lon: number;
  type?: string; statut?: string; acc?: number; ville?: string; cp?: string; adresse?: string;
  mat?: boolean; tel?: string; site?: string;
};

export function prochesFR(lat: number, lon: number, n = 10): Etablissement[] {
  return FR.map((r) => ({ nom: r[0], type: r[1], statut: r[2], acc: r[3], ville: r[4], cp: r[5], adresse: r[6], lat: r[7], lon: r[8], km: km(lat, lon, r[7], r[8]) }))
    .sort((a, b) => a.km - b.km).slice(0, n);
}

type Osm = { nom: string; lat: number; lon: number; tags: Record<string, string> };
async function overpass(lat: number, lon: number, rayon: number, lang: string): Promise<Osm[]> {
  const q = '[out:json][timeout:25];nwr["amenity"="hospital"](around:' + rayon + ',' + lat + ',' + lon + ');out center tags 120;';
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as { remark?: string; elements?: { center?: { lat: number; lon: number }; lat?: number; lon?: number; tags?: Record<string, string> }[] };
  if (j.remark && !(j.elements || []).length) throw new Error(j.remark);
  return (j.elements || []).map((e) => { const c = e.center || { lat: e.lat as number, lon: e.lon as number }; const t = e.tags || {}; return { nom: t['name:' + lang] || t.name || '', lat: c.lat, lon: c.lon, tags: t }; })
    .filter((x) => x.lat && x.nom);
}
const RE_MAT = /matern|obstet|gyn|geburt|kraam|frauenklinik|women|mother|m[èe]re|enfant|child|kinder|natal|birth|accouch|partos|nascita|ostetric/i;
const HORS = /psychi|psiqui|sport|r[ée]adapt|rehab|reha|g[ée]riatr|ophtalm|opht|dental|dentist|v[ée]t[ée]rin|tierklinik|orthop|cardio|oncolog|cancer|dialys|soins de suite|convalesc|palliat|long s[ée]jour|ehpad|nursing/i;
function estMaternite(x: Osm): boolean {
  const t = x.tags, sp = (t['healthcare:speciality'] || '') + ' ' + (t['healthcare:specialty'] || '') + ' ' + (t.department || '');
  return t.maternity === 'yes' || t['healthcare:speciality'] === 'maternity' || /matern|obstet|gynaec|gynec|neonat/i.test(sp) || RE_MAT.test(x.nom);
}

export async function prochesOSM(lat: number, lon: number, lang: string): Promise<{ liste: Etablissement[]; nbMat: number; total: number }> {
  let tous = await overpass(lat, lon, 60000, lang);
  if (tous.length < 3) { const l2 = await overpass(lat, lon, 150000, lang); if (l2.length) tous = l2; }
  tous = tous.filter((x) => !HORS.test(x.nom));
  const liste = tous.map((x) => {
    const t = x.tags;
    return { nom: x.nom, lat: x.lat, lon: x.lon, km: km(lat, lon, x.lat, x.lon), mat: estMaternite(x),
      adresse: [t['addr:street'], t['addr:city']].filter(Boolean).join(', ') || undefined, site: t.website || t['contact:website'], tel: t.phone || t['contact:phone'] };
  }).sort((a, b) => a.km - b.km).slice(0, 12);
  return { liste, nbMat: liste.filter((x) => x.mat).length, total: tous.length };
}

/** France métropolitaine, Antilles ou Réunion : la liste officielle s'applique. */
export function enFrance(lat: number, lon: number, code?: string | null): boolean {
  if (code) return code === 'FR';
  return (lat > 41 && lat < 51.2 && lon > -5.3 && lon < 9.7) || (lat > 14 && lat < 18.5 && lon > -63.2 && lon < -60.8) || (lat > -21.5 && lat < -20.8 && lon > 55.2 && lon < 55.9);
}
