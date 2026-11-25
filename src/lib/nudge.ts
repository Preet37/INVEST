import { sendNotification, setVapidDetails } from "web-push";
import { eq } from "drizzle-orm";
import { db, pushSub, user } from "@/db";
import { getFeed } from "./feed";
import { getUser, localDay } from "./user";

const WINDOW_MINUTES = 180; // if the scheduler was down, don't send a 7am nudge at 11pm

function localMinutes(timezone: string, at: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return get("hour") * 60 + get("minute");
  } catch {
    return at.getUTCHours() * 60 + at.getUTCMinutes();
  }
}

// True when the chosen time has passed today (within the window) and today's nudge hasn't gone out yet.
export function shouldNudge(nudgeTime: string | null, timezone: string, lastNudgeDay: string | null, now = new Date()) {
  if (!nudgeTime) return false;
  if (lastNudgeDay === localDay(timezone, now)) return false;
  const [h, m] = nudgeTime.split(":").map(Number);
  const due = h * 60 + m;
  const mins = localMinutes(timezone, now);
  return mins >= due && mins - due <= WINDOW_MINUTES;
}

const clip = (s: string, n = 120) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

// Called every half hour by the scheduler. Sends at most one notification a day.
export async function runNudge(now = new Date()) {
  const u = await getUser();
  if (!shouldNudge(u.nudgeTime, u.timezone, u.lastNudgeDay, now)) return { sent: 0, reason: "not due" };
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { sent: 0, reason: "VAPID keys are not set" };

  const d = db();
  const today = localDay(u.timezone, now);
  const feed = await getFeed();
  // Already hit today's stopping point: no need to nudge.
  if (!feed.lessons.length) {
    await d.update(user).set({ lastNudgeDay: today }).where(eq(user.id, 1));
    return { sent: 0, reason: "already done today" };
  }
  const subs = await d.select().from(pushSub);
  if (!subs.length) return { sent: 0, reason: "no device has reminders turned on" };

  // The nudge is the hook of today's first lesson: specific and curious, never guilt.
  const payload = JSON.stringify({ title: "Invest", body: clip(feed.lessons[0].cards[0].text), url: "/" });
  setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@example.com", pub, priv);
  let sent = 0;
  const errors: string[] = [];
  for (const s of subs) {
    try {
      await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404 or 410 means the device dropped the subscription. Forget it.
      if (status === 404 || status === 410) await d.delete(pushSub).where(eq(pushSub.id, s.id));
      else errors.push(String(status ?? (e as Error).message));
    }
  }
  if (sent > 0) await d.update(user).set({ lastNudgeDay: today }).where(eq(user.id, 1));
  return { sent, errors };
}
