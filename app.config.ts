import type { ExpoConfig } from "expo/config";

/**
 * ─── Signing ─────────────────────────────────────────────────────────
 * APPLE_TEAM_ID — your team (taken from your other Xcode projects)
 * BUNDLE_ID     — must be unique in App Store Connect
 */
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? "Y7MSY46LM7";
const BUNDLE_ID = process.env.BUNDLE_ID ?? "abr.sleeptalk";

const MIC = "SleepTalk listens while you sleep to catch talking, snoring and laughing. Only short clips are kept, on your iPhone.";
const SPEECH = "SleepTalk turns your sleep-talk clips into text on your iPhone when you tap “What did I say?”.";

const config: ExpoConfig = {
  name: "SleepTalk",
  slug: "sleeptalk",
  scheme: "sleeptalk",
  version: "1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#F3EEE4",
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: "1", // raise by 1 for every upload to App Store Connect
    appleTeamId: APPLE_TEAM_ID,
    supportsTablet: false,
    // shared container with the home/lock-screen widget (targets/widget)
    entitlements: { "com.apple.security.application-groups": [`group.${BUNDLE_ID}`] },
    // Required-reason APIs used by React Native / Expo / AsyncStorage (App Store upload check)
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp", NSPrivacyAccessedAPITypeReasons: ["0A2A.1", "3B52.1", "C617.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace", NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"] },
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime", NSPrivacyAccessedAPITypeReasons: ["35F9.1"] },
      ],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: { backgroundColor: "#F3EEE4", foregroundImage: "./assets/images/adaptive-icon.png" },
  },
  locales: {
    en: "./locales/en.json",
    ru: "./locales/ru.json",
    es: "./locales/es.json",
    pt: "./locales/pt.json",
    de: "./locales/de.json",
    fr: "./locales/fr.json",
    it: "./locales/it.json",
    ja: "./locales/ja.json",
    ko: "./locales/ko.json",
    "zh-Hans": "./locales/zh-Hans.json",
    "zh-Hant": "./locales/zh-Hant.json",
  },
  web: { favicon: "./assets/images/favicon.png" },
  plugins: [
    "./plugins/withNoPush",
    "./plugins/withStoreKitConfig", // local purchase testing in Xcode (Run only)
    "@kingstinct/expo-apple-targets", // builds targets/* (the widget) into the Xcode project
    "expo-router",
    "expo-localization",
    "expo-font",
    "expo-sharing",
    "expo-asset",
    ["expo-splash-screen", { image: "./assets/images/splash.png", imageWidth: 200, backgroundColor: "#F3EEE4" }],
    ["expo-build-properties", { ios: { deploymentTarget: "16.4" } }],
    ["expo-notifications", { color: "#FF4F9A" }],
    ["expo-audio", { microphonePermission: MIC, enableBackgroundRecording: true, enableBackgroundPlayback: false }],
    ["expo-speech-recognition", { microphonePermission: MIC, speechRecognitionPermission: SPEECH }],
  ],
  experiments: { typedRoutes: false },
};

export default config;
