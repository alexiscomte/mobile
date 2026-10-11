// Textes ajoutés le 12/10/2026 (« Se connecter avec Apple », règle 4.8 de l'App Store ; cahier
// C:\Claude\Claude\specs\appli-ios-apple-1210.md), 9 langues. Le libellé du bouton lui-même est écrit par iOS (bouton officiel d'Apple,
// dans la langue de l'iPhone).
import type { Langue } from './i18n';

type T6 = {
  appleKo: string;         // échec de la connexion avec Apple (jeton refusé, erreur d'Apple)
  appleCourriel: string;   // Apple n'a donné aucune adresse pour un compte à créer
};

export const TEXTES6: Record<Langue, T6> = {
  fr: { appleKo: 'La connexion avec Apple a échoué.',
        appleCourriel: 'Apple n\'a transmis aucune adresse électronique. Réessayez en acceptant de partager votre adresse (ou de la masquer), ou créez un compte avec votre adresse.' },
  en: { appleKo: 'Signing in with Apple failed.',
        appleCourriel: 'Apple did not share an email address. Try again and allow sharing your email (or hiding it), or create an account with your address.' },
  de: { appleKo: 'Die Anmeldung mit Apple ist fehlgeschlagen.',
        appleCourriel: 'Apple hat keine E-Mail-Adresse übermittelt. Versuchen Sie es erneut und erlauben Sie das Teilen (oder Verbergen) Ihrer E-Mail-Adresse, oder erstellen Sie ein Konto mit Ihrer Adresse.' },
  es: { appleKo: 'No se ha podido iniciar sesión con Apple.',
        appleCourriel: 'Apple no ha facilitado ninguna dirección de correo. Vuelva a intentarlo aceptando compartir su correo (u ocultarlo), o cree una cuenta con su dirección.' },
  it: { appleKo: 'L’accesso con Apple non è riuscito.',
        appleCourriel: 'Apple non ha trasmesso alcun indirizzo e-mail. Riprovate accettando di condividere l’indirizzo (o di nasconderlo), oppure create un account con il vostro indirizzo.' },
  pt: { appleKo: 'Não foi possível iniciar sessão com a Apple.',
        appleCourriel: 'A Apple não transmitiu nenhum endereço de e-mail. Tente novamente aceitando partilhar o seu e-mail (ou ocultá-lo), ou crie uma conta com o seu endereço.' },
  nl: { appleKo: 'Inloggen met Apple is mislukt.',
        appleCourriel: 'Apple heeft geen e-mailadres doorgegeven. Probeer het opnieuw en sta delen (of verbergen) van uw e-mailadres toe, of maak een account aan met uw adres.' },
  pl: { appleKo: 'Logowanie przez Apple nie powiodło się.',
        appleCourriel: 'Apple nie przekazało adresu e-mail. Spróbuj ponownie i zgódź się na udostępnienie (lub ukrycie) adresu albo załóż konto na swój adres.' },
  tr: { appleKo: 'Apple ile giriş başarısız oldu.',
        appleCourriel: 'Apple bir e-posta adresi iletmedi. E-postanızın paylaşılmasına (veya gizlenmesine) izin vererek tekrar deneyin ya da adresinizle bir hesap oluşturun.' },
};
