import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db, interaction, lesson, review } from "@/db";
import { addDays, getUser, localDay } from "./user";

export const INTERVALS = [1, 3, 7, 21]; // days until each review

export type RecapItem = {
  reviewId: number | null; // null = a lesson from today, asked once without changing its schedule
  lessonId: number;
  lessonTitle: string;
  kind: "quiz" | "word";
  question: string;
  choices?: string[];
  answer?: number;
  word?: { word: string; meaning: string; example: string };
};

export async function getRecap(limit = 3): Promise<RecapItem[]> {
  const d = db();
  const u = await getUser();
  const today = localDay(u.timezone);
  const due = await d
    .select()
    .from(review)
    .where(and(isNotNull(review.nextDue), lte(review.nextDue, today)))
    .orderBy(asc(review.nextDue))
    .limit(limit);

  const picks: { reviewId: number | null; lessonId: number; step: number }[] = due.map((r) => ({
    reviewId: r.id,
    lessonId: r.lessonId,
    step: r.step,
  }));
  if (picks.length < limit) {
    const todays = await d
      .select({ lessonId: interaction.lessonId })
      .from(interaction)
      .where(and(eq(interaction.event, "finish"), eq(interaction.day, today)));
    for (const t of todays) {
      if (picks.length >= limit) break;
      if (!picks.some((p) => p.lessonId === t.lessonId)) picks.push({ reviewId: null, lessonId: t.lessonId, step: 0 });
    }
  }
  if (!picks.length) return [];
  const lessons = await d.select().from(lesson).where(inArray(lesson.id, picks.map((p) => p.lessonId)));

  const items: RecapItem[] = [];
  for (const p of picks) {
    const l = lessons.find((x) => x.id === p.lessonId);
    if (!l) continue;
    // The word worth knowing comes back on every second review.
    if (l.word && (p.step % 2 === 1 || !l.quiz)) {
      items.push({ ...p, lessonTitle: l.title, kind: "word", question: `Use "${l.word.word}" in a sentence.`, word: l.word });
    } else if (l.quiz) {
      items.push({ ...p, lessonTitle: l.title, kind: "quiz", question: l.quiz.question, choices: l.quiz.choices, answer: l.quiz.answer });
    }
  }
  return items;
}

export async function answerReview(reviewId: number, correct: boolean) {
  const d = db();
  const u = await getUser();
  const today = localDay(u.timezone);
  const [r] = await d.select().from(review).where(eq(review.id, reviewId));
  if (!r) return;
  // Right: move to the next gap (1, 3, 7, 21 days). Wrong: start over tomorrow.
  const step = correct ? r.step + 1 : 0;
  const nextDue = step >= INTERVALS.length ? null : addDays(today, INTERVALS[step]);
  await d.update(review).set({ step, nextDue }).where(eq(review.id, reviewId));
}
