// Nouveautés (ticket #162, 26/10/2026) : JOURNAL DES CHANGEMENTS de la dernière mise à jour du contenu, lu dans le manifeste en service
// (tableau « modifications » calculé par le site, outils/gen/app_manifeste.py) : pages ajoutées ou mises à jour dans la langue de l'appli,
// titres touchables (écran article natif). Tirer vers le bas, ou le bouton, vérifie les mises à jour tout de suite (en plus de la
// vérification quotidienne).
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bouton, F } from '@/components/form';
import { fmt } from '@/i18n';
import { TEXTES7 } from '@/i18n7';
import { nouveautes, type PageModifiee } from '@/maj/coeur';
import { manifesteCourant, mettreAJourContenu, surNouveauContenu } from '@/maj/depot';
import { ouvrirArticle } from '@/nav';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type Journal = { version: string; date: string; pages: PageModifiee[]; total: number } | null;

function jourLong(iso: string, lg: string): string {
  try { return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString(lg, { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
}

export default function Nouveautes() {
  const { langue } = useProfil();
  const T = TEXTES7[langue];
  const router = useRouter();
  const [journal, setJournal] = useState<Journal | undefined>(undefined);
  const [actualisation, setActualisation] = useState(false);
  const [message, setMessage] = useState('');

  const [version, setVersion] = useState(0);         // une mise à jour mise en service : le journal est relu
  useEffect(() => surNouveauContenu(() => setVersion((v) => v + 1)), []);
  useEffect(() => {
    let actif = true;
    manifesteCourant().catch(() => null).then((m) => { if (actif) setJournal(nouveautes(m, langue, 1)[0] || null); });
    return () => { actif = false; };
  }, [langue, version]);

  const verifier = useCallback(async () => {
    setActualisation(true);
    setMessage(T.verification);
    try {
      const r = await mettreAJourContenu();
      setMessage(r.telecharges ? fmt(T.recus, r.telecharges) : T.aJour);
      setVersion((v) => v + 1);
    } catch { setMessage(T.horsLigne); }
    setActualisation(false);
  }, [T]);

  return (
    <>
      <Stack.Screen options={{ title: T.nouveautes }} />
      <ScrollView contentContainerStyle={F.contenu}
        refreshControl={<RefreshControl refreshing={actualisation} onRefresh={verifier} tintColor={COULEURS.primaire} />}>
        <Text style={F.texte}>{T.intro}</Text>
        {journal === undefined ? null : journal ? (
          <>
            <Text style={styles.date} accessibilityRole="header">{fmt(T.majDu, jourLong(journal.date, langue))}</Text>
            {journal.pages.map((p) => (
              <Pressable key={p.url} onPress={() => ouvrirArticle(router, p.url)} accessibilityRole="link"
                accessibilityLabel={p.titre + ', ' + (p.type === 'ajout' ? T.ajout : T.modifiee)}
                style={({ pressed }) => [styles.ligne, pressed && F.presse]}>
                <View style={[styles.pastille, p.type === 'ajout' ? styles.pastilleAjout : null]}>
                  <Text style={[styles.pastilleTxt, p.type === 'ajout' ? styles.pastilleTxtAjout : null]}>{p.type === 'ajout' ? T.ajout : T.modifiee}</Text>
                </View>
                <Text style={styles.titre}>{p.titre}</Text>
                {p.sections && p.sections.length ? <Text style={styles.sections}>{fmt(T.sections, p.sections.join(' · '))}</Text> : null}
                {p.resume ? <Text style={styles.resume} numberOfLines={3}>{p.resume}</Text> : null}
              </Pressable>
            ))}
            {journal.total > journal.pages.length ? <Text style={F.muet}>{fmt(T.autres, journal.total - journal.pages.length)}</Text> : null}
          </>
        ) : <Text style={[F.muet, styles.vide]}>{T.aucune}</Text>}
        <View style={styles.bouton}><Bouton titre={T.verifier} secondaire disabled={actualisation} onPress={verifier} /></View>
        {message ? <Text style={[F.muet, styles.message]} accessibilityLiveRegion="polite">{message}</Text> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  date: { color: COULEURS.primaireFonce, fontSize: 17, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  ligne: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure, gap: 4 },
  pastille: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COULEURS.fondDoux },
  pastilleAjout: { backgroundColor: COULEURS.primairePlein },
  pastilleTxt: { fontSize: 12, fontWeight: '600', color: COULEURS.primaire },
  pastilleTxtAjout: { color: COULEURS.surPlein },
  titre: { color: COULEURS.secondaire, fontSize: 16, fontWeight: '600' },
  sections: { color: COULEURS.texte, fontSize: 14 },
  resume: { color: COULEURS.texteMuet, fontSize: 13, lineHeight: 18 },
  vide: { marginTop: 12 },
  bouton: { marginTop: 18 },
  message: { marginTop: 8, textAlign: 'center' },
});
