import Constants from "expo-constants";
// Keys you fill in before release. Empty = feature off (no-op), app still works.
export const APP_ID = "sleeptalk";
/** PostHog project API key, e.g. "phc_XXXXXXXX" (Project settings → Project API key). */
export const POSTHOG_KEY = "phc_mxznohNkHFPTu7RQtmz9QGQZtzWzcaPjo3BMPVoKg4y3";
/** EU cloud keeps data in Frankfurt (GDPR-friendly). Use "https://us.i.posthog.com" for a US project. */
export const POSTHOG_HOST = "https://eu.i.posthog.com";
/** Shared container with the widget — follows the bundle id, same rule as the widget's Swift. */
export const APP_GROUP = `group.${Constants.expoConfig?.ios?.bundleIdentifier ?? "abr.sleeptalk"}`;
