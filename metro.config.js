// Metro : les fichiers « .dat » (contenu du site embarqué dans l'appli, voir outils/gen/app_embarquer.py du dépôt Claude) sont des RESSOURCES
// (copiées telles quelles dans l'appli, lues à la demande) et non du code JavaScript.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'dat'];
module.exports = config;
