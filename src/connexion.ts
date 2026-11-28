// Connexion par le service commun (Keycloak CAPIT, auth.capit.net, realm capit, depuis le 23/11/2026 ; avant : connect.capit.net) depuis
// n'importe quel écran (espace membre, 07/10/2026) : écran web Keycloak (code + PKCE S256), échange du code sur le point de jeton de
// Keycloak, session de l'appli (compte.ts connecterOidc, qui envoie le jeton d'identité à POST /api/compte/oidc).
// Authentification TOUJOURS fraîche (23/11/2026, relecture) : prompt=login à chaque connexion, prompt=create + max_age=0 pour « Créer un
// compte » (si la personne revient de l'inscription vers la connexion, Keycloak redemande le mot de passe). La session du navigateur
// (ASWebAuthenticationSession non éphémère sur iOS, Custom Tabs sur Android) reste celle de Safari / Chrome : elle garde les sessions des
// réseaux sociaux et l'identifiant proposé, mais elle ne connecte plus personne sans écran. Raison : le retour se fait par un schéma privé
// (com.affectionplus.app), qu'une autre appli peut déclarer ; avec un client public, elle obtiendrait sinon un code et un jeton sans que
// la personne voie rien. Le serveur refuse donc à ce client un jeton dont l'authentification a plus de 5 minutes (compte_api.js routeOidc),
// et l'appli n'en demande jamais d'autre. Plus de drapeau « reconnexion » après une déconnexion : c'est toujours le cas.
// Les réseaux sociaux passent par les fournisseurs d'identité du realm (kc_idp_hint) : facebook, linkedin-openid-connect, google, snapchat
// (pont OIDC approuvé par Snap le 28/11/2026).
//
// Se connecter avec Apple (12/10/2026, règle App Store 4.8 : une appli qui propose Google doit proposer Apple) : Apple et Google sont
// proposés en natif sur l'écran Mon compte (app/compte.tsx), où mènent « Se connecter » / « Créer un compte » dès que Se connecter avec
// Apple est disponible (ecranNatif). L'écran web de Keycloak montre Apple à côté de Google : la règle 4.8 y est respectée aussi (l'ancien
// paramètre fournisseurs=sans-google est sans objet).
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

import { OIDC, connecterOidc } from './compte';

// Navigateur système seulement (RFC 8252) : expo-auth-session ouvre ASWebAuthenticationSession sur iOS et un onglet personnalisé (Custom
// Tabs) sur Android, jamais une vue web de l'appli ; aucun secret client (client public, PKCE S256) ; retour par le schéma privé
// com.affectionplus.app (Universal Links / App Links pas encore possibles : projets/keycloak/MOBILE_AUTHENTICATION.md du dépôt claude).
//
// Refus du serveur (23/11/2026) : POST /api/compte/oidc répond 403 « bloque » (compte suspendu pour AffectionPlus), 403 « adresse » (adresse
// pas encore vérifiée dans Keycloak), 409 « compte_deja_relie » (issue « relie »), 429 « trop », 503 « indisponible » ; chacun a son message
// dans les neuf langues (messageConnexion). « autre » : import du profil par un réseau social relié à un AUTRE compte (compte.ts connecterOidc).
export type Issue = 'ok' | 'invite' | 'annule' | 'echec' | 'bloque' | 'adresse' | 'trop' | 'reseau' | 'indisponible' | 'relie' | 'autre';

/** Issue d'une réponse de connexion refusée par le serveur (oidc, google, apple). */
export function issueRefus(j: { erreur?: unknown; statut?: unknown }): Issue {
  const e = String(j.erreur || '');
  if (e === 'bloque' || e === 'adresse' || e === 'trop' || e === 'indisponible') return e;
  if (e === 'compte_deja_relie') return 'relie';
  if (e === 'autre_compte') return 'autre';
  if (j.statut === 0) return 'reseau';
  // réponse qui n'est pas du JSON (page d'erreur d'un relais) : le statut dit la cause, ce n'est pas une panne d'Internet
  if (j.statut === 429) return 'trop';
  if (j.statut === 502 || j.statut === 503 || j.statut === 504) return 'indisponible';
  if (e === 'reseau') return 'reseau';
  return 'echec';
}

