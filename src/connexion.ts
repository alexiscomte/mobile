// Connexion par le service commun (connexion_oidc.js) depuis n'importe quel écran (espace membre, 07/10/2026) : écran web en session
// privée (code + PKCE, rien n'est gardé dans Safari), échange du code, session de l'appli (compte.ts connecterOidc).
// « Continuer en invité » : le service renvoie error=access_denied&error_description=invite ; ce choix vaut pour ce lancement de
// l'appli (comme une visite sur le site), et l'onglet Moi ne repropose pas la connexion d'office.
//
// Se connecter avec Apple (12/10/2026, règle App Store 4.8 : une appli qui propose Google doit proposer Apple) : sur iPhone, l'écran web
// du service commun ne montre plus Google (fournisseurs=sans-google) ; Apple et Google sont proposés en natif sur l'écran Mon compte
// (app/compte.tsx), où mènent « Se connecter » / « Créer un compte » dès que Se connecter avec Apple est disponible (ecranNatif).
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

import { OIDC, connecterOidc } from './compte';

export type Issue = 'ok' | 'invite' | 'annule' | 'echec';
/** Pas de service commun dans l'aperçu web (adresse de retour com.affectionplus.app). */
export const AVEC_OIDC = Platform.OS !== 'web';

let appleDispo: boolean | null = null;
/** Se connecter avec Apple est-il disponible ? iOS seulement (iOS 13 et plus) ; jamais sur le web ni Android. */
export async function appleDisponible(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (appleDispo === null) {
    try { appleDispo = await AppleAuthentication.isAvailableAsync(); } catch { appleDispo = false; }
  }
  return appleDispo;
}
/** Règle d'affichage du bouton Google (règle 4.8) : sur iOS, seulement si Apple est proposé à côté ; ailleurs, inchangé. */
export function googleAutorise(plateforme: string, apple: boolean): boolean {
  return plateforme !== 'ios' || apple;
}
/** « Se connecter » mène à l'écran natif Mon compte (aperçu web, ou iPhone avec Apple : Apple, Google, adresse + mot de passe) plutôt
 *  qu'à l'écran web du service commun directement. */
export async function ecranNatif(): Promise<boolean> {
  return !AVEC_OIDC || (await appleDisponible());
}

let invite = false;     // « Continuer en invité » choisi pendant ce lancement
let propose = false;    // connexion déjà proposée (d'office ou à la demande) pendant ce lancement
let enCours = false;    // une seule session d'authentification à la fois (sinon « locked »)

export function estInvite(): boolean { return invite; }
export function dejaPropose(): boolean { return propose; }
/** Après une déconnexion : on ne repropose pas la connexion d'office pendant ce lancement. */
export function marquerInvite(): void { invite = true; }

/** Ouvre l'écran de connexion (ecran = 'inscription' pour « Créer un compte »). */
export async function connexionOidc(langue: string, ecran?: string): Promise<Issue> {
  if (!AVEC_OIDC || enCours) return 'annule';
  enCours = true; propose = true;
  try {
    const extra: Record<string, string> = { ui_locales: langue };
    if (ecran) extra.ecran = ecran;
    if (Platform.OS === 'ios') extra.fournisseurs = 'sans-google';   // règle 4.8 : Google seulement en natif, à côté d'Apple
    const req = new AuthSession.AuthRequest({
      clientId: OIDC.client, redirectUri: OIDC.retour, scopes: ['openid', 'email', 'profile'], usePKCE: true,
      responseType: AuthSession.ResponseType.Code, extraParams: extra,
    });
    const r = await req.promptAsync(OIDC.decouverte, { preferEphemeralSession: true });
    if (r.type === 'success' && r.params.code) {
      const tok = await AuthSession.exchangeCodeAsync({ clientId: OIDC.client, code: r.params.code, redirectUri: OIDC.retour,
        extraParams: { code_verifier: req.codeVerifier || '' } }, OIDC.decouverte);
      if (!tok.idToken) return 'echec';
      const j = await connecterOidc(tok.idToken);
      if (!j.ok) return 'echec';
      invite = false;
      return 'ok';
    }
    if (r.type === 'error' && r.params.error === 'access_denied') {
      if (r.params.error_description === 'invite') { invite = true; return 'invite'; }
      return 'annule';
    }
    if (r.type === 'cancel' || r.type === 'dismiss' || r.type === 'locked') return 'annule';
    return 'echec';
  } catch {
    return 'echec';
  } finally {
    enCours = false;
  }
}
