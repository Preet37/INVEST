// Real passkey flow in Chromium with a virtual authenticator (no dev bypass).
//   AUTH_DEV_BYPASS=false SETUP_CODE=abc ... npx next dev -p 3101 ; node tests/passkey.mjs
import { createRequire } from "module";
import { execSync } from "child_process";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3101";
const DB = process.env.TEST_DATABASE_URL || "postgres://invest:invest@localhost:5432/invest_test";
execSync(`psql "${DB}" -q -c 'TRUNCATE "user", passkey, topic_pref, interaction, review, tutor_message RESTART IDENTITY'`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("WebAuthn.enable");
await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
});

// No session and no passkey yet: lands on setup.
await page.goto(BASE + "/");
await page.waitForURL("**/setup");
assert.equal((await page.request.get(BASE + "/api/feed")).status(), 401, "API refuses without a session");
await page.locator("button.btn-primary").click();

// Wrong setup code is refused.
await page.getByLabel("Setup code").fill("wrong");
await page.locator("button.btn-primary").click();
await page.getByText("That setup code isn't right.").waitFor();

await page.getByLabel("Setup code").fill("abc");
await page.locator("button.btn-primary").click();
await page.waitForURL("**/onboarding", { timeout: 10000 }).catch(async () => {
  console.log("STUCK:", page.url(), await page.locator("[role=alert]").allTextContents());
  process.exit(1);
});
await page.getByRole("heading", { name: "Why are you here?" }).waitFor();
console.log("ok  registered a passkey and continued into onboarding");

// Setup turns itself off once a passkey exists.
await page.goto(BASE + "/setup");
await page.waitForURL("**/login");
const again = await page.request.post(BASE + "/api/auth/register-options", { data: { setupCode: "abc" } });
console.log("ok  /setup refuses after first passkey");

await page.request.post(BASE + "/api/auth/logout");
assert.equal(again.status(), 200, "adding a device works while logged in");
const anon = await (await browser.newContext()).request.post(BASE + "/api/auth/register-options", { data: { setupCode: "abc" } });
assert.equal(anon.status(), 403, "setup code no longer registers a passkey for a stranger");
console.log("ok  setup code is dead for anyone without a session");

await page.goto(BASE + "/");
await page.waitForURL("**/login");
await page.getByRole("button", { name: "Unlock with Face ID" }).click();
await page.waitForURL("**/onboarding");
console.log("ok  logged back in with the passkey");
await browser.close();
