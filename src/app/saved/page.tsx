import Link from "next/link";
import { getSaved } from "@/lib/feed";
import { Shell } from "@/lib/shell";
import { topicName } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <Shell>
      <List />
    </Shell>
  );
}

async function List() {
  const lessons = await getSaved();
  return (
    <div className="mx-auto h-full max-w-xl overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-6">
      <h1 className="text-3xl font-bold tracking-tight">Saved</h1>
      {lessons.length === 0 ? (
        <p className="mt-4 text-muted">Nothing saved yet. Tap Save on any lesson and it shows up here. Saved lessons also come back as quick recap questions.</p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link href={`/lesson/${l.id}`} className="block rounded-2xl border border-line bg-surface p-4">
                <div className="text-xs font-semibold text-muted">{topicName(l.topic)}</div>
                <div className="font-semibold">{l.title}</div>
                <div className="mt-1 text-sm text-muted">{l.cards[4].text}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
