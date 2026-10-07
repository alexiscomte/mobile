// Messagerie entre un membre et l'admin (Alexis, 07/10/2026 ; politique du soir : « on ne va garder la messagerie que pour les
// communications avec l'admin », « on n'affiche pas les noms des autres utilisateurs »), comme assets/js/messages.js du site.
// API : /api/messages (messages_api.js) et /api/compte/historique (activite_api.js), par le client commun de compte.ts.
// Réservée aux comptes connectés (sans session : 401 {erreur:'connexion'}) ; aucun destinataire à choisir : tout fil va à l'admin.
// Un membre ne reçoit jamais le nom, l'adresse ni le numéro de compte de l'admin ou d'un autre membre : l'écran affiche toujours le
// texte fixe « AffectionPlus » ; seul l'admin reçoit, par fil, le nom donné, l'adresse et le numéro de compte du membre.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { appelApi, type Reponse } from './compte';

export type Message = { id?: number; auteur: 'membre' | 'admin'; texte: string; cree: string; verifie?: boolean };
/** Un fil. Membre : en_ligne / derniere = présence d'AffectionPlus. Admin : en plus compte_id, nom (donné par le membre), courriel,
 *  invite (ancien fil écrit sans compte) et la présence du membre. */
export type Fil = { id: number; sujet: string; etat: string; cree: string; maj: string; langue?: string; non_lu: boolean;
  en_ligne?: boolean; derniere?: string | null; compte_id?: number | null; nom?: string; courriel?: string; invite?: boolean;
  messages: Message[] };
export type Rep = Reponse;
/** Une connexion du compte : date, pays, navigateur ; pour l'admin seulement, adresse IP, User-Agent, VPN probable, fournisseur. */
export type Connexion = { quand: string; pays: string | null; pays_nom: string | null; navigateur: string;
  ip?: string | null; ua?: string | null; vpn?: boolean | null; fournisseur?: string | null };

function appel(chemin: string, corps?: unknown, methode?: string): Promise<Rep> {
  return appelApi('api/messages' + chemin, corps, methode);
}

/** Ouvre un fil vers l'admin (compte connecté seulement) : nom donné (facultatif), sujet, texte, langue. Erreurs : connexion (401),
 *  admin (403 : l'admin n'ouvre pas de fil), sujet, texte, trop, reseau. */
export function envoyer(m: { nom: string; sujet: string; texte: string; langue: string }): Promise<Rep> {
  return appel('/envoyer', { ...m, site: '' });
}
export async function fils(): Promise<{ ok: boolean; admin: boolean; mail: boolean; fils: Fil[]; erreur?: string; statut: number }> {
  const j = await appel('', undefined, 'GET');
  return { ok: !!j.ok, admin: !!j.admin, mail: !!j.mail, fils: Array.isArray(j.fils) ? (j.fils as Fil[]) : [], erreur: j.erreur, statut: j.statut };
}
/** Réponse dans un fil (toujours dans la messagerie ; copie par courriel si le membre l'a demandée) -> {ok, mail, mailDemande}. */
export function repondre(fil: number, texte: string): Promise<Rep> { return appel('/repondre', { fil, texte }); }
export function marquerLu(fil: number): Promise<Rep> { return appel('/lu', { fil }); }
export function changerEtat(fil: number, etat: 'ouvert' | 'clos'): Promise<Rep> { return appel('/etat', { fil, etat }); }
/** Case « Recevoir une copie des messages par courriel » (compte.messages_mail, seule source). */
export function preferenceMail(mail: boolean): Promise<Rep> { return appel('/preferences', { mail }); }

/** Historique des connexions : le sien (membre ou admin) ; l'admin peut demander celui d'un membre (u = numéro de compte), avec en
 *  plus compte {id, courriel, cree}. */
export async function historique(u?: number): Promise<{ ok: boolean; admin: boolean; connexions: Connexion[];
  compte?: { id?: number; courriel?: string; cree?: string }; erreur?: string; statut: number }> {
  const j = await appelApi('api/compte/historique' + (u !== undefined ? '?u=' + encodeURIComponent(String(u)) : ''), undefined, 'GET');
  const k = j.compte && typeof j.compte === 'object' ? (j.compte as { id?: number; courriel?: string; cree?: string }) : undefined;
  return { ok: !!j.ok, admin: !!j.admin, connexions: Array.isArray(j.connexions) ? (j.connexions as Connexion[]) : [], compte: k, erreur: j.erreur, statut: j.statut };
}

/** L'ancienne trace locale des messages écrits sans compte (« ap.messages », avant le 07/10/2026 au soir) est effacée. */
export function oublierTrace(): void {
  AsyncStorage.removeItem('ap.messages').catch(() => undefined);
}
