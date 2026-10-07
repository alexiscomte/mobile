// Textes du compte propres à l'appli (06/10/2026), 9 langues. Les textes de l'espace membre et du compte viennent du site
// (ui.json → espace, compte, générés depuis assets/js/espace.js et compte.js par outils/gen/app_moteurs.py) ; ceux-ci complètent pour l'appli.
// 07/10/2026 (nuit, cahier specs/espace-membre-retouches-0710.md, décision 7) : plus de « Gérer mon compte » (le compte se gère dans
// « Mes informations personnelles », comme sur le site) ; infosIci remplace la première phrase du texte infosLocal du site (« … dans ce
// navigateur ») : components/mon-compte.tsx texteSansCompte().
import type { Langue } from './i18n';

type T4 = {
  infosIci: string;       // « Ces informations restent sur cet appareil. » (première phrase de infosLocal d'espace.js, version appli)
  mesSondages: string; mesSondagesTxt: string;
  mesCompte: string;      // « Mes sondages » vide, sans compte (%s = nom de l'onglet Moi)
  effacerCompte: string;  // ajouté à la confirmation « Effacer mes données » quand un compte est connecté
};

export const TEXTES4: Record<Langue, T4> = {
  fr: { infosIci: 'Ces informations restent sur cet appareil.',
        mesSondages: 'Mes sondages', mesSondagesTxt: 'Vos réponses et les résultats',
        mesCompte: 'Avec un compte (onglet « %s »), vous retrouvez vos réponses sur tous vos appareils.',
        effacerCompte: 'Vous serez aussi déconnecté : votre compte garde ses informations.' },
  en: { infosIci: 'This information stays on this device.',
        mesSondages: 'My polls', mesSondagesTxt: 'Your answers and the results',
        mesCompte: 'With an account (“%s” tab), you find your answers on all your devices.',
        effacerCompte: 'You will also be signed out: your account keeps its information.' },
  de: { infosIci: 'Diese Angaben bleiben auf diesem Gerät.',
        mesSondages: 'Meine Umfragen', mesSondagesTxt: 'Ihre Antworten und die Ergebnisse',
        mesCompte: 'Mit einem Konto (Reiter „%s“) finden Sie Ihre Antworten auf allen Ihren Geräten.',
        effacerCompte: 'Sie werden auch abgemeldet: Ihr Konto behält seine Angaben.' },
  es: { infosIci: 'Esta información se queda en este dispositivo.',
        mesSondages: 'Mis encuestas', mesSondagesTxt: 'Sus respuestas y los resultados',
        mesCompte: 'Con una cuenta (pestaña «%s»), recupera sus respuestas en todos sus dispositivos.',
        effacerCompte: 'También se cerrará su sesión: su cuenta conserva su información.' },
  it: { infosIci: 'Queste informazioni restano su questo dispositivo.',
        mesSondages: 'I miei sondaggi', mesSondagesTxt: 'Le vostre risposte e i risultati',
        mesCompte: 'Con un account (scheda «%s») ritrovate le vostre risposte su tutti i dispositivi.',
        effacerCompte: 'Sarete anche disconnessi: il vostro account conserva le sue informazioni.' },
  pt: { infosIci: 'Estas informações ficam neste dispositivo.',
        mesSondages: 'As minhas sondagens', mesSondagesTxt: 'As suas respostas e os resultados',
        mesCompte: 'Com uma conta (separador «%s»), encontra as suas respostas em todos os seus dispositivos.',
        effacerCompte: 'A sua sessão também será terminada: a sua conta conserva as informações.' },
  nl: { infosIci: 'Deze gegevens blijven op dit apparaat.',
        mesSondages: 'Mijn peilingen', mesSondagesTxt: 'Uw antwoorden en de resultaten',
        mesCompte: 'Met een account (tabblad ‘%s’) vindt u uw antwoorden terug op al uw apparaten.',
        effacerCompte: 'U wordt ook uitgelogd: uw account behoudt zijn gegevens.' },
  pl: { infosIci: 'Te informacje pozostają na tym urządzeniu.',
        mesSondages: 'Moje ankiety', mesSondagesTxt: 'Twoje odpowiedzi i wyniki',
        mesCompte: 'Z kontem (karta „%s”) odnajdziesz swoje odpowiedzi na wszystkich urządzeniach.',
        effacerCompte: 'Zostaniesz też wylogowany: Twoje konto zachowa swoje informacje.' },
  tr: { infosIci: 'Bu bilgiler bu cihazda kalır.',
        mesSondages: 'Anketlerim', mesSondagesTxt: 'Yanıtlarınız ve sonuçlar',
        mesCompte: 'Bir hesapla (“%s” sekmesi) yanıtlarınızı tüm cihazlarınızda bulursunuz.',
        effacerCompte: 'Oturumunuz da kapatılacak: hesabınız bilgilerini korur.' },
};
