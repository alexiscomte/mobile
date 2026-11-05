// Dossiers documentaires (05/11/2026, specs/dossiers-premium.md) : même API que le site (dossiers_api.js). Les droits sont décidés par le serveur, à partir du compte : un achat fait sur le site,
// sur iPhone ou sur Android se retrouve partout. Jamais /api/dossiers/commande (Stripe) dans l'appli : achat par l'App Store ou Google Play (dossier-achat.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { appelApi } from '@/compte';
import { SITE } from '@/site';

export type Livrable = { id: number; type: string; format: string; taille: number; nom: string };
export type Fiche = { slug: string; langue: string; langues: string[]; page: string | null; titre: string; description: string; prix: number; devise: string; livrables: Livrable[] };
export type EtatAcces = 'achete' | 'abonne' | 'aucun' | 'attente' | 'echec';
export type Acces = { etat: EtatAcces; abonnementExpire: boolean; rembourse: boolean };
export type Retour = { ok: boolean; statut: number; erreur?: string };

const K_PAGES = 'ap.dossiers.pages.v1';
const DUREE_CARTE = 24 * 3600 * 1000;
let carte: Record<string, string[]> | null = null;

/** Table page -> dossiers : au plus un appel par jour, gardée hors ligne ; un échec réseau laisse l'ancienne table. Aucun appel par article ouvert. */
export async function dossiersDeLaPage(page: string): Promise<string[]> {
  if (!carte) {
    try { const s = await AsyncStorage.getItem(K_PAGES); if (s) carte = (JSON.parse(s) as { pages: Record<string, string[]> }).pages; } catch { /* rien */ }
  }
  let date = 0;
  try { const s = await AsyncStorage.getItem(K_PAGES); if (s) date = (JSON.parse(s) as { date: number }).date || 0; } catch { /* rien */ }
  if (Date.now() - date > DUREE_CARTE) {
    const r = (await appelApi('api/dossiers/pages', undefined, 'GET')) as unknown as { ok: boolean; pages?: Record<string, string[]> };
    if (r.ok && r.pages) {
      carte = r.pages;
      AsyncStorage.setItem(K_PAGES, JSON.stringify({ date: Date.now(), pages: r.pages })).catch(() => undefined);
    }
  }
  return (carte && carte[page]) || [];
}

export async function lireFiche(slug: string, langue: string): Promise<{ fiche: Fiche | null; statut: number }> {
  const r = await fetch(SITE + 'api/dossiers/fiche?dossier=' + encodeURIComponent(slug) + '&langue=' + encodeURIComponent(langue), { headers: { Accept: 'application/json' } }).catch(() => null);
  if (!r) return { fiche: null, statut: 0 };
  const j = (await r.json().catch(() => null)) as { ok?: boolean; dossier?: Fiche } | null;
  return { fiche: j && j.ok && j.dossier ? j.dossier : null, statut: r.status };
}

export async function lireAcces(slug: string): Promise<Acces | null> {
  const r = (await appelApi('api/dossiers/acces?dossier=' + encodeURIComponent(slug), undefined, 'GET')) as unknown as { ok: boolean; etat?: EtatAcces; abonnement_expire?: boolean; rembourse?: boolean };
  return r.ok && r.etat ? { etat: r.etat, abonnementExpire: !!r.abonnement_expire, rembourse: !!r.rembourse } : null;
}

export async function demanderUrl(slug: string, livrable: number): Promise<Retour & { url?: string }> {
  return (await appelApi('api/dossiers/telecharger', { dossier: slug, livrable })) as unknown as Retour & { url?: string };
}

export async function creerIntention(slug: string, langue: string, plateforme: 'apple' | 'google'): Promise<Retour & { jeton?: string; produit?: string; jeton_compte?: string }> {
  return (await appelApi('api/dossiers/intention', { dossier: slug, langue, plateforme })) as unknown as Retour & { jeton?: string; produit?: string; jeton_compte?: string };
}
export const envoyerApple = async (signedTransaction: string) => (await appelApi('api/dossiers/apple/transaction', { signedTransaction })) as unknown as Retour & { dossier?: string };
export const envoyerGoogle = async (purchaseToken: string) => (await appelApi('api/dossiers/google/transaction', { purchaseToken })) as unknown as Retour & { dossier?: string };

export type MesDossiers = { ok: boolean; statut: number; achetes: Fiche[]; inclus: { slug: string; titre: string }[] };
export async function lireMesDossiers(langue: string): Promise<MesDossiers> {
  const r = (await appelApi('api/dossiers/mes-dossiers?langue=' + encodeURIComponent(langue), undefined, 'GET')) as unknown as MesDossiers;
  return { ok: !!r.ok, statut: r.statut, achetes: r.achetes || [], inclus: r.inclus || [] };
}
