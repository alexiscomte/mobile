// Changer mon mot de passe (07/10/2026 nuit, cahier specs/espace-membre-retouches-0710.md, décisions 4 et 7), comme la page du site
// fr/mot-de-passe.html… (compte.js monterMdp) et par la même route (POST /api/compte/mot-de-passe, compte.ts changerMdp). Le compte a un
// mot de passe (ap.compte.mdp) : « Mot de passe actuel », « Nouveau mot de passe », « Confirmer le nouveau mot de passe » ; sinon (compte
// créé avec Google ou avec un code) une phrase l'explique et seuls les deux champs du nouveau sont demandés. Sans compte : invitation à
// se connecter. Contrôles avant envoi : actuel vide, moins de 8 caractères, confirmation différente (le champ fautif reçoit le focus).
// Réponses du serveur : actuel faux (champ vidé ; s'il n'était pas affiché, le compte a reçu un mot de passe ailleurs : l'écran l'ajoute),
// court, trop (5 essais faux par heure et par compte, 10 par adresse IP), session expirée (compte oublié, invitation). Textes : ui.json
// compte (compte.js) et espacePages.mdp (chapeau de la page du site).
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { PAGES_ESPACE } from '@/components/espace';
import { F, Label } from '@/components/form';
import { focaliser } from '@/components/mon-compte';
import { changerMdp, noterMdp, oublierSession } from '@/compte';
import { AVEC_OIDC, connexionOidc } from '@/connexion';
import ui from '@/moteur/ui.json';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_C = (ui as unknown as { compte: Record<string, TX> }).compte;
type Champ = 'actuel' | 'nouveau' | 'confirme';

