// Liens « Jouer sur Reddit » et « Jouer sur Facebook » de l'onglet Jeux (04/11/2026), 9 langues, mêmes textes que l'accueil Jeux du site
// (outils/gen/jeux_reseaux.py). Même fichier dans `mobile` et `affectionplus-android`.
import type { Langue } from './i18n';

export const URL_REDDIT = 'https://www.reddit.com/r/AffectionPlus/';
export const URL_FACEBOOK = 'https://www.facebook.com/instantgames/play/1522572163080713';

type Lien = { titre: string; texte: string };
export const JEUX_RESEAUX: Record<Langue, { titre: string; reddit: Lien; facebook: Lien }> = {
  fr: { titre: 'Jouer sur Reddit et sur Facebook',
       reddit: { titre: 'Jouer sur Reddit', texte: 'Nos jeux dans la communauté r/AffectionPlus : sondages, question du jour et jeu à deux.' },
       facebook: { titre: 'Jouer sur Facebook', texte: 'Nos jeux sur Facebook, dans les jeux instantanés : un quiz, un sondage ou une partie à deux en quelques touches.' } },
  en: { titre: 'Play on Reddit and on Facebook',
       reddit: { titre: 'Play on Reddit', texte: 'Our games in the r/AffectionPlus community: polls, the question of the day and the two-player game.' },
       facebook: { titre: 'Play on Facebook', texte: 'Our games on Facebook, as Instant Games: a quiz, a poll or a game for two in a few taps.' } },
  de: { titre: 'Auf Reddit und auf Facebook spielen',
       reddit: { titre: 'Auf Reddit spielen', texte: 'Unsere Spiele in der Community r/AffectionPlus: Umfragen, Frage des Tages und das Spiel zu zweit.' },
       facebook: { titre: 'Auf Facebook spielen', texte: 'Unsere Spiele auf Facebook als Instant Games: ein Quiz, eine Umfrage oder eine Partie zu zweit mit wenigen Tipps.' } },
  es: { titre: 'Jugar en Reddit y en Facebook',
       reddit: { titre: 'Jugar en Reddit', texte: 'Nuestros juegos en la comunidad r/AffectionPlus: encuestas, pregunta del día y juego para dos.' },
       facebook: { titre: 'Jugar en Facebook', texte: 'Nuestros juegos en Facebook, como juegos instantáneos: un quiz, una encuesta o una partida en pareja en unos toques.' } },
  it: { titre: 'Giocare su Reddit e su Facebook',
       reddit: { titre: 'Giocare su Reddit', texte: 'I nostri giochi nella community r/AffectionPlus: sondaggi, domanda del giorno e gioco a due.' },
       facebook: { titre: 'Giocare su Facebook', texte: 'I nostri giochi su Facebook, come giochi istantanei: un quiz, un sondaggio o una partita a due in pochi tocchi.' } },
  pt: { titre: 'Jogar no Reddit e no Facebook',
       reddit: { titre: 'Jogar no Reddit', texte: 'Os nossos jogos na comunidade r/AffectionPlus: sondagens, pergunta do dia e jogo a dois.' },
       facebook: { titre: 'Jogar no Facebook', texte: 'Os nossos jogos no Facebook, como jogos instantâneos: um quiz, uma sondagem ou uma partida a dois em poucos toques.' } },
  nl: { titre: 'Spelen op Reddit en op Facebook',
       reddit: { titre: 'Spelen op Reddit', texte: 'Onze spellen in de community r/AffectionPlus: peilingen, de vraag van de dag en het spel voor twee.' },
       facebook: { titre: 'Spelen op Facebook', texte: 'Onze spellen op Facebook, als Instant Games: een quiz, een peiling of een spel voor twee in een paar tikken.' } },
  pl: { titre: 'Graj na Reddicie i na Facebooku',
       reddit: { titre: 'Graj na Reddicie', texte: 'Nasze gry w społeczności r/AffectionPlus: ankiety, pytanie dnia i gra dla dwojga.' },
       facebook: { titre: 'Graj na Facebooku', texte: 'Nasze gry na Facebooku jako gry błyskawiczne: quiz, ankieta lub gra we dwoje w kilku dotknięciach.' } },
  tr: { titre: 'Reddit’te ve Facebook’ta oynayın',
       reddit: { titre: 'Reddit’te oynayın', texte: 'Oyunlarımız r/AffectionPlus topluluğunda: anketler, günün sorusu ve iki kişilik oyun.' },
       facebook: { titre: 'Facebook’ta oynayın', texte: 'Oyunlarımız Facebook’ta, Anlık Oyunlar olarak: bir test, bir anket ya da iki kişilik bir oyun, birkaç dokunuşla.' } },
};
