// v1 ranking, kept simple on purpose: score = topic weight x freshness x difficulty fit.

export type RankLesson = { id: number; topic: string; subtopic: string; difficulty: number; createdAt: Date };
export type Pref = { topic: string; subtopic: string; level: number; weight: number };

export const WILDCARD_EVERY = 5; // about 1 lesson in 5 is from a topic he didn't pick
export const MAX_SAME_TOPIC_RUN = 2;

export function score(l: RankLesson, prefs: Pref[], now = new Date()) {
  const topic = prefs.find((p) => p.topic === l.topic && p.subtopic === "");
  if (!topic) return 0;
  const sub = prefs.find((p) => p.topic === l.topic && p.subtopic === l.subtopic);
  const weight = topic.weight * (sub ? 1.5 * sub.weight : 1);
  const ageDays = Math.max(0, (now.getTime() - l.createdAt.getTime()) / 86400000);
  const freshness = Math.max(0.3, 1 / (1 + ageDays / 14));
  const fit = 1 / (1 + Math.abs(l.difficulty - topic.level));
  return weight * freshness * fit;
}

// Orders lessons for the feed. `penalty` lowers lessons he skipped before.
export function rank<T extends RankLesson>(
  lessons: T[],
  prefs: Pref[],
  count: number,
  opts: { penalty?: (l: T) => number; now?: Date; startIndex?: number; recentTopics?: string[] } = {},
): (T & { wildcard: boolean })[] {
  const picked = new Set(prefs.filter((p) => p.subtopic === "").map((p) => p.topic));
  const s = (l: T) => score(l, prefs, opts.now) * (opts.penalty?.(l) ?? 1);
  const main = lessons.filter((l) => picked.has(l.topic)).sort((a, b) => s(b) - s(a) || a.id - b.id);
  const wild = lessons
    .filter((l) => !picked.has(l.topic))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id - b.id);

  const out: (T & { wildcard: boolean })[] = [];
  const topics = [...(opts.recentTopics ?? [])];
  const start = opts.startIndex ?? 0;

  const blocked = (topic: string) =>
    topics.length >= MAX_SAME_TOPIC_RUN && topics.slice(-MAX_SAME_TOPIC_RUN).every((t) => t === topic);

  while (out.length < count && (main.length || wild.length)) {
    const position = start + out.length + 1;
    const wantWild = position % WILDCARD_EVERY === 0;
    let pool = wantWild && wild.length ? wild : main.length ? main : wild;
    let i = pool.findIndex((l) => !blocked(l.topic));
    if (i === -1) {
      // Every remaining lesson in this pool would break the variety rule. Try the other pool first.
      const other = pool === main ? wild : main;
      const j = other.findIndex((l) => !blocked(l.topic));
      if (j !== -1) {
        pool = other;
        i = j;
      } else i = 0;
    }
    const [l] = pool.splice(i, 1);
    out.push({ ...l, wildcard: pool === wild });
    topics.push(l.topic);
  }
  return out;
}
