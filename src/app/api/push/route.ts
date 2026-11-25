import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, pushSub } from "@/db";

export const dynamic = "force-dynamic";

// The public key the browser needs to subscribe. (Public by design; the private key never leaves the server.)
export async function GET() {
  return NextResponse.json({ key: process.env.VAPID_PUBLIC_KEY || null });
}

const body = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) });

export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await db().insert(pushSub).values({ endpoint, ...keys }).onConflictDoUpdate({ target: pushSub.endpoint, set: keys });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint === "string") await db().delete(pushSub).where(eq(pushSub.endpoint, endpoint));
  return NextResponse.json({ ok: true });
}