const MESSAGES: Record<string, Record<'bloque' | 'adresse' | 'trop' | 'reseau' | 'indisponible' | 'relie' | 'autre', string>> = {
  fr: { bloque: 'Accès suspendu : ce compte ne peut plus se connecter à AffectionPlus. Écrivez à webmaster@affection.org si vous pensez à une erreur.',
    adresse: 'Confirmez d’abord votre adresse électronique avec le lien reçu par courriel, puis reconnectez-vous.',
    trop: 'Trop d’essais. Réessayez dans quelques minutes.', reseau: 'Pas de connexion à Internet. Réessayez.',
    indisponible: 'Le service de connexion est momentanément indisponible. Réessayez dans quelques minutes.',
    relie: 'Cette identité de connexion est déjà reliée à un autre compte. Écrivez à webmaster@affection.org.',
    autre: 'Ce réseau social est relié à un autre compte AffectionPlus. Rien n’a été modifié.' },
  en: { bloque: 'Access suspended: this account can no longer sign in to AffectionPlus. Write to webmaster@affection.org if you think this is a mistake.',
    adresse: 'Please confirm your email address first with the link we sent you, then sign in again.',
    trop: 'Too many attempts. Try again in a few minutes.', reseau: 'No Internet connection. Please try again.',
    indisponible: 'The sign-in service is temporarily unavailable. Try again in a few minutes.',
    relie: 'This sign-in identity is already linked to another account. Write to webmaster@affection.org.',
    autre: 'This social network is linked to another AffectionPlus account. Nothing was changed.' },
  de: { bloque: 'Zugang gesperrt: Dieses Konto kann sich nicht mehr bei AffectionPlus anmelden. Schreiben Sie an webmaster@affection.org, wenn Sie einen Irrtum vermuten.',
    adresse: 'Bestätigen Sie zuerst Ihre E-Mail-Adresse über den Link, den wir Ihnen geschickt haben, und melden Sie sich dann erneut an.',
    trop: 'Zu viele Versuche. Versuchen Sie es in einigen Minuten erneut.', reseau: 'Keine Internetverbindung. Bitte erneut versuchen.',
    indisponible: 'Der Anmeldedienst ist vorübergehend nicht verfügbar. Versuchen Sie es in einigen Minuten erneut.',
    relie: 'Diese Anmeldeidentität ist bereits mit einem anderen Konto verknüpft. Schreiben Sie an webmaster@affection.org.',
    autre: 'Dieses soziale Netzwerk ist mit einem anderen AffectionPlus-Konto verknüpft. Es wurde nichts geändert.' },
  es: { bloque: 'Acceso suspendido: esta cuenta ya no puede iniciar sesión en AffectionPlus. Escriba a webmaster@affection.org si cree que es un error.',
    adresse: 'Confirme primero su dirección de correo con el enlace que le enviamos y vuelva a iniciar sesión.',
    trop: 'Demasiados intentos. Inténtelo de nuevo en unos minutos.', reseau: 'Sin conexión a Internet. Inténtelo de nuevo.',
    indisponible: 'El servicio de inicio de sesión no está disponible por el momento. Inténtelo de nuevo en unos minutos.',
    relie: 'Esta identidad de inicio de sesión ya está vinculada a otra cuenta. Escriba a webmaster@affection.org.',
    autre: 'Esta red social está vinculada a otra cuenta de AffectionPlus. No se ha modificado nada.' },
  it: { bloque: 'Accesso sospeso: questo account non può più accedere ad AffectionPlus. Scrivi a webmaster@affection.org se pensi che sia un errore.',
    adresse: 'Conferma prima il tuo indirizzo e-mail con il link che ti abbiamo inviato, poi accedi di nuovo.',
    trop: 'Troppi tentativi. Riprova tra qualche minuto.', reseau: 'Nessuna connessione a Internet. Riprova.',
    indisponible: 'Il servizio di accesso non è al momento disponibile. Riprova tra qualche minuto.',
    relie: 'Questa identità di accesso è già collegata a un altro account. Scrivi a webmaster@affection.org.',
    autre: 'Questo social network è collegato a un altro account AffectionPlus. Non è stato modificato nulla.' },
  pt: { bloque: 'Acesso suspenso: esta conta já não pode iniciar sessão no AffectionPlus. Escreva para webmaster@affection.org se achar que é um erro.',
    adresse: 'Confirme primeiro o seu endereço de e-mail com a ligação que lhe enviámos e volte a iniciar sessão.',
    trop: 'Demasiadas tentativas. Tente novamente dentro de alguns minutos.', reseau: 'Sem ligação à Internet. Tente novamente.',
    indisponible: 'O serviço de início de sessão está temporariamente indisponível. Tente novamente dentro de alguns minutos.',
    relie: 'Esta identidade de início de sessão já está ligada a outra conta. Escreva para webmaster@affection.org.',
    autre: 'Esta rede social está ligada a outra conta AffectionPlus. Nada foi alterado.' },
  nl: { bloque: 'Toegang opgeschort: dit account kan niet meer inloggen bij AffectionPlus. Schrijf naar webmaster@affection.org als u denkt dat dit een vergissing is.',
    adresse: 'Bevestig eerst uw e-mailadres via de link die we u stuurden en log daarna opnieuw in.',
    trop: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.', reseau: 'Geen internetverbinding. Probeer het opnieuw.',
    indisponible: 'De inlogdienst is tijdelijk niet beschikbaar. Probeer het over een paar minuten opnieuw.',
    relie: 'Deze inlogidentiteit is al gekoppeld aan een ander account. Schrijf naar webmaster@affection.org.',
    autre: 'Dit sociale netwerk is gekoppeld aan een ander AffectionPlus-account. Er is niets gewijzigd.' },
  pl: { bloque: 'Dostęp zawieszony: to konto nie może już logować się do AffectionPlus. Napisz na webmaster@affection.org, jeśli uważasz, że to pomyłka.',
    adresse: 'Najpierw potwierdź swój adres e-mail za pomocą wysłanego linku, a potem zaloguj się ponownie.',
    trop: 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.', reseau: 'Brak połączenia z internetem. Spróbuj ponownie.',
    indisponible: 'Usługa logowania jest chwilowo niedostępna. Spróbuj ponownie za kilka minut.',
    relie: 'Ta tożsamość logowania jest już powiązana z innym kontem. Napisz na webmaster@affection.org.',
    autre: 'Ta sieć społecznościowa jest powiązana z innym kontem AffectionPlus. Nic nie zostało zmienione.' },
  tr: { bloque: 'Erişim askıya alındı: bu hesap artık AffectionPlus’a giriş yapamaz. Bir hata olduğunu düşünüyorsanız webmaster@affection.org adresine yazın.',
    adresse: 'Önce size gönderdiğimiz bağlantıyla e-posta adresinizi doğrulayın, ardından yeniden giriş yapın.',
    trop: 'Çok fazla deneme. Birkaç dakika sonra yeniden deneyin.', reseau: 'İnternet bağlantısı yok. Yeniden deneyin.',
    indisponible: 'Giriş hizmeti geçici olarak kullanılamıyor. Birkaç dakika sonra yeniden deneyin.',
    relie: 'Bu giriş kimliği zaten başka bir hesaba bağlı. webmaster@affection.org adresine yazın.',
    autre: 'Bu sosyal ağ başka bir AffectionPlus hesabına bağlı. Hiçbir şey değiştirilmedi.' },
};

