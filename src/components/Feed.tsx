"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedLesson } from "@/lib/feed";
import type { RecapItem } from "@/lib/recap";
import { topicName } from "@/lib/topics";
import Tutor from "./Tutor";

type Props = {
  initial: { goal: number; doneToday: number; lessons: FeedLesson[]; savedIds: number[]; voice: boolean };
  single?: boolean; // one saved lesson opened on its own: no daily stop
};

const LABEL: Record<string, string> = { hook: "", idea: "The idea", example: "Real example", use: "Use it", say: "Say it to a friend" };
const color = (topic: string) => `var(--${["finance", "psychology", "business"].includes(topic) ? topic : "other"})`;

const track = (lessonId: number, event: string, ms?: number) =>
  fetch("/api/interaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, event, ms }), keepalive: true }).catch(() => {});

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export const claudeUrl = (q: string) => `https://claude.ai/new?q=${encodeURIComponent(q)}`;

export default function Feed({ initial, single }: Props) {
  const [lessons, setLessons] = useState(initial.lessons);
  const [done, setDone] = useState(initial.doneToday);
  const [saved, setSaved] = useState(() => new Set(initial.savedIds));
  const [active, setActive] = useState(0);
  const [cards, setCards] = useState<Record<number, number>>({});
  const [tutorOpen, setTutorOpen] = useState(false);
  const [toast, setToast] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const finished = useRef(new Set<number>());
  const viewed = useRef(new Set<number>());
  const enteredAt = useRef(0);
  const prev = useRef<FeedLesson | null>(null);
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const current = lessons[active] as FeedLesson | undefined;
  const cardIdx = current ? cards[current.id] ?? 0 : 0;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 1800);
  };

  // Which lesson is on screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lessons.length]);

  // Log a view when a lesson appears, and a quick skip if he left the last one's hook card in under 2 seconds.
  useEffect(() => {
    const now = Date.now();
    const p = prev.current;
    if (p && p.id !== current?.id && (cardsRef.current[p.id] ?? 0) === 0 && now - enteredAt.current < 2000 && !finished.current.has(p.id)) {
      track(p.id, "skip", now - enteredAt.current);
    }
    enteredAt.current = now;
    prev.current = current ?? null;
    if (current && !viewed.current.has(current.id)) {
      viewed.current.add(current.id);
      track(current.id, "view");
    }
    window.speechSynthesis?.cancel();
  }, [current]);

  const onCard = (l: FeedLesson, idx: number) => {
    setCards((c) => (c[l.id] === idx ? c : { ...c, [l.id]: idx }));
    if (idx === l.cards.length - 1 && !finished.current.has(l.id)) {
      finished.current.add(l.id);
      // eslint-disable-next-line react-hooks/purity -- only ever called from a scroll handler
      track(l.id, "finish", Date.now() - enteredAt.current);
      if (!single) setDone((d) => d + 1);
    }
  };

  const goLesson = useCallback((i: number) => {
    const el = scroller.current?.querySelector(`[data-i="${i}"]`);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);
  const goCard = useCallback((lessonId: number, idx: number) => {
    const el = scroller.current?.querySelector(`[data-cards="${lessonId}"]`) as HTMLElement | null;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, []);

  const toggleSave = (l: FeedLesson) => {
    const on = !saved.has(l.id);
    setSaved((s) => {
      const n = new Set(s);
      if (on) n.add(l.id);
      else n.delete(l.id);
      return n;
    });
    track(l.id, on ? "save" : "unsave");
    flash(on ? "Saved" : "Removed from Saved");
  };
  const deeper = (l: FeedLesson) => {
    track(l.id, "deeper");
    flash("Got it. More like this is coming.");
  };
  const notForMe = (l: FeedLesson) => {
    track(l.id, "not_for_me");
    setLessons((ls) => ls.filter((x) => x.id !== l.id));
    flash("Okay, less of that.");
  };

  // Laptop keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "j") goLesson(active + 1);
      else if (k === "arrowup" || k === "k") goLesson(Math.max(0, active - 1));
      else if (!current) return;
      else if (k === "arrowright") goCard(current.id, Math.min(cardIdx + 1, current.cards.length - 1));
      else if (k === "arrowleft") goCard(current.id, Math.max(cardIdx - 1, 0));
      else if (k === "s") toggleSave(current);
      else if (k === "d") deeper(current);
      else if (k === "/") document.getElementById("tutor-input")?.focus();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keepGoing = async () => {
    const r = await fetch("/api/feed?more=3").then((x) => x.json());
    const have = new Set(lessons.map((l) => l.id));
    const fresh = (r.lessons as FeedLesson[]).filter((l) => !have.has(l.id));
    if (!fresh.length) return flash("That's everything for now. New lessons arrive tomorrow.");
    const at = lessons.length;
    setLessons([...lessons, ...fresh]);
    setTimeout(() => goLesson(at), 50);
  };

  return (
    <div className="relative h-[calc(100dvh-var(--nav-h))] desk:grid desk:h-dvh desk:grid-cols-[1fr_380px]">
      <div className="relative h-full min-w-0">
        {!single && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-[calc(env(safe-area-inset-top)+10px)]">
            <div className="rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-muted shadow-sm backdrop-blur" aria-live="polite">
              {Math.min(done, initial.goal)} of {initial.goal} today
            </div>
          </div>
        )}
        <div ref={scroller} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll">
          {lessons.map((l, i) => (
            <section key={l.id} data-i={i} className="mx-auto flex h-full max-w-xl snap-start snap-always flex-col px-4 pb-3 pt-[calc(env(safe-area-inset-top)+44px)]">
              <div className="flex items-center gap-1.5" aria-label={`Card ${(cards[l.id] ?? 0) + 1} of ${l.cards.length}`}>
                {l.cards.map((_, c) => (
                  <button
                    key={c}
                    aria-label={`Go to card ${c + 1}`}
                    onClick={() => goCard(l.id, c)}
                    className="h-6 flex-1"
                  >
                    <span className="block h-1 rounded-full transition-colors" style={{ background: c <= (cards[l.id] ?? 0) ? color(l.topic) : "var(--line)" }} />
                  </button>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                <span style={{ color: color(l.topic) }}>{topicName(l.topic)}</span>
                {l.wildcard && <span className="rounded-full bg-line px-2 py-0.5 text-muted">Something different</span>}
              </div>

              <div
                data-cards={l.id}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  onCard(l, Math.round(el.scrollLeft / el.clientWidth));
                }}
                className="no-scrollbar mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-scroll"
              >
                {l.cards.map((c, ci) => (
                  <article key={ci} className="flex w-full shrink-0 snap-center snap-always flex-col justify-center overflow-y-auto px-1">
                    {LABEL[c.type] && (
                      <div className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: color(l.topic) }}>
                        {LABEL[c.type]}
                      </div>
                    )}
                    <p className={c.type === "hook" ? "text-[30px] font-bold leading-tight tracking-tight" : "text-[22px] leading-snug"}>{c.text}</p>
                    {c.type === "hook" && i === 0 && <p className="mt-6 text-sm text-muted desk:hidden">Swipe left to keep reading →</p>}
                    {c.type === "hook" && <p className="mt-6 hidden text-sm text-muted desk:block">Press → for the next card, ↓ for the next lesson.</p>}
                    {c.type === "say" && <YourTurn lesson={l} />}
                    {c.type === "say" && l.word && (
                      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 text-[15px]">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted">Word worth knowing</div>
                        <b>{l.word.word}</b>: {l.word.meaning}
                        <div className="mt-1 italic text-muted">"{l.word.example}"</div>
                      </div>
                    )}
                    {c.type === "say" && (
                      <p className="mt-4 text-sm text-muted">
                        From{" "}
                        {l.sourceUrl ? (
                          <a className="underline" href={l.sourceUrl} target="_blank" rel="noreferrer">
                            {l.sourceTitle}
                          </a>
                        ) : (
                          l.sourceTitle
                        )}
                        {!single && i < lessons.length - 1 && <span className="desk:hidden"> · Swipe up for the next one</span>}
                      </p>
                    )}
                  </article>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-[13px] font-semibold">
                <Action on={saved.has(l.id)} onClick={() => toggleSave(l)} label={saved.has(l.id) ? "Saved" : "Save"} />
                <Action onClick={() => deeper(l)} label="Go deeper" />
                <Action onClick={() => notForMe(l)} label="Not for me" />
                <Action onClick={() => speak(l.cards[cards[l.id] ?? 0].text)} label="Read aloud" />
                <Action onClick={() => setTutorOpen(true)} label="Ask tutor" className="desk:hidden" />
                <a
                  className="grid min-h-11 place-items-center rounded-xl border border-line bg-surface"
                  href={claudeUrl(`I'm learning about "${l.title}" (from ${l.sourceTitle}). This card says: "${l.cards[cards[l.id] ?? 0].text}" Help me understand it more deeply, in plain language.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ask Claude
                </a>
              </div>
            </section>
          ))}
          {!single && (
            <section data-i={lessons.length} className="mx-auto flex h-full max-w-xl snap-start flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
              <EndPanel visible={active === lessons.length || lessons.length === 0} done={done} goal={initial.goal} onKeepGoing={keepGoing} />
            </section>
          )}
        </div>
        {toast && (
          <div role="status" className="rise pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center">
            <div className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lg">{toast}</div>
          </div>
        )}
      </div>

      {/* Tutor: bottom sheet on a phone, always-open side panel on a laptop. */}
      {tutorOpen && <button aria-label="Close tutor" className="fixed inset-0 z-30 bg-black/40 desk:hidden" onClick={() => setTutorOpen(false)} />}
      <aside
        className={`fixed inset-x-0 bottom-0 z-40 h-[78dvh] rounded-t-3xl border-t border-line bg-surface transition-transform duration-300 desk:static desk:z-auto desk:h-dvh desk:translate-y-0 desk:rounded-none desk:border-l desk:border-t-0 ${
          tutorOpen ? "translate-y-0" : "translate-y-full"
        }`}
        aria-label="Tutor"
      >
        {current ? (
          <Tutor key={current.id} lesson={current} cardIndex={cardIdx} onClose={() => setTutorOpen(false)} />
        ) : (
          <div className="p-6 text-muted">The tutor is here when you're on a lesson.</div>
        )}
      </aside>
    </div>
  );
}

function Action({ label, onClick, on, className = "" }: { label: string; onClick: () => void; on?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 rounded-xl border bg-surface transition-transform active:scale-95 ${on ? "pop border-accent text-accent" : "border-line"} ${className}`}
    >
      {label}
    </button>
  );
}

// "Your turn": he explains the idea in his own words and gets quick feedback.
function YourTurn({ lesson }: { lesson: FeedLesson }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button className="btn btn-quiet mt-5 self-start" onClick={() => setOpen(true)}>
        Your turn: say it your way
      </button>
    );
  const send = async () => {
    setBusy(true);
    track(lesson.id, "your_turn");
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, cardIndex: 4, mode: "feedback", messages: [{ role: "user", content: text }] }),
      }).then((x) => x.json());
      setReply(r.reply ?? "Couldn't get feedback just now.");
    } catch {
      setReply("Couldn't get feedback just now. Check your connection.");
    }
    setBusy(false);
  };
  return (
    <div className="rise mt-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Explain it like you're telling a friend..."
        className="w-full rounded-xl border-2 border-line bg-surface p-3"
        aria-label="Your explanation"
      />
      <button className="btn btn-primary mt-2" disabled={busy || text.trim().length < 5} onClick={send}>
        {busy ? "Reading..." : "Get feedback"}
      </button>
      {reply && <p className="rise mt-3 rounded-xl bg-bg p-3 text-[15px]">{reply}</p>}
    </div>
  );
}

