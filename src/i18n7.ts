// Textes ajoutés le 26/10/2026 (ticket #162 : mises à jour de contenu sans nouvelle version, écran « Nouveautés », pages décrites en JSON),
// 9 langues.
import type { Langue } from './i18n';

type T7 = {
  nouveautes: string;       // titre de l'écran et de la ligne de l'écran Moi
  intro: string;            // chapeau de l'écran
  majDu: string;            // « Mise à jour du %s » (%s = date)
  ajout: string;            // pastille d'une page ajoutée
  modifiee: string;         // pastille d'une page mise à jour
  sections: string;         // « Nouveau : %s » (%s = intertitres ajoutés)
  autres: string;           // « … et %s autres pages »
  aucune: string;           // aucune page modifiée dans la langue
  verifier: string;         // bouton de vérification manuelle
  verification: string;     // vérification en cours
  aJour: string;            // vérification faite, rien de neuf
  recus: string;            // « %s fichiers mis à jour. »
  horsLigne: string;        // le site ne répond pas
};

export const TEXTES7: Record<Langue, T7> = {
  fr: { nouveautes: 'Nouveautés', intro: 'Les pages ajoutées ou mises à jour par la dernière mise à jour du contenu de l’appli.',
        majDu: 'Mise à jour du %s', ajout: 'Nouvelle page', modifiee: 'Page mise à jour', sections: 'Nouveau : %s',
        autres: 'et %s autres pages', aucune: 'Aucune page modifiée pour l’instant dans cette langue.', verifier: 'Vérifier les mises à jour',
        verification: 'Vérification…', aJour: 'Le contenu est à jour.', recus: '%s fichiers mis à jour.',
        horsLigne: 'Le site ne répond pas. Le contenu de l’appli reste disponible hors ligne.' },
  en: { nouveautes: 'What’s new', intro: 'Pages added or updated by the latest content update of the app.',
        majDu: 'Update of %s', ajout: 'New page', modifiee: 'Updated page', sections: 'New: %s',
        autres: 'and %s more pages', aucune: 'No page changed in this language yet.', verifier: 'Check for updates',
        verification: 'Checking…', aJour: 'Content is up to date.', recus: '%s files updated.',
        horsLigne: 'The site is not responding. The app’s content remains available offline.' },
  de: { nouveautes: 'Neuigkeiten', intro: 'Die Seiten, die mit der letzten Inhaltsaktualisierung der App hinzugefügt oder aktualisiert wurden.',
        majDu: 'Aktualisierung vom %s', ajout: 'Neue Seite', modifiee: 'Aktualisierte Seite', sections: 'Neu: %s',
        autres: 'und %s weitere Seiten', aucune: 'In dieser Sprache wurde noch keine Seite geändert.', verifier: 'Nach Aktualisierungen suchen',
        verification: 'Wird geprüft…', aJour: 'Der Inhalt ist aktuell.', recus: '%s Dateien aktualisiert.',
        horsLigne: 'Die Website antwortet nicht. Der Inhalt der App bleibt offline verfügbar.' },
  es: { nouveautes: 'Novedades', intro: 'Las páginas añadidas o actualizadas en la última actualización del contenido de la app.',
        majDu: 'Actualización del %s', ajout: 'Página nueva', modifiee: 'Página actualizada', sections: 'Nuevo: %s',
        autres: 'y %s páginas más', aucune: 'Todavía no hay páginas modificadas en este idioma.', verifier: 'Buscar actualizaciones',
        verification: 'Comprobando…', aJour: 'El contenido está al día.', recus: '%s archivos actualizados.',
        horsLigne: 'El sitio no responde. El contenido de la app sigue disponible sin conexión.' },
  it: { nouveautes: 'Novità', intro: 'Le pagine aggiunte o aggiornate con l’ultimo aggiornamento dei contenuti dell’app.',
        majDu: 'Aggiornamento del %s', ajout: 'Nuova pagina', modifiee: 'Pagina aggiornata', sections: 'Novità: %s',
        autres: 'e altre %s pagine', aucune: 'Ancora nessuna pagina modificata in questa lingua.', verifier: 'Cerca aggiornamenti',
        verification: 'Verifica in corso…', aJour: 'I contenuti sono aggiornati.', recus: '%s file aggiornati.',
        horsLigne: 'Il sito non risponde. I contenuti dell’app restano disponibili offline.' },
  pt: { nouveautes: 'Novidades', intro: 'As páginas adicionadas ou atualizadas na última atualização do conteúdo da app.',
        majDu: 'Atualização de %s', ajout: 'Página nova', modifiee: 'Página atualizada', sections: 'Novo: %s',
        autres: 'e mais %s páginas', aucune: 'Ainda nenhuma página alterada neste idioma.', verifier: 'Procurar atualizações',
        verification: 'A verificar…', aJour: 'O conteúdo está atualizado.', recus: '%s ficheiros atualizados.',
        horsLigne: 'O site não responde. O conteúdo da app continua disponível offline.' },
  nl: { nouveautes: 'Nieuw', intro: 'De pagina’s die bij de laatste inhoudsupdate van de app zijn toegevoegd of bijgewerkt.',
        majDu: 'Update van %s', ajout: 'Nieuwe pagina', modifiee: 'Bijgewerkte pagina', sections: 'Nieuw: %s',
        autres: 'en nog %s pagina’s', aucune: 'Nog geen gewijzigde pagina’s in deze taal.', verifier: 'Zoeken naar updates',
        verification: 'Bezig met controleren…', aJour: 'De inhoud is bijgewerkt.', recus: '%s bestanden bijgewerkt.',
        horsLigne: 'De site reageert niet. De inhoud van de app blijft offline beschikbaar.' },
  pl: { nouveautes: 'Nowości', intro: 'Strony dodane lub zaktualizowane podczas ostatniej aktualizacji treści aplikacji.',
        majDu: 'Aktualizacja z %s', ajout: 'Nowa strona', modifiee: 'Zaktualizowana strona', sections: 'Nowe: %s',
        autres: 'i jeszcze %s stron', aucune: 'W tym języku nie zmieniono jeszcze żadnej strony.', verifier: 'Sprawdź aktualizacje',
        verification: 'Sprawdzanie…', aJour: 'Treść jest aktualna.', recus: 'Zaktualizowano plików: %s.',
        horsLigne: 'Strona nie odpowiada. Treść aplikacji pozostaje dostępna offline.' },
  tr: { nouveautes: 'Yenilikler', intro: 'Uygulamanın son içerik güncellemesiyle eklenen veya güncellenen sayfalar.',
        majDu: '%s güncellemesi', ajout: 'Yeni sayfa', modifiee: 'Güncellenen sayfa', sections: 'Yeni: %s',
        autres: 've %s sayfa daha', aucune: 'Bu dilde henüz değiştirilen sayfa yok.', verifier: 'Güncellemeleri denetle',
        verification: 'Denetleniyor…', aJour: 'İçerik güncel.', recus: '%s dosya güncellendi.',
        horsLigne: 'Site yanıt vermiyor. Uygulamanın içeriği çevrimdışı kullanılabilir.' },
};
