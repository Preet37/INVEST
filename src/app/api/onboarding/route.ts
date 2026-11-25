import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, topicPref, user } from "@/db";
import { getUser } from "@/lib/user";
import { GOAL_TOPIC, TOPICS } from "@/lib/topics";

export const dynamic = "force-dynamic";

const body = z.object({
  step: z.number().int().min(0).max(30),
  draft: z.object({
    goals: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    subtopics: z.record(z.string(), z.array(z.string())).optional(),
    levels: z.record(z.string(), z.number().int().min(1).max(3)).optional(),
  }),
  dailyGoal: z.number().int().min(1).max(20).optional(),
  nudgeTime: z.string().regex(/^\d\d:\d\d$/).nullable().optional(),
  timezone: z.string().max(60).optional(),
  finish: z.boolean().optional(),
});

export async function GET() {
  const u = await getUser();
  return NextResponse.json({ step: u.onboardingStep, draft: u.onboardingDraft, dailyGoal: u.dailyGoal, nudgeTime: u.nudgeTime, onboarded: u.onboarded });
}

// Saved after every screen, so closing the app halfway resumes where he left off.
export async function PUT(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { step, draft, dailyGoal, nudgeTime, timezone, finish } = parsed.data;
  const d = db();
  await getUser();
  await d
    .update(user)
    .set({
      onboardingStep: step,
      onboardingDraft: draft,
      ...(dailyGoal ? { dailyGoal } : {}),
      ...(nudgeTime !== undefined ? { nudgeTime } : {}),
      ...(timezone ? { timezone } : {}),
      ...(draft.goals ? { goals: draft.goals } : {}),
    })
    .where(eq(user.id, 1));

  if (finish) {
    const topics = (draft.topics ?? []).filter((t) => TOPICS.some((x) => x.id === t));
    if (topics.length === 0) return NextResponse.json({ error: "Pick at least one topic." }, { status: 400 });
    const boosted = new Set((draft.goals ?? []).map((g) => GOAL_TOPIC[g]).filter(Boolean));
    const existing = await d.select().from(topicPref);
    const rows = topics.flatMap((t) => {
      const level = draft.levels?.[t] ?? 1;
      // Keep any weight he has already earned through use (this also runs when he edits topics later).
      const keep = existing.find((e) => e.topic === t && e.subtopic === "")?.weight;
      return [
        { topic: t, subtopic: "", level, weight: keep ?? (boosted.has(t) ? 1.2 : 1) },
        ...(draft.subtopics?.[t] ?? []).map((s) => ({ topic: t, subtopic: s, level, weight: 1 })),
      ];
    });
    await d.transaction(async (tx) => {
      await tx.delete(topicPref);
      await tx.insert(topicPref).values(rows);
      await tx.update(user).set({ onboarded: true }).where(eq(user.id, 1));
    });
  }
  return NextResponse.json({ ok: true });
}
