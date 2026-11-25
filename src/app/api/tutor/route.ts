import { NextResponse, type NextRequest } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, tutorMessage } from "@/db";
import { getLesson } from "@/lib/feed";
import { getUser, localDay } from "@/lib/user";
import { TUTOR_LIMIT, TUTOR_SYSTEM, askTutor } from "@/lib/tutor";

const body = z.object({
  lessonId: z.number().int(),
  cardIndex: z.number().int().min(0).max(4).default(0),
  mode: z.enum(["chat", "feedback"]).default("chat"),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { lessonId, cardIndex, mode, messages } = parsed.data;
  const l = await getLesson(lessonId);
  if (!l) return NextResponse.json({ error: "No such lesson" }, { status: 404 });

  const d = db();
  const u = await getUser();
  const day = localDay(u.timezone);
  const [{ n }] = await d
    .select({ n: count() })
    .from(tutorMessage)
    .where(and(eq(tutorMessage.day, day), eq(tutorMessage.role, "user")));
  if (n >= TUTOR_LIMIT()) {
    return NextResponse.json({ limited: true, reply: "The tutor's resting for today. Tap Ask Claude to keep going there." });
  }

  const lessonText = l.cards.map((c, i) => `Card ${i + 1} (${c.type}): ${c.text}`).join("\n");
  const system =
    `${TUTOR_SYSTEM}\n\nLesson: "${l.title}" (source: ${l.sourceTitle})\n${lessonText}\nThe learner is on card ${cardIndex + 1}.` +
    (mode === "feedback"
      ? `\n\nThe learner is explaining this idea in their own words. In under 60 words: say what they got right, fix anything wrong, and suggest one sharper way to phrase it.`
      : "");

  const last = messages[messages.length - 1];
  await d.insert(tutorMessage).values({ lessonId, role: "user", content: last.content, day });
  try {
    const reply = await askTutor(system, messages);
    await d.insert(tutorMessage).values({ lessonId, role: "assistant", content: reply, day });
    return NextResponse.json({ reply, left: TUTOR_LIMIT() - n - 1 });
  } catch {
    return NextResponse.json({ unavailable: true, reply: "The tutor isn't connected right now. Tap Ask Claude to ask there instead." });
  }
}
