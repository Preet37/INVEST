import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { db, passkey } from "@/db";
import { rp, unb64 } from "@/lib/webauthn";
import { CHALLENGE_COOKIE, SESSION_COOKIE, SESSION_DAYS, cookieOpts, sign, verify } from "@/lib/session";

export async function POST(req: NextRequest) {
  const ch = await verify<{ c: string; k: string }>(req.cookies.get(CHALLENGE_COOKIE)?.value);
  if (!ch || ch.k !== "auth") return NextResponse.json({ error: "That took too long. Try again." }, { status: 400 });
  const body = await req.json();
  const [key] = await db().select().from(passkey).where(eq(passkey.credentialId, String(body?.id)));
  if (!key) return NextResponse.json({ error: "This device isn't registered." }, { status: 400 });
  const { rpID, origin } = rp(req);
  try {
    const result = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: ch.c,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: key.credentialId, publicKey: unb64(key.publicKey), counter: key.counter },
    });
    if (!result.verified) throw new Error("not verified");
    await db().update(passkey).set({ counter: result.authenticationInfo.newCounter }).where(eq(passkey.id, key.id));
  } catch {
    return NextResponse.json({ error: "That didn't work. Try again." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  const age = SESSION_DAYS * 86400;
  res.cookies.set(SESSION_COOKIE, await sign({ ok: true }, age), cookieOpts(age));
  res.cookies.delete(CHALLENGE_COOKIE);
  return res;
}
