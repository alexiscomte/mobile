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
- **Contenu EMBARQUÉ (11/10/2026, décision d'Alexis)** : tout le contenu du site est dans l'appli dès l'installation, 9 langues, hors ligne,
  aucun téléchargement nécessaire : articles et fiches pays (paquets `c/`), recherche (`s/`), quiz (`q/`), villes (`v/`) et images (`i/`),
  soit 2 161 fichiers et 122 Mo dans `assets/embarque/` (IGNORÉ par git, régénéré ; `.easignore` le laisse partir à EAS Build). Génération :
  `python C:\Claude\Claude\outils\gen\app_embarquer.py` après les six exports du site (écrit aussi `src/embarque-registre.ts`, versionné).
  Lecture : `src/embarque.ts` (fichiers `.dat` = ressources Metro, `metro.config.js`). Le réseau ne sert qu'aux MISES À JOUR : au lancement
  (au plus une fois par jour, `majArrierePlan`) et par le bouton de l'écran Moi, l'index du site est comparé à celui de l'appli et seuls les
  paquets modifiés (version = empreinte, `pv` de l'index) sont téléchargés dans le dossier de l'appli ; la recherche et les quiz se
  rafraîchissent de même en arrière-plan. Sur un nouveau PC : relancer `app_embarquer.py` avant tout build.
- **Infos** : recherche dans toutes les pages du site (index `assets/search-<langue>.json`, gardé sur l'appareil
  24 h), les rubriques (Conseils, Santé, Sexualité, Astrologie, Pays) lues en natif et hors ligne, et les outils
  natifs : estimateur d'ovulation, maternité la plus proche (position du téléphone ou pays/ville), compteur de couple,
  vie d'époux selon le prénom, calendrier de garde alternée (export .ics), distance et différences (deux lieux :
  distance, vol, décalage horaire du jour, repères culturels, fiches pays).
- **Moi** = espace membre, même menu que l'icône « Mes infos » du site (table `MENU` d'espace.js, exportée dans `ui.json`) :
  « Se connecter » ou le nom (vers Mes informations personnelles), puis Mes informations personnelles,
  Mes favoris, Mes outils, Se déconnecter (connecté) ; langue, lecture hors ligne, effacement (07/10/2026 nuit, cahier
  `specs/espace-membre-retouches-0710.md`). Une entrée du menu du site sans écran natif (`ECRANS` de `moi.tsx`) est ignorée.
  **Mes informations personnelles** (`mes-infos`) : le formulaire d'abord, puis le
  rappel des signes, le texte selon l'état et l'encadré « Mon compte » (`components/mon-compte.tsx` : « Changer mon mot de
  passe » vers l'écran `mot-de-passe`, « Supprimer mon compte » avec un panneau de confirmation) ; aucun « Connecté : … », ni
  « Synchroniser maintenant », ni « Se déconnecter » ailleurs que dans Moi. **Mes outils** (`outils`) : rappel des signes (date
  connue), cartes d'astrologie (« Mon astrologie » y est fusionnée), outils du couple et de la famille, puis Mes sondages, Mes
  compatibilités amoureuses et Mon historique de connexion (`connexions`).
- **Messagerie interne supprimée (14/10/2026, Alexis)** : plus d'écran `messages`, plus de notifications ni de pastille (icône et
  onglet Moi), plus d'`expo-notifications` ; il n'est plus besoin de compte pour nous écrire : contact par courriel (page Contact
  du site). L'historique des connexions reste (`src/connexions-api.ts`, écran `connexions`). **Présence** : `POST /api/presence
  {appareil:'appli'}` toutes les 60 s au premier plan quand un compte est connecté (pays de résidence vide rempli une fois).
- **Protection anti-robot** (07/10/2026 nuit, cahier `specs/anti-robot-0710.md`) : l'inscription à la lettre sans compte joint une
  preuve de travail invisible (`src/robot.ts`, protocole ALTCHA du site : défi `GET /api/robot/defi`, empreintes natives expo-crypto),
  préparée à l'affichage de l'écran Newsletter et dès qu'on approche l'adresse ou la case de Mes informations personnelles ; échec =
  textes de `robot.js` du site (`ui.json robot` : ko, reseau, trop). « Créer un compte » et « Mot de passe oublié » se font sur les écrans
  du service commun, qui calculent eux-mêmes la preuve. **Pouce « j'aime »** sous le
  chapeau des articles (`/api/likes`, compteur sans liste de personnes ; la page entre dans les favoris). Aucune photo.

Les outils et les articles sont les pages du site, affichées dans une vue web en **mode application**
(`?app=1` → `<html class="app">` : sans en-tête, pied, partage ni bandeau — `outils/gen/app_mode.py` côté site).
Le profil saisi dans l'application est injecté dans le stockage de la page (clé `ap.profil`, même forme que
`assets/js/espace.js`), et ce que le site apprend (lieu de naissance, favoris) revient dans l'application.
Sans compte, ni le profil ni les favoris ne sont envoyés à un serveur (un « j'aime » touché sur un article envoie seulement
l'adresse de la page et un jeton aléatoire de l'appareil, haché par le serveur).

**Compte facultatif (06/10/2026)** : même système que le site (`assets/js/compte.js`, API `compte_api.js`, `/api/compte/…`).
Identifiant = adresse électronique, prouvée par un code à 6 chiffres reçu par courriel ou par Google (expo-auth-session,
client iOS de `src/compte_conf.json`, schéma d'URL inverse dans `app.json` → `ios.scheme`). À la connexion, les données du
compte remplissent l'appareil (profil, favoris, votes, scores, question du jour, parties à deux) ; ensuite la synchronisation
est automatique, comme sur le site (`src/compte.ts`) : envoi 1,5 s après chaque changement local (`pousser()`) et tout de suite
quand l'appli passe en arrière-plan, nouvel essai après 30 s, 1, 2, 4, 8 puis 10 min en cas d'échec (signalé discrètement dans
« Mon compte » après 3 échecs de suite). **« Le local gagne » (07/10/2026 nuit, cahier `specs/synchro-local-0710.md`)** : toute
modification faite sur l'appareil gagne, même hors ligne et après une fermeture de l'appli, jusqu'à ce qu'elle soit envoyée
(marqueur persistant `ap.compte.sale`) ; seul ce qui a été modifié ici part (envoi partiel, champ par champ) : une valeur non
touchée n'écrase jamais ce qui a changé sur un autre appareil. L'empreinte (`ap.compte.empreinte`, hachage de la base
`ap.compte.base`) est comparée au lancement (`synchroAuLancement`) et à chaque changement d'état de l'appli : rien n'a changé =
aucun appel. Les données du compte n'arrivent QU'À LA CONNEXION (plus de tirage au lancement ni au retour au premier plan) : un
changement fait sur un autre appareil arrive à la connexion suivante. « Effacer mes données » oublie aussi les modifications
non envoyées (`oublierSynchro`). Pendant une série d'échecs, ni le passage en arrière-plan ni une relance n'envoient hors de ce
calendrier (`ap.compte.essai` ; pas de rafale : essai `C:\Claude\Claude\outils\tests\appli_synchro.js`, compte.ts transpilé,
faux serveur = vraie fusion de `compte_api.js`, appels comptés sur 10 min simulées, 30 / 30). « Supprimer mon compte »
refusé par 401 (session déjà fermée) = rien de supprimé : message `supprSession`, jamais « Compte supprimé. ».
Session gardée sous `ap.compte` (`{ courriel, session, sync, depuis, mdp, newsletter, admin }`, même forme que le site) et injectée dans
les pages du site ouvertes dans l'appli (avec `admin` pour l'admin) ; une connexion ou une déconnexion faite dans la page revient dans l'appli
(`adopterCompte`). « Effacer mes données »
vide l'appareil et déconnecte, sans toucher au compte ; « Supprimer mon compte » (encadré « Mon compte » de Mes informations
personnelles, avec confirmation) efface le compte sur le serveur ; « Changer mon mot de passe » est un écran à part (même route
que le site, `/api/compte/mot-de-passe`).

## Structure

```
src/app/                 écrans (Expo Router) : (tabs)/index|astro|jeux|infos|moi ; page (vue web) ; article (hors ligne) ;
                         horoscope, signes, theme, compat, biorythme, chinois, autres (védique/maya), lune, qdj, sondages,
                         jeu2, quiz, ovulation, maternite, compteur, epoux, garde, newsletter, compte ; espace membre :
                         mes-infos, mot-de-passe, messages, favoris, mes-compat, outils, connexions
