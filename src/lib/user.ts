import { db, user } from "@/db";
import { eq } from "drizzle-orm";

export async function getUser() {
  const d = db();
  const [u] = await d.select().from(user).where(eq(user.id, 1));
  if (u) return u;
  const [created] = await d.insert(user).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await d.select().from(user).where(eq(user.id, 1)))[0];
}

// The user's local calendar day as YYYY-MM-DD.
export function localDay(timezone: string, at = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
