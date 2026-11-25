import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, interaction, lesson, review, topicPref } from "@/db";
import { addDays, getUser, localDay } from "@/lib/user";

const body = z.object({
  lessonId: z.number().int(),
  event: z.enum(["view", "finish", "save", "unsave", "deeper", "not_for_me", "skip", "your_turn"]),
  ms: z.number().int().optional(),
});

// How each action moves the topic's weight in the ranking.
const NUDGE: Record<string, number> = { save: 0.15, deeper: 0.3, finish: 0.05, your_turn: 0.1, not_for_me: -0.3, skip: -0.1 };

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { lessonId, event, ms } = parsed.data;
  const d = db();
  const [l] = await d.select().from(lesson).where(eq(lesson.id, lessonId));
  if (!l) return NextResponse.json({ error: "No such lesson" }, { status: 404 });
  const u = await getUser();
  const day = localDay(u.timezone);

  if (event === "finish") {
    // Finishing the same lesson twice in a day counts once.
    const [dup] = await d
      .select({ id: interaction.id })
      .from(interaction)
      .where(and(eq(interaction.lessonId, lessonId), eq(interaction.event, "finish"), eq(interaction.day, day)));
    if (dup) return NextResponse.json({ ok: true });
  }
  await d.insert(interaction).values({ lessonId, event, ms: ms ?? null, day });

  const nudge = NUDGE[event];
  if (nudge) {
    await d
      .update(topicPref)
      .set({ weight: sql`least(3, greatest(0.2, ${topicPref.weight} + ${nudge}))` })
      .where(and(eq(topicPref.topic, l.topic), eq(topicPref.subtopic, "")));
    if (event === "deeper") {
      // "Go deeper" also boosts the exact subtopic, even if he didn't pick it in onboarding.
      await d
        .insert(topicPref)
        .values({ topic: l.topic, subtopic: l.subtopic, weight: 1.3 })
        .onConflictDoUpdate({
          target: [topicPref.topic, topicPref.subtopic],
          set: { weight: sql`least(3, ${topicPref.weight} + 0.3)` },
        });
    }
  }
  // Saved or finished lessons come back as recap questions, starting tomorrow.
  if (event === "finish" || event === "save") {
    await d.insert(review).values({ lessonId, nextDue: addDays(day, 1), step: 0 }).onConflictDoNothing();
  }
  return NextResponse.json({ ok: true });
}
