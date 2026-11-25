import { NextResponse, type NextRequest } from "next/server";
import { runNudge } from "@/lib/nudge";

export const dynamic = "force-dynamic";

// Called every 30 minutes by .github/workflows/nudge.yml with "Authorization: Bearer <CRON_SECRET>".
// (Vercel's free plan only runs cron jobs once a day, which can't hit a time he picks.)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runNudge());
}
