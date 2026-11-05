// Écran d'un dossier documentaire (05/11/2026, specs/dossiers-premium.md), 9 langues : présentation (livrables réellement disponibles), achat à l'unité par la boutique de l'appareil ou abonnement
// (écran de l'annuaire, achat intégré) ; téléchargement direct pour qui a le droit. Aucun lien vers un paiement extérieur (App Store 3.1.1, Google Play). Le droit est relu au serveur à chaque ouverture.
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Invitation } from '@/components/espace';
import { Bouton } from '@/components/form';
import { oublierSession } from '@/compte';
import { ACHAT_POSSIBLE, acheter, lirePrix, ouvrirAchats, reprendre, type Resultat } from '@/dossier-achat';
import { demanderUrl, lireAcces, lireFiche, type Acces, type Fiche, type Livrable } from '@/dossiers-api';
import { TEXTES9, type T9 } from '@/i18n9';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

const taille = (o: number, T: T9) => (o >= 1e9 ? (o / 1e9).toFixed(1) + ' ' + T.goT : o >= 1e6 ? Math.round(o / 1e6) + ' ' + T.moT : Math.max(1, Math.round(o / 1e3)) + ' ' + T.koT);
const libre = (T: T9, type: string, s = '') => (T as Record<string, string>)[type + s] || (s ? '' : T.autre);
const nomLangue = (code: string, lg: string) => { try { return new Intl.DisplayNames([lg], { type: 'language' }).of(code) || code; } catch { return code; } };
const BOUTIQUE = Platform.OS === 'android' ? 'Google Play' : 'App Store';

