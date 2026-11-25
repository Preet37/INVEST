import { NextResponse, type NextRequest } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { db, passkey } from "@/db";
import { b64, rp } from "@/lib/webauthn";
import { CHALLENGE_COOKIE, SESSION_COOKIE, SESSION_DAYS, cookieOpts, sign, verify } from "@/lib/session";

export async function POST(req: NextRequest) {
  const ch = await verify<{ c: string; k: string; label: string }>(req.cookies.get(CHALLENGE_COOKIE)?.value);
  if (!ch || ch.k !== "reg") return NextResponse.json({ error: "That took too long. Try again." }, { status: 400 });
  const { rpID, origin } = rp(req);
  try {
    const result = await verifyRegistrationResponse({
      response: await req.json(),
      expectedChallenge: ch.c,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!result.verified || !result.registrationInfo) throw new Error("not verified");
    const { credential } = result.registrationInfo;
    await db().insert(passkey).values({
      credentialId: credential.id,
      publicKey: b64(credential.publicKey),
      counter: credential.counter,
      deviceLabel: ch.label,
    });
  } catch {
    return NextResponse.json({ error: "Couldn't save that passkey. Try again." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  const age = SESSION_DAYS * 86400;
  res.cookies.set(SESSION_COOKIE, await sign({ ok: true }, age), cookieOpts(age));
  res.cookies.delete(CHALLENGE_COOKIE);
  return res;
}
