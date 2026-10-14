// Notifications et pastille de l'icône de l'appli (14/10/2026, Alexis : « lorsqu'il y a un message non lu, je voudrais qu'il y ait une
// pastille qui apparaisse sur l'application mobile »). Le serveur (Affection/push_api.js) envoie par Expo une notification quand
// AffectionPlus répond (pour l'admin : quand un membre écrit) avec le nombre de fils non lus, qu'iOS pose sur l'icône même appli fermée ;
// un message lu remet la pastille à jour sur tous les appareils du compte. La notification ne contient jamais le texte d'un message.
// - Autorisation : demandée au bon moment seulement — après l'envoi d'un message (on attend une réponse), ou par le bouton « Me prévenir
//   des réponses » de Mes messages ; jamais au lancement. Refusée : Mes messages le dit et propose d'ouvrir les Réglages.
// - Jeton Expo : envoyé au serveur avec la session (POST /api/push/jeton) ; il disparaît avec elle (déconnexion, compte supprimé…).
// - Pastille au premier plan : setBadgeCountAsync(ap.compte.messages_non_lus), tenu à jour par la présence et la messagerie (profil.tsx).
// - Toucher la notification ouvre Mes messages (_layout.tsx).
// Rien sur le web ni dans le simulateur (pas de jeton).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { appelApi, compteActuel, noterNonLus } from './compte';

const NATIF = Platform.OS === 'ios' || Platform.OS === 'android';
export type EtatNotif = 'oui' | 'a-demander' | 'non' | 'sans';

let inscrit = '';   // session + langue pour lesquelles le jeton est déjà enregistré (une fois par lancement)

if (NATIF) {
  // appli ouverte : la bannière s'affiche quand même (la liste de Mes messages se met à jour à la présence suivante)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
  });
}

/** État de l'autorisation sur cet appareil. */
export async function etatNotif(): Promise<EtatNotif> {
  if (!NATIF || !Device.isDevice) return 'sans';
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'oui';
    return p.canAskAgain ? 'a-demander' : 'non';
  } catch { return 'sans'; }
}

/** Pastille de l'icône (0 = retirée). */
export async function pastille(n: number): Promise<void> {
  if (!NATIF) return;
  try { await Notifications.setBadgeCountAsync(Math.max(0, Math.floor(n) || 0)); } catch { /* autorisation absente */ }
}

/** Enregistre le jeton de l'appareil pour le compte connecté. demander = la fenêtre d'autorisation d'iOS peut s'ouvrir (si elle n'a
 *  jamais été montrée) ; sinon rien n'est demandé. Rend l'état de l'autorisation. */
export async function inscrire(langue: string, demander: boolean): Promise<EtatNotif> {
  const c = compteActuel();
  let etat = await etatNotif();
  if (!c || etat === 'sans') return etat;
  if (etat === 'a-demander' && demander) {
    try {
      const r = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
      etat = r.granted ? 'oui' : (r.canAskAgain ? 'a-demander' : 'non');
    } catch { return etat; }
  }
  if (etat !== 'oui' || inscrit === c.session + langue) return etat;
  try {
    const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
    const jeton = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    const j = await appelApi('api/push/jeton', { jeton, langue });
    const apres = compteActuel();
    if (j.ok && apres && apres.session === c.session) {
      inscrit = c.session + langue;
      if (typeof j.non_lus === 'number') await noterNonLus(j.non_lus);
    }
  } catch { /* hors ligne, Expo indisponible : nouvel essai au prochain lancement ou à la prochaine connexion */ }
  return etat;
}

/** Déconnexion : le serveur oublie le jeton avec la session ; ici, la pastille est retirée. */
export function oublier(): void { inscrit = ''; pastille(0).catch(() => undefined); }

/** Notification reçue pendant que l'appli est ouverte. Rend la fonction de désabonnement. */
export function surReception(f: () => void): () => void {
  if (!NATIF) return () => undefined;
  const a = Notifications.addNotificationReceivedListener(() => f());
  return () => a.remove();
}

/** Notification touchée (ouvrir : écran demandé, « messages »), y compris celle qui a lancé l'appli. Rend la fonction de désabonnement. */
export function surOuverture(ouvrir: (ecran: string) => void): () => void {
  if (!NATIF) return () => undefined;
  const ecranDe = (r: Notifications.NotificationResponse | null) => {
    const d = r?.notification.request.content.data as { ecran?: unknown } | undefined;
    return d && typeof d.ecran === 'string' ? d.ecran : '';
  };
  try {
    const e = ecranDe(Notifications.getLastNotificationResponse());
    if (e) { Notifications.clearLastNotificationResponse(); setTimeout(() => ouvrir(e), 0); }
  } catch { /* lecture impossible : rien */ }
  const b = Notifications.addNotificationResponseReceivedListener((r) => {
    const e = ecranDe(r);
    if (e) { Notifications.clearLastNotificationResponse(); ouvrir(e); }
  });
  return () => b.remove();
}
