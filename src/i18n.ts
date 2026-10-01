// Textes de l'interface de l'application AffectionPlus, 9 langues (les titres des pages du site viennent de catalogue.json).
export const LANGUES = ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'tr'] as const;
export type Langue = (typeof LANGUES)[number];

export const NOMS_LANGUES: Record<Langue, string> = {
  fr: 'Français', en: 'English', de: 'Deutsch', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe',
};

type Textes = {
  accueil: string; astro: string; jeux: string; infos: string; moi: string;
  bonjour: string; bonjourPrenom: string; aujourdhui: string;
  vosOutils: string; jouer: string; commencerIci: string; commencerIciTxt: string; etapes: string; etapeRencontre: string; etapeMariage: string; etapeFamille: string; etapeDivorce: string;
  horoscopeDuJour: string; horoscopeDuJourTxt: string; questionDuJour: string; questionDuJourTxt: string;
  compatTxt: string; jeu2Txt: string; themeTxt: string; bioTxt: string; sondagesTxt: string; quizTxt: string;
  astroTitre: string; astroIntro: string; jeuxTitre: string; jeuxIntro: string;
  infosTitre: string; infosIntro: string; rechercher: string; recherchePlaceholder: string; aucunResultat: string;
  resultats: string; rubriques: string; chargementIndex: string; indexIndispo: string;
  moiTitre: string; moiIntro: string; prenom: string; naissance: string; heure: string; heureInconnue: string;
  lieuNaissance: string; lieuNaissanceTxt: string; lieuBouton: string; langue: string; enregistrer: string; enregistre: string;
  effacer: string; effacerConfirm: string; oui: string; non: string; favoris: string; aucunFavori: string;
  aPropos: string; aProposTxt: string; siteWeb: string; newsletter: string; confidentialite: string;
  chargement: string; horsLigne: string; reessayer: string; ouvrirNavigateur: string; partager: string; retour: string;
  version: string;
};

const fr: Textes = {
  accueil: 'Accueil', astro: 'Astro', jeux: 'Jeux', infos: 'Infos', moi: 'Moi',
  bonjour: 'Bonjour', bonjourPrenom: 'Bonjour %s', aujourdhui: "Aujourd’hui",
  vosOutils: 'Vos outils', jouer: 'Jouer à deux', commencerIci: 'Par où commencer ?',
  commencerIciTxt: 'Quelques questions pour vous orienter vers les pages qui vous concernent.', etapes: 'Les étapes de la vie de couple', etapeRencontre: 'Rencontre', etapeMariage: 'Mariage', etapeFamille: 'Famille', etapeDivorce: 'Divorce',
  horoscopeDuJour: 'Votre horoscope du jour', horoscopeDuJourTxt: 'Zodiaque, signe chinois, ascendant : calculé pour vous, chaque jour.',
  questionDuJour: 'La question du jour à deux', questionDuJourTxt: 'Une question à vous poser en couple et un petit défi.',
  compatTxt: 'Deux prénoms, deux dates de naissance, sept lectures.', jeu2Txt: 'Répondez, devinez les réponses de l’autre, comparez.',
  themeTxt: 'Positions des planètes, ascendant, maisons.', bioTxt: 'Vos trois cycles aujourd’hui et sur trente jours.',
  sondagesTxt: 'Ce que pensent les lecteurs, en direct.', quizTxt: 'Quiz de connaissances, tests, calculateurs.',
  astroTitre: 'Astrologie', astroIntro: 'Vos calculs se font sur votre appareil, à partir de vos infos personnelles.',
  jeuxTitre: 'Jeux', jeuxIntro: 'Jouer à deux, se poser une question par jour, voter et comparer.',
  infosTitre: 'Infos', infosIntro: 'Toutes les pages du site : couple, famille, santé, sexualité, droit, pays.',
  rechercher: 'Rechercher', recherchePlaceholder: 'Rechercher une page…', aucunResultat: 'Aucun résultat.',
  resultats: 'Résultats', rubriques: 'Rubriques', chargementIndex: 'Chargement de l’index…', indexIndispo: 'Index indisponible : vérifiez la connexion.',
  moiTitre: 'Mes infos', moiIntro: 'Gardées sur votre appareil, jamais envoyées : elles pré-remplissent les outils du site.',
  prenom: 'Prénom', naissance: 'Date de naissance', heure: 'Heure de naissance', heureInconnue: 'Heure inconnue',
  lieuNaissance: 'Lieu de naissance', lieuNaissanceTxt: 'Pour l’ascendant : à renseigner sur la fiche du site (pays et ville).',
  lieuBouton: 'Compléter sur le site', langue: 'Langue', enregistrer: 'Enregistrer', enregistre: 'Enregistré.',
  effacer: 'Effacer mes données', effacerConfirm: 'Effacer vos infos et vos favoris de cet appareil ?', oui: 'Oui', non: 'Non',
  favoris: 'Favoris', aucunFavori: 'Aucun favori : sur une page, touchez l’étoile pour l’ajouter.',
  aPropos: 'À propos', aProposTxt: 'AffectionPlus : le site et l’application sont gratuits, sans compte ni publicité intrusive.',
  siteWeb: 'Le site affectionplus.com', newsletter: 'Lettre d’information', confidentialite: 'Confidentialité',
  chargement: 'Chargement…', horsLigne: 'Pas de connexion. Cette page a besoin d’internet.', reessayer: 'Réessayer',
  ouvrirNavigateur: 'Ouvrir dans le navigateur', partager: 'Partager', retour: 'Retour', version: 'Version',
};

