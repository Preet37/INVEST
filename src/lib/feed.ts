import { desc, eq } from "drizzle-orm";
import { db, interaction, lesson, topicPref } from "@/db";
import { getUser, localDay } from "./user";
import { rank } from "./ranking";

export type FeedLesson = Awaited<ReturnType<typeof getFeed>>["lessons"][number];

// Today's feed: the lessons left before the daily stopping point, or `more` extra ones if he keeps going.
export async function getFeed(more = 0) {
  const d = db();
  const u = await getUser();
  const today = localDay(u.timezone);
  const [lessons, prefs, events] = await Promise.all([
    d.select().from(lesson),
    d.select().from(topicPref),
    d.select().from(interaction).orderBy(desc(interaction.at)),
  ]);

  const finished = new Set<number>();
  const hidden = new Set<number>();
  const skipped = new Set<number>();
  const finishedToday = new Set<number>();
  const saves = new Map<number, number>();
  for (const e of events) {
    if (e.event === "finish") {
      finished.add(e.lessonId);
      if (e.day === today) finishedToday.add(e.lessonId);
    } else if (e.event === "not_for_me") hidden.add(e.lessonId);
    else if (e.event === "skip") skipped.add(e.lessonId);
    else if (e.event === "save") saves.set(e.lessonId, (saves.get(e.lessonId) ?? 0) + 1);
    else if (e.event === "unsave") saves.set(e.lessonId, (saves.get(e.lessonId) ?? 0) - 1);
  }

  const doneToday = finishedToday.size;
  const want = more > 0 ? more : Math.max(u.dailyGoal - doneToday, 0);
  const unseen = lessons.filter((l) => !finished.has(l.id) && !hidden.has(l.id));
  const recentTopics = events
    .filter((e) => e.event === "finish" && e.day === today)
    .slice(0, 2)
    .reverse()
    .map((e) => lessons.find((l) => l.id === e.lessonId)?.topic)
    .filter((t): t is string => !!t);

  let ranked = rank(unseen, prefs, want, {
    penalty: (l) => (skipped.has(l.id) ? 0.3 : 1),
    startIndex: doneToday,
    recentTopics,
  });

  // Never empty: if new lessons run out, bring back older ones he has already seen.
  if (ranked.length < want) {
    const have = new Set(ranked.map((l) => l.id));
    const old = lessons.filter((l) => finished.has(l.id) && !finishedToday.has(l.id) && !hidden.has(l.id) && !have.has(l.id));
    ranked = ranked.concat(rank(old, prefs, want - ranked.length, { startIndex: doneToday + ranked.length }));
  }

  const savedIds = [...saves].filter(([, n]) => n > 0).map(([id]) => id);
  return { goal: u.dailyGoal, doneToday, lessons: ranked, savedIds, voice: u.voice, today };
}

export async function getSaved() {
  const d = db();
  const events = await d.select().from(interaction);
  const saves = new Map<number, number>();
  for (const e of events) {
    if (e.event === "save") saves.set(e.lessonId, (saves.get(e.lessonId) ?? 0) + 1);
    if (e.event === "unsave") saves.set(e.lessonId, (saves.get(e.lessonId) ?? 0) - 1);
  }
  const ids = new Set([...saves].filter(([, n]) => n > 0).map(([id]) => id));
  const all = await d.select().from(lesson).orderBy(desc(lesson.id));
  return all.filter((l) => ids.has(l.id));
}

export async function getLesson(id: number) {
  const [l] = await db().select().from(lesson).where(eq(lesson.id, id));
  return l ?? null;
}
