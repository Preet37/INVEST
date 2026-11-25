# Build Spec: Invest (personal learning feed, web app on Vercel)

Hand this whole file to Claude Code. It explains what to build, why, the order to build it in, and how to test it as a brand new user.

App name: **Invest**, as in investing in yourself and your future, not just stocks. Use it in the UI, the manifest and the home screen icon label.

---

## 0. The plain-English version

Preet scrolls Instagram and TikTok for hours and wants to stop. Instead of just blocking those apps, he wants a replacement that feels just as easy to open and swipe, but every swipe teaches him something real: finance and stocks, psychology, business and entrepreneurship.

It should:
- Feel like Instagram: open it, swipe, something interesting is there.
- Come to him instead of waiting for him to ask (unlike a chatbot).
- Actually make things stick, so he can use them in real conversations and sound sharper.
- Have an ending each day ("You're caught up"), so it doesn't become another endless scroll.
- Be free, private, and just for him. No App Store, no paywall, no other users.

It's built as a website that installs onto his iPhone home screen and also works on his laptop. It runs on Vercel, so it works all the time, even with the laptop closed.

---

## 1. Who this is for

- **Owner and only real user:** Preet, 20, finishing a double engineering degree (December 2026) and starting full-time work. He's technical, but he wants plain-language explanations: no jargon without a plain explanation, and concrete everyday examples first.
- **Main device:** iPhone, added to the home screen. **Second device:** his laptop, in a browser.
- **Writing rule for all UI text and AI-generated content:** no em dashes. Write like a person talks.

### What inspired it (and what to do better)

Preet tried the onboarding for a paid app called Imprint. Keep what's good about it:
- Picking interests, then narrowing them into subtopics.
- Short, visual lessons made of swipeable cards.
- An AI tutor you can ask anything.
- A map of how ideas connect to each other.
- A daily goal.

Do these things differently:
- No paywall, free trial or "remind me before my trial ends" screen.
- No gender question or any other question that doesn't change what the app does.
- No fake social proof ("5 million users", review stars) and no "invite a friend" screen.
- Shorter onboarding. Get to the first real lesson fast (target in section 6).
- A daily goal counted in lessons, with a real stopping point, not just minutes.

---

## 2. Tech stack (decided)

