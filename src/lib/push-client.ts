// Web Push in the browser. On iPhone this only exists when the app is opened from the home screen icon.

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const toBytes = (b64: string) => {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(b64.length / 4) * 4, "="));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

// Asks for permission and registers this device. Returns a short message a person can read.
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    return { ok: false, message: ios ? "On iPhone, reminders only work after you add Invest to your home screen and open it from there." : "This browser can't show reminders." };
  }
  const { key } = await fetch("/api/push").then((r) => r.json());
  if (!key) return { ok: false, message: "Reminders aren't set up on the server yet (VAPID keys missing)." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, message: "Notifications are blocked for this app. You can allow them in your device settings." };
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(key) }));
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    if (!r.ok) throw new Error();
    return { ok: true, message: "Reminders are on for this device." };
  } catch {
    return { ok: false, message: "Couldn't turn on reminders. Try again." };
  }
}