const en: Textes = {
  accueil: 'Home', astro: 'Astro', jeux: 'Games', infos: 'Info', moi: 'Me',
  bonjour: 'Hello', bonjourPrenom: 'Hello %s', aujourdhui: 'Today',
  vosOutils: 'Your tools', jouer: 'Play together', commencerIci: 'Where to start?',
  commencerIciTxt: 'A few questions to point you to the pages that concern you.', etapes: 'The stages of a relationship', etapeRencontre: 'Dating', etapeMariage: 'Marriage', etapeFamille: 'Family', etapeDivorce: 'Divorce',
  horoscopeDuJour: 'Your horoscope today', horoscopeDuJourTxt: 'Zodiac, Chinese sign, ascendant: computed for you, every day.',
  questionDuJour: 'The question of the day for couples', questionDuJourTxt: 'One question to ask each other and a small challenge.',
  compatTxt: 'Two first names, two dates of birth, seven readings.', jeu2Txt: 'Answer, guess the other’s answers, compare.',
  themeTxt: 'Planet positions, ascendant, houses.', bioTxt: 'Your three cycles today and over thirty days.',
  sondagesTxt: 'What readers think, live.', quizTxt: 'Knowledge quizzes, tests, calculators.',
  astroTitre: 'Astrology', astroIntro: 'Everything is computed on your device from your personal details.',
  jeuxTitre: 'Games', jeuxIntro: 'Play together, ask one question a day, vote and compare.',
  infosTitre: 'Info', infosIntro: 'All the site’s pages: relationships, family, health, sexuality, law, countries.',
  rechercher: 'Search', recherchePlaceholder: 'Search a page…', aucunResultat: 'No results.',
  resultats: 'Results', rubriques: 'Sections', chargementIndex: 'Loading the index…', indexIndispo: 'Index unavailable: check your connection.',
  moiTitre: 'My details', moiIntro: 'Kept on your device, never sent: they pre-fill the site’s tools.',
  prenom: 'First name', naissance: 'Date of birth', heure: 'Time of birth', heureInconnue: 'Unknown time',
  lieuNaissance: 'Place of birth', lieuNaissanceTxt: 'For the ascendant: set it on the site’s form (country and town).',
  lieuBouton: 'Complete on the site', langue: 'Language', enregistrer: 'Save', enregistre: 'Saved.',
  effacer: 'Erase my data', effacerConfirm: 'Erase your details and favourites from this device?', oui: 'Yes', non: 'No',
  favoris: 'Favourites', aucunFavori: 'No favourites: on a page, tap the star to add it.',
  aPropos: 'About', aProposTxt: 'AffectionPlus: the site and the app are free, with no account and no intrusive advertising.',
  siteWeb: 'The affectionplus.com site', newsletter: 'Newsletter', confidentialite: 'Privacy',
  chargement: 'Loading…', horsLigne: 'No connection. This page needs the internet.', reessayer: 'Retry',
  ouvrirNavigateur: 'Open in browser', partager: 'Share', retour: 'Back', version: 'Version',
};

