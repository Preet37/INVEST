// New-user run for both personas, phone and laptop. Needs the dev server running against a test database:
//   DATABASE_URL=postgres://invest:invest@localhost:5432/invest_test AUTH_DEV_BYPASS=true SESSION_SECRET=... npx next dev -p 3100
//   node tests/new-user.mjs
// Writes screenshots and results.json to test-results/.
import { createRequire } from "module";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3100";
const DB = process.env.TEST_DATABASE_URL || "postgres://invest:invest@localhost:5432/invest_test";
const OUT = "test-results";

const PERSONAS = {
  A: {
    name: "Preet",
    goals: ["Replace mindless scrolling", "Get better at stocks and money", "Sound sharper in conversations"],
    topics: ["Finance and stocks", "Psychology", "Business and entrepreneurship"],
    subtopics: ["Reading stock charts", "How great investors think", "Understanding behavior", "Connecting with people", "Starting a company", "Innovation", "Leading teams"],
    levels: { "Business and entrepreneurship": "Know the basics" },
    picked: ["finance", "psychology", "business"],
    views: ["phone", "laptop"],
  },
  B: {
    name: "Skeptic",
    goals: ["Understand people better"],
    topics: ["Psychology"],
    subtopics: [],
    levels: {},
    picked: ["psychology"],
    views: ["phone"],
  },
};

function resetDb() {
  execSync(
    `psql "${DB}" -q -c 'TRUNCATE "user", passkey, topic_pref, interaction, review, tutor_message RESTART IDENTITY'`,
    { stdio: "inherit" },
  );
}

