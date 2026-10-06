// Textes du compte propres à l'appli (06/10/2026), 9 langues. Les textes de l'écran de connexion viennent du site
// (ui.json → compte, généré depuis assets/js/compte.js par outils/gen/app_moteurs.py) ; ceux-ci complètent pour l'appli.
import type { Langue } from './i18n';

type T4 = {
  compteTxt: string;      // section « Compte » de l'écran Moi, sans compte
  gerer: string;          // bouton vers l'écran du compte, connecté
  sansCompte: string;     // remplace la dernière phrase de l'intro du site (« … dans ce navigateur »)
  mesSondages: string; mesSondagesTxt: string;
  mesCompte: string;      // « Mes sondages » vide, sans compte (%s = nom de l'onglet Moi)
  effacerCompte: string;  // ajouté à la confirmation « Effacer mes données » quand un compte est connecté
};

export const TEXTES4: Record<Langue, T4> = {
  fr: { compteTxt: 'Facultatif : retrouvez vos infos, vos favoris, vos réponses aux sondages et vos scores sur vos autres appareils et sur le site, avec votre seule adresse électronique (sans mot de passe).',
        gerer: 'Gérer mon compte', sansCompte: 'Sans compte, tout reste sur cet appareil.',
        mesSondages: 'Mes sondages', mesSondagesTxt: 'Vos réponses et les résultats',
        mesCompte: 'Avec un compte (onglet « %s »), vous retrouvez vos réponses sur tous vos appareils.',
        effacerCompte: 'Vous serez aussi déconnecté : votre compte garde ses informations.' },
  en: { compteTxt: 'Optional: find your details, bookmarks, poll answers and scores on your other devices and on the site, with just your email address (no password).',
        gerer: 'Manage my account', sansCompte: 'Without an account, everything stays on this device.',
        mesSondages: 'My polls', mesSondagesTxt: 'Your answers and the results',
        mesCompte: 'With an account (“%s” tab), you find your answers on all your devices.',
        effacerCompte: 'You will also be signed out: your account keeps its information.' },
  de: { compteTxt: 'Freiwillig: Finden Sie Ihre Angaben, Lesezeichen, Umfrageantworten und Punktzahlen auf Ihren anderen Geräten und auf der Website wieder, nur mit Ihrer E-Mail-Adresse (ohne Passwort).',
        gerer: 'Mein Konto verwalten', sansCompte: 'Ohne Konto bleibt alles auf diesem Gerät.',
        mesSondages: 'Meine Umfragen', mesSondagesTxt: 'Ihre Antworten und die Ergebnisse',
        mesCompte: 'Mit einem Konto (Reiter „%s“) finden Sie Ihre Antworten auf allen Ihren Geräten.',
        effacerCompte: 'Sie werden auch abgemeldet: Ihr Konto behält seine Angaben.' },
  es: { compteTxt: 'Opcional: recupere sus datos, favoritos, respuestas a las encuestas y puntuaciones en sus otros dispositivos y en el sitio, solo con su dirección de correo (sin contraseña).',
        gerer: 'Gestionar mi cuenta', sansCompte: 'Sin cuenta, todo se queda en este dispositivo.',
        mesSondages: 'Mis encuestas', mesSondagesTxt: 'Sus respuestas y los resultados',
        mesCompte: 'Con una cuenta (pestaña «%s»), recupera sus respuestas en todos sus dispositivos.',
        effacerCompte: 'También se cerrará su sesión: su cuenta conserva su información.' },
  it: { compteTxt: 'Facoltativo: ritrovate i vostri dati, i preferiti, le risposte ai sondaggi e i punteggi sugli altri dispositivi e sul sito, con il solo indirizzo e-mail (senza password).',
        gerer: 'Gestisci il mio account', sansCompte: 'Senza account, tutto resta su questo dispositivo.',
        mesSondages: 'I miei sondaggi', mesSondagesTxt: 'Le vostre risposte e i risultati',
        mesCompte: 'Con un account (scheda «%s») ritrovate le vostre risposte su tutti i dispositivi.',
        effacerCompte: 'Sarete anche disconnessi: il vostro account conserva le sue informazioni.' },
  pt: { compteTxt: 'Opcional: encontre os seus dados, favoritos, respostas às sondagens e pontuações nos seus outros dispositivos e no site, apenas com o seu endereço de e-mail (sem palavra-passe).',
        gerer: 'Gerir a minha conta', sansCompte: 'Sem conta, tudo fica neste dispositivo.',
        mesSondages: 'As minhas sondagens', mesSondagesTxt: 'As suas respostas e os resultados',
        mesCompte: 'Com uma conta (separador «%s»), encontra as suas respostas em todos os seus dispositivos.',
        effacerCompte: 'A sua sessão também será terminada: a sua conta conserva as informações.' },
  nl: { compteTxt: 'Optioneel: vind uw gegevens, favorieten, peilingantwoorden en scores terug op uw andere apparaten en op de site, met alleen uw e-mailadres (zonder wachtwoord).',
        gerer: 'Mijn account beheren', sansCompte: 'Zonder account blijft alles op dit apparaat.',
        mesSondages: 'Mijn peilingen', mesSondagesTxt: 'Uw antwoorden en de resultaten',
        mesCompte: 'Met een account (tabblad ‘%s’) vindt u uw antwoorden terug op al uw apparaten.',
        effacerCompte: 'U wordt ook uitgelogd: uw account behoudt zijn gegevens.' },
  pl: { compteTxt: 'Opcjonalnie: odnajdź swoje dane, zakładki, odpowiedzi w ankietach i wyniki na innych urządzeniach i w serwisie, podając tylko adres e-mail (bez hasła).',
        gerer: 'Zarządzaj kontem', sansCompte: 'Bez konta wszystko zostaje na tym urządzeniu.',
        mesSondages: 'Moje ankiety', mesSondagesTxt: 'Twoje odpowiedzi i wyniki',
        mesCompte: 'Z kontem (karta „%s”) odnajdziesz swoje odpowiedzi na wszystkich urządzeniach.',
        effacerCompte: 'Zostaniesz też wylogowany: Twoje konto zachowa swoje informacje.' },
  tr: { compteTxt: 'İsteğe bağlı: bilgilerinizi, yer imlerinizi, anket yanıtlarınızı ve puanlarınızı diğer cihazlarınızda ve sitede bulun; yalnızca e-posta adresinizle (şifresiz).',
        gerer: 'Hesabımı yönet', sansCompte: 'Hesap olmadan her şey bu cihazda kalır.',
        mesSondages: 'Anketlerim', mesSondagesTxt: 'Yanıtlarınız ve sonuçlar',
        mesCompte: 'Bir hesapla (“%s” sekmesi) yanıtlarınızı tüm cihazlarınızda bulursunuz.',
        effacerCompte: 'Oturumunuz da kapatılacak: hesabınız bilgilerini korur.' },
};