// The daily stop: caught up, a short recap quiz, then see you tomorrow.
function EndPanel({ visible, done, goal, onKeepGoing }: { visible: boolean; done: number; goal: number; onKeepGoing: () => void }) {
  const [items, setItems] = useState<RecapItem[] | null>(null);
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [sentence, setSentence] = useState("");
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (visible && items === null) {
      fetch("/api/recap")
        .then((r) => r.json())
        .then((r) => setItems(r.items ?? []))
        .catch(() => setItems([]));
    }
  }, [visible, items]);

  const item = items?.[n];
  const answer = (correct: boolean) => {
    if (correct) setScore((s) => s + 1);
    if (item?.reviewId) {
      fetch("/api/recap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: item.reviewId, correct }) }).catch(() => {});
    }
  };
  const nextQ = () => {
    setN(n + 1);
    setPicked(null);
    setSentence("");
    setShown(false);
  };

  if (items === null) return <p className="text-center text-muted">One moment...</p>;

  if (item) {
    return (
      <div className="rise" key={n}>
        <div className="text-sm font-bold uppercase tracking-wide text-accent">
          {done >= goal ? "You're caught up" : "That's today's set"} · Quick recap {n + 1} of {items.length}
        </div>
        <h2 className="mt-3 text-2xl font-bold leading-snug">{item.question}</h2>
        <p className="mt-1 text-sm text-muted">From: {item.lessonTitle}</p>
        {item.kind === "quiz" ? (
          <div className="mt-5 flex flex-col gap-2.5">
            {item.choices!.map((c, i) => {
              const state = picked === null ? "" : i === item.answer ? "!border-green-500" : i === picked ? "!border-red-500" : "opacity-60";
              return (
                <button
                  key={i}
                  className={`choice ${state}`}
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    answer(i === item.answer);
                  }}
                >
                  {c}
                </button>
              );
            })}
            {picked !== null && <p className="font-semibold">{picked === item.answer ? "Right." : "Not quite. The green one is the answer."}</p>}
          </div>
        ) : (
          <div className="mt-5">
            <textarea value={sentence} onChange={(e) => setSentence(e.target.value)} rows={2} className="w-full rounded-xl border-2 border-line bg-surface p-3" placeholder="Type a sentence..." aria-label="Your sentence" />
            {!shown ? (
              <button className="btn btn-quiet mt-2" disabled={sentence.trim().length < 3} onClick={() => setShown(true)}>
                Check it
              </button>
            ) : (
              <div className="rise mt-3 rounded-xl bg-surface p-4 text-[15px]">
                <b>{item.word!.word}</b>: {item.word!.meaning}
                <div className="mt-1 italic text-muted">"{item.word!.example}"</div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-quiet flex-1" onClick={() => { answer(true); nextQ(); }}>
                    I used it right
                  </button>
                  <button className="btn btn-quiet flex-1" onClick={() => { answer(false); nextQ(); }}>
                    Not quite
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {item.kind === "quiz" && picked !== null && (
          <button className="btn btn-primary mt-5 w-full" onClick={nextQ}>
            {n + 1 < items.length ? "Next question" : "Finish"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rise text-center">
      <div className="text-5xl">✓</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{done >= goal ? "You're caught up" : "That's today's set"}</h2>
      <p className="mt-2 text-muted">
        {done > 0 ? `${done} ${done === 1 ? "lesson" : "lessons"} today.` : "Nothing finished yet today."}
        {items.length > 0 && ` Recap: ${score} of ${items.length} right.`}
      </p>
      <p className="mt-6 text-xl font-semibold">See you tomorrow.</p>
      <p className="mt-1 text-sm text-muted">Stopping here is the point. Go use what you learned.</p>
      <button className="mt-8 min-h-11 text-sm text-muted underline" onClick={onKeepGoing}>
        Keep going anyway
      </button>
    </div>
  );
}
