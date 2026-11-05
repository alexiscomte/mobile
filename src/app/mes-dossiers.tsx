// « Mes dossiers documentaires » (05/11/2026, specs/dossiers-premium.md) : dossiers achetés (sur toute plateforme) et dossiers inclus dans l'abonnement, lus depuis le compte.
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';

import { Ligne } from '@/components/carte';
import { Invitation } from '@/components/espace';
import { reprendre } from '@/dossier-achat';
import { lireMesDossiers, type MesDossiers } from '@/dossiers-api';
import { TEXTES9 } from '@/i18n9';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

export default function EcranMesDossiers() {
  const { langue, compte } = useProfil();
  const T = TEXTES9[langue];
  const router = useRouter();
  const [d, setD] = useState<MesDossiers | null | undefined>(undefined);
  useFocusEffect(useCallback(() => {
    let actif = true;
    if (!compte) { setD(null); return () => undefined; }
    reprendre().catch(() => 0).then(() => lireMesDossiers(langue)).then((x) => { if (actif) setD(x); }, () => { if (actif) setD({ ok: false, statut: 0, achetes: [], inclus: [] }); });
    return () => { actif = false; };
  }, [compte, langue]));
  const ouvrir = (slug: string) => router.push({ pathname: '/dossier', params: { slug } } as never);
  return (
    <>
      <Stack.Screen options={{ title: T.mesT }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {!compte ? <Invitation texte={T.connexion} lg={langue} /> : null}
        {compte && d === undefined ? <ActivityIndicator color={COULEURS.primaire} accessibilityLabel={T.charge} /> : null}
        {d && !d.ok ? <Text style={styles.err} accessibilityLiveRegion="polite">{T.erreur}</Text> : null}
        {d && d.ok && d.achetes.length ? <Text style={styles.sous} accessibilityRole="header">{T.mesAchetes}</Text> : null}
        {d && d.ok ? d.achetes.map((f) => <Ligne key={f.slug} titre={f.titre} sf="doc.text.fill" onPress={() => ouvrir(f.slug)} />) : null}
        {d && d.ok && d.inclus.length ? <Text style={styles.sous} accessibilityRole="header">{T.mesInclus}</Text> : null}
        {d && d.ok ? d.inclus.map((f) => <Ligne key={f.slug} titre={f.titre} sf="doc.text.fill" onPress={() => ouvrir(f.slug)} />) : null}
        {d && d.ok && !d.achetes.length && !d.inclus.length ? <Text style={styles.vide}>{T.mesVide}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 60 },
  sous: { fontSize: 18, fontWeight: '700', color: COULEURS.texte, marginTop: 14, marginBottom: 6 },
  vide: { fontSize: 15, color: COULEURS.texte, lineHeight: 21 },
  err: { fontSize: 15, color: COULEURS.coeur },
});
