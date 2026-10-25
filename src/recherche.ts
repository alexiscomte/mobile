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

// Journal interne des recherches (action V15-02, ticket #157, 26/10/2026), même mécanisme que le site (assets/js/search.js) : une
// recherche validée (bouton « Rechercher » ou touche Entrée du clavier) envoie une fois { r, q, l, n, s: 'appli' } ; un résultat ouvert
// envoie { r, p }. Petit envoi sans attente de réponse (fetch, aucune bibliothèque native), ni compte ni adresse IP gardés par le serveur
// (recherche_api.js ; politique de confidentialité, « journal-recherche »). Une panne réseau est ignorée : la recherche reste locale.
let derniere: { cle: string; r: string } | null = null;

function identifiant(): string {
  let t = '';
  for (let i = 0; i < 24; i++) t += Math.floor(Math.random() * 16).toString(16);
  return t;
}

function envoyer(objet: Record<string, unknown>): void {
  try {
    fetch(SITE + 'api/recherche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(objet) })
      .catch(() => undefined);
  } catch { /* le journal ne doit jamais gêner la recherche */ }
}

/** Recherche validée : envoie le mot, la langue et le nombre de résultats (deux validations du même texte ne comptent qu'une fois). */
export function noterRecherche(lg: Langue, question: string, n: number): void {
  const cle = lg + '|' + normaliser(question).replace(/\s+/g, ' ').trim();
  if (!question.trim() || (derniere && derniere.cle === cle)) return;
  derniere = { cle, r: identifiant() };
  envoyer({ r: derniere.r, q: question.trim(), l: lg, n, s: 'appli' });
}

/** Résultat ouvert : la page choisie, rattachée à la dernière recherche validée. */
export function noterClic(page: string): void {
  if (derniere) envoyer({ r: derniere.r, p: page });
}
