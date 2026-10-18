// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Copies générées des moteurs du site : conserver leur syntaxe d'origine.
    // Les règles de correction restent actives ; seule la préférence var/let est écartée.
    files: ['src/moteur/astro.js', 'src/moteur/astro_txt.js', 'src/moteur/lieu.js'],
    rules: { 'no-var': 'off' },
  },
  {
    // Le générateur partage ce commentaire avec les projets qui interdisent require().
    files: ['src/images.ts'],
    linterOptions: { reportUnusedDisableDirectives: false },
  },
]);
