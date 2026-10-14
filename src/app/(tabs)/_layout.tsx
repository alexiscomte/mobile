// Barre d'onglets native (UITabBarController) : sur iOS 26 elle prend d'elle-même le matériau « Liquid Glass » et l'apparence
// claire / sombre du système ; aucune couleur de fond n'est imposée sur iOS (recommandation d'Apple : laisser le système dessiner
// les barres). Symboles SF : contour au repos, plein quand l'onglet est choisi.
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform } from 'react-native';

import { TEXTES } from '@/i18n';
import { useProfil } from '@/profil';
import { COULEURS } from '@/theme';

const IOS = Platform.OS === 'ios';

export default function Onglets() {
  const { langue } = useProfil();
  const T = TEXTES[langue];
  return (
    <NativeTabs
      backgroundColor={IOS ? undefined : COULEURS.fond}
      indicatorColor={IOS ? undefined : COULEURS.fondDoux}
      tintColor={COULEURS.primaire}
      labelStyle={IOS ? undefined : { selected: { color: COULEURS.primaire } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{T.accueil}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="astro">
        <NativeTabs.Trigger.Label>{T.astro}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'moon.stars', selected: 'moon.stars.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jeux">
        <NativeTabs.Trigger.Label>{T.jeux}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gamecontroller', selected: 'gamecontroller.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="infos">
        <NativeTabs.Trigger.Label>{T.infos}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="moi">
        <NativeTabs.Trigger.Label>{T.moi}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
