// Mon historique de connexion (espace membre, 07/10/2026 soir ; cahier specs/espace-membre-reduit-0710.md, point 4), comme la page du
// site fr/mes-connexions.html… (messages.js historique) : date, pays (déduit de l'adresse IP) et navigateur des dernières connexions du
// compte (GET /api/compte/historique). Jamais l'adresse IP ni le VPN pour un membre : le serveur ne les envoie qu'à l'admin.
// Sans compte : invitation à se connecter. Alerte (texte du site, 07/10/2026 nuit) : une connexion inconnue → [Changez votre mot de
// passe], lien vers l'écran « Changer mon mot de passe » (/mot-de-passe). Écran ouvert depuis une carte de « Mes outils » (plus dans le menu).
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';

import { Invitation, ListeConnexions, PAGES_ESPACE, TexteCrochet, UI_E, UI_M } from '@/components/espace';
import { F } from '@/components/form';
import { oublierSession } from '@/compte';
import { historique, type Connexion } from '@/messages';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

export default function MesConnexions() {
  const { langue, compte } = useProfil();
  const router = useRouter();
  const t = UI_M[langue] || UI_M.fr, E = UI_E[langue] || UI_E.fr;
  const P = PAGES_ESPACE.connexions[langue] || PAGES_ESPACE.connexions.fr;
  const [etat, setEtat] = useState<{ liste: Connexion[]; admin: boolean } | null>(null);
  const [msg, setMsg] = useState('');
  const session = compte ? compte.session : '';

  const charger = useCallback(async () => {
    if (!session) { setEtat(null); return; }
    setMsg(''); setEtat(null);
    const j = await historique();
    if (j.statut === 401) { await oublierSession(session); return; }
    if (!j.ok) { setMsg(j.erreur === 'trop' ? t.errTrop : t.errReseau); return; }
    setEtat({ liste: j.connexions, admin: j.admin });
  }, [session, t]);
  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  return (
    <>
      <Stack.Screen options={{ title: E.ongConnexions }} />
      <ScrollView contentContainerStyle={F.contenu}>
        <Text style={styles.lead}>{P.lead}</Text>
        {!compte ? <Invitation texte={t.histConnecter} lg={langue} /> : (
          <>
            {etat === null && !msg ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
            {msg ? <Text style={styles.statut}>{msg}</Text> : null}
            {etat ? <ListeConnexions liste={etat.liste} admin={etat.admin} lg={langue} /> : null}
            {P.alerte ? <TexteCrochet texte={P.alerte} onPress={() => router.push('/mot-de-passe')} style={styles.note} /> : null}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 24, color: COULEURS.texteMuet, marginBottom: 10 },
  attente: { marginTop: 14 },
  statut: { marginTop: 10, color: COULEURS.primaireFonce, fontWeight: '600' },
  note: { marginTop: 16, fontSize: 14, color: COULEURS.texteMuet },
});
