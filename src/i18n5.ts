// Textes ajoutés le 12/10/2026 (recommandations d'Apple, cahier C:\Claude\Claude\specs\appli-ios-apple-1210.md), 9 langues :
// mention santé des articles (règle 1.4.1 de l'App Store) et état du contenu embarqué (indicateur discret de mise à jour).
import type { Langue } from './i18n';

type T5 = {
  avisMedical: string;   // sous les articles des rubriques Santé et Sexualité
  contenuDu: string;     // « Contenu du %s » (%s = date de la version du contenu utilisée)
  majEnCours: string;    // mise à jour en arrière-plan
  majFaite: string;      // « vérifié le %s »
};

export const TEXTES5: Record<Langue, T5> = {
  fr: { avisMedical: 'Ces informations sont générales : elles ne remplacent pas l\'avis d\'un médecin, d\'une sage-femme ou d\'un pharmacien. En cas d\'urgence, appelez le 15 ou le 112.',
        contenuDu: 'Contenu du %s', majEnCours: 'Mise à jour du contenu…', majFaite: 'vérifié le %s' },
  en: { avisMedical: 'This is general information: it does not replace advice from a doctor, midwife or pharmacist. In an emergency, call your local emergency number (112 in Europe).',
        contenuDu: 'Content of %s', majEnCours: 'Updating content…', majFaite: 'checked on %s' },
  de: { avisMedical: 'Dies sind allgemeine Informationen: Sie ersetzen nicht den Rat einer Ärztin, eines Arztes, einer Hebamme oder einer Apotheke. Im Notfall 112 anrufen.',
        contenuDu: 'Inhalt vom %s', majEnCours: 'Inhalt wird aktualisiert…', majFaite: 'geprüft am %s' },
  es: { avisMedical: 'Esta información es general: no sustituye el consejo de un médico, una matrona o un farmacéutico. En caso de urgencia, llame al 112.',
        contenuDu: 'Contenido del %s', majEnCours: 'Actualizando el contenido…', majFaite: 'comprobado el %s' },
  it: { avisMedical: 'Queste informazioni sono generali: non sostituiscono il parere di un medico, di un\'ostetrica o di un farmacista. In caso di emergenza, chiama il 112.',
        contenuDu: 'Contenuti del %s', majEnCours: 'Aggiornamento dei contenuti…', majFaite: 'verificato il %s' },
  pt: { avisMedical: 'Estas informações são gerais: não substituem o conselho de um médico, de uma parteira ou de um farmacêutico. Em caso de urgência, ligue 112.',
        contenuDu: 'Conteúdo de %s', majEnCours: 'A atualizar o conteúdo…', majFaite: 'verificado em %s' },
  nl: { avisMedical: 'Dit is algemene informatie: ze vervangt niet het advies van een arts, verloskundige of apotheker. Bel in een noodgeval 112.',
        contenuDu: 'Inhoud van %s', majEnCours: 'Inhoud wordt bijgewerkt…', majFaite: 'gecontroleerd op %s' },
  pl: { avisMedical: 'To informacje ogólne: nie zastępują porady lekarza, położnej ani farmaceuty. W nagłym wypadku zadzwoń pod numer 112.',
        contenuDu: 'Treści z %s', majEnCours: 'Aktualizacja treści…', majFaite: 'sprawdzono %s' },
  tr: { avisMedical: 'Bu bilgiler geneldir: bir doktorun, ebenin veya eczacının tavsiyesinin yerini tutmaz. Acil durumda 112\'yi arayın.',
        contenuDu: '%s tarihli içerik', majEnCours: 'İçerik güncelleniyor…', majFaite: '%s tarihinde kontrol edildi' },
};