export default function EcranDossier() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { langue, compte } = useProfil();
  const T = TEXTES9[langue];
  const router = useRouter();
  const [fiche, setFiche] = useState<Fiche | null | undefined>(undefined);
  const [acces, setAcces] = useState<Acces | null>(null);
  const [prix, setPrix] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  const charger = useCallback(async () => {
    const f = await lireFiche(String(slug || ''), langue);
    setFiche(f.fiche);
    if (!f.fiche) { setMsg({ t: f.statut === 404 ? T.indispo : T.erreur, err: f.statut !== 404 }); return; }
    if (compte) {
      await reprendre().catch(() => 0);                           // achat payé mais pas encore enregistré
      const a = await lireAcces(f.fiche.slug);
      setAcces(a);
    } else setAcces(null);
  }, [slug, langue, compte, T]);
  useFocusEffect(useCallback(() => { let actif = true; charger().catch(() => { if (actif) setMsg({ t: T.erreur, err: true }); }); return () => { actif = false; }; }, [charger, T]));

  // à chaque retour sur l'écran : l'écran de l'annuaire ferme la connexion commune à la boutique en se fermant
  useFocusEffect(useCallback(() => {
    let fermer: () => void = () => undefined, actif = true;
    if (ACHAT_POSSIBLE && compte) {
      ouvrirAchats((r: Resultat) => {
        setOccupe(false);
        if (r === 'enregistre') { setMsg({ t: T.confirme }); charger().catch(() => undefined); }
        else if (r === 'attente') { setMsg({ t: T.attente }); charger().catch(() => undefined); }
        else setMsg({ t: T.enregistrer, err: true });
      }, () => { setOccupe(false); setMsg({ t: T.erreur, err: true }); }, () => { setOccupe(false); })
        .then((f) => {
          if (actif) { fermer = f; lirePrix().then((p) => { if (actif) setPrix(p); }, () => undefined); } else f();
        }, () => undefined);
    }
    return () => { actif = false; fermer(); };
  }, [compte, charger, T]));

  const payer = async () => {
    if (!fiche) return;
    setOccupe(true); setMsg(null);
    try {
      const r = await acheter(fiche.slug, langue);
      if (r === 'deja') { setOccupe(false); await charger(); }
      else if (r === 'session') { setOccupe(false); if (compte) await oublierSession(compte.session); setMsg({ t: T.session, err: true }); }
      else if (r === 'bloque') { setOccupe(false); setMsg({ t: T.enregistrer, err: true }); }
      else if (r === 'erreur') { setOccupe(false); setMsg({ t: T.achatImpossible, err: true }); }
    } catch (e) {
      setOccupe(false);
      if ((e as { code?: string })?.code !== 'user-cancelled') setMsg({ t: T.achatImpossible, err: true });   // annulation : aucun message
    }
  };
  const telecharger = async (l: Livrable) => {
    if (!fiche) return;
    setOccupe(true); setMsg({ t: T.prepare });
    try {
      const r = await demanderUrl(fiche.slug, l.id);
      if (r.statut === 403) { setOccupe(false); setMsg(null); await charger(); return; }   // droit perdu : l'écran relit le vrai état
      if (r.ok && r.url) {
        if (Platform.OS === 'android') await Linking.openURL(r.url); else await WebBrowser.openBrowserAsync(r.url);   // URL temporaire : Safari affiche ou enregistre, Android télécharge
        setMsg({ t: T.commence });
      } else setMsg({ t: r.erreur === 'quota' ? T.quota : r.statut === 429 ? T.trop : r.statut === 401 ? T.session : r.statut === 404 ? T.fichierIndispo : T.erreurDl, err: true });
    } catch { setMsg({ t: T.erreurDl, err: true }); }
    setOccupe(false);
  };

  const autorise = acces?.etat === 'achete' || acces?.etat === 'abonne';
  return (
    <>
      <Stack.Screen options={{ title: T.bouton }} />
      <ScrollView contentContainerStyle={styles.contenu}>
        {fiche === undefined ? <ActivityIndicator color={COULEURS.primaire} accessibilityLabel={T.charge} /> : null}
        {msg ? <Text style={[styles.msg, msg.err && styles.err]} accessibilityLiveRegion="polite">{msg.t}</Text> : null}
        {fiche ? (
          <View>
            <Text style={styles.titre} accessibilityRole="header">{fiche.titre}</Text>
            {fiche.langue !== langue ? <Text style={styles.note}>{T.langueAutre.replace('%s', nomLangue(fiche.langue, langue))}</Text> : null}
            {fiche.description ? <Text style={styles.texte}>{fiche.description}</Text> : null}
            <Text style={styles.sous} accessibilityRole="header">{autorise ? T.telecharger : T.contenu}</Text>
            {autorise ? <Text style={styles.note}>{acces?.etat === 'achete' ? T.achete : T.abonne}</Text> : null}
            {fiche.livrables.map((l) => (
              <View key={l.id} style={styles.livrable}>
                <Text style={styles.nom}>{libre(T, l.type)}</Text>
                {libre(T, l.type, 'D') ? <Text style={styles.texte}>{libre(T, l.type, 'D')}</Text> : null}
                <Text style={styles.note}>{l.format.toUpperCase() + ' · ' + taille(l.taille, T)}</Text>
                {autorise ? <Bouton titre={T.tel1} disabled={occupe} label={T.tel1 + ' : ' + libre(T, l.type)} onPress={() => { telecharger(l); }} /> : null}
              </View>
            ))}
            {!autorise ? (
              <View>
                {acces?.etat === 'attente' ? <Text style={styles.msg}>{T.attente}</Text> : null}
                {acces?.etat === 'echec' ? <Text style={[styles.msg, styles.err]}>{T.echec}</Text> : null}
                {acces?.rembourse ? <Text style={styles.msg}>{T.rembourse}</Text> : null}
                {acces?.abonnementExpire ? <Text style={styles.msg}>{T.expire}</Text> : null}
                {acces?.etat !== 'attente' ? (
                  <View>
                    <Text style={styles.sous} accessibilityRole="header">{T.choix}</Text>
                    <View style={styles.offre}>
                      <Text style={styles.nom}>{T.acheterT.replace('%s', prix || '1 €')}</Text>
                      {[T.achat1, T.achat2, T.achat3, T.achat4].map((x) => <Text key={x} style={styles.point}>{'• ' + x}</Text>)}
                      {compte ? (
                        <View>
                          <Bouton titre={T.acheter + (prix ? ' — ' + prix : '')} disabled={occupe || !ACHAT_POSSIBLE || !prix} onPress={() => { payer(); }} />
                          <Text style={styles.note}>{T.boutique.replace('%s', BOUTIQUE)}</Text>
                          {!prix && ACHAT_POSSIBLE ? <Text style={styles.note}>{T.achatImpossible}</Text> : null}
                        </View>
                      ) : <Invitation texte={T.connexion} lg={langue} apres={() => { charger().catch(() => undefined); }} />}
                    </View>
                    <View style={styles.offre}>
                      <Text style={styles.nom}>{T.aboT}</Text>
                      {[T.abo1, T.abo2, T.abo3, T.abo4].map((x) => <Text key={x} style={styles.point}>{'• ' + x}</Text>)}
                      <Bouton titre={T.aboVoir} secondaire onPress={() => router.push('/annuaire' as never)} />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.note}>{T.avert}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contenu: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 60 },
  titre: { fontSize: 22, fontWeight: '700', color: COULEURS.texte, marginBottom: 8 },
  sous: { fontSize: 18, fontWeight: '700', color: COULEURS.texte, marginTop: 18, marginBottom: 6 },
  texte: { fontSize: 15, color: COULEURS.texte, lineHeight: 21 },
  note: { fontSize: 13, color: COULEURS.texteMuet, marginTop: 4, lineHeight: 18 },
  nom: { fontSize: 16, fontWeight: '600', color: COULEURS.texte, marginBottom: 2 },
  point: { fontSize: 15, color: COULEURS.texte, lineHeight: 22 },
  livrable: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COULEURS.bordure },
  offre: { backgroundColor: COULEURS.fondDoux, borderRadius: 14, padding: 14, marginTop: 10 },
  msg: { fontSize: 15, color: COULEURS.texte, backgroundColor: COULEURS.fondDoux, borderRadius: 10, padding: 10, marginVertical: 8 },
  err: { color: COULEURS.coeur },
});
