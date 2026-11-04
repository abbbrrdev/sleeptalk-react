/** Home-screen + lock-screen widget. Built by @kingstinct/expo-apple-targets on prebuild. */
/** @type {import('@kingstinct/expo-apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "SleepTalkWidget",
  bundleIdentifier: ".widget",
  deploymentTarget: "16.4",
  frameworks: ["SwiftUI", "WidgetKit"],
  entitlements: { "com.apple.security.application-groups": [`group.${config.ios.bundleIdentifier}`] },
  colors: { $accent: "#FF4F9A", $widgetBackground: "#F3EEE4" },
});