export default function MotDePasse() {
  const { langue, compte } = useProfil();
  const router = useRouter();
  const t = UI_C[langue] || UI_C.fr;
  const P = (PAGES_ESPACE.mdp || {})[langue] || (PAGES_ESPACE.mdp || {}).fr;
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirme, setConfirme] = useState('');
  const [voir, setVoir] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [fautif, setFautif] = useState<Champ | null>(null);
  const refs = { actuel: useRef<TextInput>(null), nouveau: useRef<TextInput>(null), confirme: useRef<TextInput>(null) };
  const refMsg = useRef<Text>(null);
  const avec = !!(compte && compte.mdp);
  const session = compte ? compte.session : '';

  // autre session (connexion, déconnexion, session expirée) : formulaire vidé
  useEffect(() => { setActuel(''); setNouveau(''); setConfirme(''); setFautif(null); }, [session]);

  const dire = (texte: string, ok: boolean, champ?: Champ) => {
    setMsg({ t: texte, ok });
    setFautif(champ || null);
    if (champ) setTimeout(() => refs[champ].current?.focus(), 30);
    else if (ok) setTimeout(() => focaliser(refMsg.current), 50);
  };

  const enregistrer = async () => {
    if (occupe) return;
    if (avec && !actuel) { dire(t.mdpActuelVide, false, 'actuel'); return; }
    if (nouveau.length < 8) { dire(t.mdpCourt, false, 'nouveau'); return; }
    if (nouveau !== confirme) { dire(t.mdpDiff, false, 'confirme'); return; }
    setOccupe(true); setFautif(null); setMsg({ t: '…', ok: true });
    const j = await changerMdp(avec ? actuel : '', nouveau);
    setOccupe(false);
    if (j.ok) { setActuel(''); setNouveau(''); setConfirme(''); dire(t.mdpOk, true); return; }
    if (j.statut === 401 && j.erreur !== 'actuel') { setMsg(null); await oublierSession(session); return; }   // session expirée : invitation
    if (j.erreur === 'actuel') {
      if (!avec) { await noterMdp(); dire(t.mdpActuelVide, false, 'actuel'); return; }   // mot de passe posé ailleurs : le champ apparaît
      setActuel(''); dire(t.mdpActuelKo, false, 'actuel'); return;
    }
    if (j.erreur === 'court') { dire(t.mdpCourt, false, 'nouveau'); return; }
    dire(j.erreur === 'trop' ? t.mdpTrop : t.reseau, false);
  };

  const seConnecter = async () => {
    if (!AVEC_OIDC) { router.push('/compte'); return; }   // aperçu web : pas de service commun, l'écran du compte
    const r = await connexionOidc(langue);
    if (r === 'echec') setMsg({ t: t.oidcKo, ok: false });
  };

  const champ = (c: Champ, label: string, valeur: string, changer: (v: string) => void, auto: 'current-password' | 'new-password', aide?: string) => (
    <View key={c}>
      <Label>{label}</Label>
      <TextInput ref={refs[c]} style={[F.entree, fautif === c && styles.fautif]} value={valeur} onChangeText={(v) => { changer(v); if (fautif === c) setFautif(null); }}
        secureTextEntry={!voir} autoCapitalize="none" autoCorrect={false} maxLength={200} editable={!occupe}
        autoComplete={auto} textContentType={auto === 'current-password' ? 'password' : 'newPassword'}
        passwordRules={auto === 'new-password' ? 'minlength: 8;' : undefined}
        accessibilityLabel={label} accessibilityHint={aide}
        returnKeyType={c === 'confirme' ? 'done' : 'next'}
        onSubmitEditing={() => { if (c === 'confirme') enregistrer(); else refs[c === 'actuel' ? 'nouveau' : 'confirme'].current?.focus(); }} />
      {aide ? <Text style={[F.muet, styles.aide]}>{aide}</Text> : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: t.mdpChanger }} />
      <ScrollView contentContainerStyle={F.contenu} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        {P ? <Text style={styles.lead}>{P.lead}</Text> : null}
        {!compte ? (
          <View>
            <Text style={F.texte}>{t.mdpInvite}</Text>
            <Pressable style={({ pressed }) => [F.bouton, pressed && F.presse]} onPress={() => { seConnecter(); }} accessibilityRole="button">
              <Text style={F.boutonTxt}>{t.seConnecter}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {avec ? null : <Text style={[F.texte, styles.sans]}>{t.mdpSans}</Text>}
            {avec ? champ('actuel', t.mdpActuel, actuel, setActuel, 'current-password') : null}
            {champ('nouveau', t.mdpNouveau, nouveau, setNouveau, 'new-password', t.mdpAide)}
            {champ('confirme', t.mdpConfirmer, confirme, setConfirme, 'new-password')}
            <View style={styles.voir}>
              <Switch value={voir} onValueChange={setVoir} trackColor={{ true: COULEURS.secondaire }} accessibilityLabel={t.mdpVoir} />
              <Text style={styles.voirTxt} onPress={() => setVoir(!voir)}>{t.mdpVoir}</Text>
            </View>
            <Pressable disabled={occupe} style={({ pressed }) => [F.bouton, (pressed || occupe) && F.presse]} onPress={() => { enregistrer(); }}
              accessibilityRole="button" accessibilityState={{ disabled: occupe }}>
              <Text style={F.boutonTxt}>{t.mdpEnregistrer}</Text>
            </Pressable>
            {occupe ? <ActivityIndicator color={COULEURS.primaire} style={styles.attente} /> : null}
          </View>
        )}
        {msg && msg.t !== '…' ? (
          <Text ref={refMsg} style={[styles.msg, { color: msg.ok ? COULEURS.vert : COULEURS.coeur }]} accessibilityLiveRegion="polite"
            accessibilityRole={msg.ok ? undefined : 'alert'}>{msg.t}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 17, lineHeight: 24, color: COULEURS.texteMuet, marginBottom: 10 },
  sans: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12 },
  fautif: { borderWidth: 1, borderColor: COULEURS.coeur },
  aide: { marginTop: 4 },
  voir: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  voirTxt: { color: COULEURS.texte, fontSize: 15, flex: 1 },
  attente: { marginTop: 12 },
  msg: { marginTop: 14, fontSize: 15, lineHeight: 21 },
});
