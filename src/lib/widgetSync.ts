import { useEffect } from "react";
import { t } from "@/i18n";
import { useSleep } from "@/store/useSleep";
import { pushWidget } from "./widget";

/**
 * Keeps the home/lock-screen widget in step with the latest night and the app language.
 * The widget decides by itself (local clock) whether to show "Start night" (after 20:00,
 * or no night since the last 20:00) or the last night's issue.
 * The quote is the user's own sleep talk — it only goes to their own widget (App Group),
 * never to analytics.
 */
export function syncWidget() {
  const s = useSleep.getState();
  if (!s.onboarded) return;
  const last = s.nights.reduce<(typeof s.nights)[number] | undefined>((a, n) => (!a || n.startedAt > a.startedAt ? n : a), undefined);
  const sum = last?.summary;
  const quote = last?.clips.find((c) => c.kind === "talk" && c.text)?.text?.trim() ?? "";
  const talk = sum?.talk ?? 0;
  const nClips = last?.clips.length ?? 0;
  pushWidget({
    id: last?.id ?? "",
    n: last?.n ?? 0,
    ended: last ? Math.floor(last.endedAt / 1000) : 0,
    talk,
    snore: sum?.snore ?? 0,
    laugh: sum?.laugh ?? 0,
    clips: nClips,
    quote,
    l_issue: last ? t("issue_no", { n: last.n }) : "",
    l_said: talk === 1 ? t("wd_said_1") : talk > 1 ? t("wd_said", { n: talk }) : nClips ? t("clips_n", { n: nClips }) : t("quiet_night"),
    l_talk: t("k_talk_s"),
    l_snore: t("k_snore_s"),
    l_laugh: t("k_laugh_s"),
    l_title: t("rp_title"),
    l_tonight: t("tonight"),
    l_start: t("start_night"),
    l_next: t("rm_bed1_t", { n: s.counter + 1 }),
    l_hint: t("start_hint"),
  });
}

export function useWidgetSync(lang: string | null) {
  useEffect(() => {
    syncWidget();
    return useSleep.subscribe((s, p) => {
      if (s.nights !== p.nights || s.onboarded !== p.onboarded || s.counter !== p.counter) syncWidget();
    });
  }, [lang]);
}
