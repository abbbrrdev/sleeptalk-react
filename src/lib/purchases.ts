/**
 * Subscriptions via RevenueCat.
 *
 * Keys (RevenueCat → API keys):
 * - appl_… — the real App Store key. Used in every build by default.
 * - test_… — RevenueCat Test Store, for dev builds only. Turn it on with
 *   EXPO_PUBLIC_RC_TEST_STORE=1 (never in a release: RevenueCat rejects Test Store
 *   keys in App Store builds). The Test Store needs its own products + offering.
 *
 * Local testing without App Store Connect: run from Xcode — the scheme uses
 * storekit/SleepTalk.storekit (see plugins/withStoreKitConfig.js).
 *
 * With no key at all (or on web) the app runs in MOCK mode: purchases succeed instantly.
 */
import { Platform } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { track } from "./analytics";

const APP_STORE_KEY = "appl_qnPCEAXSVHrFsvYaEmncJanoGQZ";
const TEST_STORE_KEY = "test_JwulMGQJRUaJFRtpSGalbOGRToP";
const useTestStore = __DEV__ && process.env.EXPO_PUBLIC_RC_TEST_STORE === "1";
export const REVENUECAT_IOS_KEY = useTestStore ? TEST_STORE_KEY : APP_STORE_KEY;
export const REVENUECAT_ANDROID_KEY = "";
export const ENTITLEMENT = "pro";

export type PlanId = "weekly" | "yearly";

/** Raw plan data — the paywall formats it in the current language. */
export type Plan = {
  id: PlanId;
  /** Localized by the App Store for the user's storefront, e.g. "$39.99", "3 990 ₸", "¥6,000" */
  price: string;
  /** Only for yearly: the same price spread per week */
  perWeek: string | null;
  trialDays: number | null;
  savePct: number | null;
  pkg: PurchasesPackage | null;
};

const FALLBACK: Record<PlanId, Plan> = {
  yearly: { id: "yearly", price: "$39.99", perWeek: "$0.77", trialDays: 3, savePct: 89, pkg: null },
  weekly: { id: "weekly", price: "$6.99", perWeek: null, trialDays: null, savePct: null, pkg: null },
};

const apiKey = Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
export const isMock = !apiKey || Platform.OS === "web";

type RC = typeof import("react-native-purchases").default;
let rc: RC | null = null;
function sdk(): RC | null {
  if (isMock) return null;
  if (!rc) rc = require("react-native-purchases").default as RC;
  return rc;
}

let configured = false;

/** Same anonymous id in RevenueCat and PostHog → trial/renewal/cancel events land on the funnel. */
export async function linkAnalytics(id: string | null) {
  const P = sdk();
  if (!P || !id || !configured) return;
  try {
    await P.setAttributes({ $posthogUserId: id });
  } catch {}
}
export async function initPurchases(onPro: (pro: boolean) => void) {
  const P = sdk();
  if (!P || configured) return;
  configured = true;
  // RevenueCat logs a cancelled purchase as ERROR, which shows a red screen in dev.
  // Route its logs ourselves: real errors → warning, the rest → plain log (dev only).
  P.setLogHandler((level, message) => {
    const { LOG_LEVEL } = require("react-native-purchases");
    if (level === LOG_LEVEL.ERROR && !/cancel/i.test(message)) console.warn("[RevenueCat]", message);
    else if (__DEV__ && level !== LOG_LEVEL.DEBUG && level !== LOG_LEVEL.VERBOSE) console.log("[RevenueCat]", message);
  });
  P.setLogLevel(__DEV__ ? (require("react-native-purchases").LOG_LEVEL.INFO) : (require("react-native-purchases").LOG_LEVEL.WARN));
  P.configure({ apiKey });
  P.addCustomerInfoUpdateListener((info) => onPro(!!info.entitlements.active[ENTITLEMENT]));
  try {
    const info = await P.getCustomerInfo();
    onPro(!!info.entitlements.active[ENTITLEMENT]);
  } catch {
    // offline — keep cached state
  }
}

function trialDays(intro: { price: number; periodUnit: string; periodNumberOfUnits: number; cycles: number } | null) {
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits * intro.cycles;
  if (intro.periodUnit === "DAY") return n;
  if (intro.periodUnit === "WEEK") return n * 7;
  if (intro.periodUnit === "MONTH") return n * 30;
  return n;
}

export async function loadPlans(): Promise<Plan[]> {
  const P = sdk();
  const base = [FALLBACK.yearly, FALLBACK.weekly];
  if (!P) return base;
  try {
    const offerings = await P.getOfferings();
    const cur = offerings.current;
    if (!cur) return base;
    const plans: Plan[] = [];
    const weekly = cur.weekly?.product;
    if (cur.annual) {
      const pr = cur.annual.product;
      const save = weekly && weekly.price > 0 ? Math.round((1 - pr.price / 52 / weekly.price) * 100) : null;
      plans.push({
        id: "yearly",
        price: pr.priceString,
        perWeek: pr.pricePerWeekString ?? null,
        trialDays: trialDays(pr.introPrice as any),
        savePct: save && save > 0 ? save : null,
        pkg: cur.annual,
      });
    }
    if (cur.weekly && weekly) {
      plans.push({ id: "weekly", price: weekly.priceString, perWeek: null, trialDays: trialDays(weekly.introPrice as any), savePct: null, pkg: cur.weekly });
    }
    return plans.length ? plans : base;
  } catch {
    return base;
  }
}

export class StoreUnavailable extends Error {}

export async function purchase(plan: Plan): Promise<boolean> {
  const P = sdk();
  if (!P) {
    await new Promise((r) => setTimeout(r, 700));
    return true;
  }
  if (!plan.pkg) throw new StoreUnavailable();
  track("purchase_start", { plan: plan.id, trial: plan.trialDays ?? 0 });
  try {
    const { customerInfo } = await P.purchasePackage(plan.pkg);
    const ok = !!customerInfo.entitlements.active[ENTITLEMENT];
    track(ok ? (plan.trialDays ? "trial_start" : "purchase_success") : "purchase_no_entitlement", { plan: plan.id });
    return ok;
  } catch (e: any) {
    if (e?.userCancelled) {
      track("purchase_cancel", { plan: plan.id });
      return false;
    }
    track("purchase_error", { plan: plan.id, code: String(e?.code ?? "") });
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  const P = sdk();
  if (!P) return false;
  const info = await P.restorePurchases();
  const ok = !!info.entitlements.active[ENTITLEMENT];
  track("restore", { ok });
  return ok;
}
