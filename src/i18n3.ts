// Textes des articles hors ligne et des outils natifs (liens, lieux), 9 langues.
import type { Langue } from './i18n';

type T3 = {
  enLigne: string; ouvrirOutil: string; faireQuiz: string; etVous: string; telecharger: string; telechargement: string; horsLigneOk: string;
  horsLigneTxt: string; introuvable: string; maj: string; lirePage: string; pays: string; ville: string;
};

export const TEXTES3: Record<Langue, T3> = {
  fr: { enLigne: 'Voir la version en ligne', ouvrirOutil: 'Ouvrir l’outil', faireQuiz: 'Faire le quiz', etVous: 'Et vous ? Votez dans les sondages',
        telecharger: 'Mettre à jour le contenu', telechargement: 'Téléchargement…', horsLigneOk: 'Contenu à jour. Tout est disponible hors ligne.',
        horsLigneTxt: 'Tout le contenu est déjà dans l’appli et disponible hors ligne. Les mises à jour se téléchargent automatiquement ; vous pouvez aussi les lancer ici.', introuvable: 'Page indisponible hors ligne.', maj: 'Contenu du',
        lirePage: 'Lire la page', pays: 'Pays', ville: 'Ville' },
  en: { enLigne: 'View the online version', ouvrirOutil: 'Open the tool', faireQuiz: 'Take the quiz', etVous: 'What about you? Vote in the polls',
        telecharger: 'Update content', telechargement: 'Downloading…', horsLigneOk: 'Content up to date. Everything is available offline.',
        horsLigneTxt: 'All content is already in the app and available offline. Updates download automatically; you can also start them here.', introuvable: 'Page unavailable offline.', maj: 'Content as of',
        lirePage: 'Read the page', pays: 'Country', ville: 'Town' },
  de: { enLigne: 'Online-Version ansehen', ouvrirOutil: 'Werkzeug öffnen', faireQuiz: 'Quiz machen', etVous: 'Und Sie? Stimmen Sie bei den Umfragen ab',
        telecharger: 'Inhalte aktualisieren', telechargement: 'Wird heruntergeladen…', horsLigneOk: 'Inhalte aktuell. Alles ist offline verfügbar.',
        horsLigneTxt: 'Alle Inhalte sind bereits in der App und offline verfügbar. Aktualisierungen werden automatisch geladen; Sie können sie auch hier starten.', introuvable: 'Seite offline nicht verfügbar.', maj: 'Inhalt vom',
        lirePage: 'Seite lesen', pays: 'Land', ville: 'Ort' },
  es: { enLigne: 'Ver la versión en línea', ouvrirOutil: 'Abrir la herramienta', faireQuiz: 'Hacer el quiz', etVous: '¿Y usted? Vote en las encuestas',
        telecharger: 'Actualizar el contenido', telechargement: 'Descargando…', horsLigneOk: 'Contenido actualizado. Todo está disponible sin conexión.',
        horsLigneTxt: 'Todo el contenido ya está en la aplicación y disponible sin conexión. Las actualizaciones se descargan automáticamente; también puede iniciarlas aquí.', introuvable: 'Página no disponible sin conexión.', maj: 'Contenido del',
        lirePage: 'Leer la página', pays: 'País', ville: 'Ciudad' },
  it: { enLigne: 'Vedi la versione online', ouvrirOutil: 'Apri lo strumento', faireQuiz: 'Fai il quiz', etVous: 'E voi? Votate nei sondaggi',
        telecharger: 'Aggiorna i contenuti', telechargement: 'Download in corso…', horsLigneOk: 'Contenuti aggiornati. Tutto è disponibile offline.',
        horsLigneTxt: 'Tutti i contenuti sono già nell’app e disponibili offline. Gli aggiornamenti si scaricano automaticamente; potete anche avviarli qui.', introuvable: 'Pagina non disponibile offline.', maj: 'Contenuto del',
        lirePage: 'Leggi la pagina', pays: 'Paese', ville: 'Città' },
  pt: { enLigne: 'Ver a versão online', ouvrirOutil: 'Abrir a ferramenta', faireQuiz: 'Fazer o quiz', etVous: 'E você? Vote nas sondagens',
        telecharger: 'Atualizar o conteúdo', telechargement: 'A descarregar…', horsLigneOk: 'Conteúdo atualizado. Tudo está disponível offline.',
        horsLigneTxt: 'Todo o conteúdo já está na aplicação e disponível offline. As atualizações são descarregadas automaticamente; também pode iniciá-las aqui.', introuvable: 'Página indisponível offline.', maj: 'Conteúdo de',
        lirePage: 'Ler a página', pays: 'País', ville: 'Cidade' },
  nl: { enLigne: 'Onlineversie bekijken', ouvrirOutil: 'Hulpmiddel openen', faireQuiz: 'Quiz doen', etVous: 'En u? Stem in de peilingen',
        telecharger: 'Inhoud bijwerken', telechargement: 'Downloaden…', horsLigneOk: 'Inhoud bijgewerkt. Alles is offline beschikbaar.',
        horsLigneTxt: 'Alle inhoud zit al in de app en is offline beschikbaar. Updates worden automatisch gedownload; u kunt ze ook hier starten.', introuvable: 'Pagina offline niet beschikbaar.', maj: 'Inhoud van',
        lirePage: 'Pagina lezen', pays: 'Land', ville: 'Plaats' },
  pl: { enLigne: 'Zobacz wersję online', ouvrirOutil: 'Otwórz narzędzie', faireQuiz: 'Rozwiąż quiz', etVous: 'A ty? Zagłosuj w ankietach',
        telecharger: 'Zaktualizuj treść', telechargement: 'Pobieranie…', horsLigneOk: 'Treść aktualna. Wszystko jest dostępne offline.',
        horsLigneTxt: 'Cała treść jest już w aplikacji i dostępna offline. Aktualizacje pobierają się automatycznie; możesz też uruchomić je tutaj.', introuvable: 'Strona niedostępna offline.', maj: 'Treść z',
        lirePage: 'Czytaj stronę', pays: 'Kraj', ville: 'Miasto' },
  tr: { enLigne: 'Çevrimiçi sürümü gör', ouvrirOutil: 'Aracı aç', faireQuiz: 'Testi yap', etVous: 'Ya siz? Anketlerde oy verin',
        telecharger: 'İçeriği güncelle', telechargement: 'İndiriliyor…', horsLigneOk: 'İçerik güncel. Her şey çevrimdışı kullanılabilir.',
        horsLigneTxt: 'Tüm içerik zaten uygulamanın içinde ve çevrimdışı kullanılabilir. Güncellemeler otomatik indirilir; buradan da başlatabilirsiniz.', introuvable: 'Sayfa çevrimdışı kullanılamıyor.', maj: 'İçerik tarihi',
        lirePage: 'Sayfayı oku', pays: 'Ülke', ville: 'Şehir' },
};
