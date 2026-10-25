// Données des écrans mises à jour sans nouvelle version (#162) : appliquées AVANT tout autre module de l'appli (premier import).
import '@/maj/donnees';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { TEXTES } from '@/i18n';
import { majArrierePlan } from '@/moteur/contenu';
import { ProfilProvider, useProfil } from '@/profil';
import { COULEURS, useCouleurs } from '@/theme';

SplashScreen.preventAutoHideAsync();


function Pile() {
  const { pret, langue } = useProfil();
  const T = TEXTES[langue];
  useEffect(() => { if (pret) SplashScreen.hideAsync(); }, [pret]);
  // tout le contenu est embarqué dans l'appli : le réseau ne sert qu'à la mise à jour, discrète, une fois par jour
  useEffect(() => { if (pret) majArrierePlan(langue); }, [pret, langue]);
  // retour au premier plan : même vérification (au plus une fois par jour), pour que le contenu du site arrive le lendemain sans relancer
  useEffect(() => {
    const s = AppState.addEventListener('change', (e) => { if (e === 'active' && pret) majArrierePlan(langue); });
    return () => s.remove();
  }, [pret, langue]);
  if (!pret) return null;
  return (
    // en-têtes natifs (UINavigationBar) : titre au centre, retour avec le titre de l'écran précédent ou « Retour », balayage depuis le
    // bord gauche pour revenir ; aucune couleur de fond imposée (Liquid Glass sur iOS 26), teinte de la marque pour les boutons
    <Stack screenOptions={{ headerTintColor: COULEURS.primaire, headerTitleStyle: { color: COULEURS.texte, fontWeight: '600' }, headerBackTitle: T.retour, contentStyle: { backgroundColor: COULEURS.fond } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="page" options={{ title: '', headerBackTitle: T.retour }} />
      <Stack.Screen name="horoscope" options={{ title: T.horoscopeDuJour }} />
      <Stack.Screen name="biorythme" options={{ title: '' }} />
      <Stack.Screen name="qdj" options={{ title: T.questionDuJour }} />
      <Stack.Screen name="sondages" options={{ title: '' }} />
      <Stack.Screen name="jeu2" options={{ title: '' }} />
      <Stack.Screen name="quiz" options={{ title: '' }} />
      <Stack.Screen name="theme" options={{ title: '' }} />
      <Stack.Screen name="article" options={{ title: '' }} />
      <Stack.Screen name="chinois" options={{ title: '' }} />
      <Stack.Screen name="lune" options={{ title: '' }} />
      <Stack.Screen name="ovulation" options={{ title: '' }} />
      <Stack.Screen name="compteur" options={{ title: '' }} />
      <Stack.Screen name="compat" options={{ title: '' }} />
      <Stack.Screen name="signes" options={{ title: '' }} />
      <Stack.Screen name="autres" options={{ title: '' }} />
      <Stack.Screen name="epoux" options={{ title: '' }} />
      <Stack.Screen name="garde" options={{ title: '' }} />
      <Stack.Screen name="maternite" options={{ title: '' }} />
      <Stack.Screen name="callisthenie" options={{ title: '' }} />
      <Stack.Screen name="distance" options={{ title: '' }} />
      <Stack.Screen name="pension" options={{ title: '' }} />
      <Stack.Screen name="newsletter" options={{ title: T.newsletter }} />
      <Stack.Screen name="compte" options={{ title: '' }} />
      <Stack.Screen name="mes-compat" options={{ title: '' }} />
      <Stack.Screen name="mes-infos" options={{ title: '' }} />
      <Stack.Screen name="favoris" options={{ title: '' }} />
      <Stack.Screen name="outils" options={{ title: '' }} />
      <Stack.Screen name="connexions" options={{ title: '' }} />
      <Stack.Screen name="mot-de-passe" options={{ title: '' }} />
      <Stack.Screen name="nouveautes" options={{ title: '' }} />
      <Stack.Screen name="fiche" options={{ title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // mode clair / sombre : suit le réglage de l'iPhone (app.json userInterfaceStyle = automatic) ; le thème de la navigation veut des
  // chaînes, d'où useCouleurs() ici (les écrans, eux, utilisent les couleurs dynamiques de COULEURS)
  const c = useCouleurs();
  const theme = useMemo(() => {
    const base = c.sombre ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: c.primaire, background: c.fond, card: c.fond, text: c.texte, border: c.bordure } };
  }, [c.sombre]);   // eslint-disable-line react-hooks/exhaustive-deps
  // fond de la vue racine (visible pendant les transitions et sous le clavier) : noir en mode sombre, sinon blanc
  useEffect(() => { SystemUI.setBackgroundColorAsync(c.fond).catch(() => undefined); }, [c.fond]);
  return (
    <ProfilProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <Pile />
      </ThemeProvider>
    </ProfilProvider>
  );
}
