#!/bin/zsh
# Compile l'appli iOS sur le Mac et l'envoie sur App Store Connect (TestFlight puis examen), sans EAS.
# Usage : scripts/ios-publier.sh                   contrôles obligatoires, puis compilation et envoi
#         scripts/ios-publier.sh --controles-seuls  contrôles seulement, rien n'est compilé pour l'App Store ni envoyé
#         scripts/ios-publier.sh --sans-tests       saute les contrôles (déconseillé, avertissement affiché)
# Contrôles (voir tests/ios/README.md) : lint, TypeScript, puis suite XCTest iPhone sur le simulateur d'audit
# (IOS_SIM_AUDIT, par défaut « Audit AffectionPlus iPhone »), en clair/texte normal puis en sombre/texte maximal.
# Numéro de build = AAAAMMJJHH, toujours croissant.
# Prérequis : Xcode, CocoaPods (brew install cocoapods), certificat « Apple Distribution: CAPIT » dans le trousseau
# et profil App Store installé (voir README). Clé API App Store Connect : ~/Developer/claude/Gandi/asc-api.p8 (hors dépôt).
set -euo pipefail
cd "$(dirname "$0")/../ios"
export LANG=en_US.UTF-8

SANS_TESTS=0
CONTROLES_SEULS=0
for option in "$@"; do
  case $option in
    --sans-tests) SANS_TESTS=1 ;;
    --controles-seuls) CONTROLES_SEULS=1 ;;
    *) echo "Option inconnue : $option (options : --sans-tests, --controles-seuls)"; exit 2 ;;
  esac
done
(( SANS_TESTS && CONTROLES_SEULS )) && { echo "--sans-tests et --controles-seuls sont incompatibles"; exit 2; }

CLE=${ASC_CLE:-$HOME/Developer/claude/Gandi/asc-api.p8}
CLE_ID=CL68SP5FV2
EMETTEUR=94eb5821-fe4d-4408-b5be-e8dfd6f061fe
BUILD=$(date +%Y%m%d%H)
ARCHIVE=$HOME/Library/Developer/Xcode/Archives/AffectionPlus/AffectionPlus-$BUILD.xcarchive
SIM=${IOS_SIM_AUDIT:-F31133B3-CCA4-4474-9A11-B52DF537490C}
RESULTATS=${TMPDIR:-/tmp}/AffectionPlus-controles-$(date +%Y%m%d-%H%M%S)

etape() { print -P "\n%B▶ $1%b" }
echec() {
  print -u2 -P "\n%F{red}%B✗ ÉCHEC : $1%b%f"
  print -u2 "Publication arrêtée avant toute compilation pour l'App Store : rien n'a été envoyé."
  exit 1
}
avertir_sans_tests() {
  print -u2 -P "\n%F{yellow}%B⚠ --sans-tests : lint, TypeScript et tests XCTest NON exécutés.%b%f"
  print -u2 -P "%F{yellow}  Ce build part sur App Store Connect sans contrôle d'accessibilité ni de qualité.%f"
}

# Contrôle obligatoire, même avec --sans-tests : tous les articles et images doivent être embarqués.
(cd .. && npm run verifier:contenu) || echec "contenu hors ligne incomplet : régénérer les exports et lancer outils/gen/app_embarquer.py"

pod install

# Réglages du simulateur d'audit, rétablis à la sortie quoi qu'il arrive.
APPARENCE_INITIALE=
TAILLE_INITIALE=
restaurer_simulateur() {
  [[ -n $APPARENCE_INITIALE ]] && xcrun simctl ui $SIM appearance $APPARENCE_INITIALE 2>/dev/null || true
  [[ -n $TAILLE_INITIALE ]] && xcrun simctl ui $SIM content_size $TAILLE_INITIALE 2>/dev/null || true
}
trap restaurer_simulateur EXIT

