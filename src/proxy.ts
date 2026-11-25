import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, devBypass, verify } from "@/lib/session";

// Single-user app: anything without a valid session gets the login screen.
const PUBLIC = [/^\/login$/, /^\/setup$/, /^\/api\/auth\//, /^\/api\/cron\//];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => p.test(pathname)) || devBypass()) return NextResponse.next();
  const session = await verify(req.cookies.get(SESSION_COOKIE)?.value);
  if (session?.ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/|icons/|sw\\.js|manifest\\.webmanifest|favicon\\.ico).*)"],
};
