# Invest

A personal learning feed that replaces endless scrolling. Short swipeable lessons on finance, psychology and business, a daily stopping point, and a recap that makes things stick. Single user, private, installs to the iPhone home screen. The full plan is in [BUILD_SPEC.md](BUILD_SPEC.md).

## What's built

| Phase | Status |
|---|---|
| 1. Skeleton, installable app (manifest, icons, service worker) | Built. Not yet deployed to Vercel |
| 2. Passkey login, `/setup`, lock screen, test bypass | Built and tested with a virtual authenticator |
| 3. Database, `content/` folder, `DAILY_TASK.md`, import cron | Built. 16 starter lessons from the book shelf |
| 4. Feed and lesson cards, phone and laptop layouts | Built |
| 5. Onboarding wired into ranking | Built |
| 6. Tutor | Built, not yet tested against a live model |
| 7. Daily stop, recap quiz, spaced repetition | Built |
| 8. Pattern Lab | Not built (placeholder tab) |
| 9. Daily nudge | Not built (the time is saved, nothing is sent) |
| 9b. Offline tutor | Not built |
| 10. Idea map | Not built |

See [TEST_REPORT.md](TEST_REPORT.md) for the new-user test results and known problems.

## Deploy to Vercel

1. Import this repo as a new Vercel project.
2. In the project's Storage tab, add **Neon Postgres** from the Marketplace. That sets `DATABASE_URL`.
3. Add these environment variables:
   - `SETUP_CODE`: any phrase you choose. You type it once on `/setup`.
   - `SESSION_SECRET`: a long random string (`openssl rand -base64 32`).
   - `CRON_SECRET`: another long random string.
   - `RP_ID`: your domain with no `https://`, for example `invest-xyz.vercel.app`.
   - `RP_ORIGIN`: the same with `https://` in front.
   - `TUTOR_MODEL`: a model id from Vercel AI Gateway's free tier. Optional backup: `GEMINI_API_KEY`.
   - `GITHUB_REPO`: `Preet37/invest`. If the repo is private also add `GITHUB_TOKEN` (a read-only token), or leave both unset and lessons are read from the deployed files instead.
4. Create the tables: `DATABASE_URL=<your Neon url> npm run db:migrate`
5. Deploy, then load the lessons once: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-domain>/api/cron/import`
6. Open `https://<your-domain>/setup` on your iPhone in Safari and follow the screens.

Passkeys are tied to `RP_ID`. If you later move to a custom domain you will need to register again, so settle the domain first.

## Daily lessons

`content/DAILY_TASK.md` is the prompt for a daily Claude scheduled task. It writes `content/lessons/YYYY-MM-DD.json` and pushes it. The Vercel cron in `vercel.json` (14:00 UTC) then imports new files. To set it up, ask Claude: "Run content/DAILY_TASK.md in Preet37/invest every morning at 6am."

Feeds: `content/sources.json` currently holds only the book shelf. `content/sources.candidates.json` has 15 feed addresses that have **not** been checked. Run `npm run sources:verify` on a machine with normal internet and copy the ones that pass into `sources.json`.

## Run locally

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL, SETUP_CODE, SESSION_SECRET, AUTH_DEV_BYPASS=true
npm run db:push
npm run content:import
npm run dev
```

## Tests

```bash
npm run test:unit      # ranking rules
npm run content:check  # lesson files match the format and the writing rules
node tests/new-user.mjs   # both personas, phone and laptop (dev server on :3100 with AUTH_DEV_BYPASS=true)
node tests/passkey.mjs    # real passkey flow (dev server on :3101 with AUTH_DEV_BYPASS=false, SETUP_CODE=abc)
```
