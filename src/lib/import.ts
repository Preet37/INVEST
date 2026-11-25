import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, item, lesson, source } from "@/db";

const words = (s: string) => s.trim().split(/\s+/).length;
const cardText = z
  .string()
  .min(1)
  .refine((s) => !s.includes("—"), "no em dashes")
  .refine((s) => words(s) <= 40, "at most 40 words per card");

const CARD_ORDER = ["hook", "idea", "example", "use", "say"] as const;

export const lessonSchema = z.object({
  sourceId: z.string(),
  itemUrl: z.string().min(1), // unique per original item; used to skip duplicates
  itemTitle: z.string(),
  publishedAt: z.string().optional(),
  excerpt: z.string().max(600).optional(),
  sourceTitle: z.string(),
  sourceUrl: z.string().url().nullable().optional(),
  title: z.string().min(1),
  topic: z.string(),
  subtopic: z.string(),
  difficulty: z.number().int().min(1).max(3),
  concepts: z.array(z.string()).default([]),
  cards: z
    .array(z.object({ type: z.enum(CARD_ORDER), text: cardText }))
    .length(5)
    .refine((c) => c.every((card, i) => card.type === CARD_ORDER[i]), "cards must be hook, idea, example, use, say"),
  word: z.object({ word: z.string(), meaning: z.string(), example: z.string() }).nullable().optional(),
  quiz: z
    .object({ question: z.string(), choices: z.array(z.string()).min(2).max(4), answer: z.number().int().min(0) })
    .refine((q) => q.answer < q.choices.length, "answer must point at a choice")
    .nullable()
    .optional(),
  tutorQuestion: z.string().nullable().optional(),
});

export const fileSchema = z.object({ date: z.string(), lessons: z.array(lessonSchema) });
const sourcesSchema = z.object({
  sources: z.array(
    z.object({ id: z.string(), type: z.string(), topic: z.string(), title: z.string(), url: z.string().nullable().optional() }),
  ),
});

type Files = { sources: unknown; lessonFiles: { name: string; data: unknown }[] };

async function readLocal(): Promise<Files> {
  const root = path.join(process.cwd(), "content");
  const sources = JSON.parse(await fs.readFile(path.join(root, "sources.json"), "utf8"));
  const names = (await fs.readdir(path.join(root, "lessons"))).filter((n) => n.endsWith(".json")).sort();
  const lessonFiles = await Promise.all(
    names.map(async (name) => ({ name, data: JSON.parse(await fs.readFile(path.join(root, "lessons", name), "utf8")) })),
  );
  return { sources, lessonFiles };
}

// Reads straight from GitHub, so new lesson files show up without waiting for a redeploy.
async function readGitHub(repo: string): Promise<Files> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "invest-import" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const get = async (p: string) => {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${p}`, { headers, cache: "no-store" });
    if (!r.ok) throw new Error(`GitHub ${r.status} for ${p}`);
    return r.json();
  };
  const file = async (p: string) => JSON.parse(Buffer.from((await get(p)).content, "base64").toString("utf8"));
  const listing = (await get("content/lessons")) as { name: string }[];
  const names = listing.map((f) => f.name).filter((n) => n.endsWith(".json")).sort();
  return {
    sources: await file("content/sources.json"),
    lessonFiles: await Promise.all(names.map(async (name) => ({ name, data: await file(`content/lessons/${name}`) }))),
  };
}

export async function importContent() {
  const d = db();
  let files: Files;
  let from = "local files";
  if (process.env.GITHUB_REPO) {
    try {
      files = await readGitHub(process.env.GITHUB_REPO);
      from = "GitHub";
    } catch {
      files = await readLocal();
    }
  } else files = await readLocal();

  const { sources } = sourcesSchema.parse(files.sources);
  for (const s of sources) {
    const row = { id: s.id, type: s.type, topic: s.topic, title: s.title, url: s.url ?? null };
    await d.insert(source).values(row).onConflictDoUpdate({ target: source.id, set: row });
  }

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const f of files.lessonFiles) {
    const parsed = fileSchema.safeParse(f.data);
    if (!parsed.success) {
      errors.push(`${f.name}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    for (const l of parsed.data.lessons) {
      const [existing] = await d.select({ id: item.id }).from(item).where(eq(item.url, l.itemUrl));
      if (existing) {
        skipped++;
        continue;
      }
      const [it] = await d
        .insert(item)
        .values({
          sourceId: l.sourceId,
          url: l.itemUrl,
          title: l.itemTitle,
          publishedAt: l.publishedAt ? new Date(l.publishedAt) : null,
          excerpt: l.excerpt ?? null,
        })
        .returning({ id: item.id });
      await d.insert(lesson).values({
        itemId: it.id,
        title: l.title,
        topic: l.topic,
        subtopic: l.subtopic,
        difficulty: l.difficulty,
        concepts: l.concepts,
        cards: l.cards,
        word: l.word ?? null,
        quiz: l.quiz ?? null,
        tutorQuestion: l.tutorQuestion ?? null,
        sourceTitle: l.sourceTitle,
        sourceUrl: l.sourceUrl ?? null,
        createdAt: new Date(parsed.data.date + "T12:00:00Z"),
      });
      added++;
    }
  }
  return { from, added, skipped, errors };
}
