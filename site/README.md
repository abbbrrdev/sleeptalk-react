# SleepTalk — landing + legal pages

A static site with no build step:
- `/`: landing (EN/RU, language detected automatically)
- `/privacy`: Privacy Policy (EN/RU). It covers overnight recording, deleting the full recording after processing, the on-device SoundAnalysis classifier, Apple Speech transcription and other people in the room.
- `/terms`: Terms of Use (EN/RU). It covers subscriptions, says this is not medical (apnea), and requires consent from anyone else being recorded.

Deploy: `cd site && npx vercel --prod`, then put `https://<domain>/privacy` into `LEGAL.privacy` (`src/lib/config.ts`) and App Store Connect.
At the top of `site.js`: `APP_STORE_URL` and `CONTACT_EMAIL` (hidden while empty).
