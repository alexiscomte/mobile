// Photo de profil et import depuis un réseau social (05/11/2026), comme assets/js/profil_photo.js du site ; API : profil_import_api.js.
// Compte connecté seulement. Rien n'entre dans le profil sans le geste du membre : la connexion par Google, Facebook, LinkedIn ou Snapchat dépose
// une proposition, le membre coche ce qu'il reprend. Moins de 15 ans : ni photo ni import (règle vérifiée par le serveur). Textes : ui.json profilPhoto.
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';

import { annoncerIOS } from '@/accessibilite';
import { api, compteActuel } from '@/compte';
import { connexionOidc } from '@/connexion';
import ui from '@/moteur/ui.json';
import { SITE } from '@/site';
import { COULEURS } from '@/theme';

type TX = Record<string, string>;
const UI_P = (ui as unknown as { profilPhoto: Record<string, TX> }).profilPhoto;
const NOMS: Record<string, string> = { google: 'Google', facebook: 'Facebook', linkedin: 'LinkedIn', snapchat: 'Snapchat', x: 'X' };
const COTE = 256, TAILLE_MAX = 180 * 1024;
// Sur iOS, Google passe seulement par le bouton natif de l'écran de connexion (règle 4.8, connexion.ts) : pas de raccourci ici.
const RESEAUX = Platform.OS === 'ios' ? ['facebook', 'linkedin', 'snapchat', 'x'] : ['google', 'facebook', 'linkedin', 'snapchat', 'x'];

type Proposition = { fournisseur: string; prenom: string; nom: string; photo: boolean };

function Bouton({ titre, onPress, plein, desactive, pile }: { titre: string; onPress: () => void; plein?: boolean; desactive?: boolean; pile?: boolean }) {
  const { fontScale } = useWindowDimensions();      // grand texte : un bouton par ligne, sans couper les mots
  return (
    <Pressable onPress={onPress} disabled={desactive} accessibilityRole="button" accessibilityState={{ disabled: !!desactive }}
      style={({ pressed }) => [styles.bouton, fontScale >= 1.3 && styles.boutonLarge, pile && styles.boutonPile, plein ? styles.boutonPlein : styles.boutonCreux, (pressed || desactive) && styles.presse]}>
      <Text style={plein ? styles.boutonPleinTxt : styles.boutonCreuxTxt}>{titre}</Text>
    </Pressable>
  );
}

/** Aperçu servi par notre serveur, sous session : jamais d'appel direct au réseau, jamais d'adresse publique. */
function ImageCompte({ chemin, cote, label, rendu, surEchec }: { chemin: string; cote: number; label?: string; rendu: number; surEchec?: () => void }) {
  const c = compteActuel();
  if (!c) return null;
  return (
    <Image source={{ uri: SITE + 'api/compte/' + chemin + (chemin.includes('?') ? '&' : '?') + 'v=' + rendu, headers: { Authorization: 'Bearer ' + c.session } }}
      cachePolicy="none" contentFit="cover" onError={surEchec} accessible={!!label} accessibilityLabel={label}
      style={{ width: cote, height: cote, borderRadius: cote / 2, backgroundColor: COULEURS.fondDoux }} />
  );
}

