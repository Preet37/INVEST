import { NextResponse } from "next/server";
import { pickRound } from "@/lib/market";
import { sign } from "@/lib/session";

export const dynamic = "force-dynamic";

// A past chart with the outcome held back. The token says which chart it was, so the answer never reaches the browser early.
export async function GET() {
  const round = await pickRound();
  if (!round) return NextResponse.json({ empty: true });
  const end = round.shown[round.shown.length - 1].day;
  const token = await sign({ s: round.symbol, e: end, k: "lab" }, 3600);
  // Dates and the ticker stay hidden until the reveal, so he reads the chart instead of remembering the year.
  const bars = round.shown.map((b, i) => ({ ...b, day: fakeDay(i) }));
  return NextResponse.json({ token, bars });
}

// Stand-in dates (weekdays from a fixed start) so the chart library has a time axis without giving the real dates away.
function fakeDay(i: number) {
  const d = new Date(Date.UTC(2000, 0, 3));
  d.setUTCDate(d.getUTCDate() + Math.floor(i / 5) * 7 + (i % 5));
  return d.toISOString().slice(0, 10);
}
