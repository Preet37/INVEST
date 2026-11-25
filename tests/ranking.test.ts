import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, score, type Pref, type RankLesson } from "../src/lib/ranking";

const now = new Date("2026-11-25T12:00:00Z");
const L = (id: number, topic: string, subtopic = "x", difficulty = 1): RankLesson => ({ id, topic, subtopic, difficulty, createdAt: now });
const prefs: Pref[] = [
  { topic: "finance", subtopic: "", level: 1, weight: 1.2 },
  { topic: "finance", subtopic: "reading-charts", level: 1, weight: 1 },
  { topic: "psychology", subtopic: "", level: 1, weight: 1 },
];

test("picked subtopics and matching difficulty score higher", () => {
  assert.ok(score(L(1, "finance", "reading-charts"), prefs, now) > score(L(2, "finance", "other"), prefs, now));
  assert.ok(score(L(1, "finance", "x", 1), prefs, now) > score(L(2, "finance", "x", 3), prefs, now));
  assert.equal(score(L(3, "business"), prefs, now), 0);
});

test("never more than 2 lessons in a row from the same topic", () => {
  const lessons = [...Array(8)].map((_, i) => L(i + 1, "finance")).concat([...Array(4)].map((_, i) => L(i + 20, "psychology")));
  const out = rank(lessons, prefs, 10, { now });
  for (let i = 2; i < out.length; i++) {
    assert.ok(!(out[i].topic === out[i - 1].topic && out[i].topic === out[i - 2].topic), `run of 3 at ${i}`);
  }
});

test("every fifth lesson is a wildcard from a topic he didn't pick", () => {
  const lessons = [...Array(6)].map((_, i) => L(i + 1, i % 2 ? "finance" : "psychology")).concat([L(50, "business"), L(51, "business")]);
  const out = rank(lessons, prefs, 8, { now });
  assert.equal(out[4].topic, "business");
  assert.equal(out[4].wildcard, true);
  assert.ok(out.slice(0, 4).every((l) => !l.wildcard));
});

test("with only one picked topic and no other content, the feed still fills", () => {
  const out = rank([...Array(5)].map((_, i) => L(i + 1, "psychology")), [prefs[2]], 5, { now });
  assert.equal(out.length, 5);
});

test("one picked topic: other topics only appear as the 1-in-5 wildcard, never because of the variety rule", () => {
  const lessons = [...Array(6)].map((_, i) => L(i + 1, "psychology")).concat([L(50, "finance"), L(51, "business")]);
  const out = rank(lessons, [prefs[2]], 6, { now });
  assert.deepEqual(out.map((l) => l.wildcard), [false, false, false, false, true, false]);
});
