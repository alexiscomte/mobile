# Tests iOS sur simulateur

Ce projet XCTest indépendant pilote l'app Release déjà installée (`com.affectionplus.app`). Il ne régénère pas le projet natif et ne nécessite pas de serveur Metro. Les commandes ci-dessous se lancent depuis la racine du dépôt, avec Xcode et le runtime iOS du simulateur installés. Ne pas exécuter `expo prebuild` pour préparer ces tests.

## Préparer les simulateurs

- Utiliser des simulateurs réservés aux tests. L'application et ses données restent installées entre les exécutions.
- Pour la suite standard, préparer un profil local fictif nommé **Camille**, une date de naissance valide et une heure connue, par exemple `12:00`. Choisir le français dans l'application et dans les réglages du simulateur. Le compte doit être déconnecté.
- Pour le test de fenêtre iPad, activer préalablement **Réglages → Multitâche et gestes → Apps en fenêtres**. Ce test redimensionne la fenêtre, vérifie que le titre reste sous les commandes système, puis la remet en plein écran en conservant ce mode.
- Les scénarios utilisent les libellés français. La matrice de neuf langues se termine en français lorsqu'elle réussit ; rétablir cette langue si une exécution est interrompue.

## Suite standard

```sh
xcodebuild -project tests/ios/AffectionPlusUITests.xcodeproj \
  -scheme AffectionPlusUITests -configuration Release \
  -destination 'platform=iOS Simulator,id=<UUID>' \
  -derivedDataPath /tmp/AffectionPlusUITests \
  -resultBundlePath /tmp/AffectionPlusAudit.xcresult \
  -parallel-testing-enabled NO \
  -collect-test-diagnostics never test
```

Le chemin du résultat `.xcresult` doit être nouveau. La suite standard couvre :

- La navigation dans les cinq onglets et leurs audits d'accessibilité.
- L'ouverture de Mes infos, thème astral, biorythmes, garde alternée, quiz, sondages et de l'index des articles de conseils.
- L'accueil dans les neuf langues, sur iPhone.
- Le calcul local d'un calendrier avec des noms longs, le formulaire avec heure inconnue et l'accès au sélecteur de date après défilement.
- Le paysage et le redimensionnement d'une fenêtre, sur iPad. Le paysage est ignoré sur iPhone, où l'application est prévue en portrait.
- Quinze déplacements VoiceOver sur l'accueil, avec transcription jointe, sur iOS 27. L'assertion vérifie la présence d'annonces ; leur pertinence et leur ordre restent à examiner dans la transcription.

Les tests saisissent des brouillons et calculent un calendrier sans enregistrer le profil. Les tests du compte et du changement Dynamic Type à chaud sont ignorés dans cette commande ; ils utilisent les lanceurs séparés ci-dessous.

Les audits XCTest contrôlent contraste, taille des cibles, descriptions accessibles, texte coupé et traits sur les **surfaces visibles au moment du contrôle**. Ils ne parcourent pas automatiquement tout le contenu hors écran. Les captures et arbres accessibles joints permettent la vérification visuelle. Un résultat sans anomalie ne certifie ni l'accessibilité de l'application entière, ni sa conformité à toutes les recommandations Apple, ni son acceptation par l'App Store.

### Diagnostic UIKit connu

Sur iOS 27 uniquement, l'audit de Mes infos peut signaler le sélecteur horaire compact natif par le diagnostic exact `Text of this UILabel may be clipped at larger Dynamic Type sizes.`, sans élément accessible associé. Le test accepte **au maximum un** diagnostic identique par audit, uniquement lorsque les deux sélecteurs natifs sont présents. Il conserve ce diagnostic dans la pièce jointe et exige que le sélecteur expose une heure complète avec minutes (`H:mm` ou `HH:mm`, éventuellement suivie de `AM`/`PM` selon la région).

Tout diagnostic supplémentaire ou différent reste un échec. Le scénario avec l'heure inconnue contrôle séparément le formulaire sans ce sélecteur ; cette exception n'est pas une désactivation générale du contrôle de texte coupé.

## Contrôles obligatoires avant publication

`scripts/ios-publier.sh` lance ces contrôles avant de toucher au numéro de build, à l'archive Release ou à App Store Connect, et s'arrête au premier échec avec un message rouge et le chemin du journal :

1. `CI=1 npx expo lint` ;
2. `npx tsc --noEmit` ;
3. compilation Release pour le simulateur d'audit et installation de l'app (les données du profil **Camille** sont conservées) ;
4. la suite standard ci-dessus, deux fois : en clair avec le texte `large`, puis en mode sombre avec le texte maximal (`accessibility-extra-extra-extra-large`). L'apparence et la taille de texte initiales du simulateur sont rétablies à la fin, même en cas d'échec.

Le simulateur utilisé est **Audit AffectionPlus iPhone** ; en choisir un autre avec `IOS_SIM_AUDIT=<UUID>`. Les journaux et `.xcresult` sont écrits dans `$TMPDIR/AffectionPlus-controles-<date>/`.

- `scripts/ios-publier.sh --controles-seuls` exécute les contrôles et s'arrête sans compiler pour l'App Store ni rien envoyer : à utiliser pour vérifier une branche.
- `scripts/ios-publier.sh --sans-tests` saute tous les contrôles. Un avertissement jaune s'affiche au début (avec dix secondes pour annuler par Ctrl-C) et à la fin. À réserver aux urgences, puis relancer `--controles-seuls` au plus tôt.

Les lanceurs Dynamic Type à chaud et compte de test ci-dessous ne font pas partie de ce passage obligatoire.

## Dynamic Type à chaud

Le test de changement de texte à chaud demande une coordination avec `simctl` et se lance séparément :

```sh
python3 scripts/test-ios-dynamic-type.py <UUID> --output /tmp/affection-dynamic-type
```

Le simulateur doit être démarré et préparé comme pour la suite standard. Le lanceur règle d'abord la taille sur `large`, saisit un brouillon, passe à `accessibility-large`, puis revient à `large` **sans relancer l'app**. Il vérifie la hauteur recalculée du libellé et la conservation du brouillon dans les deux sens. Son bloc de nettoyage rétablit le réglage initial du simulateur, y compris en cas d'échec du test. Le répertoire de sortie doit être nouveau.

## Parcours connecté avec un compte de test

Utiliser un autre simulateur dédié, en français, et un compte de démonstration. Placer le courriel et le mot de passe dans deux fichiers privés hors du dépôt, chacun sur une seule ligne. Ne pas inscrire ces valeurs dans le code ni dans la commande :

```sh
python3 scripts/test-ios-account.py <UUID> \
  --email-file /chemin/prive/compte-courriel.txt \
  --password-file /chemin/prive/compte-mot-de-passe.txt \
  --output /chemin/prive/resultats-compte
```

Le répertoire de sortie doit être nouveau. Le lanceur lit les fichiers localement et transmet les valeurs au processus de test. Il masque le courriel et le mot de passe dans son journal texte. Le scénario se connecte si nécessaire, puis consulte et audite Mes infos, favoris, outils, historique des connexions et changement de mot de passe. Il ne valide aucun enregistrement de profil, modification de mot de passe ou suppression de compte. La connexion crée toutefois une session et l'activité normale de l'application peut figurer dans l'historique du compte.

Conserver les résultats de ce parcours dans un emplacement privé : **ne pas publier ni exporter publiquement le `.xcresult`, les pièces jointes ou les journaux du compte**. Le masquage du journal texte ne garantit pas l'anonymisation de tous les artefacts produits par Xcode. La session de démonstration reste connectée sur son simulateur à la fin du test.
