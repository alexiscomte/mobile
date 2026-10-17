#!/bin/zsh
# Compile l'appli iOS sur le Mac et l'envoie sur App Store Connect (TestFlight puis examen), sans EAS.
# Usage : scripts/ios-publier.sh            (numéro de build = AAAAMMJJHH, toujours croissant)
# Prérequis : Xcode, CocoaPods (brew install cocoapods), certificat « Apple Distribution: CAPIT » dans le trousseau
# et profil App Store installé (voir README). Clé API App Store Connect : ~/Developer/claude/Gandi/asc-api.p8 (hors dépôt).
set -euo pipefail
cd "$(dirname "$0")/../ios"
export LANG=en_US.UTF-8

CLE=${ASC_CLE:-$HOME/Developer/claude/Gandi/asc-api.p8}
CLE_ID=CL68SP5FV2
EMETTEUR=94eb5821-fe4d-4408-b5be-e8dfd6f061fe
BUILD=$(date +%Y%m%d%H)
ARCHIVE=$HOME/Library/Developer/Xcode/Archives/AffectionPlus/AffectionPlus-$BUILD.xcarchive

# Contenu hors ligne : sans assets/embarque/ (non versionné), la compilation JS échoue.
[[ -n $(ls ../assets/embarque 2>/dev/null) ]] || { echo "assets/embarque/ vide : lancer d'abord outils/gen/app_embarquer.py"; exit 1; }

pod install
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
