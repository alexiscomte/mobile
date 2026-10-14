// Textes ajoutés le 14/10/2026 (notifications et pastille de l'icône de l'appli, notifications.ts), 9 langues. La fenêtre
// d'autorisation elle-même est écrite par iOS, dans la langue de l'iPhone.
import type { Langue } from './i18n';

type T7 = {
  notifActiver: string;    // bouton de Mes messages : ouvre la demande d'autorisation d'iOS
  notifOff: string;        // autorisation refusée
  notifReglages: string;   // ouvre les Réglages de l'appli
};

export const TEXTES7: Record<Langue, T7> = {
  fr: { notifActiver: 'Me prévenir des nouveaux messages sur cet appareil',
        notifOff: 'Les notifications de l\'appli sont coupées : aucune alerte ni pastille ne vous signalera un nouveau message. Vous pouvez les activer dans les Réglages.',
        notifReglages: 'Ouvrir les Réglages' },
  en: { notifActiver: 'Notify me of new messages on this device',
        notifOff: 'Notifications are turned off for the app: no alert or badge will tell you about a new message. You can turn them on in Settings.',
        notifReglages: 'Open Settings' },
  de: { notifActiver: 'Mich auf diesem Gerät über neue Nachrichten benachrichtigen',
        notifOff: 'Die Mitteilungen der App sind ausgeschaltet: Weder Hinweis noch Kennzeichen zeigen Ihnen eine neue Nachricht an. Sie können sie in den Einstellungen einschalten.',
        notifReglages: 'Einstellungen öffnen' },
  es: { notifActiver: 'Avisarme de los mensajes nuevos en este dispositivo',
        notifOff: 'Las notificaciones de la app están desactivadas: ningún aviso ni globo le indicará un mensaje nuevo. Puede activarlas en Ajustes.',
        notifReglages: 'Abrir Ajustes' },
  it: { notifActiver: 'Avvisami dei nuovi messaggi su questo dispositivo',
        notifOff: 'Le notifiche dell’app sono disattivate: nessun avviso né badge vi segnalerà un nuovo messaggio. Potete attivarle in Impostazioni.',
        notifReglages: 'Apri Impostazioni' },
  pt: { notifActiver: 'Avisar-me de novas mensagens neste dispositivo',
        notifOff: 'As notificações da app estão desativadas: nenhum alerta nem indicador lhe assinalará uma nova mensagem. Pode ativá-las nas Definições.',
        notifReglages: 'Abrir Definições' },
  nl: { notifActiver: 'Mij op dit apparaat waarschuwen bij nieuwe berichten',
        notifOff: 'De meldingen van de app staan uit: geen melding of badge wijst u op een nieuw bericht. U kunt ze aanzetten in Instellingen.',
        notifReglages: 'Instellingen openen' },
  pl: { notifActiver: 'Powiadamiaj mnie o nowych wiadomościach na tym urządzeniu',
        notifOff: 'Powiadomienia aplikacji są wyłączone: żaden alert ani plakietka nie poinformuje Cię o nowej wiadomości. Możesz je włączyć w Ustawieniach.',
        notifReglages: 'Otwórz Ustawienia' },
  tr: { notifActiver: 'Bu cihazda yeni mesajlardan beni haberdar et',
        notifOff: 'Uygulamanın bildirimleri kapalı: yeni bir mesajı size hiçbir uyarı veya rozet bildirmeyecek. Bildirimleri Ayarlar’dan açabilirsiniz.',
        notifReglages: 'Ayarlar’ı aç' },
};
