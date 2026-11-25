import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "invest_session";
export const CHALLENGE_COOKIE = "invest_challenge";
export const SESSION_DAYS = 30;

const key = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(s);
};

export const devBypass = () => process.env.AUTH_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production";

export async function sign(payload: Record<string, unknown>, maxAgeSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(key());
}

export async function verify<T = Record<string, unknown>>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, key())).payload as T;
  } catch {
    return null;
  }
}

export const cookieOpts = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});
