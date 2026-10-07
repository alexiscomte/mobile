// Connexion par le service commun (connexion_oidc.js) depuis n'importe quel écran (espace membre, 07/10/2026) : écran web en session
// privée (code + PKCE, rien n'est gardé dans Safari), échange du code, session de l'appli (compte.ts connecterOidc).
// « Continuer en invité » : le service renvoie error=access_denied&error_description=invite ; ce choix vaut pour ce lancement de
// l'appli (comme une visite sur le site), et l'onglet Moi ne repropose pas la connexion d'office.
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

import { OIDC, connecterOidc } from './compte';

export type Issue = 'ok' | 'invite' | 'annule' | 'echec';
/** Pas de service commun dans l'aperçu web (adresse de retour com.affectionplus.app). */
export const AVEC_OIDC = Platform.OS !== 'web';

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
    const req = new AuthSession.AuthRequest({
      clientId: OIDC.client, redirectUri: OIDC.retour, scopes: ['openid', 'email', 'profile'], usePKCE: true,
      responseType: AuthSession.ResponseType.Code, extraParams: ecran ? { ui_locales: langue, ecran } : { ui_locales: langue },
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
