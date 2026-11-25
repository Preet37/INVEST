import { inArray } from "drizzle-orm";
import { db, interaction, lesson } from "@/db";

export type MapNode = { id: number; title: string; topic: string; concepts: string[] };
export type MapLink = { a: number; b: number; shared: string[] };

// Lessons he has finished or saved, linked wherever two of them share a concept tag.
export async function getIdeaMap(): Promise<{ nodes: MapNode[]; links: MapLink[] }> {
  const d = db();
  const events = await d.selectDistinct({ lessonId: interaction.lessonId }).from(interaction).where(inArray(interaction.event, ["finish", "save"]));
  if (!events.length) return { nodes: [], links: [] };
  const rows = await d.select().from(lesson).where(inArray(lesson.id, events.map((e) => e.lessonId)));
  const nodes = rows.map((l) => ({ id: l.id, title: l.title, topic: l.topic, concepts: l.concepts }));
  return { nodes, links: linkByConcept(nodes) };
}

export function linkByConcept(nodes: MapNode[]): MapLink[] {
  const links: MapLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].concepts.filter((c) => nodes[j].concepts.includes(c));
      if (shared.length) links.push({ a: nodes[i].id, b: nodes[j].id, shared });
    }
  }
  return links;
}