const de: Textes = {
  accueil: 'Start', astro: 'Astro', jeux: 'Spiele', infos: 'Infos', moi: 'Ich',
  bonjour: 'Guten Tag', bonjourPrenom: 'Guten Tag %s', aujourdhui: 'Heute',
  vosOutils: 'Ihre Werkzeuge', jouer: 'Zu zweit spielen', commencerIci: 'Wo anfangen?',
  commencerIciTxt: 'Ein paar Fragen, die Sie zu den Seiten führen, die Sie betreffen.', etapes: 'Die Etappen des Paarlebens', etapeRencontre: 'Kennenlernen', etapeMariage: 'Ehe', etapeFamille: 'Familie', etapeDivorce: 'Scheidung',
  horoscopeDuJour: 'Ihr Horoskop heute', horoscopeDuJourTxt: 'Tierkreis, chinesisches Zeichen, Aszendent: jeden Tag für Sie berechnet.',
  questionDuJour: 'Die Frage des Tages für Paare', questionDuJourTxt: 'Eine Frage für Sie beide und eine kleine Aufgabe.',
  compatTxt: 'Zwei Vornamen, zwei Geburtsdaten, sieben Lesarten.', jeu2Txt: 'Antworten, die Antworten des anderen erraten, vergleichen.',
  themeTxt: 'Planetenstände, Aszendent, Häuser.', bioTxt: 'Ihre drei Zyklen heute und über dreißig Tage.',
  sondagesTxt: 'Was die Leser denken, live.', quizTxt: 'Wissensquiz, Tests, Rechner.',
  astroTitre: 'Astrologie', astroIntro: 'Alles wird auf Ihrem Gerät aus Ihren persönlichen Angaben berechnet.',
  jeuxTitre: 'Spiele', jeuxIntro: 'Zu zweit spielen, jeden Tag eine Frage, abstimmen und vergleichen.',
  infosTitre: 'Infos', infosIntro: 'Alle Seiten der Website: Beziehung, Familie, Gesundheit, Sexualität, Recht, Länder.',
  rechercher: 'Suchen', recherchePlaceholder: 'Seite suchen…', aucunResultat: 'Keine Ergebnisse.',
  resultats: 'Ergebnisse', rubriques: 'Rubriken', chargementIndex: 'Index wird geladen…', indexIndispo: 'Index nicht verfügbar: Verbindung prüfen.',
  moiTitre: 'Meine Angaben', moiIntro: 'Bleiben auf Ihrem Gerät, werden nie gesendet: Sie füllen die Werkzeuge der Website vor.',
  prenom: 'Vorname', naissance: 'Geburtsdatum', heure: 'Geburtszeit', heureInconnue: 'Zeit unbekannt',
  lieuNaissance: 'Geburtsort', lieuNaissanceTxt: 'Für den Aszendenten: auf dem Formular der Website eintragen (Land und Ort).',
  lieuBouton: 'Auf der Website ergänzen', langue: 'Sprache', enregistrer: 'Speichern', enregistre: 'Gespeichert.',
  effacer: 'Meine Daten löschen', effacerConfirm: 'Ihre Angaben und Favoriten von diesem Gerät löschen?', oui: 'Ja', non: 'Nein',
  favoris: 'Favoriten', aucunFavori: 'Keine Favoriten: Tippen Sie auf einer Seite auf den Stern.',
  aPropos: 'Über', aProposTxt: 'AffectionPlus: Website und App sind kostenlos, ohne Konto und ohne aufdringliche Werbung.',
  siteWeb: 'Die Website affectionplus.com', newsletter: 'Newsletter', confidentialite: 'Datenschutz',
  chargement: 'Wird geladen…', horsLigne: 'Keine Verbindung. Diese Seite braucht Internet.', reessayer: 'Erneut versuchen',
  ouvrirNavigateur: 'Im Browser öffnen', partager: 'Teilen', retour: 'Zurück', version: 'Version',
};

