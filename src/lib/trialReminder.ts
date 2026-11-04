/**
 * "We'll remind you before your trial ends" — a local notification one day
 * before the free trial converts. Promised on the paywall; cuts reflexive
 * day-0 cancellations and refund requests.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "@/i18n";
import { track } from "./analytics";

const ID = "trial-ends";

export async function scheduleTrialReminder(trialDays: number) {
  if (Platform.OS === "web" || !trialDays) return;
  try {
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    track("trial_reminder", { granted: perm.granted });
    if (!perm.granted) return;
    const at = new Date(Date.now() + Math.max(trialDays - 1, 0.5) * 86400_000);
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: t("tr_t"), body: t("tr_b"), data: { url: "/settings" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  } catch {}
}