async function run(browser, key, view) {
  const p = PERSONAS[key];
  resetDb();
  const ctx = await browser.newContext(
    view === "phone" ? { ...devices["iPhone 15"] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  );
  const page = await ctx.newPage();
  const errors = [];
  const overflow = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  let taps = 0;
  let shot = 0;
  const dir = `${OUT}/${key}-${view}`;
  mkdirSync(dir, { recursive: true });
  const snap = async (name) => {
    await page.waitForTimeout(350);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) overflow.push(name);
    await page.screenshot({ path: `${dir}/${String(++shot).padStart(2, "0")}-${name}.png` });
  };
  const tap = async (locator) => {
    await locator.click();
    taps++;
  };
  const btn = (name) => page.getByRole("button", { name, exact: true });
  const cont = () => tap(page.locator("button.btn-primary"));

  const t0 = Date.now();
  await page.goto(BASE + "/");
  await page.waitForURL("**/onboarding");
  await snap("welcome");
  await cont();
  await page.getByRole("heading", { name: "Why are you here?" }).waitFor();
  for (const g of p.goals) await tap(btn(g));
  await snap("goals");
  await cont();
  await page.getByRole("heading", { name: "Pick your topics" }).waitFor();
  const disabledWithNoTopics = await page.locator("button.btn-primary").isDisabled();
  for (const t of p.topics) await tap(btn(t));
  await snap("topics");
  await cont();
  await page.getByRole("heading", { name: "Narrow it down" }).waitFor();
  for (const s of p.subtopics) await tap(btn(s));
  await snap("narrow");
  await cont();
  await page.getByRole("heading", { name: "Your level" }).waitFor();
  for (const [topic, level] of Object.entries(p.levels)) {
    await tap(page.locator("section", { hasText: topic }).getByRole("button", { name: level }));
  }
  await snap("level");
  await cont();
  await page.getByRole("heading", { name: "Your daily stopping point" }).waitFor();
  await snap("daily");

  // Edge case: closing the app halfway resumes where he left off.
  await page.reload();
  const resumed = await page.getByRole("heading", { name: "Your daily stopping point" }).waitFor({ timeout: 8000 }).then(() => true, () => false);
  await page.waitForLoadState("networkidle");

  await cont();
  await page.getByRole("heading", { name: "Daily nudge" }).waitFor();
  await tap(btn("No nudges"));
  await snap("nudge");
  await cont();
  // Install screen (iPhone Safari) or QR (laptop). Skippable.
  const skip = page.getByRole("button", { name: "Skip for now" });
  await skip.waitFor();
  await snap("install");
  await tap(skip);
  await page.locator('section[data-i="0"]').waitFor();
  const secondsToFirstLesson = (Date.now() - t0) / 1000;
  const tapsToFirstLesson = taps;
  await snap("first-lesson");

  const feed = await page.evaluate(() => fetch("/api/feed").then((r) => r.json()));
  const first3 = feed.lessons.slice(0, 3).map((l) => ({ title: l.title, topic: l.topic, subtopic: l.subtopic, wildcard: l.wildcard }));
  const count = feed.lessons.length;

  // Go through today's lessons card by card, the way a swipe would.
  for (let i = 0; i < count; i++) {
    const cards = page.locator(`section[data-i="${i}"] [data-cards]`);
    for (let c = 1; c < 5; c++) {
      await cards.evaluate((el, c) => el.scrollTo({ left: c * el.clientWidth }), c);
      await page.waitForTimeout(250);
      if (i === 0 && c === 1) await snap("idea-card");
      if (i === 0 && c === 4) await snap("say-card");
    }
    if (i === 0) {
      await tap(page.locator('section[data-i="0"]').getByRole("button", { name: "Save", exact: true }));
      if (view === "phone") {
        await tap(page.locator('section[data-i="0"]').getByRole("button", { name: "Ask tutor" }));
        await snap("tutor-sheet");
        await page.getByRole("button", { name: "Close tutor" }).first().click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(400);
      }
    }
    await page.locator(`section[data-i="${i + 1}"]`).evaluate((el) => el.scrollIntoView());
    await page.waitForTimeout(700);
  }
  const progress = await page.getByText(/of \d+ today/).textContent();
  await page.getByText("Quick recap 1 of").waitFor({ timeout: 5000 });
  await snap("recap");
  let recapQuestions = 0;
  for (let q = 0; q < 3; q++) {
    const choice = page.locator(`section[data-i="${count}"] button.choice`).first();
    if (!(await choice.isVisible().catch(() => false))) break;
    await choice.click();
    recapQuestions++;
    await page.locator(`section[data-i="${count}"] button.btn-primary`).click();
    await page.waitForTimeout(300);
  }
  const stopShown = await page.getByText("See you tomorrow.").isVisible();
  await snap("caught-up");

  await page.goto(BASE + "/saved");
  await page.getByRole("heading", { name: "Saved" }).waitFor();
  const savedCount = await page.locator("main li").count();
  await snap("saved");
  await page.goto(BASE + "/profile");
  await page.getByRole("heading", { name: "Profile" }).waitFor();
  await snap("profile");

  // Pattern Lab and the idea map (Persona A only, as in the spec).
  let lab = null;
  let map = null;
  if (key === "A") {
    await page.getByLabel("Watchlist").fill("aapl");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(500);
    await page.goto(BASE + "/lab");
    await page.getByText("Name and dates hidden").waitFor({ timeout: 15000 });
    await page.locator("canvas").first().waitFor();
    const noteShown = await page.getByText("For learning, not financial advice.").first().isVisible();
    const leaked = await page.evaluate(() => /AAPL/.test(document.querySelector("main section")?.textContent ?? ""));
    await snap("lab-guess");
    await page.getByRole("button", { name: /It climbs/ }).click();
    await page.getByLabel("Why? (optional)").fill("Higher lows, looks like an uptrend.");
    await page.getByRole("button", { name: "Show me what happened" }).click();
    await page.getByRole("button", { name: "Next chart" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await snap("lab-reveal");
    const revealText = await page.locator("main section").first().innerText();
    await page.getByRole("button", { name: "Next chart" }).scrollIntoViewIfNeeded();
    await snap("lab-reveal-facts");
    const current = page.locator("section", { hasText: "Do you notice any patterns?" }).first();
    await current.scrollIntoViewIfNeeded();
    await current.getByRole("button", { name: "Compare with what the app sees" }).click();
    await page.waitForTimeout(400);
    await current.scrollIntoViewIfNeeded();
    await snap("lab-current");
    lab = {
      noteShown,
      nameHiddenBeforeReveal: !leaked,
      revealNamesTicker: /AAPL/.test(revealText),
      revealHasTrend: /Trend\./.test(revealText),
      currentMarketShown: await current.getByText("Trend.").isVisible(),
      reveal: revealText.split("\n").filter(Boolean).slice(0, 4),
    };

    await page.goto(BASE + "/map");
    await page.getByRole("heading", { name: "Idea map" }).waitFor();
    const dots = page.locator("svg g[role=button]");
    const summary = await page.getByText(/\d+ lessons?, \d+ connections?/).textContent();
    await dots.first().click();
    await snap("idea-map");
    map = { dots: await dots.count(), summary: summary.split(".")[0], detailShown: await page.getByRole("link", { name: "Open this lesson" }).isVisible() };
  }

  // Coming back later the same day: the feed should still say he's done.
  await page.goto(BASE + "/");
  await page.getByText("See you tomorrow.").waitFor({ timeout: 8000 }).catch(() => {});
  const stillStopped = await page.getByText("See you tomorrow.").isVisible().catch(() => false);
  await snap("return-same-day");

  await ctx.close();
  return {
    persona: `${key} (${p.name})`,
    view,
    secondsToFirstLesson: Number(secondsToFirstLesson.toFixed(1)),
    tapsToFirstLesson,
    screensBeforeLesson: 8,
    disabledWithNoTopics,
    resumedAfterReload: resumed,
    first3,
    first3MatchPicks: first3.every((l) => p.picked.includes(l.topic)),
    wildcardPositions: feed.lessons.map((l, i) => (l.wildcard ? i + 1 : 0)).filter(Boolean),
    lessonsToday: count,
    progress,
    recapQuestions,
    stopShown,
    stillStoppedOnReturn: stillStopped,
    savedCount,
    lab,
    map,
    overflowOn: overflow,
    consoleErrors: errors,
  };
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const [key, p] of Object.entries(PERSONAS)) {
  for (const view of p.views) {
    const r = await run(browser, key, view);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  }
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
