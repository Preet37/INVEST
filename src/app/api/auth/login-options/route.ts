import { NextResponse, type NextRequest } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db, passkey } from "@/db";
import { rp } from "@/lib/webauthn";
import { CHALLENGE_COOKIE, cookieOpts, sign } from "@/lib/session";

export async function POST(req: NextRequest) {
  const keys = await db().select().from(passkey);
  if (keys.length === 0) return NextResponse.json({ error: "No passkey yet. Go to /setup first." }, { status: 400 });
  const options = await generateAuthenticationOptions({
    rpID: rp(req).rpID,
    allowCredentials: keys.map((k) => ({ id: k.credentialId })),
    userVerification: "required",
  });
  const res = NextResponse.json(options);
  res.cookies.set(CHALLENGE_COOKIE, await sign({ c: options.challenge, k: "auth" }, 300), cookieOpts(300));
  return res;
}
