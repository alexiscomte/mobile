// Annuaire « Comptes à suivre » (03/11/2026, specs/annuaire-comptes-payant.md) : même API que le site (annuaire_api.js). L'appli gère les comptes réseaux et la
// candidature ; elle n'appelle JAMAIS /api/annuaire/payer ni /portail et n'affiche aucun prix (règle App Store 3.1.1) : le lien de paiement part par courriel.
import { appelApi } from '@/compte';

export type PageAnnuaire = { id: number; page: string; statut: string; justification: string; note: string };
export type CompteAnnuaire = { id: number; reseau: string; url: string; nom: string; langues: string[]; pages: PageAnnuaire[] };
export type PageChoix = { page: string; titre: string; sujet: string };
export type EtatAnnuaire = { ok: boolean; statut: number; erreur?: string; actif: boolean; comptes: CompteAnnuaire[] };
export type Retour = { ok: boolean; statut: number; erreur?: string };

export const RESEAUX: [string, string][] = [['facebook', 'Facebook'], ['x', 'X'], ['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'], ['threads', 'Threads'], ['vk', 'VK'], ['telegram', 'Telegram'], ['bluesky', 'Bluesky']];

export async function lireEtat(): Promise<EtatAnnuaire> {
  const r = (await appelApi('api/annuaire/etat', undefined, 'GET')) as unknown as { ok: boolean; statut: number; erreur?: string; abonnement?: { actif?: boolean } | null; comptes?: CompteAnnuaire[] };
  return { ok: !!r.ok, statut: r.statut, erreur: r.erreur, actif: !!(r.abonnement && r.abonnement.actif), comptes: Array.isArray(r.comptes) ? r.comptes : [] };
}
export async function lirePages(langue: string): Promise<PageChoix[]> {
  const r = (await appelApi('api/annuaire/pages?langue=' + encodeURIComponent(langue), undefined, 'GET')) as unknown as { pages?: PageChoix[] };
  return Array.isArray(r.pages) ? r.pages : [];
}
const poster = async (chemin: string, corps: unknown): Promise<Retour> => (await appelApi('api/annuaire/' + chemin, corps)) as unknown as Retour;
export const enregistrerCompte = (reseau: string, url: string, nom: string, langues: string[]) => poster('compte', { reseau, url, nom, langues });
export const supprimerCompte = (id: number) => poster('compte/supprimer', { id });
export const candidater = (id: number, page: string, justification?: string) => poster('page', justification ? { id, page, justification } : { id, page });
export const retirerPage = (id: number) => poster('page/supprimer', { id });
