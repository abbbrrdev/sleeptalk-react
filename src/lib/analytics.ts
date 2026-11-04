/**
 * Product analytics (PostHog) — anonymous funnel & retention tracking.
 *
 * What we send: event names like "onboarding_step", "paywall_view", "trial_start",
 * plus a random install id, app version, iOS version, device model and app language.
 * Never: names, emails, recordings, transcripts, health data, scores' raw content.
 *
 * Without POSTHOG_KEY (or on web) everything here is a silent no-op, so the
 * app works the same before you create the PostHog project.
 * Dashboard setup: see ANALYTICS.md in the project root.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import PostHog from "posthog-react-native";
import { APP_ID, POSTHOG_HOST, POSTHOG_KEY } from "./analyticsConfig";

type Props = Record<string, string | number | boolean | null | undefined>;

let ph: PostHog | null = null;
let installedAt = 0;
const queue: [string, Props | undefined][] = [];
const INSTALL_KEY = `${APP_ID}-installed-at`;
const OPT_KEY = `${APP_ID}-analytics-off`;

export const analyticsEnabled = () => !!POSTHOG_KEY && Platform.OS !== "web";

const dayN = () => (installedAt ? Math.floor((Date.now() - installedAt) / 86400_000) : 0);

/** Call once at startup (root layout). Safe to call again. */
export async function initAnalytics() {
  if (ph || !analyticsEnabled()) return;
  const saved = await AsyncStorage.getItem(INSTALL_KEY).catch(() => null);
  installedAt = saved ? Number(saved) : Date.now();
  const first = !saved;
  if (first) AsyncStorage.setItem(INSTALL_KEY, String(installedAt)).catch(() => {});
  ph = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    captureAppLifecycleEvents: true, // Application Installed / Opened / Backgrounded / Updated
    personProfiles: "always", // anonymous random id — needed for retention & funnels
    flushAt: 15,
    flushInterval: 30,
    disableGeoip: true, // no IP-based location: country comes from App Store Connect instead
  });
  if ((await AsyncStorage.getItem(OPT_KEY).catch(() => null)) === "1") await ph.optOut();
  await ph.register({ app: APP_ID, install_date: new Date(installedAt).toISOString().slice(0, 10) });
  if (first) ph.capture("first_open");
  for (const [e, p] of queue.splice(0)) ph.capture(e, { ...p, day_n: dayN() } as any);
}

/** Track a product event. Queued until init finishes. */
export function track(event: string, props?: Props) {
  if (!analyticsEnabled()) return;
  if (!ph) return void queue.push([event, props]);
  ph.capture(event, { ...props, day_n: dayN() } as any);
}

/** Super-properties attached to every later event (e.g. is_pro, app_lang). */
export function setTraits(props: Props) {
  ph?.register(props as any);
}

/** Random anonymous id — given to RevenueCat so subscription events land on the same user. */
export const distinctId = () => (ph ? ph.getDistinctId() : null);

export async function setAnalyticsOff(off: boolean) {
  await AsyncStorage.setItem(OPT_KEY, off ? "1" : "0").catch(() => {});
  if (!ph) return;
  if (off) await ph.optOut();
  else await ph.optIn();
}
export async function isAnalyticsOff() {
  return (await AsyncStorage.getItem(OPT_KEY).catch(() => null)) === "1";
}

/** Mount once in the root layout: screen views from expo-router paths. */
export function useScreenTracking() {
  const path = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!path || path === last.current) return;
    last.current = path;
    if (ph) ph.screen(path, { day_n: dayN() } as any);
  }, [path]);
}