src/compte.ts            compte facultatif : appels /api/compte, synchronisation « le local gagne » (pousser, noter, appliquer), client commun
                         appelApi, présence
src/messages.ts          messagerie avec l'admin (/api/messages), brouillons (garderBrouillon) et historique des connexions (/api/compte/historique)
src/robot.ts             preuve anti-robot (preparerRobot, preuveRobot) ; src/lettre.ts : lettre d'information sans compte (abonnerInvite)
src/aime.ts              pouce « j'aime » (/api/likes, jeton local ap.jaime.jeton) ; écran : components/pouce.tsx
src/components/espace    briques de l'espace membre (écran Mes outils, invitation à se connecter, présence, connexions)
src/components/mon-compte encadré « Mon compte » de Mes informations personnelles (mot de passe, suppression confirmée)
src/components/vue-site  vue web d'une page du site (injection, messages, liens externes, hors-ligne)
src/components/form      champs communs des outils (date, heure inconnue, boutons, notes, suggestions)
src/moteur/              moteurs et données du site : astro.js, astro_txt.js, lieu.js (copies), compat.ts + compat_txt.json,
                         epoux.ts, garde.ts, autres.ts, lieux.ts (pays.json, villes lues sur le site), maternite.ts
                         (maternites_fr.json, OpenStreetMap), distance.ts (distance.json, culture.json),
                         outils_txt.json, ui.json, qdj/jeu2/sondages.json — écrits
                         par outils/gen/app_moteurs.py, app_outils_txt.py, app_compat_txt.py : ne pas modifier à la main
