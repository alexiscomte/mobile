// Connexion par le service commun (Keycloak CAPIT, auth.capit.net, realm capit, depuis le 23/11/2026 ; avant : connect.capit.net) depuis
// n'importe quel écran (espace membre, 07/10/2026) : écran web Keycloak (code + PKCE S256), échange du code sur le point de jeton de
// Keycloak, session de l'appli (compte.ts connecterOidc, qui envoie le jeton d'identité à POST /api/compte/oidc).
// Session web PARTAGÉE avec Safari / Chrome (17/11/2026, une seule session pour tous les sites et applis) : ASWebAuthenticationSession
// non éphémère sur iOS, Custom Tabs sur Android ; un membre connecté sur le web est reconnu sans ressaisie. prompt=login quand l'écran
// demandé l'exige (lancement direct d'un réseau social, import de profil) ou après une déconnexion dans l'appli ; prompt=create pour
// « Créer un compte » (formulaire d'inscription de Keycloak).
// Les réseaux sociaux passent par les fournisseurs d'identité du realm (kc_idp_hint) : facebook, linkedin-openid-connect, google.
// Snapchat n'existe pas dans Keycloak : bouton retiré (23/11/2026).
//
// Se connecter avec Apple (12/10/2026, règle App Store 4.8 : une appli qui propose Google doit proposer Apple) : Apple et Google sont
// proposés en natif sur l'écran Mon compte (app/compte.tsx), où mènent « Se connecter » / « Créer un compte » dès que Se connecter avec
// Apple est disponible (ecranNatif). L'écran web de Keycloak montre Apple à côté de Google : la règle 4.8 y est respectée aussi (l'ancien
// paramètre fournisseurs=sans-google est sans objet).
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

import { OIDC, connecterOidc, reconnexionDemandee } from './compte';

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

/** Fournisseurs d'identité du realm capit (kc_idp_hint) pour un lancement direct depuis l'appli. */
const IDP: Record<string, string> = { facebook: 'facebook', linkedin: 'linkedin-openid-connect', google: 'google' };

/** Paramètres Keycloak d'un écran demandé (remplacent l'ancien ecran=… de connect.capit.net) : 'inscription' → prompt=create ; réseau
 *  connu → kc_idp_hint + prompt=login ; écran inconnu (ancien Snapchat) → connexion simple. reconnexion : déconnexion faite dans l'appli. */
export function parametresKeycloak(ecran: string | undefined, reconnexion: boolean): { extra: Record<string, string>; prompt?: string } {
  if (ecran === 'inscription') return { extra: {}, prompt: 'create' };
  const idp = ecran ? IDP[ecran] : undefined;
  if (idp) return { extra: { kc_idp_hint: idp }, prompt: 'login' };
  return { extra: {}, ...(reconnexion ? { prompt: 'login' } : {}) };
}

/** Ouvre l'écran de connexion (ecran = 'inscription' pour « Créer un compte », 'facebook', 'linkedin' ou 'google' pour le lancement direct
 *  par ce réseau). */
export async function connexionOidc(langue: string, ecran?: string): Promise<Issue> {
  if (!AVEC_OIDC || enCours) return 'annule';
  enCours = true; propose = true;
  try {
    // session web partagée : sans prompt=login, une session ouverte sur auth.capit.net rendrait le code d'office, sans l'écran demandé
    const p = parametresKeycloak(ecran, await reconnexionDemandee());
    const req = new AuthSession.AuthRequest({
      clientId: OIDC.client, redirectUri: OIDC.retour, scopes: ['openid', 'email', 'profile'], usePKCE: true,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256, responseType: AuthSession.ResponseType.Code,
      extraParams: { ui_locales: langue, ...p.extra }, ...(p.prompt ? { prompt: p.prompt as AuthSession.Prompt } : {}),
    });
    const r = await req.promptAsync(OIDC.decouverte, { preferEphemeralSession: false });
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
