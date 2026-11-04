/**
 * "Come back" notifications — local, no server.
 *
 * Every time the app leaves the foreground we cancel and re-plan a short
 * series of nudges N days from now. A user who keeps opening the app keeps
 * pushing them into the future, so they only ever fire after real inactivity
 * (1, 3, 7, 14, 30 days). Never asks for permission by itself — it quietly
 * does nothing until the user has allowed notifications somewhere else.
 *
 * The same mechanism carries an optional daily reminder: days 0..4 at the
 * user's time (day 0 is skipped when today's thing is already done). Because
 * it's re-planned on every visit, it stops nagging the moment you show up.
 */
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

export type Nudge = { days: number; title: string; body: string; url?: string };
export type ComebackPlan = { nudges: Nudge[]; hour: number; minute: number } | null;

const PREFIX = "comeback-";
const MAX = 12;

/** Pure: when each nudge should fire. Skips anything less than 15 minutes away. */
export function nudgeDates(now: Date, nudges: Nudge[], hour: number, minute: number): { nudge: Nudge; at: Date }[] {
  const out: { nudge: Nudge; at: Date }[] = [];
  for (const n of nudges.slice(0, MAX)) {
    const d = new Date(now);
    d.setDate(d.getDate() + n.days);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() - now.getTime() >= 15 * 60_000) out.push({ nudge: n, at: d });
  }
  return out;
}

export async function clearComeback() {
  if (Platform.OS === "web") return;
  await Promise.all(Array.from({ length: MAX }, (_, i) => Notifications.cancelScheduledNotificationAsync(PREFIX + i).catch(() => {})));
}

export async function planComeback(plan: ComebackPlan) {
  if (Platform.OS === "web") return;
  await clearComeback();
  if (!plan || !plan.nudges.length) return;
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  if (!perm?.granted) return;
  const list = nudgeDates(new Date(), plan.nudges, plan.hour, plan.minute);
  for (const [i, { nudge, at }] of list.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: PREFIX + i,
      content: { title: nudge.title, body: nudge.body, data: { url: nudge.url ?? "/", kind: "comeback" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    }).catch(() => {});
  }
}

/**
 * Mount once in the root layout. `build` is called at plan time (reads the
 * store via getState(), so the copy uses the latest numbers and language).
 */
export function useComeback(build: () => ComebackPlan, ready: boolean) {
  useEffect(() => {
    if (Platform.OS === "web" || !ready) return;
    const run = () => {
      try {
        planComeback(build());
      } catch {}
    };
    run();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") run();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