function CarteImport({ p, T, surFin, surErreur, rendu }: { p: Proposition; T: TX; surFin: (r: { prenom?: string; nom?: string; photo?: boolean }, reprise: boolean) => void; surErreur: (mineur: boolean) => void; rendu: number }) {
  const [choix, setChoix] = useState<Record<string, boolean>>({ prenom: true, nom: true, photo: true });
  const [occupe, setOccupe] = useState(false);
  const envoyer = async (champs: string[]) => {
    setOccupe(true);
    const r = await api('import', { fournisseur: p.fournisseur, champs });
    setOccupe(false);
    if (!r.ok) { surErreur(r.erreur === 'mineur'); return; }
    surFin(r as { prenom?: string; nom?: string; photo?: boolean }, champs.length > 0);
  };
  const lignes: [string, string][] = [];
  if (p.prenom) lignes.push(['prenom', T.prenom.replace('%s', p.prenom)]);
  if (p.nom) lignes.push(['nom', T.nom.replace('%s', p.nom)]);
  if (p.photo) lignes.push(['photo', T.photoCase]);
  return (
    <View style={styles.carte}>
      <Text style={styles.sousTitre} accessibilityRole="header">{T.depuis.replace('%s', NOMS[p.fournisseur] || p.fournisseur)}</Text>
      {lignes.map(([k, t]) => (
        <View key={k} style={styles.ligne}>
          {k === 'photo' ? <ImageCompte chemin={'import/photo?fournisseur=' + encodeURIComponent(p.fournisseur)} cote={48} rendu={rendu} /> : null}
          <Text style={styles.ligneTxt}>{t}</Text>
          <Switch value={!!choix[k]} accessibilityLabel={t} trackColor={{ true: COULEURS.secondaire }}
            onValueChange={(v) => setChoix((x) => ({ ...x, [k]: v }))} />
        </View>
      ))}
      <View style={styles.boutons}>
        <Bouton plein titre={T.reprendre} desactive={occupe} onPress={() => envoyer(lignes.map(([k]) => k).filter((k) => choix[k]))} />
        <Bouton titre={T.ignorer} desactive={occupe} onPress={() => envoyer([])} />
      </View>
    </View>
  );
}

