// Achat de l'annuaire dans l'appli iOS (03/11/2026, specs/annuaire-comptes-payant.md) : abonnements du groupe « Annuaire AffectionPlus » de l'App Store, trois formules
// (annuaire-produits.ts). StoreKit 2 par expo-iap ; la transaction signée part au serveur, et finishTransaction n'est appelé qu'après
// son accord : sinon StoreKit la représente à la prochaine ouverture de l'écran. iOS seulement (Android, web : pas de vente).
import { Platform } from 'react-native';

import { envoyerTransaction } from '@/annuaire-api';
import { PRODUITS_ANNUAIRE } from '@/annuaire-produits';

export const ACHAT_POSSIBLE = Platform.OS === 'ios';
export const PAGES_MAX = Math.max(...PRODUITS_ANNUAIRE.map((p) => p.pages));

export type Offre = { id: string; pages: number; nom: string; prix: string };
type Achat = { productId: string; purchaseToken?: string | null };
const iap = () => import('expo-iap');
const estAnnuaire = (a: Achat) => PRODUITS_ANNUAIRE.some((p) => p.id === a.productId);

/** Serveur d'abord, finishTransaction ensuite ; rend false si le serveur n'a pas accepté (transaction laissée ouverte). */
async function traiter(a: Achat): Promise<boolean> {
  if (!a.purchaseToken) return false;
  const r = await envoyerTransaction(a.purchaseToken);
  if (!r.ok) return false;
  const { finishTransaction } = await iap();
  await finishTransaction({ purchase: a as never, isConsumable: false });
  return true;
}

/** Connexion et écoute : renvoie la fonction de fermeture. `surAchat(true)` : enregistré ; `surAchat(false)` : payé mais pas encore enregistré. */
export async function ouvrirAchats(surAchat: (enregistre: boolean) => void, surErreur: () => void): Promise<() => void> {
  if (!ACHAT_POSSIBLE) return () => undefined;
  const m = await iap();
  await m.initConnection();
  const a = m.purchaseUpdatedListener((p) => { if (estAnnuaire(p as Achat)) traiter(p as Achat).then(surAchat).catch(() => surAchat(false)); });
  const e = m.purchaseErrorListener((x) => { if (x.code !== m.ErrorCode.UserCancelled) surErreur(); });
  return () => { a.remove(); e.remove(); m.endConnection().catch(() => undefined); };
}

/** Toutes les formules, de la plus petite à la plus grande, nom et prix localisés lus chez Apple ; celles qu'Apple ne connaît pas sont écartées. */
export async function lireOffres(): Promise<Offre[]> {
  const utiles = [...PRODUITS_ANNUAIRE].sort((x, y) => x.pages - y.pages);
  const { fetchProducts } = await iap();
  const liste = ((await fetchProducts({ skus: utiles.map((p) => p.id), type: 'subs' })) || []) as { id: string; displayName?: string | null; title?: string; displayPrice: string }[];
  const offres: Offre[] = [];
  for (const u of utiles) {
    const p = liste.find((x) => x.id === u.id);
    if (p) offres.push({ id: u.id, pages: u.pages, nom: p.displayName || p.title || '', prix: p.displayPrice });
  }
  return offres;
}

/** Lance l'achat ou la montée de formule : le résultat arrive par l'écoute (ouvrirAchats). jetonCompte = appAccountToken, contrôlé par le serveur. */
export async function acheter(produit: string, jetonCompte: string): Promise<void> {
  const { requestPurchase } = await iap();
  await requestPurchase({ request: { apple: { sku: produit, appAccountToken: jetonCompte, andDangerouslyFinishTransactionAutomatically: false } }, type: 'subs' });
}

/** Restaurer les achats : rend le nombre d'achats de l'annuaire enregistrés, ou null si un envoi au serveur a échoué. */
export async function restaurer(): Promise<number | null> {
  const { restorePurchases, getAvailablePurchases } = await iap();
  await restorePurchases();
  const liste = ((await getAvailablePurchases()) as Achat[]).filter(estAnnuaire);
  let n = 0;
  for (const a of liste) { if (await traiter(a)) n += 1; else return null; }
  return n;
}

/** Feuille système de gestion des abonnements (baisse de formule, résiliation) ; à défaut, Réglages > Abonnements. */
export async function gererAbonnement(): Promise<void> {
  const { showManageSubscriptionsIOS, deepLinkToSubscriptions } = await iap();
  try { await showManageSubscriptionsIOS(); } catch { await deepLinkToSubscriptions(); }
}
