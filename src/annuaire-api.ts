// Annuaire « Comptes à suivre » (03/11/2026, specs/annuaire-comptes-payant.md) : même API que le site (annuaire_api.js). L'appli gère les comptes réseaux et la
// candidature ; le paiement dans l'appli passe par l'App Store sur iOS et Google Play sur Android (annuaire-achat.ts) : jamais /api/annuaire/payer ni /portail (Stripe), réservés au site.
import { appelApi } from '@/compte';

export type PageAnnuaire = { id: number; page: string; statut: string; justification: string; note: string; resoumettre_apres?: string | null };
export type CompteAnnuaire = { id: number; reseau: string; url: string; nom: string; langues: string[]; pages: PageAnnuaire[] };
export type PageChoix = { page: string; titre: string; sujet: string };
export type EtatAnnuaire = { ok: boolean; statut: number; erreur?: string; actif: boolean; source: string; pagesPayees: number; pagesUtilisees: number; jetonApple: string; jetonCompte: string; comptes: CompteAnnuaire[] };
export type Retour = { ok: boolean; statut: number; erreur?: string; date?: string };

export const RESEAUX: [string, string][] = [['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'], ['threads', 'Threads'], ['vk', 'VK'], ['telegram', 'Telegram'], ['bluesky', 'Bluesky']];

export async function lireEtat(): Promise<EtatAnnuaire> {
  const r = (await appelApi('api/annuaire/etat', undefined, 'GET')) as unknown as { ok: boolean; statut: number; erreur?: string; abonnement?: { actif?: boolean; source?: string; pages_payees?: number; pages_utilisees?: number; } | null; jeton_apple?: string; jeton_compte?: string; comptes?: CompteAnnuaire[] };
  const jeton = r.jeton_compte || r.jeton_apple || '';
  return { ok: !!r.ok, statut: r.statut, erreur: r.erreur, actif: !!(r.abonnement && r.abonnement.actif), source: (r.abonnement && r.abonnement.source) || '', pagesPayees: (r.abonnement && r.abonnement.pages_payees) || 0, pagesUtilisees: (r.abonnement && r.abonnement.pages_utilisees) || 0, jetonApple: jeton, jetonCompte: jeton, comptes: Array.isArray(r.comptes) ? r.comptes : [] };
}
export async function lirePages(langue: string): Promise<PageChoix[]> {
  const r = (await appelApi('api/annuaire/pages?langue=' + encodeURIComponent(langue), undefined, 'GET')) as unknown as { pages?: PageChoix[] };
  return Array.isArray(r.pages) ? r.pages : [];
}
const poster = async (chemin: string, corps: unknown): Promise<Retour> => (await appelApi('api/annuaire/' + chemin, corps)) as unknown as Retour;
export const enregistrerCompte = (reseau: string, url: string, nom: string, langues: string[]) => poster('compte', { reseau, url, nom, langues });
export const supprimerCompte = (id: number) => poster('compte/supprimer', { id });
export const candidater = (id: number, page: string, justification?: string) => poster('page', justification ? { id, page, justification } : { id, page });
export const envoyerTransaction = (signedTransaction: string) => poster('apple/transaction', { signedTransaction });
export const envoyerTransactionGoogle = (productId: string, purchaseToken: string) => poster('google/transaction', { productId, purchaseToken });
export const retirerPage = (id: number) => poster('page/supprimer', { id });

export type EtatVeille = { ok: boolean; statut: number; courriel: string; quotidienne: boolean; recherche: boolean; themes: string[]; langue: string };
export async function lireVeille(): Promise<EtatVeille> {
  // préférences communes au site (/api/veille, veille_api.js) : rien n'est coché tant que l'abonné ne l'a pas choisi (inscription volontaire)
  const r = (await appelApi('api/veille/etat', undefined, 'GET')) as unknown as { ok: boolean; statut: number; courriel?: string; veille?: { quotidienne_choisie?: boolean; recherche_choisie?: boolean; themes?: string[]; langue?: string } | null };
  const v = r.veille || {};
  return { ok: !!r.ok, statut: r.statut, courriel: r.courriel || '', quotidienne: v.quotidienne_choisie === true, recherche: v.recherche_choisie === true, themes: Array.isArray(v.themes) ? v.themes : [], langue: v.langue || 'fr' };
}
export async function enregistrerVeille(quotidienne: boolean, recherche: boolean, themes: string[], langue: string): Promise<Retour> {
  return (await appelApi('api/veille/preferences', { quotidienne, recherche, themes, langue })) as unknown as Retour;
}