/** Message d'une connexion qui n'a pas abouti : null si rien à dire (ok, invité, annulée par la personne), '' pour un échec sans cause
 *  connue (l'écran garde son propre texte), sinon le message du refus dans la langue de l'appli. */
export function messageConnexion(issue: Issue, langue: string): string | null {
  if (issue === 'ok' || issue === 'invite' || issue === 'annule') return null;
  if (issue === 'echec') return '';
  return (MESSAGES[langue] || MESSAGES.fr)[issue];
}
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
const IDP: Record<string, string> = { facebook: 'facebook', linkedin: 'linkedin-openid-connect', google: 'google', snapchat: 'snapchat' };

/** Paramètres Keycloak d'un écran demandé (remplacent l'ancien ecran=… de connect.capit.net), authentification toujours fraîche :
 *  'inscription' → prompt=create + max_age=0 ; réseau connu → kc_idp_hint + prompt=login ; sinon (connexion simple, écran inconnu) →
 *  prompt=login. */
export function parametresKeycloak(ecran: string | undefined): { extra: Record<string, string>; prompt: string } {
  if (ecran === 'inscription') return { extra: { max_age: '0' }, prompt: 'create' };
  const idp = ecran ? IDP[ecran] : undefined;
  return { extra: idp ? { kc_idp_hint: idp } : {}, prompt: 'login' };
}

/** Ouvre l'écran de connexion (ecran = 'inscription' pour « Créer un compte », 'facebook', 'linkedin', 'google' ou 'snapchat' pour le
 *  lancement direct par ce réseau). memeCompte : import du profil d'une personne déjà connectée ; un réseau relié à un autre compte ne
 *  change rien (« autre »). */
export async function connexionOidc(langue: string, ecran?: string, memeCompte = false): Promise<Issue> {
  if (!AVEC_OIDC || enCours) return 'annule';
  enCours = true; propose = true;
  try {
    const p = parametresKeycloak(ecran);
    const req = new AuthSession.AuthRequest({
      clientId: OIDC.client, redirectUri: OIDC.retour, scopes: ['openid', 'email', 'profile'], usePKCE: true,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256, responseType: AuthSession.ResponseType.Code,
      extraParams: { ui_locales: langue, ...p.extra }, prompt: p.prompt as AuthSession.Prompt,
    });
    const r = await req.promptAsync(OIDC.decouverte, { preferEphemeralSession: false });
    if (r.type === 'success' && r.params.code) {
      const tok = await AuthSession.exchangeCodeAsync({ clientId: OIDC.client, code: r.params.code, redirectUri: OIDC.retour,
        extraParams: { code_verifier: req.codeVerifier || '' } }, OIDC.decouverte);
      if (!tok.idToken) return 'echec';
      const j = await connecterOidc(tok.idToken, memeCompte);
      if (!j.ok) return issueRefus(j);
      invite = false;
      return 'ok';
    }
    // refus ou fermeture de l'écran Keycloak : la personne a renoncé
    if (r.type === 'error' && r.params.error === 'access_denied') return 'annule';
    if (r.type === 'cancel' || r.type === 'dismiss' || r.type === 'locked') return 'annule';
    return 'echec';
  } catch {
    return 'echec';
  } finally {
    enCours = false;
  }
}
