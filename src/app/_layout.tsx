import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';

import { TEXTES } from '@/i18n';
import { ProfilProvider, useProfil } from '@/profil';
import { COULEURS } from '@/theme';

SplashScreen.preventAutoHideAsync();

const THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: COULEURS.primaire, background: COULEURS.fond, card: COULEURS.fond, text: COULEURS.texte, border: COULEURS.bordure },
};

function Pile() {
  const { pret, langue } = useProfil();
  const T = TEXTES[langue];
  useEffect(() => { if (pret) SplashScreen.hideAsync(); }, [pret]);
  if (!pret) return null;
  return (
    <Stack screenOptions={{ headerTintColor: COULEURS.primaire, headerTitleStyle: { color: COULEURS.texte, fontWeight: '600' }, headerBackTitle: T.retour }}>
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
      <Stack.Screen name="newsletter" options={{ title: T.newsletter }} />
      <Stack.Screen name="compte" options={{ title: '' }} />
      <Stack.Screen name="mes-compat" options={{ title: '' }} />
      <Stack.Screen name="mes-infos" options={{ title: '' }} />
      <Stack.Screen name="favoris" options={{ title: '' }} />
      <Stack.Screen name="messages" options={{ title: '' }} />
      <Stack.Screen name="astrologie" options={{ title: '' }} />
      <Stack.Screen name="outils" options={{ title: '' }} />
      <Stack.Screen name="connexions" options={{ title: '' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ProfilProvider>
      <ThemeProvider value={THEME}>
        <StatusBar style="dark" />
        <Pile />
      </ThemeProvider>
    </ProfilProvider>
  );
}
