import { NextResponse, type NextRequest } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { timingSafeEqual } from "crypto";
import { db, passkey } from "@/db";
import { rp } from "@/lib/webauthn";
import { CHALLENGE_COOKIE, SESSION_COOKIE, cookieOpts, sign, verify } from "@/lib/session";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// First passkey: needs the one-time setup code. Later passkeys ("Add this device"): need a session.
export async function POST(req: NextRequest) {
  const { setupCode, deviceLabel } = await req.json().catch(() => ({}));
  const existing = await db().select().from(passkey);
  const session = await verify(req.cookies.get(SESSION_COOKIE)?.value);

  if (existing.length > 0 && !session?.ok) {
    return NextResponse.json({ error: "Setup is already done. Log in instead." }, { status: 403 });
  }
  if (existing.length === 0) {
    const expected = process.env.SETUP_CODE;
    if (!expected || typeof setupCode !== "string" || !same(setupCode.trim(), expected)) {
      return NextResponse.json({ error: "That setup code isn't right." }, { status: 403 });
    }
  }

  const { rpName, rpID } = rp(req);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: "Invest",
    userID: new TextEncoder().encode("invest-owner"),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.credentialId })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
  const res = NextResponse.json(options);
  const label = typeof deviceLabel === "string" ? deviceLabel.slice(0, 40) : "Device";
  res.cookies.set(CHALLENGE_COOKIE, await sign({ c: options.challenge, k: "reg", label }, 300), cookieOpts(300));
  return res;
}