export function ProfilPhoto({ langue, appliquer }: { langue: string; appliquer: (q: { prenom?: string; nom?: string }) => void }) {
  const T = UI_P[langue] || UI_P.fr;
  const [aPhoto, setAPhoto] = useState(true);   // une photo est supposée présente : l'image reçoit 404 sinon (voir relirePhoto)
  const [rendu, setRendu] = useState(0);
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [mineur, setMineur] = useState(false);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const dire = (s: string) => { setMessage(s); if (s) annoncerIOS(s); };

  const relire = useCallback(async () => {
    const r = await api('import', undefined, 'GET');
    if (r.ok) {
      setMineur(!!r.mineur);
      setPropositions(Array.isArray(r.propositions) ? (r.propositions as Proposition[]) : []);
    }
  }, []);
  // La présence d'une photo se lit sur la réponse de l'image : un compte sans photo reçoit 404.
  const relirePhoto = useCallback(() => { setAPhoto(true); setRendu((n) => n + 1); }, []);
  // première lecture au montage ; l'image se charge d'elle-même au premier rendu (aPhoto vrai, rendu 0) ; drapeau : réponse ignorée si l'écran est déjà quitté
  useEffect(() => {
    let actif = true;
    api('import', undefined, 'GET').then((r) => {
      if (!actif || !r.ok) return;
      setMineur(!!r.mineur);
      setPropositions(Array.isArray(r.propositions) ? (r.propositions as Proposition[]) : []);
    }, () => undefined);
    return () => { actif = false; };
  }, []);

  const choisir = async () => {
    dire('');
    const res = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (res.canceled || !res.assets || !res.assets[0]) return;
    const a = res.assets[0];
    setOccupe(true);
    try {
      const cote = Math.min(a.width, a.height);
      const actions = [{ crop: { originX: Math.floor((a.width - cote) / 2), originY: Math.floor((a.height - cote) / 2), width: cote, height: cote } }, { resize: { width: COTE, height: COTE } }];
      let m = await manipulateAsync(a.uri, actions, { compress: 0.85, format: SaveFormat.JPEG, base64: true });
      if ((m.base64 || '').length * 0.75 > TAILLE_MAX) m = await manipulateAsync(a.uri, actions, { compress: 0.6, format: SaveFormat.JPEG, base64: true });
      const r = await api('photo', { image: 'data:image/jpeg;base64,' + (m.base64 || '') });
      if (r.ok) { relirePhoto(); relire(); dire(T.ok); }
      else dire(r.erreur === 'mineur' ? T.mineur : r.erreur === 'image' || r.erreur === 'taille' ? T.image : T.ko);
    } catch {
      dire(T.image);
    } finally {
      setOccupe(false);
    }
  };
  const retirer = async () => {
    setOccupe(true);
    const r = await api('photo/supprimer', {});
    setOccupe(false);
    if (r.ok) { setAPhoto(false); dire(T.ok); relire(); } else dire(T.ko);
  };
  const connecter = async (f: string) => {
    dire('');
    const issue = await connexionOidc(langue, f === 'google' ? undefined : f);   // session éphémère : on repasse toujours par le réseau
    if (issue === 'ok') { relire(); relirePhoto(); } else if (issue === 'echec') dire(T.ko);
  };

  if (mineur) return <Text style={styles.message}>{T.mineur}</Text>;
  return (
    <View style={styles.bloc}>
      <Text style={styles.titre} accessibilityRole="header">{T.photo}</Text>
      <View style={styles.ligneAvatar}>
        {aPhoto
          ? <ImageCompte chemin="photo" cote={96} rendu={rendu} label={T.imgAlt} surEchec={() => setAPhoto(false)} />
          : <View style={styles.avatarVide} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />}
        <View style={styles.boutonsAvatar}>
          <Bouton pile titre={aPhoto ? T.changer : T.ajouter} desactive={occupe} onPress={choisir} />
          {aPhoto ? <Bouton pile titre={T.retirer} desactive={occupe} onPress={retirer} /> : null}
        </View>
      </View>
      {propositions.map((p) => (
        <CarteImport key={p.fournisseur} p={p} T={T} rendu={rendu}
          surErreur={(min) => dire(min ? T.mineur : T.ko)}
          surFin={(r, reprise) => {
            const q: { prenom?: string; nom?: string } = {};
            if (r.prenom) q.prenom = r.prenom;
            if (r.nom) q.nom = r.nom;
            if (Object.keys(q).length) appliquer(q);
            if (r.photo) relirePhoto();
            setPropositions((l) => l.filter((x) => x.fournisseur !== p.fournisseur));
            if (reprise) dire(T.ok);
          }} />
      ))}
      <Text style={styles.sousTitre} accessibilityRole="header">{T.importTitre}</Text>
      <Text style={styles.aide}>{T.importTexte}</Text>
      <View style={styles.boutons}>
        {RESEAUX.map((f) => <Bouton key={f} titre={NOMS[f]} onPress={() => connecter(f)} />)}
      </View>
      {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { marginBottom: 8, padding: 14, borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 12 },
  titre: { fontSize: 17, fontWeight: '700', color: COULEURS.texte, marginBottom: 10 },
  sousTitre: { fontSize: 15, fontWeight: '700', color: COULEURS.texte, marginTop: 14, marginBottom: 6 },
  ligneAvatar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 },
  avatarVide: { width: 96, height: 96, borderRadius: 48, backgroundColor: COULEURS.fondDoux, borderWidth: 1, borderColor: COULEURS.bordure },
  boutonsAvatar: { flexGrow: 1, flexBasis: 170, gap: 8 },
  carte: { marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COULEURS.primairePlein, backgroundColor: COULEURS.fondDoux },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  ligneTxt: { flex: 1, fontSize: 15, color: COULEURS.texte },
  boutons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  bouton: { flexGrow: 1, flexBasis: 130, minHeight: 44, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  boutonLarge: { flexBasis: '100%' },
  boutonPile: { flexGrow: 0, flexBasis: 'auto' },
  boutonPlein: { backgroundColor: COULEURS.primairePlein },
  boutonCreux: { borderWidth: 1, borderColor: COULEURS.primairePlein },
  boutonPleinTxt: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  boutonCreuxTxt: { color: COULEURS.primaire, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  presse: { opacity: 0.6 },
  aide: { color: COULEURS.texteMuet, fontSize: 14, lineHeight: 19 },
  message: { color: COULEURS.texte, marginTop: 10 },
});