const es: Textes = {
  accueil: 'Inicio', astro: 'Astro', jeux: 'Juegos', infos: 'Info', moi: 'Yo',
  bonjour: 'Hola', bonjourPrenom: 'Hola, %s', aujourdhui: 'Hoy',
  vosOutils: 'Sus herramientas', jouer: 'Jugar en pareja', commencerIci: '¿Por dónde empezar?',
  commencerIciTxt: 'Unas preguntas para orientarle hacia las páginas que le conciernen.', etapes: 'Las etapas de la vida en pareja', etapeRencontre: 'Encuentros', etapeMariage: 'Matrimonio', etapeFamille: 'Familia', etapeDivorce: 'Divorcio',
  horoscopeDuJour: 'Su horóscopo de hoy', horoscopeDuJourTxt: 'Zodiaco, signo chino, ascendente: calculado para usted cada día.',
  questionDuJour: 'La pregunta del día en pareja', questionDuJourTxt: 'Una pregunta para hacerse en pareja y un pequeño reto.',
  compatTxt: 'Dos nombres, dos fechas de nacimiento, siete lecturas.', jeu2Txt: 'Responda, adivine las respuestas del otro, comparen.',
  themeTxt: 'Posiciones de los planetas, ascendente, casas.', bioTxt: 'Sus tres ciclos hoy y durante treinta días.',
  sondagesTxt: 'Lo que piensan los lectores, en directo.', quizTxt: 'Quiz de conocimientos, tests, calculadoras.',
  astroTitre: 'Astrología', astroIntro: 'Todo se calcula en su dispositivo a partir de sus datos personales.',
  jeuxTitre: 'Juegos', jeuxIntro: 'Jugar en pareja, hacerse una pregunta al día, votar y comparar.',
  infosTitre: 'Info', infosIntro: 'Todas las páginas del sitio: pareja, familia, salud, sexualidad, derecho, países.',
  rechercher: 'Buscar', recherchePlaceholder: 'Buscar una página…', aucunResultat: 'Sin resultados.',
  resultats: 'Resultados', rubriques: 'Secciones', chargementIndex: 'Cargando el índice…', indexIndispo: 'Índice no disponible: compruebe la conexión.',
  moiTitre: 'Mis datos', moiIntro: 'Guardados en su dispositivo, nunca enviados: rellenan las herramientas del sitio.',
  prenom: 'Nombre', naissance: 'Fecha de nacimiento', heure: 'Hora de nacimiento', heureInconnue: 'Hora desconocida',
  lieuNaissance: 'Lugar de nacimiento', lieuNaissanceTxt: 'Para el ascendente: indíquelo en la ficha del sitio (país y ciudad).',
  lieuBouton: 'Completar en el sitio', langue: 'Idioma', enregistrer: 'Guardar', enregistre: 'Guardado.',
  effacer: 'Borrar mis datos', effacerConfirm: '¿Borrar sus datos y favoritos de este dispositivo?', oui: 'Sí', non: 'No',
  favoris: 'Favoritos', aucunFavori: 'Sin favoritos: en una página, toque la estrella para añadirla.',
  aPropos: 'Acerca de', aProposTxt: 'AffectionPlus: el sitio y la aplicación son gratuitos, sin cuenta ni publicidad intrusiva.',
  siteWeb: 'El sitio affectionplus.com', newsletter: 'Boletín', confidentialite: 'Privacidad',
  chargement: 'Cargando…', horsLigne: 'Sin conexión. Esta página necesita internet.', reessayer: 'Reintentar',
  ouvrirNavigateur: 'Abrir en el navegador', partager: 'Compartir', retour: 'Atrás', version: 'Versión',
};

