import { db, passkey, topicPref } from "@/db";
import { Shell } from "@/lib/shell";
import { getUser } from "@/lib/user";
import { devBypass } from "@/lib/session";
import { topicName } from "@/lib/topics";
import Settings from "./Settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <Shell>
      <Load />
    </Shell>
  );
}

async function Load() {
  const u = await getUser();
  const [keys, prefs] = await Promise.all([db().select().from(passkey), db().select().from(topicPref)]);
  return (
    <Settings
      initial={{ dailyGoal: u.dailyGoal, nudgeTime: u.nudgeTime, lockMinutes: u.lockMinutes, voice: u.voice, watchlist: u.watchlist }}
      devices={keys.map((k) => k.deviceLabel)}
      topics={prefs.filter((p) => p.subtopic === "").map((p) => topicName(p.topic))}
      bypass={devBypass()}
    />
  );
}
