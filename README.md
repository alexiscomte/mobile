# AffectionPlus — application iOS (et Android)

Application mobile du site [affectionplus.com](https://affectionplus.com), 9 langues (fr en de es it pt nl pl tr).
Faite avec **Expo** (React Native, TypeScript, Expo Router), développée sous Windows : les versions iOS se
construisent dans le nuage d'Expo (EAS Build), sans Mac.

## Ce que fait l'application

- **Accueil** : bonjour + prénom, vos outils du jour (horoscope, question du jour à deux, compatibilité, jeu à deux,
  thème astral, biorythmes, sondages), « Par où commencer ? ».
- **Astro** : horoscope du jour, thème astral et ascendant, compatibilité, biorythmes, signe chinois, amour signe
  par signe, Lune, tarot, autres astrologies.
- **Jeux** : Nous connaissons-nous ?, la question du jour, les sondages, quiz et tests, mes scores.
- **Infos** : recherche dans toutes les pages du site (index `assets/search-<langue>.json`, gardé sur l'appareil
  24 h) et accès aux rubriques (Conseils, Santé, Sexualité, Astrologie, Pays).
- **Moi** : prénom, date et heure de naissance, langue, favoris, effacement des données.

Les outils et les articles sont les pages du site, affichées dans une vue web en **mode application**
(`?app=1` → `<html class="app">` : sans en-tête, pied, partage ni bandeau — `outils/gen/app_mode.py` côté site).
Le profil saisi dans l'application est injecté dans le stockage de la page (clé `ap.profil`, même forme que
`assets/js/espace.js`), et ce que le site apprend (lieu de naissance, favoris) revient dans l'application.
Rien n'est envoyé à un serveur : ni profil, ni favoris.

## Structure

```
src/app/                 écrans (Expo Router) : (tabs)/index|astro|jeux|infos|moi, page (vue web)
src/components/vue-site  vue web d'une page du site (injection, messages, liens externes, hors-ligne)
src/i18n.ts              textes de l'interface, 9 langues
src/catalogue.json       adresses et titres des pages du site par langue — écrit par outils/gen/app_catalogue.py
src/site.ts              adresses en mode application, scripts injectés
src/profil.tsx           profil, favoris, langue (AsyncStorage)
src/recherche.ts         index de recherche et recherche
src/theme.ts             couleurs du site
```

## Développer et tester (Windows)

Node 22 portable : `D:\dvt_git\Claude\outils\node\current` (à mettre en tête du PATH ; le Node 18 du système sert au site).

```bash
npx expo start
```

Puis, sur l'iPhone, l'application **Expo Go** (App Store, gratuite) : scanner le QR code affiché (même Wi-Fi).
Dans un navigateur : `npx expo start --web` (les pages du site s'affichent alors dans un iframe).

Vérifications : `npx tsc --noEmit` et `npx expo-doctor`.

## Construire pour l'App Store (sans Mac)

1. Compte Expo (gratuit) : `npx expo login`. Compte **Apple Developer Program** (99 $/an) : developer.apple.com.
2. `npx eas-cli build --platform ios --profile production` : EAS crée les certificats, construit dans le nuage et
   donne un lien vers le fichier `.ipa`.
3. `npx eas-cli submit --platform ios` : envoi sur App Store Connect ; puis TestFlight (test) et soumission à Apple.

Pour tester sur son propre iPhone sans App Store : `--profile preview` (build interne) puis installation par le lien.

Identifiant de l'application : `com.affectionplus.app` (app.json). Icône et écran de démarrage : `assets/images/`.

## Mettre à jour le catalogue des pages

Quand une page outil change d'adresse ou de titre sur le site :
`python D:\dvt_git\Claude\outils\gen\app_catalogue.py` puis commit ici.