const it: Textes = {
  accueil: 'Home', astro: 'Astro', jeux: 'Giochi', infos: 'Info', moi: 'Io',
  bonjour: 'Buongiorno', bonjourPrenom: 'Buongiorno %s', aujourdhui: 'Oggi',
  vosOutils: 'I vostri strumenti', jouer: 'Giocare in due', commencerIci: 'Da dove cominciare?',
  commencerIciTxt: 'Qualche domanda per orientarvi verso le pagine che vi riguardano.', etapes: 'Le tappe della vita di coppia', etapeRencontre: 'Incontri', etapeMariage: 'Matrimonio', etapeFamille: 'Famiglia', etapeDivorce: 'Divorzio',
  horoscopeDuJour: 'Il vostro oroscopo di oggi', horoscopeDuJourTxt: 'Zodiaco, segno cinese, ascendente: calcolati per voi ogni giorno.',
  questionDuJour: 'La domanda del giorno per la coppia', questionDuJourTxt: 'Una domanda da farvi in coppia e una piccola sfida.',
  compatTxt: 'Due nomi, due date di nascita, sette letture.', jeu2Txt: 'Rispondete, indovinate le risposte dell’altro, confrontate.',
  themeTxt: 'Posizioni dei pianeti, ascendente, case.', bioTxt: 'I vostri tre cicli oggi e su trenta giorni.',
  sondagesTxt: 'Che cosa pensano i lettori, in diretta.', quizTxt: 'Quiz di conoscenza, test, calcolatori.',
  astroTitre: 'Astrologia', astroIntro: 'Tutto si calcola sul vostro dispositivo, dai vostri dati personali.',
  jeuxTitre: 'Giochi', jeuxIntro: 'Giocare in due, farsi una domanda al giorno, votare e confrontare.',
  infosTitre: 'Info', infosIntro: 'Tutte le pagine del sito: coppia, famiglia, salute, sessualità, diritto, paesi.',
  rechercher: 'Cerca', recherchePlaceholder: 'Cerca una pagina…', aucunResultat: 'Nessun risultato.',
  resultats: 'Risultati', rubriques: 'Sezioni', chargementIndex: 'Caricamento dell’indice…', indexIndispo: 'Indice non disponibile: verificate la connessione.',
  moiTitre: 'I miei dati', moiIntro: 'Restano sul vostro dispositivo, mai inviati: precompilano gli strumenti del sito.',
  prenom: 'Nome', naissance: 'Data di nascita', heure: 'Ora di nascita', heureInconnue: 'Ora sconosciuta',
  lieuNaissance: 'Luogo di nascita', lieuNaissanceTxt: 'Per l’ascendente: da indicare nella scheda del sito (paese e città).',
  lieuBouton: 'Completare sul sito', langue: 'Lingua', enregistrer: 'Salva', enregistre: 'Salvato.',
  effacer: 'Cancella i miei dati', effacerConfirm: 'Cancellare i vostri dati e preferiti da questo dispositivo?', oui: 'Sì', non: 'No',
  favoris: 'Preferiti', aucunFavori: 'Nessun preferito: su una pagina, toccate la stella per aggiungerla.',
  aPropos: 'Informazioni', aProposTxt: 'AffectionPlus: sito e app sono gratuiti, senza account né pubblicità invadente.',
  siteWeb: 'Il sito affectionplus.com', newsletter: 'Newsletter', confidentialite: 'Privacy',
  chargement: 'Caricamento…', horsLigne: 'Nessuna connessione. Questa pagina ha bisogno di internet.', reessayer: 'Riprova',
  ouvrirNavigateur: 'Apri nel browser', partager: 'Condividi', retour: 'Indietro', version: 'Versione',
};

const pt: Textes = {
  accueil: 'Início', astro: 'Astro', jeux: 'Jogos', infos: 'Info', moi: 'Eu',
  bonjour: 'Olá', bonjourPrenom: 'Olá, %s', aujourdhui: 'Hoje',
  vosOutils: 'As suas ferramentas', jouer: 'Jogar a dois', commencerIci: 'Por onde começar?',
  commencerIciTxt: 'Algumas perguntas para o orientar para as páginas que lhe dizem respeito.', etapes: 'As etapas da vida a dois', etapeRencontre: 'Encontros', etapeMariage: 'Casamento', etapeFamille: 'Família', etapeDivorce: 'Divórcio',
  horoscopeDuJour: 'O seu horóscopo de hoje', horoscopeDuJourTxt: 'Zodíaco, signo chinês, ascendente: calculados para si todos os dias.',
  questionDuJour: 'A pergunta do dia a dois', questionDuJourTxt: 'Uma pergunta para fazerem um ao outro e um pequeno desafio.',
  compatTxt: 'Dois nomes, duas datas de nascimento, sete leituras.', jeu2Txt: 'Responda, adivinhe as respostas do outro, comparem.',
  themeTxt: 'Posições dos planetas, ascendente, casas.', bioTxt: 'Os seus três ciclos hoje e ao longo de trinta dias.',
  sondagesTxt: 'O que pensam os leitores, em direto.', quizTxt: 'Quiz de conhecimentos, testes, calculadoras.',
  astroTitre: 'Astrologia', astroIntro: 'Tudo se calcula no seu dispositivo, a partir dos seus dados pessoais.',
  jeuxTitre: 'Jogos', jeuxIntro: 'Jogar a dois, fazer uma pergunta por dia, votar e comparar.',
  infosTitre: 'Info', infosIntro: 'Todas as páginas do site: casal, família, saúde, sexualidade, direito, países.',
  rechercher: 'Pesquisar', recherchePlaceholder: 'Pesquisar uma página…', aucunResultat: 'Sem resultados.',
  resultats: 'Resultados', rubriques: 'Secções', chargementIndex: 'A carregar o índice…', indexIndispo: 'Índice indisponível: verifique a ligação.',
  moiTitre: 'Os meus dados', moiIntro: 'Guardados no seu dispositivo, nunca enviados: preenchem as ferramentas do site.',
  prenom: 'Nome', naissance: 'Data de nascimento', heure: 'Hora de nascimento', heureInconnue: 'Hora desconhecida',
  lieuNaissance: 'Local de nascimento', lieuNaissanceTxt: 'Para o ascendente: a indicar na ficha do site (país e cidade).',
  lieuBouton: 'Completar no site', langue: 'Língua', enregistrer: 'Guardar', enregistre: 'Guardado.',
  effacer: 'Apagar os meus dados', effacerConfirm: 'Apagar os seus dados e favoritos deste dispositivo?', oui: 'Sim', non: 'Não',
  favoris: 'Favoritos', aucunFavori: 'Sem favoritos: numa página, toque na estrela para a adicionar.',
  aPropos: 'Sobre', aProposTxt: 'AffectionPlus: o site e a aplicação são gratuitos, sem conta nem publicidade intrusiva.',
  siteWeb: 'O site affectionplus.com', newsletter: 'Newsletter', confidentialite: 'Privacidade',
  chargement: 'A carregar…', horsLigne: 'Sem ligação. Esta página precisa de internet.', reessayer: 'Tentar de novo',
  ouvrirNavigateur: 'Abrir no navegador', partager: 'Partilhar', retour: 'Voltar', version: 'Versão',
};

