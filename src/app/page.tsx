// Une page du site, en mode application, par-dessus les onglets : titre dans la barre, partage, retour dans l'historique de la vue web.
// Partage (09/10/2026) : l'icône « partager » du site (components/pouce.tsx IconePartage) en haut de l'écran, dans la barre de titre, ouvre le
// partage natif ; la page du site garde en haut son pouce (barre du fil d'Ariane) et cache son propre bouton de partage en mode application.
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet } from 'react-native';

import { IconePartage } from '@/components/pouce';
import { VueSite, type VueSiteRef } from '@/components/vue-site';
import { TEXTES } from '@/i18n';
import { useProfil } from '@/profil';
import { SITE, urlPropre } from '@/site';

export default function PageSite() {
  const { url, titre, apres } = useLocalSearchParams<{ url?: string; titre?: string; apres?: string }>();
  const { langue } = useProfil();
  const T = TEXTES[langue];
  const router = useRouter();
  const navigation = useNavigation();
  const vue = useRef<VueSiteRef>(null);
  const [titreVue, setTitreVue] = useState(titre || '');
  const [urlCourante, setUrlCourante] = useState(url || SITE);
  const peutRevenir = useRef(false);

  // bouton retour de la barre : d'abord l'historique de la vue web, puis l'écran précédent
  useEffect(() => {
    const retirer = navigation.addListener('beforeRemove', (e) => {
      if (peutRevenir.current && vue.current && vue.current.revenir()) e.preventDefault();
    });
    return retirer;
  }, [navigation]);

  const partager = useCallback(() => {
    const u = urlPropre(urlCourante);
    Share.share(Platform.OS === 'ios' ? { url: u, message: titreVue } : { message: titreVue + ' ' + u }).catch(() => undefined);
  }, [urlCourante, titreVue]);

  if (!url) { router.back(); return null; }
  return (
    <>
      <Stack.Screen
        options={{
          title: titreVue,
          headerRight: () => (
            <Pressable onPress={partager} accessibilityRole="button" accessibilityLabel={T.partagerPage} hitSlop={10} style={styles.partager}>
              <IconePartage taille={21} />
            </Pressable>
          ),
        }}
      />
      <VueSite
        ref={vue}
        url={url}
        apres={apres}
        onTitre={setTitreVue}
        onNavigation={(peut, u) => { peutRevenir.current = peut; setUrlCourante(u); }}
      />
    </>
  );
}

const styles = StyleSheet.create({ partager: { paddingHorizontal: 4, paddingVertical: 2 } });
