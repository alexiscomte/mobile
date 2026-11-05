// Achat d'un dossier à l'unité dans l'appli (05/11/2026, specs/dossiers-premium.md) : un seul produit consommable App Store / Google Play (1 €), jamais un produit par dossier.
// Le serveur crée d'abord une « intention » qui lie le paiement au dossier : son jeton part dans l'achat (appAccountToken sur iOS, obfuscatedProfileId sur Android), donc dans la transaction
// signée par la boutique. Le droit s'ouvre seulement quand le serveur a vérifié la transaction ; finishTransaction n'est appelé qu'après son accord : sinon la boutique la représente au lancement suivant.
import { Platform } from 'react-native';

import { creerIntention, envoyerApple, envoyerGoogle } from '@/dossiers-api';

export const PRODUIT_DOSSIER = 'com.affectionplus.app.dossier.unite';
export const ACHAT_POSSIBLE = Platform.OS === 'ios' || Platform.OS === 'android';
export type Resultat = 'enregistre' | 'attente' | 'erreur';
type Achat = { productId: string; purchaseToken?: string | null; purchaseState?: string };
const iap = () => import('expo-iap');
const estDossier = (a: Achat) => a.productId === PRODUIT_DOSSIER;

/** Serveur d'abord, finishTransaction ensuite. Android : déjà consommé par le serveur, l'échec de finishTransaction est sans effet. */
export async function traiterAchat(a: Achat): Promise<Resultat> {
  if (!a.purchaseToken) return 'erreur';
  if (Platform.OS === 'android' && a.purchaseState === 'pending') return 'attente';
  const r = Platform.OS === 'android' ? await envoyerGoogle(a.purchaseToken) : await envoyerApple(a.purchaseToken);
  if (r.statut === 202 || r.erreur === 'attente') return 'attente';
  if (!r.ok) return 'erreur';
  const { finishTransaction } = await iap();
  await finishTransaction({ purchase: a as never, isConsumable: true }).catch(() => undefined);
  return 'enregistre';
}

/** Connexion et écoute : l'annuaire a sa propre écoute, chacun ne traite que ses produits. Rend la fonction de fermeture. */
export async function ouvrirAchats(surAchat: (r: Resultat) => void, surErreur: () => void, surAnnule?: () => void): Promise<() => void> {
  if (!ACHAT_POSSIBLE) return () => undefined;
  const m = await iap();
  await m.initConnection();
  const a = m.purchaseUpdatedListener((p) => { if (estDossier(p as Achat)) traiterAchat(p as Achat).then(surAchat).catch(() => surAchat('erreur')); });
  const e = m.purchaseErrorListener((x) => { if (x.code === m.ErrorCode.UserCancelled) { if (surAnnule) surAnnule(); } else surErreur(); });
  // la connexion à la boutique reste ouverte : elle est commune à l'écran de l'annuaire, et rouverte ici à chaque retour sur l'écran (initConnection est sans effet si elle l'est déjà)
  return () => { a.remove(); e.remove(); };
}

/** Prix localisé lu chez Apple / Google Play ; '' si le produit est inconnu de la boutique (l'achat est alors proposé désactivé). */
export async function lirePrix(): Promise<string> {
  const { fetchProducts, initConnection } = await iap();
  await initConnection();
  const l = ((await fetchProducts({ skus: [PRODUIT_DOSSIER], type: 'in-app' })) || []) as { id: string; displayPrice?: string }[];
  const p = l.find((x) => x.id === PRODUIT_DOSSIER);
  return (p && p.displayPrice) || '';
}

/** Lance l'achat ; le résultat arrive par l'écoute. Rend le refus du serveur ('deja' : déjà autorisé, ne jamais faire payer). */
export async function acheter(slug: string, langue: string): Promise<'lance' | 'deja' | 'session' | 'erreur' | 'bloque'> {
  // un paiement déjà encaissé mais pas encore accepté par le serveur passe d'abord : jamais de second achat par-dessus
  if ((await reprendreDetail()).restants > 0) return 'bloque';
  const plateforme = Platform.OS === 'android' ? 'google' : 'apple';
  const i = await creerIntention(slug, langue, plateforme);
  if (i.erreur === 'deja') return 'deja';
  if (i.statut === 401) return 'session';
  if (!i.ok || !i.jeton || i.produit !== PRODUIT_DOSSIER) return 'erreur';
  const { requestPurchase } = await iap();
  if (Platform.OS === 'android') {
    await requestPurchase({ request: { google: { skus: [PRODUIT_DOSSIER], obfuscatedAccountId: i.jeton_compte || undefined, obfuscatedProfileId: i.jeton } }, type: 'in-app' });
  } else {
    await requestPurchase({ request: { apple: { sku: PRODUIT_DOSSIER, appAccountToken: i.jeton, andDangerouslyFinishTransactionAutomatically: false } }, type: 'in-app' });
  }
  return 'lance';
}

/** Achats payés mais pas encore acceptés par le serveur (appli fermée, réseau coupé) : à l'ouverture des écrans et avant tout achat. iOS : les transactions non terminées, car la liste habituelle exclut les consommables. */
async function reprendreDetail(): Promise<{ traites: number; restants: number }> {
  if (!ACHAT_POSSIBLE) return { traites: 0, restants: 0 };
  const m = await iap();
  await m.initConnection();
  const l = ((Platform.OS === 'ios' ? await m.getPendingTransactionsIOS() : await m.getAvailablePurchases()) as Achat[]).filter(estDossier);
  let traites = 0, restants = 0;
  for (const a of l) { if ((await traiterAchat(a).catch(() => 'erreur')) === 'enregistre') traites += 1; else restants += 1; }
  return { traites, restants };
}
export async function reprendre(): Promise<number> { return (await reprendreDetail()).traites; }