# $1 nom du passage, $2 apparence (light|dark), $3 taille de texte
suite_xctest() {
  etape "Suite XCTest iPhone : $1"
  xcrun simctl ui $SIM appearance $2
  xcrun simctl ui $SIM content_size $3
  xcodebuild -project ../tests/ios/AffectionPlusUITests.xcodeproj \
    -scheme AffectionPlusUITests -configuration Release \
    -destination "platform=iOS Simulator,id=$SIM" \
    -derivedDataPath ${TMPDIR:-/tmp}/AffectionPlusUITests \
    -resultBundlePath $RESULTATS/$1.xcresult \
    -parallel-testing-enabled NO -collect-test-diagnostics never test > $RESULTATS/$1.log 2>&1 \
    || { grep -E 'error:|failed|Failing tests' $RESULTATS/$1.log | tail -15 >&2 || true
         echec "suite XCTest « $1 » (journal : $RESULTATS/$1.log, résultats : $RESULTATS/$1.xcresult)"; }
  grep -E '^Test (Suite|session).*(passed|Executed)|Executed [0-9]+ tests' $RESULTATS/$1.log | tail -1 || true
}

if (( SANS_TESTS )); then
  avertir_sans_tests
  print -u2 "  Ctrl-C dans les 10 secondes pour annuler."
  sleep 10
else
  mkdir -p $RESULTATS
  etape "Lint (CI=1 npx expo lint)"
  (cd .. && CI=1 npx expo lint) || echec "lint : corriger les erreurs ci-dessus"
  etape "TypeScript (npx tsc --noEmit)"
  (cd .. && npx tsc --noEmit) || echec "TypeScript : corriger les erreurs ci-dessus"

  etape "Compilation Release pour le simulateur d'audit ($SIM) et installation"
  xcrun simctl list devices | grep -q $SIM || echec "simulateur $SIM introuvable (régler IOS_SIM_AUDIT)"
  xcrun simctl boot $SIM 2>/dev/null || true
  xcrun simctl bootstatus $SIM -b > /dev/null
  APPARENCE_INITIALE=$(xcrun simctl ui $SIM appearance)
  TAILLE_INITIALE=$(xcrun simctl ui $SIM content_size)
  xcodebuild -workspace AffectionPlus.xcworkspace -scheme AffectionPlus -configuration Release \
    -destination "platform=iOS Simulator,id=$SIM" \
    -derivedDataPath $HOME/Library/Developer/Xcode/DerivedData/AffectionPlus-sim build > $RESULTATS/compilation-simulateur.log 2>&1 \
    || { grep -E 'error:' $RESULTATS/compilation-simulateur.log | tail -15 >&2 || true
         echec "compilation pour le simulateur (journal : $RESULTATS/compilation-simulateur.log)"; }
  xcrun simctl install $SIM $HOME/Library/Developer/Xcode/DerivedData/AffectionPlus-sim/Build/Products/Release-iphonesimulator/AffectionPlus.app \
    || echec "installation de l'app sur le simulateur"

  suite_xctest clair-texte-normal light large
  suite_xctest sombre-texte-maximal dark accessibility-extra-extra-extra-large
  print -P "\n%F{green}%B✓ Contrôles réussis%b%f (résultats : $RESULTATS)"
  (( CONTROLES_SEULS )) && { echo "--controles-seuls : arrêt avant la compilation App Store, rien n'a été envoyé."; exit 0; }
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD" AffectionPlus/Info.plist
sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = $BUILD;/" AffectionPlus.xcodeproj/project.pbxproj
echo "Build $BUILD"

xcodebuild -workspace AffectionPlus.xcworkspace -scheme AffectionPlus -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath $HOME/Library/Developer/Xcode/DerivedData/AffectionPlus-device \
  -archivePath "$ARCHIVE" archive | tail -3

xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist ExportOptions.plist \
  -exportPath "$ARCHIVE/../export-$BUILD" \
  -authenticationKeyPath "$CLE" -authenticationKeyID $CLE_ID -authenticationKeyIssuerID $EMETTEUR | tail -3

echo "Envoyé : build $BUILD. Il apparaît dans App Store Connect après quelques minutes de traitement."
if (( SANS_TESTS )); then avertir_sans_tests; fi
