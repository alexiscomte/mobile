// Textes des articles hors ligne et des outils natifs (liens, lieux), 9 langues.
import type { Langue } from './i18n';

type T3 = {
  enLigne: string; ouvrirOutil: string; faireQuiz: string; etVous: string; telecharger: string; telechargement: string; horsLigneOk: string;
  horsLigneTxt: string; introuvable: string; maj: string; lirePage: string; pays: string; ville: string;
};

export const TEXTES3: Record<Langue, T3> = {
  fr: { enLigne: 'Voir la version en ligne', ouvrirOutil: 'Ouvrir l’outil', faireQuiz: 'Faire le quiz', etVous: 'Et vous ? Votez dans les sondages',
        telecharger: 'Télécharger tout pour lire hors ligne', telechargement: 'Téléchargement…', horsLigneOk: 'Tout le contenu est disponible hors ligne.',
        horsLigneTxt: 'Les pages lues sont gardées sur votre téléphone. Vous pouvez aussi tout télécharger d’un coup.', introuvable: 'Page indisponible hors ligne.', maj: 'Contenu du',
        lirePage: 'Lire la page', pays: 'Pays', ville: 'Ville' },
  en: { enLigne: 'View the online version', ouvrirOutil: 'Open the tool', faireQuiz: 'Take the quiz', etVous: 'What about you? Vote in the polls',
        telecharger: 'Download everything for offline reading', telechargement: 'Downloading…', horsLigneOk: 'All content is available offline.',
        horsLigneTxt: 'Pages you read are kept on your phone. You can also download everything at once.', introuvable: 'Page unavailable offline.', maj: 'Content as of',
        lirePage: 'Read the page', pays: 'Country', ville: 'Town' },
  de: { enLigne: 'Online-Version ansehen', ouvrirOutil: 'Werkzeug öffnen', faireQuiz: 'Quiz machen', etVous: 'Und Sie? Stimmen Sie bei den Umfragen ab',
        telecharger: 'Alles zum Offline-Lesen herunterladen', telechargement: 'Wird heruntergeladen…', horsLigneOk: 'Alle Inhalte sind offline verfügbar.',
        horsLigneTxt: 'Gelesene Seiten bleiben auf Ihrem Telefon. Sie können auch alles auf einmal herunterladen.', introuvable: 'Seite offline nicht verfügbar.', maj: 'Inhalt vom',
        lirePage: 'Seite lesen', pays: 'Land', ville: 'Ort' },
  es: { enLigne: 'Ver la versión en línea', ouvrirOutil: 'Abrir la herramienta', faireQuiz: 'Hacer el quiz', etVous: '¿Y usted? Vote en las encuestas',
        telecharger: 'Descargar todo para leer sin conexión', telechargement: 'Descargando…', horsLigneOk: 'Todo el contenido está disponible sin conexión.',
        horsLigneTxt: 'Las páginas leídas se guardan en su teléfono. También puede descargarlo todo de una vez.', introuvable: 'Página no disponible sin conexión.', maj: 'Contenido del',
        lirePage: 'Leer la página', pays: 'País', ville: 'Ciudad' },
  it: { enLigne: 'Vedi la versione online', ouvrirOutil: 'Apri lo strumento', faireQuiz: 'Fai il quiz', etVous: 'E voi? Votate nei sondaggi',
        telecharger: 'Scarica tutto per leggere offline', telechargement: 'Download in corso…', horsLigneOk: 'Tutti i contenuti sono disponibili offline.',
        horsLigneTxt: 'Le pagine lette restano sul telefono. Potete anche scaricare tutto in una volta.', introuvable: 'Pagina non disponibile offline.', maj: 'Contenuto del',
        lirePage: 'Leggi la pagina', pays: 'Paese', ville: 'Città' },
  pt: { enLigne: 'Ver a versão online', ouvrirOutil: 'Abrir a ferramenta', faireQuiz: 'Fazer o quiz', etVous: 'E você? Vote nas sondagens',
        telecharger: 'Descarregar tudo para ler offline', telechargement: 'A descarregar…', horsLigneOk: 'Todo o conteúdo está disponível offline.',
        horsLigneTxt: 'As páginas lidas ficam no seu telemóvel. Também pode descarregar tudo de uma vez.', introuvable: 'Página indisponível offline.', maj: 'Conteúdo de',
        lirePage: 'Ler a página', pays: 'País', ville: 'Cidade' },
  nl: { enLigne: 'Onlineversie bekijken', ouvrirOutil: 'Hulpmiddel openen', faireQuiz: 'Quiz doen', etVous: 'En u? Stem in de peilingen',
        telecharger: 'Alles downloaden om offline te lezen', telechargement: 'Downloaden…', horsLigneOk: 'Alle inhoud is offline beschikbaar.',
        horsLigneTxt: 'Gelezen pagina’s blijven op uw telefoon. U kunt ook alles in één keer downloaden.', introuvable: 'Pagina offline niet beschikbaar.', maj: 'Inhoud van',
        lirePage: 'Pagina lezen', pays: 'Land', ville: 'Plaats' },
  pl: { enLigne: 'Zobacz wersję online', ouvrirOutil: 'Otwórz narzędzie', faireQuiz: 'Rozwiąż quiz', etVous: 'A ty? Zagłosuj w ankietach',
        telecharger: 'Pobierz wszystko do czytania offline', telechargement: 'Pobieranie…', horsLigneOk: 'Cała treść jest dostępna offline.',
        horsLigneTxt: 'Przeczytane strony zostają w telefonie. Możesz też pobrać wszystko naraz.', introuvable: 'Strona niedostępna offline.', maj: 'Treść z',
        lirePage: 'Czytaj stronę', pays: 'Kraj', ville: 'Miasto' },
  tr: { enLigne: 'Çevrimiçi sürümü gör', ouvrirOutil: 'Aracı aç', faireQuiz: 'Testi yap', etVous: 'Ya siz? Anketlerde oy verin',
        telecharger: 'Çevrimdışı okumak için her şeyi indir', telechargement: 'İndiriliyor…', horsLigneOk: 'Tüm içerik çevrimdışı kullanılabilir.',
        horsLigneTxt: 'Okunan sayfalar telefonunuzda kalır. Her şeyi bir kerede de indirebilirsiniz.', introuvable: 'Sayfa çevrimdışı kullanılamıyor.', maj: 'İçerik tarihi',
        lirePage: 'Sayfayı oku', pays: 'Ülke', ville: 'Şehir' },
};
