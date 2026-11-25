import { NextResponse, type NextRequest } from "next/server";
import { answerReview, getRecap } from "@/lib/recap";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await getRecap() });
}

export async function POST(req: NextRequest) {
  const { reviewId, correct } = await req.json().catch(() => ({}));
  if (typeof reviewId !== "number") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  await answerReview(reviewId, !!correct);
  return NextResponse.json({ ok: true });
}
