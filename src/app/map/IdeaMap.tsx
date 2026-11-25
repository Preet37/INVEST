"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MapLink, MapNode } from "@/lib/map";
import { TOPICS, topicName } from "@/lib/topics";

const W = 600;
const H = 640;
const color = (topic: string) => `var(--${["finance", "psychology", "business"].includes(topic) ? topic : "other"})`;

// A small spring layout: linked lessons pull together, every pair pushes apart, topics drift to their own corner.
// It starts from fixed positions, so the same lessons always land in the same places.
function layout(nodes: MapNode[], links: MapLink[]) {
  const topics = [...new Set(nodes.map((n) => n.topic))];
  const home = (t: string) => {
    const a = (topics.indexOf(t) / Math.max(topics.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: W / 2 + Math.cos(a) * 130, y: H / 2 + Math.sin(a) * 150 };
  };
  const pos = nodes.map((n, i) => {
    const h = home(n.topic);
    const a = i * 2.4; // golden-angle spread
    return { x: h.x + Math.cos(a) * (30 + i * 3), y: h.y + Math.sin(a) * (30 + i * 3) };
  });
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  for (let step = 0; step < 300; step++) {
    const f = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d2 = Math.max(dx * dx + dy * dy, 100);
        const k = 16000 / d2;
        const d = Math.sqrt(d2);
        f[i].x += (dx / d) * k;
        f[i].y += (dy / d) * k;
        f[j].x -= (dx / d) * k;
        f[j].y -= (dy / d) * k;
      }
      const h = home(nodes[i].topic);
      f[i].x += (h.x - pos[i].x) * 0.02;
      f[i].y += (h.y - pos[i].y) * 0.02;
    }
    for (const l of links) {
      const a = index.get(l.a)!;
      const b = index.get(l.b)!;
      const dx = pos[b].x - pos[a].x;
      const dy = pos[b].y - pos[a].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const k = (d - 130) * 0.03;
      f[a].x += (dx / d) * k;
      f[a].y += (dy / d) * k;
      f[b].x -= (dx / d) * k;
      f[b].y -= (dy / d) * k;
    }
    pos.forEach((p, i) => {
      p.x = Math.min(W - 40, Math.max(40, p.x + f[i].x));
      p.y = Math.min(H - 40, Math.max(40, p.y + f[i].y));
    });
  }
  return pos;
}

export default function IdeaMap({ nodes, links }: { nodes: MapNode[]; links: MapLink[] }) {
  const pos = useMemo(() => layout(nodes, links), [nodes, links]);
  const [picked, setPicked] = useState<number | null>(null);
  const at = (id: number) => pos[nodes.findIndex((n) => n.id === id)];
  const sel = nodes.find((n) => n.id === picked);
  const selLinks = links.filter((l) => l.a === picked || l.b === picked);
  const topics = TOPICS.filter((t) => nodes.some((n) => n.topic === t.id));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)]">
        <h1 className="text-3xl font-bold tracking-tight">Idea map</h1>
        {nodes.length === 0 ? (
          <p className="mt-4 text-muted">Nothing here yet. Each lesson you finish or save becomes a dot. Lines appear between lessons that share an idea.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {nodes.length} {nodes.length === 1 ? "lesson" : "lessons"}, {links.length} {links.length === 1 ? "connection" : "connections"}. Each dot is a lesson you finished or saved. A line means two lessons share an idea. Tap a dot.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {topics.map((t) => (
                <span key={t.id} className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: color(t.id) }} />
                  {t.name}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full rounded-2xl border border-line bg-surface" role="img" aria-label="Map of lessons and how they connect">
              {links.map((l) => {
                const a = at(l.a);
                const b = at(l.b);
                const on = picked === l.a || picked === l.b;
                return <line key={`${l.a}-${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "var(--accent)" : "var(--line)"} strokeWidth={on ? 3 : 2} />;
              })}
              {nodes.map((n, i) => {
                const p = pos[i];
                const on = picked === n.id;
                const label = n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title;
                return (
                  <g key={n.id} onClick={() => setPicked(on ? null : n.id)} className="cursor-pointer outline-none" role="button" aria-label={n.title} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setPicked(on ? null : n.id)}>
                    <circle cx={p.x} cy={p.y} r={26} fill="transparent" />
                    <circle cx={p.x} cy={p.y} r={on ? 15 : 11} fill={color(n.topic)} stroke="var(--surface)" strokeWidth={3} />
                    <text x={p.x} y={p.y + 30} textAnchor="middle" fontSize="15" fontWeight={on ? 700 : 500} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
            {sel && (
              <div className="rise mt-3 rounded-2xl border border-line bg-surface p-4">
                <div className="text-xs font-semibold" style={{ color: color(sel.topic) }}>
                  {topicName(sel.topic)}
                </div>
                <div className="text-lg font-bold">{sel.title}</div>
                {selLinks.length ? (
                  <ul className="mt-2 flex flex-col gap-1 text-[15px]">
                    {selLinks.map((l) => {
                      const other = nodes.find((n) => n.id === (l.a === sel.id ? l.b : l.a))!;
                      return (
                        <li key={other.id}>
                          Connects to <b>{other.title}</b> through {l.shared.join(", ")}.
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-[15px] text-muted">No connections yet. They appear as you cover related lessons.</p>
                )}
                <Link href={`/lesson/${sel.id}`} className="btn btn-quiet mt-3">
                  Open this lesson
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
