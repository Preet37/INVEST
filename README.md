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
| 8. Pattern Lab | Built. Tested on real AAPL prices only (see the test report) |
| 9. Daily nudge | Built. Timing logic tested; real delivery to a phone is not |
| 9b. Offline tutor | Not built |
| 10. Idea map | Built |

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
   - `MARKET_DATA_API_KEY`: a free key from twelvedata.com (no credit card). Pattern Lab is empty without it.
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: run `npx web-push generate-vapid-keys` once and paste both. Needed for the daily nudge.
   - `GITHUB_REPO`: `Preet37/invest`. If the repo is private also add `GITHUB_TOKEN` (a read-only token), or leave both unset and lessons are read from the deployed files instead.
4. Deploy. The build creates the database tables and loads the lessons by itself (the `vercel-build` script), so there is nothing to run by hand.
5. Redeploy after adding or changing environment variables so they take effect.
6. Load prices once: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-domain>/api/cron/market`. It loads up to 7 tickers per call, so run it again if you have a long watchlist.
7. For the daily nudge, add two repository secrets on GitHub (Settings, Secrets and variables, Actions): `APP_URL` (your `https://` address) and `CRON_SECRET`. The workflow in `.github/workflows/nudge.yml` then checks every 30 minutes whether your chosen time has arrived. It lives on GitHub because Vercel's free plan only runs scheduled jobs once a day.
8. Open `https://<your-domain>/setup` on your iPhone in Safari and follow the screens.

Passkeys are tied to `RP_ID`. If you later move to a custom domain you will need to register again, so settle the domain first.

## Use it on your phone over Tailscale

Passkeys only work on a secure origin with a matching `RP_ID`. Tailscale provides HTTPS for your Mac's tailnet hostname.

1. Install Tailscale on the Mac and the iPhone. Sign both in to the same account, and run `tailscale up` on the Mac.
2. Turn on MagicDNS and HTTPS certificates in the Tailscale admin console (DNS page).
3. Run `npm run tailnet`. It runs `tailscale serve --bg 3000` and prints:

   ```text
   Serving http://localhost:<port> at https://<host>
   Add to .env.local:
   RP_ID=<host>
   RP_ORIGIN=https://<host>
   Then run: npm run dev
   ```

4. Put the printed `RP_ID` and `RP_ORIGIN` in `.env.local`, then run `npm run dev`.
5. Open `https://<host>` on the iPhone in Safari, go to `/setup`, register a passkey, then use **Add to Home Screen**.

A passkey registered on one hostname does not work on another. Register again on `/setup` if you switch between Vercel and the tailnet.

To stop serving, run `tailscale serve --https=443 off`, or `tailscale serve reset`.

### Troubleshooting

- `Tailscale CLI not found. Install Tailscale and run: tailscale up`: Install Tailscale on the Mac, make its CLI available, then run `tailscale up`.
- `Tailscale is not connected. Run: tailscale up`: Run `tailscale up` on the Mac and sign in to the same account as the iPhone.
- `tailscale status: no DNS name (is MagicDNS on?)`: Turn on MagicDNS in the Tailscale admin console (DNS page), then run `npm run tailnet` again.

## Pattern Lab data

Prices come from Twelve Data, pulled once a day by the Vercel cron (`/api/cron/market`, 23:30 UTC) and stored in the database. The app never calls the provider while you use it. Charts are drawn from SPY, AAPL, MSFT, NVDA, AMZN, TSLA and your watchlist (Profile). The pattern notes (trend, support and resistance, volume, big one-day moves) are calculated from the prices, so they can't be made up. If the tutor model is connected it rewords them; if not, the calculated text is shown.

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
