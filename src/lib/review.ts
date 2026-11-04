/**
 * "Rate us" — Apple's native review alert (SKStoreReviewController).
 *
 * We ask at a *good* moment, picked at random among them: after a win
 * (a good result, a finished night/take/check), only once the person has used
 * the app for a few days, never in the first session, never right after a
 * paywall, at most every 60 days. iOS itself shows the alert at most 3 times a
 * year and may silently skip it — that's expected.
 * Custom "Do you like us?" pre-prompts are against App Store guideline 5.6.1,
 * so there's none.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { Linking, Platform } from "react-native";
import { APP_ID } from "./analyticsConfig";
import { track } from "./analytics";

/** Fill after the app is live, e.g. "6501234567" — enables "Rate on the App Store" in Settings. */
export const APP_STORE_ID = "";

const KEY = `${APP_ID}-review-v1`;
type S = { first: number; wins: number; lastAsk: number; asks: number[] };
const DAY = 86400_000;

async function load(): Promise<S> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { first: Date.now(), wins: 0, lastAsk: 0, asks: [] };
}
const save = (s: S) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});

let sessionStart = Date.now();
let lastPaywall = 0;
/** Call when a paywall is shown — no review alert for the next few minutes. */
export const notePaywall = () => (lastPaywall = Date.now());

/**
 * Something good just happened. `chance` = probability of asking when all
 * conditions hold (the "random moment"). `minWins` = good moments needed first.
 */
export async function noteWin(opts: { chance?: number; minWins?: number; minDays?: number } = {}) {
  const { chance = 0.5, minWins = 3, minDays = 2 } = opts;
  const s = await load();
  s.wins += 1;
  const now = Date.now();
  const yearAsks = s.asks.filter((t) => now - t < 365 * DAY);
  const ok =
    Platform.OS === "ios" &&
    s.wins >= minWins &&
    now - s.first >= minDays * DAY &&
    now - sessionStart > 60_000 &&
    now - lastPaywall > 5 * 60_000 &&
    now - s.lastAsk > 60 * DAY &&
    yearAsks.length < 3 &&
    Math.random() < chance;
  if (ok && (await StoreReview.hasAction().catch(() => false))) {
    s.lastAsk = now;
    s.asks = [...yearAsks, now];
    await save(s);
    track("review_prompt", { wins: s.wins });
    setTimeout(() => StoreReview.requestReview().catch(() => {}), 1200);
    return;
  }
  await save(s);
}

/** Settings → "Rate on the App Store": opens the write-review page directly. */
export async function openWriteReview() {
  track("review_open_store");
  if (APP_STORE_ID) return Linking.openURL(`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`);
  const url = StoreReview.storeUrl();
  if (url) return Linking.openURL(url);
  return StoreReview.requestReview().catch(() => {});
}
export const canOpenReview = () => Platform.OS === "ios";
