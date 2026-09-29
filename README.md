# AffectionPlus — application iOS (et Android)

Application mobile du site [affectionplus.com](https://affectionplus.com), 9 langues (fr en de es it pt nl pl tr).
Faite avec **Expo** (React Native, TypeScript, Expo Router), développée sous Windows : les versions iOS se
construisent dans le nuage d'Expo (EAS Build), sans Mac.

## Ce que fait l'application

- **Accueil** : bonjour + prénom, vos signes (zodiaque, chinois, ascendant, forme du jour), l'horoscope, la question du
  jour à deux et le sondage du jour, vos outils (compatibilité, jeu à deux, thème astral, biorythmes, jeux, quiz),
  « Par où commencer ? ».
- **Astro** (tout en natif, calculé sur l'appareil) : horoscope du jour, signes (Soleil, Lune, ascendant), thème astral,
  compatibilité amoureuse (sept lectures), biorythmes, signe chinois, astrologie védique, astrologie maya, Lune ;
  amour signe par signe, tarot et le dossier astrologie sont des pages du site.
- **Jeux** : Nous connaissons-nous ?, la question du jour, les sondages (vote par `/api/sondage`), quiz et tests,
  mes scores, compteur de couple.
- **Infos** : recherche dans toutes les pages du site (index `assets/search-<langue>.json`, gardé sur l'appareil
  24 h), les rubriques (Conseils, Santé, Sexualité, Astrologie, Pays) lues en natif et hors ligne, et les outils
  natifs : estimateur d'ovulation, maternité la plus proche (position du téléphone ou pays/ville), compteur de couple,
  vie d'époux selon le prénom, calendrier de garde alternée (export .ics). « Distance et différences » reste une page
  du site (ses textes n'existent qu'en fr/en/de).
- **Moi** : prénom, date et heure de naissance, langue, favoris, téléchargement de tout le contenu pour lire hors
  ligne, inscription à la lettre d'information (`/api/newsletter`), effacement des données.

Les outils et les articles sont les pages du site, affichées dans une vue web en **mode application**
(`?app=1` → `<html class="app">` : sans en-tête, pied, partage ni bandeau — `outils/gen/app_mode.py` côté site).
Le profil saisi dans l'application est injecté dans le stockage de la page (clé `ap.profil`, même forme que
`assets/js/espace.js`), et ce que le site apprend (lieu de naissance, favoris) revient dans l'application.
Rien n'est envoyé à un serveur : ni profil, ni favoris.

## Structure

```
src/app/                 écrans (Expo Router) : (tabs)/index|astro|jeux|infos|moi ; page (vue web) ; article (hors ligne) ;
                         horoscope, signes, theme, compat, biorythme, chinois, autres (védique/maya), lune, qdj, sondages,
                         jeu2, quiz, ovulation, maternite, compteur, epoux, garde, newsletter
src/components/vue-site  vue web d'une page du site (injection, messages, liens externes, hors-ligne)
src/components/form      champs communs des outils (date, heure inconnue, boutons, notes, suggestions)
src/moteur/              moteurs et données du site : astro.js, astro_txt.js (copies), compat.ts + compat_txt.json,
                         epoux.ts, garde.ts, autres.ts, lieux.ts (pays.json, villes lues sur le site), maternite.ts
                         (maternites_fr.json, OpenStreetMap), outils_txt.json, ui.json, qdj/jeu2/sondages.json — écrits
                         par outils/gen/app_moteurs.py, app_outils_txt.py, app_compat_txt.py : ne pas modifier à la main
src/i18n.ts, i18n2, i18n3  textes de l'interface, 9 langues
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
