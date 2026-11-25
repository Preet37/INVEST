import { NextResponse, type NextRequest } from "next/server";
import { importContent } from "@/lib/import";

export const dynamic = "force-dynamic";

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>". No AI runs here.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await importContent());
}
