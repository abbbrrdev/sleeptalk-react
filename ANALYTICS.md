# SleepTalk — analytics

PostHog (EU), one project for all 5 apps. Every event carries `app: "sleeptalk"`, `day_n` (days since first open) and `app_lang`.
Key: `src/lib/analyticsConfig.ts` → `POSTHOG_KEY` (empty = analytics off). Users can opt out in Settings → Anonymous statistics.

No health data, sleep data, scores, recordings or transcripts go into events — only which screen/button and counts.

## Dashboards
Run once from ~/Desktop/dev: `POSTHOG_PERSONAL_KEY=phx_… node posthog-setup.mjs` → "Overview — all apps" + "SleepTalk — funnels":
install → trial, onboarding drop-off by screen, paywall → trial, core loop, retention D1–D30, lifecycle (new/returning/dormant), paywall views by source.

Uninstalls: iOS does not report them per user. Use App Store Connect → Analytics → Deletions (totals) and "dormant" in Lifecycle.

## Events (27)
- `$app_backgrounded`
- `$app_installed`
- `$app_opened`
- `$app_updated`
- `$screen`
- `clip_play`
- `first_open`
- `keep_clip`
- `mic_denied`
- `night_end`
- `night_start`
- `night_too_short`
- `onboarding_complete`
- `onboarding_step`
- `paywall_close`
- `paywall_view`
- `purchase_cancel`
- `purchase_error`
- `purchase_start`
- `report_view`
- `restore`
- `review_open_store`
- `review_prompt`
- `sensitivity_change`
- `share_start`
- `transcribe`
- `trial_reminder`
