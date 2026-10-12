// Textes des écrans natifs des outils (horoscope, biorythmes, jeux…), 9 langues.
import type { Langue } from './i18n';

type T2 = {
  mesSignes: string; votreSigne: string; signeChinois: string; ascendant: string; sansDate: string; renseigner: string;
  autresSignes: string; masquerAutres: string; conseil: string; lesDouze: string; calculSurAppareil: string;
  tipHoroscope: string; tipBio: string; forme: string; niveaux: string[];
  horoscopeDemain: string; voirDemain: string;
};
// page « horoscope de demain » du site (12/10/2026) : titre de l'écran /horoscope?jour=1 et lien depuis un article
const DEMAIN: Record<Langue, Pick<T2, 'horoscopeDemain' | 'voirDemain'>> = {
  fr: { horoscopeDemain: 'Horoscope de demain', voirDemain: 'Voir l’horoscope de demain' },
  en: { horoscopeDemain: 'Tomorrow’s horoscope', voirDemain: 'See tomorrow’s horoscope' },
  de: { horoscopeDemain: 'Horoskop für morgen', voirDemain: 'Das Horoskop für morgen ansehen' },
  es: { horoscopeDemain: 'Horóscopo de mañana', voirDemain: 'Ver el horóscopo de mañana' },
  it: { horoscopeDemain: 'Oroscopo di domani', voirDemain: 'Vedere l’oroscopo di domani' },
  pt: { horoscopeDemain: 'Horóscopo de amanhã', voirDemain: 'Ver o horóscopo de amanhã' },
  nl: { horoscopeDemain: 'Horoscoop van morgen', voirDemain: 'De horoscoop van morgen bekijken' },
  pl: { horoscopeDemain: 'Horoskop na jutro', voirDemain: 'Zobacz horoskop na jutro' },
  tr: { horoscopeDemain: 'Yarınki burç yorumu', voirDemain: 'Yarınki burç yorumunu görün' },
};
// info-bulles et forme du jour (mêmes mots que le bandeau du site, espace.js)
const RESUME: Record<Langue, Pick<T2, 'tipHoroscope' | 'tipBio' | 'forme' | 'niveaux'>> = {
  fr: { tipHoroscope: 'Consulter votre horoscope', tipBio: 'Voir vos biorythmes du jour', forme: 'forme', niveaux: ['bonne', 'moyenne', 'à ménager', 'jour critique'] },
  en: { tipHoroscope: 'See your horoscope', tipBio: 'See today’s biorhythms', forme: 'energy', niveaux: ['good', 'average', 'take it easy', 'critical day'] },
  de: { tipHoroscope: 'Ihr Horoskop ansehen', tipBio: 'Ihre Biorhythmen heute', forme: 'Form', niveaux: ['gut', 'mittel', 'schonen', 'kritischer Tag'] },
  es: { tipHoroscope: 'Consultar su horóscopo', tipBio: 'Ver sus biorritmos de hoy', forme: 'forma', niveaux: ['buena', 'media', 'con calma', 'día crítico'] },
  it: { tipHoroscope: 'Consultare il vostro oroscopo', tipBio: 'I vostri bioritmi di oggi', forme: 'forma', niveaux: ['buona', 'media', 'con calma', 'giorno critico'] },
  pt: { tipHoroscope: 'Consultar o seu horóscopo', tipBio: 'Ver os seus biorritmos de hoje', forme: 'forma', niveaux: ['boa', 'média', 'com calma', 'dia crítico'] },
  nl: { tipHoroscope: 'Uw horoscoop bekijken', tipBio: 'Uw bioritmen van vandaag', forme: 'vorm', niveaux: ['goed', 'gemiddeld', 'rustig aan', 'kritieke dag'] },
  pl: { tipHoroscope: 'Zobacz swój horoskop', tipBio: 'Twoje dzisiejsze biorytmy', forme: 'forma', niveaux: ['dobra', 'średnia', 'oszczędzaj się', 'dzień krytyczny'] },
  tr: { tipHoroscope: 'Burç yorumunuzu görün', tipBio: 'Bugünkü biyoritimleriniz', forme: 'form', niveaux: ['iyi', 'orta', 'kendinizi koruyun', 'kritik gün'] },
};

