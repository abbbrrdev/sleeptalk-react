# SleepTalk — sleep talking, snoring and laughing recorder

Expo SDK 57 · React Native 0.86 · expo-router · no backend. 11 languages.

**Idea:** you put the phone by the bed and it records the night. Only the moments with sounds are kept as clips: sleep talking, snoring, laughing, coughing. In the morning you get a "Night report" styled like a zine issue: stats, the best quote, a timeline of the night, and clips you can play. Pro: "What did I say?" (turns sleep talk into text), all clips, the archive. Viral loop: a card with a quote/clip + the audio, shared to TikTok/stories.

Design: a risograph zine (cream paper, fluorescent pink + blue, halftone dots, slight misregistration, Dela Gothic One / Manrope / Martian Mono). The night screen is dark blue.

## Run it
```bash
npm install
npm run ios      # dev build. Overnight recording and clip cutting only work on a real iPhone
npm run web      # UI check: the browser simulates a night; Settings → Developer → "Add sample nights"
```

## How it works
1. `src/app/night.tsx`: `expo-audio` records the whole night (AAC 22 kHz mono, ~15 MB/hour) with metering on. Background mode is `audio` (`enableBackgroundRecording`). The screen stays on (keep-awake), and stopping is a press-and-hold.
2. `src/lib/detector.ts` (pure TS): reads the volume level every 250 ms, keeps a floating noise floor (20th percentile over 2 minutes) and finds events that are louder than the room. Each event gets padding, nearby events are merged, and a clip is capped at 60 s.
3. `modules/night-lab` (a local Expo module in Swift):
   - `trim` cuts the clips out of the night recording (AVAssetExportSession → m4a);
   - `classify` labels them with Apple's built-in sound classifier (`SNClassifySoundRequest .version1`: speech / snoring / laughter / cough…) entirely on the device.
4. The full recording is deleted; only the clips stay (`Documents/clips`).
5. "What did I say?" (Pro): `expo-speech-recognition` with `audioSource.uri` transcribes the clip (on device when the language model is available).

## Free vs Pro
Free: recording every night, the report and timeline, the 3 loudest clips per night, sharing, the last 3 reports. Clip audio is kept for 7 days unless you tap "Keep".
Pro ($39.99/yr with 3-day trial, or $6.99/wk):
- all clips;
- "What did I say?";
- snore score history;
- full archive;
- clips kept forever.

## Before release
1. Bundle ID `abr.sleeptalk`, Team `Y7MSY46LM7` → `app.config.ts`.
2. RevenueCat: `sleeptalk_pro_yearly` (3-day trial) and `sleeptalk_pro_weekly`, entitlement `pro`. Put the key into `src/lib/purchases.ts`.
3. Site: `cd site && npx vercel --prod`, then `LEGAL.privacy` in `src/lib/config.ts`.
4. App Review: be ready to explain background audio. The answer: "records sleep sounds overnight at the user's request; the recording indicator is visible". The App Store description should state plainly that the app records all night.

## Check on a device
- `modules/night-lab/ios/NightLabModule.swift`: I couldn't compile it here (no Xcode). The APIs are standard (AVAssetExportSession, SoundAnalysis). If anything fails, it will be a small fix.
- Detection sensitivity: Settings → Sensitivity (Low / Normal / High). The thresholds are in `detector.ts` (`margin` 18/13/9 dB).
- On older iPhones, long nights (8+ hours) need the charger — the app reminds you on the start screen.

## Reminders
`src/lib/comeback.ts` + `src/lib/nudges.ts`. These are local notifications, no server.
- **Bedtime reminder:**
  - default time 22:30, selectable in Settings;
  - never fires while a night is recording or once tonight is done.
- **Come-back nudges:** after 7, 14 and 30 days (1, 3, 7, 14, 30 if the bedtime reminder is off).
- **Permission:** asked once, after the first night's report.

## Widgets, review, analytics

- **Widgets** (`targets/widget`, Swift/WidgetKit): home screen small/medium + lock screen. The app writes data to the App Group `group.<bundle id>` via `src/lib/widgetSync.ts`. Built by `@kingstinct/expo-apple-targets` on `expo prebuild`; check the first build in Xcode (it was not compiled here). In the Apple Developer portal enable App Groups for both `abr.*` and `abr.*.widget` IDs.
- **Review prompt** (`src/lib/review.ts`): the native iOS rating sheet, shown at a random good moment (after a win), only if ≥2 days since install, ≥3 wins, >60 s into the session, not right after the paywall, max 3 per year. Settings has a "Rate the app" row — fill `APP_STORE_ID` after release.
- **Trial reminder** (`src/lib/trialReminder.ts`): a local notification a day before the trial ends.
- **Analytics**: see `ANALYTICS.md`.
