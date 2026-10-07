// Messagerie interne (Alexis, 07/10/2026), comme assets/js/messages.js du site : API /api/messages (messages_api.js du serveur).
// Connecté : fils avec les réponses, préférence « recevoir aussi par courriel », boîte du compte ADMIN (réponse par la messagerie, par
// courriel ou les deux). Sans compte : la réponse arrive par courriel ; trace des messages envoyés depuis l'appareil (« ap.messages »).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { compteActuel } from './compte';
import { SITE } from './site';

export type Message = { id?: number; auteur: 'membre' | 'admin'; texte: string; canal?: string; cree: string; verifie?: boolean };
export type Fil = { id: number; sujet: string; nom: string; etat: string; cree: string; maj: string; langue?: string; non_lu: boolean;
  courriel?: string; invite?: boolean; messages: Message[] };
export type Rep = { ok?: boolean; erreur?: string; statut: number; [k: string]: unknown };
export const K_TRACE = 'ap.messages';
export type Trace = { sujet: string; texte: string; courriel: string; date: string };

async function appel(chemin: string, corps?: unknown, methode?: string): Promise<Rep> {
  const c = compteActuel();
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const minuterie = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
  try {
    const r = await fetch(SITE + 'api/messages' + chemin, {
      method: methode || 'POST', signal: ctrl?.signal,
      headers: { 'Content-Type': 'application/json', ...(c ? { Authorization: 'Bearer ' + c.session } : {}) },
      ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
    });
    const j = (await r.json().catch(() => ({ ok: false, erreur: 'reseau' }))) as Rep;
    j.statut = r.status;
    return j;
  } catch {
    return { ok: false, erreur: 'reseau', statut: 0 };
  } finally {
    if (minuterie) clearTimeout(minuterie);
  }
}

/** Envoie un message (connecté : adresse du compte ; sans compte : courriel obligatoire, trace gardée sur l'appareil). */
export async function envoyer(m: { nom: string; courriel: string; sujet: string; texte: string; langue: string }): Promise<Rep> {
  const j = await appel('/envoyer', { ...m, site: '' });
  if (j.ok && !compteActuel()) {
    try {
      const v = JSON.parse((await AsyncStorage.getItem(K_TRACE)) || '[]') as Trace[];
      const liste = Array.isArray(v) ? v : [];
      liste.unshift({ sujet: m.sujet, texte: m.texte.slice(0, 2000), courriel: m.courriel, date: new Date().toISOString() });
      await AsyncStorage.setItem(K_TRACE, JSON.stringify(liste.slice(0, 30)));
    } catch { /* stockage indisponible */ }
  }
  return j;
}
export async function lireTrace(): Promise<Trace[]> {
  try { const v = JSON.parse((await AsyncStorage.getItem(K_TRACE)) || '[]'); return Array.isArray(v) ? (v as Trace[]) : []; } catch { return []; }
}
export async function fils(): Promise<{ ok: boolean; admin: boolean; mail: boolean; fils: Fil[]; erreur?: string }> {
  const j = await appel('', undefined, 'GET');
  return { ok: !!j.ok, admin: !!j.admin, mail: !!j.mail, fils: Array.isArray(j.fils) ? (j.fils as Fil[]) : [], erreur: j.erreur };
}
export function repondre(fil: number, texte: string, canal?: string): Promise<Rep> { return appel('/repondre', { fil, texte, ...(canal ? { canal } : {}) }); }
export function marquerLu(fil: number): Promise<Rep> { return appel('/lu', { fil }); }
export function changerEtat(fil: number, etat: 'ouvert' | 'clos'): Promise<Rep> { return appel('/etat', { fil, etat }); }
export function preferenceMail(mail: boolean): Promise<Rep> { return appel('/preferences', { mail }); }
