// Achat de l'annuaire dans l'appli iOS et Android (03/11/2026, specs/annuaire-comptes-payant.md ; Android : 04/11/2026) : abonnements « Annuaire AffectionPlus »
// de l'App Store et de Google Play, cinq formules (annuaire-produits.ts). StoreKit 2 / Google Play Billing par expo-iap ; la transaction part au serveur,
// et finishTransaction n'est appelé qu'après son accord : sinon StoreKit / Play Billing la représente à la prochaine ouverture de l'écran.
import { Linking, Platform } from 'react-native';

import { envoyerTransaction, envoyerTransactionGoogle } from '@/annuaire-api';
import { PRODUITS_ANNUAIRE } from '@/annuaire-produits';

export const ACHAT_POSSIBLE = Platform.OS === 'ios' || Platform.OS === 'android';
export const PAGES_MAX = Math.max(...PRODUITS_ANNUAIRE.map((p) => p.pages));
const PACKAGE_ANDROID = 'com.affectionplus.app';

export type Offre = { id: string; pages: number; nom: string; prix: string; offerToken?: string };
type Achat = { productId: string; purchaseToken?: string | null; purchaseState?: string };
const iap = () => import('expo-iap');
const estAnnuaire = (a: Achat) => PRODUITS_ANNUAIRE.some((p) => p.id === a.productId);
const pagesDe = (id: string) => PRODUITS_ANNUAIRE.find((p) => p.id === id)?.pages || 0;

/** Serveur d'abord, finishTransaction ensuite ; rend false si le serveur n'a pas accepté (transaction laissée ouverte). */
export async function traiterAchat(a: Achat): Promise<boolean> {
  if (!a.purchaseToken) return false;
  if (Platform.OS === 'android' && a.purchaseState && a.purchaseState !== 'purchased') return false;
  const r = Platform.OS === 'android'
    ? await envoyerTransactionGoogle(a.productId, a.purchaseToken)
    : await envoyerTransaction(a.purchaseToken);
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
  const a = m.purchaseUpdatedListener((p) => { if (estAnnuaire(p as Achat)) traiterAchat(p as Achat).then(surAchat).catch(() => surAchat(false)); });
  const e = m.purchaseErrorListener((x) => { if (x.code !== m.ErrorCode.UserCancelled) surErreur(); });
  return () => { a.remove(); e.remove(); m.endConnection().catch(() => undefined); };
}

/** Toutes les formules, de la plus petite à la plus grande, nom et prix localisés lus chez Apple / Google Play ; celles inconnues sont écartées. */
export async function lireOffres(): Promise<Offre[]> {
  const utiles = [...PRODUITS_ANNUAIRE].sort((x, y) => x.pages - y.pages);
  const { fetchProducts } = await iap();
  const liste = ((await fetchProducts({ skus: utiles.map((p) => p.id), type: 'subs' })) || []) as {
    id: string;
    displayName?: string | null;
    nameAndroid?: string | null;
    title?: string;
    displayPrice?: string;
    subscriptionOffers?: { offerTokenAndroid?: string | null; displayPrice?: string }[] | null;
  }[];
  const offres: Offre[] = [];
  for (const u of utiles) {
    const p = liste.find((x) => x.id === u.id);
    if (!p) continue;
    const subOffer = Array.isArray(p.subscriptionOffers) && p.subscriptionOffers.length ? p.subscriptionOffers[0] : undefined;
    const prix = p.displayPrice || (subOffer && subOffer.displayPrice) || '';
    const offerToken = (subOffer && subOffer.offerTokenAndroid) || undefined;
    offres.push({ id: u.id, pages: u.pages, nom: p.displayName || p.nameAndroid || p.title || '', prix, ...(offerToken ? { offerToken } : {}) });
  }
  return offres;
}

/** Lance l'achat ou le changement de formule : le résultat arrive par l'écoute (ouvrirAchats). jetonCompte = appAccountToken (iOS) / obfuscatedAccountId (Android). */
export async function acheter(produit: string, jetonCompte: string, offerToken?: string): Promise<void> {
  const { requestPurchase, getActiveSubscriptions } = await iap();
  if (Platform.OS === 'android') {
    let ancienToken: string | undefined;
    let ancienProduit: string | undefined;
    try {
      const actifs = await getActiveSubscriptions(PRODUITS_ANNUAIRE.map((p) => p.id));
      const actuel = actifs.find((s) => s.isActive && s.productId !== produit && (s.purchaseTokenAndroid || s.purchaseToken));
      if (actuel) {
        ancienToken = (actuel.purchaseTokenAndroid || actuel.purchaseToken) ?? undefined;
        ancienProduit = actuel.productId;
      }
    } catch { /* pas d'abonnement actif local */ }
    const modeRemplacement = ancienProduit && pagesDe(produit) < pagesDe(ancienProduit) ? 'deferred' : 'charge-prorated-price';
    await requestPurchase({
      request: {
        google: {
          skus: [produit],
          obfuscatedAccountId: jetonCompte,
          ...(offerToken ? { subscriptionOffers: [{ sku: produit, offerToken }] } : {}),
          ...(ancienToken && ancienProduit ? {
            purchaseToken: ancienToken,
            subscriptionProductReplacementParams: { oldProductId: ancienProduit, replacementMode: modeRemplacement },
          } : {}),
        },
      },
      type: 'subs',
    });
    return;
  }
  await requestPurchase({ request: { apple: { sku: produit, appAccountToken: jetonCompte, andDangerouslyFinishTransactionAutomatically: false } }, type: 'subs' });
}

/** Restaurer les achats : rend le nombre d'achats de l'annuaire enregistrés, ou null si un envoi au serveur a échoué. */
export async function restaurer(): Promise<number | null> {
  const { restorePurchases, getAvailablePurchases } = await iap();
  await restorePurchases();
  const liste = ((await getAvailablePurchases()) as Achat[]).filter(estAnnuaire);
  let n = 0;
  for (const a of liste) { if (await traiterAchat(a)) n += 1; else return null; }
  return n;
}

/** Feuille système (iOS) ou centre d'abonnements Google Play (Android) pour la gestion / résiliation d'abonnement. */
export async function gererAbonnement(sku?: string): Promise<void> {
  const { showManageSubscriptionsIOS, deepLinkToSubscriptions } = await iap();
  if (Platform.OS === 'android') {
    try {
      await deepLinkToSubscriptions({ packageNameAndroid: PACKAGE_ANDROID, ...(sku ? { skuAndroid: sku } : {}) });
    } catch {
      const url = 'https://play.google.com/store/account/subscriptions?package=' + encodeURIComponent(PACKAGE_ANDROID) + (sku ? '&sku=' + encodeURIComponent(sku) : '');
      await Linking.openURL(url);
    }
    return;
  }
  try { await showManageSubscriptionsIOS(); } catch { await deepLinkToSubscriptions(); }
}
