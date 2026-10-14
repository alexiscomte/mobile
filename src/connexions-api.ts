// Historique des connexions du compte (« Mon historique de connexion »), API /api/compte/historique (activite_api.js), par le client
// commun de compte.ts. Ancien module messages.ts : la messagerie interne (membre <-> admin) a été supprimée le 14/10/2026 (Alexis :
// « Il n'est plus besoin de créer un compte pour nous écrire » ; le contact se fait par courriel, page Contact du site).
import { appelApi } from './compte';

/** Une connexion du compte : date, pays, navigateur ; pour l'admin seulement, adresse IP, User-Agent, VPN probable, fournisseur. */
export type Connexion = { quand: string; pays: string | null; pays_nom: string | null; navigateur: string;
  ip?: string | null; ua?: string | null; vpn?: boolean | null; fournisseur?: string | null };

/** Historique des connexions : le sien (membre ou admin) ; l'admin peut demander celui d'un membre (u = numéro de compte), avec en
 *  plus compte {id, courriel, cree}. */
export async function historique(u?: number): Promise<{ ok: boolean; admin: boolean; connexions: Connexion[];
  compte?: { id?: number; courriel?: string; cree?: string }; erreur?: string; statut: number }> {
  const j = await appelApi('api/compte/historique' + (u !== undefined ? '?u=' + encodeURIComponent(String(u)) : ''), undefined, 'GET');
  const k = j.compte && typeof j.compte === 'object' ? (j.compte as { id?: number; courriel?: string; cree?: string }) : undefined;
  return { ok: !!j.ok, admin: !!j.admin, connexions: Array.isArray(j.connexions) ? (j.connexions as Connexion[]) : [], compte: k, erreur: j.erreur, statut: j.statut };
}