const nl: Textes = {
  accueil: 'Start', astro: 'Astro', jeux: 'Spellen', infos: 'Info', moi: 'Ik',
  bonjour: 'Hallo', bonjourPrenom: 'Hallo %s', aujourdhui: 'Vandaag',
  vosOutils: 'Uw hulpmiddelen', jouer: 'Samen spelen', commencerIci: 'Waar beginnen?',
  commencerIciTxt: 'Een paar vragen die u naar de pagina’s leiden die u aangaan.', etapes: 'De stappen van het samenleven', etapeRencontre: 'Daten', etapeMariage: 'Huwelijk', etapeFamille: 'Gezin', etapeDivorce: 'Scheiding',
  horoscopeDuJour: 'Uw horoscoop van vandaag', horoscopeDuJourTxt: 'Sterrenbeeld, Chinees teken, ascendant: elke dag voor u berekend.',
  questionDuJour: 'De vraag van de dag voor koppels', questionDuJourTxt: 'Een vraag om elkaar te stellen en een kleine uitdaging.',
  compatTxt: 'Twee voornamen, twee geboortedata, zeven lezingen.', jeu2Txt: 'Antwoord, raad de antwoorden van de ander, vergelijk.',
  themeTxt: 'Planeetstanden, ascendant, huizen.', bioTxt: 'Uw drie cycli vandaag en over dertig dagen.',
  sondagesTxt: 'Wat lezers denken, live.', quizTxt: 'Kennisquizzen, tests, rekenhulpen.',
  astroTitre: 'Astrologie', astroIntro: 'Alles wordt op uw toestel berekend, uit uw persoonlijke gegevens.',
  jeuxTitre: 'Spellen', jeuxIntro: 'Samen spelen, elke dag een vraag stellen, stemmen en vergelijken.',
  infosTitre: 'Info', infosIntro: 'Alle pagina’s van de site: relatie, gezin, gezondheid, seksualiteit, recht, landen.',
  rechercher: 'Zoeken', recherchePlaceholder: 'Een pagina zoeken…', aucunResultat: 'Geen resultaten.',
  resultats: 'Resultaten', rubriques: 'Rubrieken', chargementIndex: 'Index laden…', indexIndispo: 'Index niet beschikbaar: controleer de verbinding.',
  moiTitre: 'Mijn gegevens', moiIntro: 'Bewaard op uw toestel, nooit verzonden: ze vullen de hulpmiddelen van de site vooraf in.',
  prenom: 'Voornaam', naissance: 'Geboortedatum', heure: 'Geboorteuur', heureInconnue: 'Uur onbekend',
  lieuNaissance: 'Geboorteplaats', lieuNaissanceTxt: 'Voor de ascendant: in te vullen op het formulier van de site (land en plaats).',
  lieuBouton: 'Aanvullen op de site', langue: 'Taal', enregistrer: 'Opslaan', enregistre: 'Opgeslagen.',
  effacer: 'Mijn gegevens wissen', effacerConfirm: 'Uw gegevens en favorieten van dit toestel wissen?', oui: 'Ja', non: 'Nee',
  favoris: 'Favorieten', aucunFavori: 'Geen favorieten: tik op een pagina op de ster om ze toe te voegen.',
  aPropos: 'Over', aProposTxt: 'AffectionPlus: de site en de app zijn gratis, zonder account en zonder opdringerige reclame.',
  siteWeb: 'De site affectionplus.com', newsletter: 'Nieuwsbrief', confidentialite: 'Privacy',
  chargement: 'Laden…', horsLigne: 'Geen verbinding. Deze pagina heeft internet nodig.', reessayer: 'Opnieuw proberen',
  ouvrirNavigateur: 'Openen in browser', partager: 'Delen', retour: 'Terug', version: 'Versie',
};

