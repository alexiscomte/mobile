// Recherche dans les pages du site : index assets/search-<langue>.json (écrit par outils/gen/searchindex.py),
// une ligne par page : [adresse, titre, description, fil d'Ariane, sous-titres, mots-clés]. Chargé une fois par langue,
// gardé en mémoire et sur l'appareil (24 h).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jsonEmbarque } from './embarque';
import type { Langue } from './i18n';
import { SITE } from './site';

export type Ligne = [string, string, string, string, string, string];
export type Resultat = { u: string; t: string; d: string; fil: string; score: number };

const memoire: Partial<Record<Langue, Ligne[]>> = {};
const DUREE = 24 * 3600 * 1000;

function normaliser(s: string): string {
  // Même normalisation que la recherche du site : accents, lettres non décomposées
  // (ł, ı) et ligatures, pour accepter aussi une saisie sur clavier ASCII.
  const equivalents: Record<string, string> = { ł: 'l', ı: 'i', œ: 'oe', æ: 'ae', ß: 'ss' };
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[łıœæß]/g, (c) => equivalents[c]).replace(/[’'`]/g, ' ');
}

export async function chargerIndex(lg: Langue): Promise<Ligne[]> {
  if (memoire[lg]) return memoire[lg] as Ligne[];
  const cle = 'ap.index.' + lg;
  try {
    const brut = await AsyncStorage.getItem(cle);
    if (brut) {
      const { t, lignes } = JSON.parse(brut);
      if (Date.now() - t < DUREE && Array.isArray(lignes)) { memoire[lg] = lignes; return lignes; }
    }
  } catch { /* cache illisible : on retombe sur l'index embarqué */ }
  // l'index embarqué dans l'appli sert tout de suite (hors ligne dès l'installation) ; le site ne sert qu'à la mise à jour, en arrière-plan
  const emb = await jsonEmbarque<Ligne[]>('s/' + lg + '.json');
  if (emb) {
    memoire[lg] = emb;
    miseAJour(lg, cle).catch(() => undefined);
    return emb;
  }
  const lignes = await telecharger(lg);
  memoire[lg] = lignes;
  AsyncStorage.setItem(cle, JSON.stringify({ t: Date.now(), lignes })).catch(() => undefined);
  return lignes;
}

async function telecharger(lg: Langue): Promise<Ligne[]> {
  const r = await fetch(SITE + 'assets/search-' + lg + '.json');
  if (!r.ok) throw new Error('index ' + r.status);
  return (await r.json()) as Ligne[];
}

async function miseAJour(lg: Langue, cle: string): Promise<void> {
  const lignes = await telecharger(lg);
  memoire[lg] = lignes;
  await AsyncStorage.setItem(cle, JSON.stringify({ t: Date.now(), lignes }));
}

/** Les pages dont le titre, la description, les sous-titres ou les mots-clés contiennent tous les mots cherchés. */
export function chercher(lignes: Ligne[], question: string, max = 60): Resultat[] {
  const mots = normaliser(question).split(/[^\p{L}\p{N}]+/u).filter((m) => m.length >= 2);
  if (!mots.length) return [];
  const out: Resultat[] = [];
  for (const [u, t, d, fil, sous, cles] of lignes) {
    const nt = normaliser(t), nd = normaliser(d), ns = normaliser(sous), nk = normaliser(cles);
    let score = 0, tous = true;
    for (const m of mots) {
      let s = 0;
      if (nt.includes(m)) s += 6;
      if (nd.includes(m)) s += 3;
      if (ns.includes(m)) s += 2;
      if (nk.includes(m)) s += 1;
      if (!s) { tous = false; break; }
      score += s;
    }
    if (!tous) continue;
    if (nt.startsWith(mots[0])) score += 3;
    if (u.split('/').length <= 3) score += 1;      // les pages de thème avant les fiches pays
    out.push({ u, t, d, fil, score });
  }
  out.sort((a, b) => b.score - a.score || a.t.localeCompare(b.t));
  return out.slice(0, max);
}
