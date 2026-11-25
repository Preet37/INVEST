import type { NextRequest } from "next/server";

// RP_ID / RP_ORIGIN come from env in production. Locally they fall back to the request's host.
export function rp(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return {
    rpName: "Invest",
    rpID: process.env.RP_ID || host.split(":")[0],
    origin: process.env.RP_ORIGIN || `${proto}://${host}`,
  };
}

export const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
export const unb64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));