const pl: Textes = {
  accueil: 'Start', astro: 'Astro', jeux: 'Gry', infos: 'Info', moi: 'Ja',
  bonjour: 'Dzień dobry', bonjourPrenom: 'Dzień dobry, %s', aujourdhui: 'Dzisiaj',
  vosOutils: 'Twoje narzędzia', jouer: 'Gra we dwoje', commencerIci: 'Od czego zacząć?',
  commencerIciTxt: 'Kilka pytań, które skierują cię do stron, które cię dotyczą.', etapes: 'Etapy życia we dwoje', etapeRencontre: 'Randki', etapeMariage: 'Małżeństwo', etapeFamille: 'Rodzina', etapeDivorce: 'Rozwód',
  horoscopeDuJour: 'Twój horoskop na dziś', horoscopeDuJourTxt: 'Zodiak, znak chiński, ascendent: obliczane dla ciebie codziennie.',
  questionDuJour: 'Pytanie dnia dla par', questionDuJourTxt: 'Jedno pytanie do zadania sobie w parze i małe wyzwanie.',
  compatTxt: 'Dwa imiona, dwie daty urodzenia, siedem odczytów.', jeu2Txt: 'Odpowiedz, zgadnij odpowiedzi drugiej osoby, porównajcie.',
  themeTxt: 'Pozycje planet, ascendent, domy.', bioTxt: 'Twoje trzy cykle dzisiaj i w ciągu trzydziestu dni.',
  sondagesTxt: 'Co myślą czytelnicy, na żywo.', quizTxt: 'Quizy wiedzy, testy, kalkulatory.',
  astroTitre: 'Astrologia', astroIntro: 'Wszystko liczy się na twoim urządzeniu, na podstawie twoich danych.',
  jeuxTitre: 'Gry', jeuxIntro: 'Grać we dwoje, zadawać sobie codziennie pytanie, głosować i porównywać.',
  infosTitre: 'Info', infosIntro: 'Wszystkie strony serwisu: związek, rodzina, zdrowie, seksualność, prawo, kraje.',
  rechercher: 'Szukaj', recherchePlaceholder: 'Szukaj strony…', aucunResultat: 'Brak wyników.',
  resultats: 'Wyniki', rubriques: 'Działy', chargementIndex: 'Wczytywanie indeksu…', indexIndispo: 'Indeks niedostępny: sprawdź połączenie.',
  moiTitre: 'Moje dane', moiIntro: 'Przechowywane na twoim urządzeniu, nigdy nie wysyłane: wypełniają narzędzia serwisu.',
  prenom: 'Imię', naissance: 'Data urodzenia', heure: 'Godzina urodzenia', heureInconnue: 'Godzina nieznana',
  lieuNaissance: 'Miejsce urodzenia', lieuNaissanceTxt: 'Do ascendentu: uzupełnij w formularzu serwisu (kraj i miasto).',
  lieuBouton: 'Uzupełnij w serwisie', langue: 'Język', enregistrer: 'Zapisz', enregistre: 'Zapisano.',
  effacer: 'Usuń moje dane', effacerConfirm: 'Usunąć twoje dane i ulubione z tego urządzenia?', oui: 'Tak', non: 'Nie',
  favoris: 'Ulubione', aucunFavori: 'Brak ulubionych: na stronie dotknij gwiazdki, aby ją dodać.',
  aPropos: 'O aplikacji', aProposTxt: 'AffectionPlus: serwis i aplikacja są darmowe, bez konta i bez nachalnych reklam.',
  siteWeb: 'Serwis affectionplus.com', newsletter: 'Newsletter', confidentialite: 'Prywatność',
  chargement: 'Wczytywanie…', horsLigne: 'Brak połączenia. Ta strona wymaga internetu.', reessayer: 'Spróbuj ponownie',
  ouvrirNavigateur: 'Otwórz w przeglądarce', partager: 'Udostępnij', retour: 'Wstecz', version: 'Wersja',
};

