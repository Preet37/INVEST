import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, user } from "@/db";
import { getUser } from "@/lib/user";

const body = z
  .object({
    dailyGoal: z.number().int().min(1).max(20),
    nudgeTime: z.string().regex(/^\d\d:\d\d$/).nullable(),
    lockMinutes: z.number().int().min(1).max(1440),
    voice: z.boolean(),
    watchlist: z.array(z.string().max(10)).max(12),
  })
  .partial();

export async function PATCH(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await getUser();
  if (Object.keys(parsed.data).length) await db().update(user).set(parsed.data).where(eq(user.id, 1));
  return NextResponse.json({ ok: true });
}
