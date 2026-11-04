import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t, type TKey } from "@/i18n";
import { useSleep } from "@/store/useSleep";
import { planComeback, type ComebackPlan, type Nudge } from "./comeback";

let recording = false;

/** night.tsx calls this on mount/unmount so tonight's reminder never fires mid-recording. */
export function setRecording(v: boolean) {
  recording = v;
  planComeback(sleepPlan());
}

const sameEvening = (a: number, b: Date) => {
  // a night "belongs" to the evening it started (before 6:00 counts as the previous evening)
  const k = (d: Date) => {
    const x = new Date(d);
    if (x.getHours() < 6) x.setDate(x.getDate() - 1);
    return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  };
  return k(new Date(a)) === k(b);
};

/**
 * SleepTalk: a bedtime reminder (tonight + next 4 evenings, skipped once
 * tonight's night is running or done) plus come-back nudges.
 */
export function sleepPlan(): ComebackPlan {
  const s = useSleep.getState();
  if (!s.onboarded) return null;
  const last = s.nights[s.nights.length - 1];
  const v = { talk: last ? last.summary.talk : 0, n: s.counter + 1 };
  const tonightDone = recording || (!!last && sameEvening(last.startedAt, new Date()));
  const nudges: Nudge[] = [];
  if (s.reminder.on) {
    for (let d = tonightDone ? 1 : 0; d <= 4; d++) {
      const k = (d % 3) + 1;
      const useLast = k === 2 && v.talk > 0;
      nudges.push({
        days: d,
        title: t(`rm_bed${useLast ? 2 : k === 2 ? 3 : k}_t` as TKey, v),
        body: t(`rm_bed${useLast ? 2 : k === 2 ? 3 : k}_b` as TKey, v),
      });
    }
  }
  if (s.nudges) {
    for (const d of s.reminder.on ? [7, 14, 30] : [1, 3, 7, 14, 30]) {
      nudges.push({ days: d, title: t(`cb${d}_t` as TKey, v), body: t(`cb${d}_b` as TKey, v) });
    }
  }
  return { hour: s.reminder.h, minute: s.reminder.m, nudges };
}

/** Ask for notification permission once — after the first night's report. */
export async function askOnce() {
  const s = useSleep.getState();
  if (Platform.OS === "web" || s.askedNotif) return;
  s.set({ askedNotif: true });
  await new Promise((r) => setTimeout(r, 2500));
  const r = await Notifications.requestPermissionsAsync().catch(() => null);
  if (r?.granted) planComeback(sleepPlan());
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const cur = await Notifications.getPermissionsAsync().catch(() => null);
  if (cur?.granted) return true;
  const r = await Notifications.requestPermissionsAsync().catch(() => null);
  return !!r?.granted;
}
