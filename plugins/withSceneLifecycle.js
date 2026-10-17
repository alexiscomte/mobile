// iOS 27 : une appli compilée avec le SDK 27 qui n'adopte pas le cycle de vie par scènes s'arrête au lancement
// (UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption). Le gabarit Expo SDK 57 ne l'active pas encore :
// ce plugin déclare la scène dans Info.plist (délégué EXExpoAppSceneDelegate, fourni par le paquet expo) et laisse
// la scène créer la fenêtre et démarrer React Native, au lieu de l'AppDelegate.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const DEBUT_FENETRE = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n[\s\S]*?#endif\n/;

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return c;
  });

  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle : AppDelegate Swift attendu.');
    }
    let src = c.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }
    if (DEBUT_FENETRE.test(src)) {
      src = src.replace(DEBUT_FENETRE, '\n    // Fenêtre et démarrage de React Native : EXExpoAppSceneDelegate (plugins/withSceneLifecycle.js).\n');
    }
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      throw new Error('withSceneLifecycle : AppDelegate inattendu, le gabarit Expo a changé — vérifier le plugin.');
    }
    c.modResults.contents = src;
    return c;
  });
};
