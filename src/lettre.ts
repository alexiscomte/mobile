// État de la lettre d'information dans l'appli (espace membre, 07/10/2026), comme espace.js du site :
// connecté = état du serveur (compte.newsletter, abonnement direct par compte.ts lettre()) ; sans compte = double opt-in
// (POST /api/newsletter, courriel de confirmation, avec la preuve anti-robot de robot.ts) et état approché gardé sur l'appareil
// (« ap.lettre », même clé que le site).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Compte } from './compte';
import { preuveRobot } from './robot';
import { SITE } from './site';

export const K_LETTRE = 'ap.lettre';
export type EtatLettre = 'confirme' | 'attente' | null;
type Local = { etat?: string; courriel?: string; date?: string };

async function lireLocal(): Promise<Local> {
  try { const v = JSON.parse((await AsyncStorage.getItem(K_LETTRE)) || 'null'); return v && typeof v === 'object' ? (v as Local) : {}; }
  catch { return {}; }
}
function etatDe(e: unknown): EtatLettre { return e === 'confirme' || e === 'attente' ? e : null; }

/** Sans compte : inscription en double opt-in ; l'état est gardé sur l'appareil. Réponse de l'API { ok, etat | erreur }.
 *  Preuve de travail anti-robot (robot.ts, 07/10/2026 nuit) jointe à l'envoi ; sans elle : { ok: false, erreur: 'robot', robot: raison }
 *  (ou 'trop' quand le serveur refuse le défi au plafond). */
export async function abonnerInvite(courriel: string, langue: string): Promise<{ ok?: boolean; etat?: string; erreur?: string; robot?: string }> {
  const pr = await preuveRobot();
  if (!pr.altcha) return { ok: false, erreur: pr.erreur === 'trop' ? 'trop' : 'robot', robot: pr.erreur };
  try {
    const r = await fetch(SITE + 'api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courriel, langue, consentement: 'oui', site: '', page: 'app', altcha: pr.altcha }) });
    const d = (await r.json()) as { ok?: boolean; etat?: string; erreur?: string };
    if (d.ok) {
      const loc: Local = { etat: d.etat === 'attente' ? 'attente' : 'confirme', courriel, date: new Date().toISOString().slice(0, 10) };
      await AsyncStorage.setItem(K_LETTRE, JSON.stringify(loc)).catch(() => undefined);
    }
    return d;
  } catch {
    return { ok: false, erreur: 'indisponible' };
  }
}
/** Sans compte, demande encore en attente : on l'oublie sur l'appareil (sans clic sur le lien du courriel, rien ne part). */
export async function oublierInvite(): Promise<void> { await AsyncStorage.removeItem(K_LETTRE).catch(() => undefined); }

/** État de la lettre et adresse concernée, relus à chaque affichage de l'écran. */
export function useLettre(compte: Compte | null): { etat: EtatLettre; courriel: string; recharger: () => Promise<void> } {
  const [local, setLocal] = useState<Local>({});
  const recharger = useCallback(async () => { setLocal(await lireLocal()); }, []);
  useFocusEffect(useCallback(() => { recharger(); }, [recharger]));
  if (compte) return { etat: etatDe(compte.newsletter), courriel: compte.courriel, recharger };
  return { etat: etatDe(local.etat), courriel: local.courriel || '', recharger };
}