const tr: Textes = {
  accueil: 'Ana sayfa', astro: 'Astro', jeux: 'Oyunlar', infos: 'Bilgi', moi: 'Ben',
  bonjour: 'Merhaba', bonjourPrenom: 'Merhaba %s', aujourdhui: 'Bugün',
  vosOutils: 'Araçlarınız', jouer: 'Birlikte oynayın', commencerIci: 'Nereden başlamalı?',
  commencerIciTxt: 'Sizi ilgilendiren sayfalara yönlendiren birkaç soru.', etapes: 'Çift hayatının aşamaları', etapeRencontre: 'Tanışma', etapeMariage: 'Evlilik', etapeFamille: 'Aile', etapeDivorce: 'Boşanma',
  horoscopeDuJour: 'Bugünkü burç yorumunuz', horoscopeDuJourTxt: 'Burç, Çin burcu, yükselen: her gün sizin için hesaplanır.',
  questionDuJour: 'Çiftler için günün sorusu', questionDuJourTxt: 'Birbirinize soracağınız bir soru ve küçük bir görev.',
  compatTxt: 'İki isim, iki doğum tarihi, yedi okuma.', jeu2Txt: 'Cevaplayın, diğerinin cevaplarını tahmin edin, karşılaştırın.',
  themeTxt: 'Gezegen konumları, yükselen, evler.', bioTxt: 'Bugünkü ve otuz günlük üç döngünüz.',
  sondagesTxt: 'Okurlar ne düşünüyor, canlı.', quizTxt: 'Bilgi testleri, sınamalar, hesaplayıcılar.',
  astroTitre: 'Astroloji', astroIntro: 'Her şey kişisel bilgilerinizden yola çıkarak cihazınızda hesaplanır.',
  jeuxTitre: 'Oyunlar', jeuxIntro: 'Birlikte oynayın, her gün bir soru sorun, oy verin ve karşılaştırın.',
  infosTitre: 'Bilgi', infosIntro: 'Sitenin tüm sayfaları: ilişki, aile, sağlık, cinsellik, hukuk, ülkeler.',
  rechercher: 'Ara', recherchePlaceholder: 'Sayfa ara…', aucunResultat: 'Sonuç yok.',
  resultats: 'Sonuçlar', rubriques: 'Bölümler', chargementIndex: 'Dizin yükleniyor…', indexIndispo: 'Dizin kullanılamıyor: bağlantıyı kontrol edin.',
  moiTitre: 'Bilgilerim', moiIntro: 'Cihazınızda kalır, asla gönderilmez: sitenin araçlarını önceden doldurur.',
  prenom: 'Ad', naissance: 'Doğum tarihi', heure: 'Doğum saati', heureInconnue: 'Saat bilinmiyor',
  lieuNaissance: 'Doğum yeri', lieuNaissanceTxt: 'Yükselen burç için: sitedeki formda belirtin (ülke ve şehir).',
  lieuBouton: 'Sitede tamamla', langue: 'Dil', enregistrer: 'Kaydet', enregistre: 'Kaydedildi.',
  effacer: 'Verilerimi sil', effacerConfirm: 'Bilgileriniz ve favorileriniz bu cihazdan silinsin mi?', oui: 'Evet', non: 'Hayır',
  favoris: 'Favoriler', aucunFavori: 'Favori yok: bir sayfada yıldıza dokunarak ekleyin.',
  aPropos: 'Hakkında', aProposTxt: 'AffectionPlus: site ve uygulama ücretsizdir, hesap gerektirmez, rahatsız edici reklam yoktur.',
  siteWeb: 'affectionplus.com sitesi', newsletter: 'Bülten', confidentialite: 'Gizlilik',
  chargement: 'Yükleniyor…', horsLigne: 'Bağlantı yok. Bu sayfa internet gerektirir.', reessayer: 'Tekrar dene',
  ouvrirNavigateur: 'Tarayıcıda aç', partager: 'Paylaş', retour: 'Geri', version: 'Sürüm',
};

export const TEXTES: Record<Langue, Textes> = { fr, en, de, es, it, pt, nl, pl, tr };

export function estLangue(x: unknown): x is Langue {
  return typeof x === 'string' && (LANGUES as readonly string[]).includes(x);
}

/** Langue de l'appareil si elle fait partie des neuf, sinon l'anglais. */
export function langueAppareil(tags: string[]): Langue {
  for (const t of tags) {
    const code = String(t || '').slice(0, 2).toLowerCase();
    if (estLangue(code)) return code;
  }
  return 'en';
}

export function fmt(s: string, ...v: (string | number)[]): string {
  let i = 0;
  return s.replace(/%s/g, () => String(v[i++] ?? ''));
}
