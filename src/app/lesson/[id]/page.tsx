import { notFound } from "next/navigation";
import Feed from "@/components/Feed";
import { getLesson, getSaved } from "@/lib/feed";
import { Shell } from "@/lib/shell";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  return (
    <Shell>
      <One id={id} />
    </Shell>
  );
}

async function One({ id }: { id: number }) {
  const l = Number.isInteger(id) ? await getLesson(id) : null;
  if (!l) notFound();
  const saved = await getSaved();
  return <Feed single initial={{ goal: 1, doneToday: 0, lessons: [{ ...l, wildcard: false }], savedIds: saved.map((s) => s.id), voice: true }} />;
}