src/i18n.ts, i18n2, i18n3, i18n4  textes de l'interface, 9 langues (i18n4 : compte et « Mes sondages »)
src/catalogue.json       adresses et titres des pages du site par langue — écrit par outils/gen/app_catalogue.py
src/site.ts              adresses en mode application, scripts injectés
src/profil.tsx           profil, favoris, langue (AsyncStorage)
src/recherche.ts         index de recherche et recherche
src/theme.ts             couleurs du site
```

## Développer et tester (Windows)

Node 22 portable : `C:\Claude\Claude\outils\node\current` (à mettre en tête du PATH ; le Node 18 du système sert au site).

```bash
npx expo start
```

Puis, sur l'iPhone, l'application **Expo Go** (App Store, gratuite) : scanner le QR code affiché (même Wi-Fi).
Dans un navigateur : `npx expo start --web` (les pages du site s'affichent alors dans un iframe).

Vérifications : `npx tsc --noEmit` et `npx expo-doctor`. Essais sans téléphone (dans `C:\Claude\Claude\outils\tests`, Node 22 portable) :
`appli_synchro.js` (synchronisation et compteurs du compte, 37 / 37 au 07/10/2026 nuit) et `appli_robot.js` (preuve anti-robot, 11 / 11).

## Construire pour l'App Store (sans Mac)

1. Compte Expo (gratuit) : `npx expo login`. Compte **Apple Developer Program** (99 $/an) : developer.apple.com.
2. `npx eas-cli build --platform ios --profile production` : EAS crée les certificats, construit dans le nuage et
   donne un lien vers le fichier `.ipa`.
3. `npx eas-cli submit --platform ios` : envoi sur App Store Connect ; puis TestFlight (test) et soumission à Apple.

Pour tester sur son propre iPhone sans App Store : `--profile preview` (build interne) puis installation par le lien.

Identifiant de l'application : `com.affectionplus.app` (app.json). Icône et écran de démarrage : `assets/images/`.

## Mettre à jour le catalogue des pages

Quand une page outil change d'adresse ou de titre sur le site :
`python C:\Claude\Claude\outils\gen\app_catalogue.py` puis commit ici.
