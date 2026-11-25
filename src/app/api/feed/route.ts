import { NextResponse, type NextRequest } from "next/server";
import { getFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const more = Math.min(Number(req.nextUrl.searchParams.get("more") ?? 0) || 0, 10);
  return NextResponse.json(await getFeed(more));
}