| Part | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Native to Vercel; one codebase covers the pages and the server code |
| Styling | Tailwind CSS | Fast responsive layouts (phone vs laptop) |
| Hosting | Vercel | Always on, free tier, Preet already uses it |
| Database | Postgres (Neon via the Vercel Marketplace) + Drizzle ORM | Free tier, simple |
| Scheduled jobs | Vercel Cron | Daily lesson import and market data pull (no AI). Once a day is enough for v1; check the current plan's cron limits |
| AI for lessons | A daily **Claude scheduled task** that runs on Preet's Claude subscription (no Anthropic API key, no extra cost). It writes the day's lessons and pushes them to the app's GitHub repo (see 5.1) | Free; uses the plan Preet already pays for |
| AI for the in-app tutor | **Vercel AI Gateway** through the AI SDK (the `ai` package), the same setup as Preet's YCAPP repo. Deployed on Vercel, it signs in automatically (OIDC), so there's no API key to manage. Use a model from the Gateway's free tier so it stays inside Vercel's monthly free credit. Backup: Google Gemini's free tier (`GEMINI_API_KEY`) if the Gateway's free credit runs out or isn't available. Set a $5 spending limit on the Gateway in the Vercel dashboard | Free. Model name goes in an env var so it's easy to swap |
| On-device tutor (optional) | A small Gemma model that runs inside the browser on the phone's own chip, using WebGPU (the browser's way to use the graphics chip) through Google's MediaPipe LLM Inference for web or WebLLM. Off by default; turned on in Settings as "Offline tutor" | Free forever, private, and works with no signal. Trade-offs: a large one-time download, uses battery, slower, and less smart than the cloud tutor. Needs iOS 26+ Safari |
| Login | Passkeys (WebAuthn) using the SimpleWebAuthn library | Face ID on iPhone, Touch ID on a Mac. No passwords |
| Charts | TradingView's open-source `lightweight-charts` | Stock charts that work well on phones |
| Voice | Browser Web Speech API: speech synthesis to read cards aloud | Free, built in. Voice input is a stretch goal (support on iOS Safari is spotty) |
| Market data | A free stock data API that needs no credit card, pulled once a day by the cron job and saved in the database | Claude has no live prices built in, so the app needs a data feed. End-of-day prices (each day's closing numbers) are enough for learning. Claude Code picks a provider whose free plan has enough price history for Pattern Lab and confirms it works before building on it |
| Installable app | Web app manifest + service worker + Apple touch icon, `display: standalone` | Lets it live on the iPhone home screen and open full screen |

Every secret stays on the server only. Never send them to the browser.

---

## 3. Login and Face ID

Goal: Preet never types a password.

1. **First-time setup:** visit `/setup`, enter a one-time setup code (from the env var `SETUP_CODE`), then register a passkey. On iPhone this is a Face ID prompt.
2. Register the laptop too, either as a second passkey or through iCloud Keychain sync. Settings has an "Add this device" button that needs an already logged-in session.
3. **Sessions:** a long-lived, httpOnly, secure cookie (30 days).
4. **App lock:** if the app has been in the background for more than [default: 15 minutes, adjustable in Settings], show a lock screen with one "Unlock with Face ID" button. One tap, then the Face ID prompt.
5. After setup, turn `/setup` off (it refuses once a passkey exists).
6. Since this is a single-user app, any request without a valid session gets the login screen. There is no sign-up flow.
7. Verify on a real iPhone that passkeys work when the app is opened from the home screen icon, not just in Safari.

**For automated tests only:** add `AUTH_DEV_BYPASS=true`, which works only when `NODE_ENV !== "production"`. Playwright's WebKit can't fake a Face ID prompt. Separately, test the real passkey flow in Chromium using its virtual authenticator.

---

## 4. Phone vs laptop: one app, two layouts

Decide the layout by screen width and touch support, not by the browser's device name.

### iPhone (narrow, touch)
- One full-screen card at a time, with vertical swipes that snap to each card (like Reels).
- Lessons swipe sideways card by card, with progress dots at the top.
- Bottom bar: Feed, Pattern Lab, Saved, Profile.
- The tutor opens as a bottom sheet.
- Respect the notch and home bar (safe-area insets) and use `100dvh` so nothing hides behind Safari's bars.
- Tap targets at least 44 px high. Body text at least 17 px.
- Haptics aren't possible on the web; use small animations instead.

### Laptop (wide, mouse and keyboard)
- A centered column for the feed, with the tutor always open in a right-side panel.
- Left sidebar navigation.
- Keyboard: arrow keys or J/K to move between cards, S to save, D for "go deeper", / to focus the tutor box.
- Stock charts get more room, with hover tooltips.

### Both
- Light and dark mode, following the system setting.
- If someone opens it in iPhone Safari without installing it, show a small, dismissible banner with the 3-step "Add to Home Screen" instructions (Share button, Add to Home Screen, Add).
- On laptop, show a QR code in Settings and at the end of onboarding: "Open this on your phone."

---

## 5. Core features

### 5.1 Content sources (the daily pull)

Lessons are made once a day in two steps, with GitHub as the handoff:

1. **Claude scheduled task (every morning, on Preet's subscription):** reads the source list (`content/sources.json` in the repo), fetches what's new, picks the best items, writes lessons in the exact JSON format from 5.2, and commits them as `content/lessons/YYYY-MM-DD.json`. The task prompt lives in the repo at `content/DAILY_TASK.md` so it can be improved like code.
2. **Vercel Cron (shortly after):** imports any new lesson files from the repo into the database (skipping ones already imported). No AI runs here.

If the scheduled task skips a day, the feed falls back to unseen older lessons and due recap items, so it's never empty.

Source types (each one is an entry in `content/sources.json`, so Preet can add more later):
- Blogs and newsletters (RSS: a standard feed format most blogs publish)
- News (RSS)
- Research papers: the arXiv API (especially its quantitative finance and economics sections) and PsyArXiv for psychology
- YouTube channels: every channel has an RSS feed. Use the transcript when one is available, otherwise the title and description
- Podcasts (RSS): use show notes, and transcripts when the show publishes them
- TED talks and documentaries, through their YouTube channels
- Books and textbooks: a short "book shelf" list Preet maintains by hand. The AI writes lessons from the key ideas of each title, citing the book

Seed sources: build a starter list of about 5 per topic for finance and stocks, psychology, and business and entrepreneurship. **Check that every feed URL actually returns content before saving it.** Don't guess URLs. Put the list in `content/sources.json` so Preet can edit it.

Rules:
- Store the summary, the lesson and a link to the original. Never republish full articles.
- Don't create duplicate lessons from the same item (check by URL).
- Target: **$0 a month for AI.** Lessons come from the Claude subscription. The tutor uses the Gateway's free credit, with Gemini's free tier as a backup.
- About 15 new lessons a day (set in `DAILY_TASK.md`).
- Tutor limits so it never runs out of free credit: answers under 120 words, at most [default: 40] tutor messages a day, and a friendly "tutor's resting, ask Claude instead" message when the limit is hit.
- Every lesson card also has an **"Ask Claude" button** that opens the Claude app with a question about that card ready to go, so long conversations happen on the subscription instead.
- **During first setup, run the scheduled task once by hand** so the feed isn't empty on day one.

### 5.2 Lessons (cards)

Each lesson is about 5 cards. The AI follows this template:
1. **Hook:** one surprising line or question
2. **The idea:** in plain words, with an everyday example
3. **Real example:** a story, a number or a case from the source
4. **Use it:** how this shows up in his life, money, work or conversations
5. **Say it to a friend:** a two-sentence version he could repeat, plus a "Your turn" button that opens a box where he explains it in his own words and the AI gives quick feedback

Every lesson also has:
- A topic tag, a difficulty level and a link to the source
- Optionally, a **word worth knowing:** one strong vocabulary word from the lesson, with its meaning and an example sentence
- Buttons: Save, Go deeper (more lessons like this), Not for me, and Read aloud

Quality rules for the AI prompt: no em dashes, no jargon without a plain explanation, no made-up statistics (only facts in the source, cited), and at most 40 words per card.

### 5.3 The feed and ranking

v1 ranking, kept simple on purpose:
- `score = topic weight × freshness × difficulty fit`
- Topic weight starts from onboarding. It goes up with Save, Go deeper, finishing a lesson and "Your turn" answers. It goes down with Not for me and quick skips (under 2 seconds on the hook card).
- **Variety rule:** never more than 2 lessons in a row from the same topic.
- **Surprise rule:** about 1 lesson in 5 is a "wildcard" from a related topic he didn't pick. This is the healthy version of the slot-machine feeling.
- **Daily stop:** after his daily goal (from onboarding), show a "You're caught up" screen with a 3-question recap quiz, then a gentle "See you tomorrow." He can keep going if he wants, but the default is to stop.

### 5.4 Recap and spaced repetition

- Lessons he saved or finished come back as quick quiz questions after 1, 3, 7 and 21 days. This is spaced repetition: reshowing things right before you'd forget them.
- The recap happens at the end of each day's feed, never in the middle of it.
- The "word worth knowing" also comes back in recaps: "Use 'X' in a sentence."

### 5.5 AI tutor

- Available on every card. It already knows which lesson and card he's on.
- Suggested questions under the input ("Explain like I'm new", "Give me a real example", "How would I use this?").
- **Proactive:** some cards end with the tutor asking *him* a question.
- Answers are short by default (under 120 words), in plain words, with an option for more.
- Read-aloud button on each answer.
- "Continue in Claude" button that opens the Claude app with the conversation so far, for longer chats.
- **Offline tutor mode (optional):** when turned on in Settings, the tutor runs on a small Gemma model in the browser instead of the cloud. Show the download size and a progress bar before downloading, only download on Wi-Fi, and check that WebGPU is available first (if not, hide the option). If the daily cloud limit is hit and the offline model is installed, switch to it automatically. Keep its answers extra short and tied closely to the card's text, since small models are more likely to make things up.
- It never gives personal buy or sell advice (see 5.6).

### 5.6 Pattern Lab (stocks)

The goal is to teach him to read markets, not to tell him what to trade.

Flow:
1. Show a real chart of a stock or index over a past window, with the outcome hidden.
2. Ask: "What do you notice? What do you think happens next, and why?"
3. He answers (tap one of a few choices, or type).
4. Reveal what actually happened next, then the AI explains the patterns involved (for example trend, support and resistance, volume, how the price reacted to news), in plain words.
5. Show a "Current market" card with today's (delayed) chart for a few tickers he picked, asking: "Do you notice any patterns?"

Rules:
- Every Pattern Lab screen shows a small note: "For learning, not financial advice."
- The tutor refuses "should I buy X?" questions politely and turns them into "here's how to think about it."
- Lessons about investors and their methods cite real sources (books, letters, interviews) from the source list. No invented quotes.
- Watchlist tickers come from onboarding or Settings.
- Market data: the daily cron job pulls end-of-day prices for the watchlist and the Pattern Lab tickers and saves them. The app reads from the database, never straight from the data provider, so the free plan's daily request limit is never hit.

### 5.7 Idea map

A simple screen showing the topics and lessons he's covered as connected dots (like Imprint's map). Lines link lessons that share concepts (the AI tags concepts on each lesson). This is a nice extra for v1: build it last.

### 5.8 Daily nudge

- One notification a day at the time he picks, using Web Push. On iPhone this only works when the app is opened from the home screen icon.
- Wording is specific and curious ("Why do people hold losing stocks too long?"), not guilt-tripping ("You'll lose your streak!").

---

## 6. Onboarding (most important; build and test this carefully)

Targets:
- **Under 90 seconds** from first open to the first lesson card, for someone who doesn't stop to think.
- **No more than 10 screens.**
- Every question changes something in the app. If it doesn't, cut it.
- One question per screen, a big Continue button at the bottom (within thumb reach on a phone), and a Back button everywhere.
- A progress bar.
- Write all copy in plain words. Every screen must make sense to someone who has never heard of the app.

Screens, in order:
1. **Welcome:** "Swap endless scrolling for 5 minutes that make you sharper." One button.
2. **Lock it with Face ID** (iPhone) or Touch ID / your passkey (laptop). Explain in one line why: "So only you can open it. No password to remember."
3. **Why are you here?** (pick any) Replace mindless scrolling / Get better at stocks and money / Understand people better / Build or grow a business / Sound sharper in conversations.
4. **Pick your topics:** Finance and stocks, Psychology, and Business and entrepreneurship, plus a "More topics" list collapsed underneath. Preselect nothing.
5. **Narrow it down:** one screen per chosen topic, with 4 to 6 subtopics each. Example for finance: Reading stock charts, How great investors think, Personal finance and wealth, How markets and the economy work, Psychology of money.
6. **Your level:** per chosen topic, New to this / Know the basics / Pretty deep. This sets the starting difficulty.
7. **Your daily stopping point:** 3 / 5 / 10 lessons a day. Explain it: "When you hit this, the app tells you you're done. That's on purpose."
8. **Daily nudge:** pick a time or "No nudges." Only ask for notification permission after he picks a time, and only on a supported setup.
9. **Install it** (only if on iPhone Safari and not installed yet): the 3-step Add to Home Screen visual. On laptop, show a QR code instead. Skippable.
10. **First lesson:** go straight into a real lesson matched to his picks, not an "All set!" screen.

Edge cases to handle:
- He closes the app halfway through onboarding: it resumes where he left off.
- He picks zero topics: Continue is disabled, with a short hint.
- No content yet for a picked subtopic: fill in from the parent topic and have the next day's scheduled task prioritize that subtopic.
- Face ID is cancelled or fails: show a friendly retry, and say what to do if it keeps failing.
- Everything chosen in onboarding can be changed later in Settings.

---

## 7. Data model (starting point)

- `user` (just one row): goals, daily lesson goal, nudge time, lock timeout, voice on/off, watchlist
- `passkey`: credential id, public key, counter, device label
- `topic_pref`: topic, subtopic, level, weight
- `source`: mirrored from `content/sources.json`
- `item`: source id, url (unique), title, published at, raw text excerpt
- `lesson`: item id, topic, subtopic, difficulty, concepts[], cards (JSON), word of the day (optional)
- `interaction`: lesson id, event (view, finish, save, deeper, not_for_me, skip, your_turn), time spent, timestamp
- `review`: lesson id, next due date, interval step
- `tutor_message`: lesson id, role, content, timestamp

---

## 8. Build order (each phase must work before the next starts)

1. **Skeleton:** Next.js app, Tailwind, the installable-app setup (manifest, icons, service worker), deploy to Vercel, and confirm it adds to an iPhone home screen and opens full screen.
2. **Login:** passkeys, the `/setup` flow, the lock screen, and the dev bypass for tests.
3. **Database + seed sources + the lesson pipeline:** the `content/` folder, `DAILY_TASK.md`, the import cron, and one hand-run of the task producing real lessons. Then Preet asks Claude to turn `DAILY_TASK.md` into a daily scheduled task.
4. **Feed and lesson cards:** both layouts (phone and laptop), save / deeper / not for me, read aloud.
5. **Onboarding** (section 6) wired into the ranking.
6. **Tutor.**
7. **Daily stop + recap quiz + spaced repetition.**
8. **Pattern Lab.**
9. **Daily nudge.**
9b. **Offline tutor (optional):** in-browser Gemma. Test on a real iPhone for download size, speed, heat and whether iOS keeps the model saved between sessions.
10. **Idea map.**

---

## 9. Testing as a brand new user (required, and be critical)

After phases 5, 7 and 8, run the full new-user test below with **both personas**, on **both an iPhone viewport and a laptop viewport**. Use Playwright: WebKit with the iPhone 15 device profile, and Chromium at 1440×900. Start every run from an empty database with no saved session.

### Persona A: Preet (the real user)
- 20, engineering student about to start full-time work. Technical, but wants plain language.
- On iPhone, opening it the way he'd open Instagram: quickly, a little impatient.
- Picks: Finance and stocks (reading charts, how great investors think), Psychology (understanding behavior, connecting with people), Business and entrepreneurship (starting a company, innovation, leading teams).
- Goals: replace scrolling, get better at stocks, sound sharper in conversations.
- Level: knows the basics in business, new to stocks.
- He'll judge it by one question: "Did the first 30 seconds of the feed feel as easy as Instagram, and did I learn something I could say out loud today?"

### Persona B: a made-up test user (not a real person) who is nothing like Preet
- Not technical and has never invested. Skeptical of "self-improvement" apps and quits anything that feels like homework.
- iPhone only, opening the link from a text message in Safari (not installed yet).
- Picks only Psychology, at "New to this."
- Purpose: catch jargon, confusing steps, too many screens, and anything that assumes knowledge or interest in finance.

### For every run, record:
- Time and number of taps from first open to the first lesson card
- Every screen: a screenshot, plus one line saying what a first-timer would think there
- Every word or phrase a first-timer might not understand
- Any question that didn't change anything later (cut it)
- Anything broken: layout overflow, text hidden behind the notch or the bottom bar, buttons out of thumb reach, slow loads, empty states, console errors
- Whether the first 3 lessons actually match what the persona picked
- Whether the daily stop and the recap appear at the right time
- Pattern Lab (Persona A only): could a beginner understand the reveal and the explanation?

### Then:
1. Write `TEST_REPORT.md`, ranked from worst problem to smallest, with screenshots.
2. Fix everything marked serious, then re-run both personas and show before vs after (taps, time, issue count).
3. Be harsh. "It works" isn't the bar. The bar is "a first-timer would want to open this again tomorrow."

Also check by hand on a real iPhone (list these in the report for Preet to do): add to home screen, Face ID unlock from the home screen icon, the daily nudge arriving, and read aloud working.

---

## 10. Environment variables

```
DATABASE_URL=
# No ANTHROPIC_API_KEY: lessons come from the Claude scheduled task
# No AI Gateway key on Vercel: the AI SDK signs in with the project's OIDC token automatically
TUTOR_MODEL=           # a free-tier model on Vercel AI Gateway
GEMINI_API_KEY=        # optional backup, Google AI Studio free tier
TUTOR_DAILY_LIMIT=40
GITHUB_REPO=           # where the daily lesson files land
MARKET_DATA_API_KEY=   # free, no-credit-card provider chosen in phase 8
SETUP_CODE=
RP_ID=                 # passkey domain, e.g. the Vercel domain
RP_ORIGIN=
SESSION_SECRET=
CRON_SECRET=
VAPID_PUBLIC_KEY=      # for Web Push
VAPID_PRIVATE_KEY=
AUTH_DEV_BYPASS=false
```

---

## 11. Out of scope for v1

- App Store or native iPhone app (possible later with Expo)
- Other users, social features or sharing
- Paywalls, ads or tracking
- Trading, brokerage connections or buy/sell signals

## 12. Open questions for Preet

- [need: Vercel custom domain, or use the default *.vercel.app address]
