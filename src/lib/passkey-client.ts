import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

const post = async (url: string, body?: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
  return j;
};

// Turns browser passkey errors into something a person can act on.
function friendly(e: unknown): Error {
  const err = e as Error;
  if (err?.name === "NotAllowedError" || err?.name === "AbortError") {
    return new Error("That was cancelled or timed out. Tap the button to try again.");
  }
  if (err?.name === "InvalidStateError") return new Error("This device is already registered. Go to the login screen instead.");
  if (err?.name === "NotSupportedError") return new Error("This browser can't use passkeys. Try Safari or Chrome.");
  return err instanceof Error ? err : new Error("Something went wrong. Try again.");
}

export function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android phone";
  if (/Windows/.test(ua)) return "Windows PC";
  return "Device";
}

export async function registerPasskey(setupCode?: string) {
  try {
    const optionsJSON = await post("/api/auth/register-options", { setupCode, deviceLabel: deviceLabel() });
    const response = await startRegistration({ optionsJSON });
    await post("/api/auth/register-verify", response);
  } catch (e) {
    throw friendly(e);
  }
}

export async function loginWithPasskey() {
  try {
    const optionsJSON = await post("/api/auth/login-options");
    const response = await startAuthentication({ optionsJSON });
    await post("/api/auth/login-verify", response);
  } catch (e) {
    throw friendly(e);
  }
}
