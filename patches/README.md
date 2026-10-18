# Correctif Dynamic Type — React Native 0.86.3

`react-native-0.86.3-dynamic-type.patch` rétroporte les cinq fichiers natifs du correctif officiel React Native [#57246](https://github.com/react/react-native/pull/57246), commit [`45904c866882f136edde55df2fe453327057d387`](https://github.com/react/react-native/commit/45904c866882f136edde55df2fe453327057d387), sous licence MIT.

Les chemins sont adaptés à `node_modules/react-native/` et les changements sont conditionnés par `__APPLE__`. Sur iOS, le code obtenu est celui du correctif amont ; sur Android, les structures C++, signatures et comportements de React Native 0.86.3 sont conservés. Cette adaptation évite une incompatibilité entre les en-têtes utilisés par les modules Android et leur moteur React Native précompilé.

Ce correctif force une nouvelle mesure des paragraphes dont l'échelle de police est devenue obsolète après un changement de taille du texte iOS. Il évite de remonter les écrans : les formulaires, la navigation et le défilement conservent leur état.

Au 18 octobre 2026, Expo SDK 57 utilise React Native 0.86.3 et aucun correctif 0.86 plus récent n'est publié. Le commit est inclus dans React Native 0.87.1. Un passage isolé à cette version ne respecte pas les dépendances d'Expo SDK 57.

## Application et compilation

- `npm install` et `npm ci` exécutent `scripts/patch-react-native.cjs` via `postinstall`. Le script vérifie la version, applique le patch atomiquement et accepte une seconde exécution sans modification.
- `pod install` exécute également le script pour couvrir les installations avec scripts npm désactivés.
- `ios/Podfile.properties.json` impose la compilation de React Native depuis les sources et désactive les modules Expo précompilés. Le correctif modifie la structure C++ `LayoutMetrics` : il ne faut pas le lier à un ancien binaire React Native ou Expo précompilé.
- Construire normalement avec Xcode après `cd ios && pod install`. Ne pas exécuter `expo prebuild` pour ce projet iOS natif.

## Retrait

Lors d'une migration vers un SDK Expo qui inclut ce correctif React Native, vérifier la présence du commit et rejouer le test de changement de taille à chaud dans les deux sens, suivi d'une mise à jour React indépendante. Retirer alors le patch, le script, le `postinstall` et l'appel du Podfile ; réinstaller les dépendances propres. Les deux options de compilation source peuvent ensuite être retirées et les Pods réinstallés pour retrouver les binaires précompilés.