const BASE2: Record<Langue, Omit<T2, 'tipHoroscope' | 'tipBio' | 'forme' | 'niveaux' | 'horoscopeDemain' | 'voirDemain'>> = {
  fr: { mesSignes: 'Vos signes', votreSigne: 'Votre signe', signeChinois: 'Signe chinois', ascendant: 'Ascendant',
        sansDate: 'Renseignez votre date de naissance pour voir vos signes en premier.', renseigner: 'Mes infos',
        autresSignes: 'Voir les horoscopes des autres signes', masquerAutres: 'Ne garder que mes signes', conseil: 'Conseil du jour',
        lesDouze: 'Les douze signes', calculSurAppareil: 'Calculé sur votre appareil à partir des positions réelles du jour.' },
  en: { mesSignes: 'Your signs', votreSigne: 'Your sign', signeChinois: 'Chinese sign', ascendant: 'Ascendant',
        sansDate: 'Enter your date of birth to see your signs first.', renseigner: 'My details',
        autresSignes: 'Show the horoscopes of the other signs', masquerAutres: 'Keep only my signs', conseil: 'Tip of the day',
        lesDouze: 'The twelve signs', calculSurAppareil: 'Computed on your device from today’s real positions.' },
  de: { mesSignes: 'Ihre Zeichen', votreSigne: 'Ihr Zeichen', signeChinois: 'Chinesisches Zeichen', ascendant: 'Aszendent',
        sansDate: 'Geben Sie Ihr Geburtsdatum ein, um Ihre Zeichen zuerst zu sehen.', renseigner: 'Meine Angaben',
        autresSignes: 'Die Horoskope der anderen Zeichen anzeigen', masquerAutres: 'Nur meine Zeichen behalten', conseil: 'Rat des Tages',
        lesDouze: 'Die zwölf Zeichen', calculSurAppareil: 'Auf Ihrem Gerät aus den echten Positionen des Tages berechnet.' },
  es: { mesSignes: 'Sus signos', votreSigne: 'Su signo', signeChinois: 'Signo chino', ascendant: 'Ascendente',
        sansDate: 'Indique su fecha de nacimiento para ver primero sus signos.', renseigner: 'Mis datos',
        autresSignes: 'Ver los horóscopos de los demás signos', masquerAutres: 'Dejar solo mis signos', conseil: 'Consejo del día',
        lesDouze: 'Los doce signos', calculSurAppareil: 'Calculado en su dispositivo a partir de las posiciones reales del día.' },
  it: { mesSignes: 'I vostri segni', votreSigne: 'Il vostro segno', signeChinois: 'Segno cinese', ascendant: 'Ascendente',
        sansDate: 'Inserite la vostra data di nascita per vedere prima i vostri segni.', renseigner: 'I miei dati',
        autresSignes: 'Vedere gli oroscopi degli altri segni', masquerAutres: 'Tenere solo i miei segni', conseil: 'Consiglio del giorno',
        lesDouze: 'I dodici segni', calculSurAppareil: 'Calcolato sul vostro dispositivo dalle posizioni reali del giorno.' },
  pt: { mesSignes: 'Os seus signos', votreSigne: 'O seu signo', signeChinois: 'Signo chinês', ascendant: 'Ascendente',
        sansDate: 'Indique a sua data de nascimento para ver primeiro os seus signos.', renseigner: 'Os meus dados',
        autresSignes: 'Ver os horóscopos dos outros signos', masquerAutres: 'Manter só os meus signos', conseil: 'Conselho do dia',
        lesDouze: 'Os doze signos', calculSurAppareil: 'Calculado no seu dispositivo a partir das posições reais do dia.' },
  nl: { mesSignes: 'Uw tekens', votreSigne: 'Uw teken', signeChinois: 'Chinees teken', ascendant: 'Ascendant',
        sansDate: 'Voer uw geboortedatum in om eerst uw tekens te zien.', renseigner: 'Mijn gegevens',
        autresSignes: 'De horoscopen van de andere tekens tonen', masquerAutres: 'Alleen mijn tekens houden', conseil: 'Tip van de dag',
        lesDouze: 'De twaalf tekens', calculSurAppareil: 'Op uw toestel berekend uit de echte standen van vandaag.' },
  pl: { mesSignes: 'Twoje znaki', votreSigne: 'Twój znak', signeChinois: 'Znak chiński', ascendant: 'Ascendent',
        sansDate: 'Podaj datę urodzenia, aby najpierw zobaczyć swoje znaki.', renseigner: 'Moje dane',
        autresSignes: 'Pokaż horoskopy pozostałych znaków', masquerAutres: 'Zostaw tylko moje znaki', conseil: 'Rada dnia',
        lesDouze: 'Dwanaście znaków', calculSurAppareil: 'Obliczone na twoim urządzeniu z rzeczywistych pozycji dnia.' },
  tr: { mesSignes: 'Burçlarınız', votreSigne: 'Burcunuz', signeChinois: 'Çin burcu', ascendant: 'Yükselen',
        sansDate: 'Burçlarınızı önce görmek için doğum tarihinizi girin.', renseigner: 'Bilgilerim',
        autresSignes: 'Diğer burçların yorumlarını göster', masquerAutres: 'Sadece benim burçlarımı tut', conseil: 'Günün tavsiyesi',
        lesDouze: 'On iki burç', calculSurAppareil: 'Günün gerçek konumlarından cihazınızda hesaplandı.' },
};

export const TEXTES2: Record<Langue, T2> = Object.fromEntries(
  (Object.keys(BASE2) as Langue[]).map((lg) => [lg, { ...BASE2[lg], ...RESUME[lg], ...DEMAIN[lg] }]),
) as Record<Langue, T2>;

export const GLYPHES = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
