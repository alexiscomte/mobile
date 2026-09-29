// Thème astral : même calcul et même lecture que le site (assets/js/theme.js), à partir du moteur ASTRO et des textes ASTRO_TXT.
import type { Langue } from '../i18n';
import { ASTRO, type Carte, type Planete } from './astro';
import { textes } from './horoscope';

export const GLYPHES_PLANETES: Record<string, string> = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', asc: 'AC', mc: 'MC' };

export type Naissance = { y: number; m: number; d: number; heure?: string; lat?: number | null; lon?: number | null; decalage?: number | null };

/** La carte du ciel de naissance ; sans heure et lieu, pas d'ascendant ni de maisons (positions à midi UT). */
export function carteDe(n: Naissance): { carte: Carte; heureConnue: boolean } {
  const h = /^(\d{2}):(\d{2})/.exec(n.heure || '');
  const lieu = typeof n.lat === 'number' && typeof n.lon === 'number';
  if (h && lieu) {
    const locale = +h[1] + +h[2] / 60;
    const dec = typeof n.decalage === 'number' ? n.decalage : Math.round((n.lon as number) / 15);
    return { carte: ASTRO.chart(ASTRO.jd(n.y, n.m, n.d, locale - dec), n.lat as number, n.lon as number), heureConnue: true };
  }
  return { carte: ASTRO.chart(ASTRO.jd(n.y, n.m, n.d, 12)), heureConnue: false };
}

export type LignePosition = { k: string; nom: string; glyphe: string; signe: string; degre: string; retro: boolean; maison?: number };

export function positions(c: Carte, lg: Langue): LignePosition[] {
  const T = textes(lg);
  const out: LignePosition[] = ASTRO.PLANETS.map((k) => ({
    k, nom: T.planetes[k], glyphe: GLYPHES_PLANETES[k], signe: T.signes[ASTRO.sign(c.planets[k].lon)], degre: ASTRO.fmtDeg(c.planets[k].lon),
    retro: c.planets[k].retro, maison: c.planets[k].house,
  }));
  if (typeof c.asc === 'number' && typeof c.mc === 'number') {
    out.push({ k: 'asc', nom: T.planetes.asc, glyphe: 'AC', signe: T.signes[ASTRO.sign(c.asc)], degre: ASTRO.fmtDeg(c.asc), retro: false, maison: 1 });
    out.push({ k: 'mc', nom: T.planetes.mc, glyphe: 'MC', signe: T.signes[ASTRO.sign(c.mc)], degre: ASTRO.fmtDeg(c.mc), retro: false, maison: ASTRO.house(c.mc, c.asc) });
  }
  return out;
}

/** Répartition par élément (Feu, Terre, Air, Eau) des planètes et de l'ascendant. */
export function elements(c: Carte, lg: Langue): { nom: string; n: number }[] {
  const T = textes(lg), el = [0, 0, 0, 0];
  for (const k of ASTRO.PLANETS) el[ASTRO.sign(c.planets[k].lon) % 4]++;
  if (typeof c.asc === 'number') el[ASTRO.sign(c.asc) % 4]++;
  return T.elements.map((nom, i) => ({ nom, n: el[i] }));
}

export type Paragraphe = { titre: string; texte: string };

/** La lecture du thème : Soleil, Lune, ascendant et MC, Vénus, Mars, Mercure/Jupiter/Saturne, génération, aspects. */
export function lecture(c: Carte, lg: Langue): { paragraphes: Paragraphe[]; aspects: string[] } {
  const T = textes(lg), U = T.ui, s = (k: Planete) => ASTRO.sign(c.planets[k].lon);
  const p: Paragraphe[] = [];
  p.push({ titre: T.planetes.sun + ' — ' + T.signes[s('sun')], texte: T.soleil[s('sun')] });
  p.push({ titre: T.planetes.moon + ' — ' + T.signes[s('moon')], texte: T.lune[s('moon')] });
  if (typeof c.asc === 'number' && typeof c.mc === 'number') {
    p.push({ titre: T.planetes.asc + ' — ' + T.signes[ASTRO.sign(c.asc)], texte: T.ascendant[ASTRO.sign(c.asc)] });
    p.push({ titre: T.planetes.mc + ' — ' + T.signes[ASTRO.sign(c.mc)], texte: T.mc[ASTRO.sign(c.mc)] });
  }
  p.push({ titre: T.planetes.venus + ' — ' + T.signes[s('venus')], texte: T.venus[s('venus')] });
  p.push({ titre: T.planetes.mars + ' — ' + T.signes[s('mars')], texte: T.mars[s('mars')] });
  for (const k of ['mercury', 'jupiter', 'saturn'] as Planete[]) {
    const sg = s(k), h = c.planets[k].house;
    p.push({ titre: T.planetes[k] + ' — ' + T.signes[sg], texte: T.intro_planete[k] + ' ' + T.style[sg] + (h ? ' (' + String(U.maison).toLowerCase() + ' ' + h + ' : ' + T.maisons[h - 1] + ')' : '') + '.' });
  }
  p.push({ titre: '', texte: T.generation + ' ' + (['uranus', 'neptune', 'pluto'] as Planete[]).map((k) => T.planetes[k] + ' : ' + T.signes[s(k)]).join(', ') + '.' });
  const aspects = c.aspects.slice(0, 12).map((a) => T.planetes[a.a] + ' – ' + T.planetes[a.b] + ' : ' + T.aspects[a.type] + ' (' + a.orb.toFixed(1) + '°) — ' + T.aspect_txt[a.type] + '.');
  return { paragraphes: p, aspects };
}
