import { NextResponse, type NextRequest } from "next/server";
import { syncPrices } from "@/lib/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily end-of-day price pull. Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.MARKET_DATA_API_KEY) return NextResponse.json({ error: "MARKET_DATA_API_KEY is not set" }, { status: 500 });
  return NextResponse.json(await syncPrices());
}
