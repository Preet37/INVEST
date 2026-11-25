import { test } from "node:test";
import assert from "node:assert/strict";
import { explainOutcome, outcomeOf, readChart, trendOf, type Bar } from "../src/lib/patterns";
import { shouldNudge } from "../src/lib/nudge";
import { linkByConcept } from "../src/lib/map";

const series = (closes: number[], volume = 100): Bar[] =>
  closes.map((c, i) => ({ day: `2020-01-${String((i % 28) + 1).padStart(2, "0")}`, open: c, high: c * 1.01, low: c * 0.99, close: c, volume }));

test("trend: rising, falling and flat series are read correctly", () => {
  assert.equal(trendOf(series([...Array(120)].map((_, i) => 100 + i * 0.3))), "up");
  assert.equal(trendOf(series([...Array(120)].map((_, i) => 100 - i * 0.3))), "down");
  assert.equal(trendOf(series([...Array(120)].map((_, i) => 100 + Math.sin(i / 5)))), "sideways");
});

test("outcome thresholds", () => {
  assert.equal(outcomeOf(0.05), "up");
  assert.equal(outcomeOf(-0.05), "down");
  assert.equal(outcomeOf(0.02), "flat");
});

test("readChart always reports the trend and flags a price sitting at its ceiling", () => {
  const facts = readChart(series([...Array(120)].map((_, i) => 100 + i * 0.3)));
  assert.equal(facts[0].name, "Trend");
  assert.ok(facts.some((f) => f.name.startsWith("Resistance")));
  assert.ok(facts.every((f) => !f.text.includes("—")));
});

test("explainOutcome says whether the trend carried on", () => {
  const shown = series([...Array(120)].map((_, i) => 100 + i * 0.3));
  const up = explainOutcome(shown, series([140, 145, 150]));
  assert.equal(up.outcome, "up");
  assert.match(up.summary, /carried on/);
  const down = explainOutcome(shown, series([130, 120, 110]));
  assert.equal(down.outcome, "down");
  assert.match(down.summary, /never guarantee/);
});

test("nudge: sends once, after the chosen time, in his timezone", () => {
  const tz = "America/Los_Angeles";
  const at = (iso: string) => new Date(iso);
  // 19:00 Pacific on Nov 25 is 03:00 UTC on Nov 26.
  assert.equal(shouldNudge("19:00", tz, null, at("2026-11-26T02:30:00Z")), false, "too early");
  assert.equal(shouldNudge("19:00", tz, null, at("2026-11-26T03:07:00Z")), true, "first run after the time");
  assert.equal(shouldNudge("19:00", tz, "2026-11-25", at("2026-11-26T03:37:00Z")), false, "already sent today");
  assert.equal(shouldNudge("07:00", tz, null, at("2026-11-26T03:07:00Z")), false, "hours late: skip");
  assert.equal(shouldNudge(null, tz, null, at("2026-11-26T03:07:00Z")), false, "no nudges chosen");
});

test("idea map links lessons that share a concept", () => {
  const links = linkByConcept([
    { id: 1, title: "a", topic: "finance", concepts: ["compounding", "patience"] },
    { id: 2, title: "b", topic: "psychology", concepts: ["habits", "compounding"] },
    { id: 3, title: "c", topic: "business", concepts: ["mvp"] },
  ]);
  assert.deepEqual(links, [{ a: 1, b: 2, shared: ["compounding"] }]);
});
