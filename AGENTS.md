This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

iOS is built, signed and submitted locally on the Mac (see Rules and `scripts/ios-publier.sh`). EAS remains available for Android and over-the-air updates (`eas update`). Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- **iOS is native since 17/10/2026**: `ios/` is versioned and the Xcode project is the source of truth. **Never run `expo prebuild` for iOS** (it would regenerate `ios/` and wipe the native changes: signing, scene lifecycle, build number). Change native iOS behavior directly in `ios/` (Info.plist, AppDelegate.swift, project.pbxproj); `app.json` and config plugins no longer reach iOS. After adding a library with native code: `cd ios && pod install`. Build and publish on the Mac with `scripts/ios-publier.sh` (Xcode + App Store Connect API key), not EAS.
- iOS 27 requires the scene life cycle: `Info.plist` declares `UIApplicationSceneManifest` with `EXExpoAppSceneDelegate`, and `AppDelegate` conforms to `ExpoReactNativeFactoryProvider` without creating the window. Keep it (`plugins/withSceneLifecycle.js` records how it was first applied).
- `android/` is still generated (Continuous Native Generation): configure Android in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
