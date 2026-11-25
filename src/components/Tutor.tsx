"use client";

import { useRef, useState } from "react";
import type { FeedLesson } from "@/lib/feed";
import { claudeUrl, speak } from "./Feed";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Explain like I'm new", "Give me a real example", "How would I use this?"];

export default function Tutor({ lesson, cardIndex, onClose }: { lesson: FeedLesson; cardIndex: number; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const lastCard = cardIndex === lesson.cards.length - 1;

  const send = async (content: string) => {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: content.trim() }];
    setMsgs(next);
    setText("");
    setBusy(true);
    let reply = "Couldn't reach the tutor. Check your connection and try again.";
    try {
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, cardIndex, messages: next.slice(-10) }),
      }).then((x) => x.json());
      if (r.reply) reply = r.reply;
    } catch {}
    setMsgs([...next, { role: "assistant", content: reply }]);
    setBusy(false);
    setTimeout(() => list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }), 50);
  };

  const transcript =
    `I'm learning about "${lesson.title}" (from ${lesson.sourceTitle}). The lesson says:\n${lesson.cards.map((c) => c.text).join("\n")}\n\n` +
    (msgs.length ? `My conversation with a tutor so far:\n${msgs.map((m) => `${m.role === "user" ? "Me" : "Tutor"}: ${m.content}`).join("\n")}\n\nPlease continue from here.` : "Help me go deeper on this.");

  return (
    <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="min-w-0">
          <div className="font-bold">Tutor</div>
          <div className="truncate text-xs text-muted">On: {lesson.title}</div>
        </div>
        <button aria-label="Close tutor" className="grid h-11 w-11 place-items-center rounded-full text-2xl text-muted desk:hidden" onClick={onClose}>
          ×
        </button>
      </div>

      <div ref={list} className="flex-1 space-y-3 overflow-y-auto p-4 text-[16px]">
        {msgs.length === 0 && (
          <p className="text-muted">
            {lastCard && lesson.tutorQuestion ? (
              <>
                <b className="text-ink">A question for you:</b> {lesson.tutorQuestion}
              </>
            ) : (
              "Ask anything about this lesson. I already know which card you're on."
            )}
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-2xl bg-accent px-3 py-2 text-accent-ink" : "mr-4 rounded-2xl bg-bg px-3 py-2"}>
            {m.content}
            {m.role === "assistant" && (
              <div className="mt-1 flex gap-4 text-xs font-semibold text-muted">
                <button className="min-h-9" onClick={() => speak(m.content)}>
                  Read aloud
                </button>
                {i === msgs.length - 1 && (
                  <button className="min-h-9" onClick={() => send("Tell me more about that.")}>
                    Tell me more
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="mr-4 rounded-2xl bg-bg px-3 py-2 text-muted">Thinking...</div>}
      </div>

      <div className="border-t border-line p-3">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="min-h-9 shrink-0 rounded-full border border-line px-3 text-sm" onClick={() => send(s)} disabled={busy}>
              {s}
            </button>
          ))}
          <a className="grid min-h-9 shrink-0 place-items-center rounded-full border border-line px-3 text-sm" href={claudeUrl(transcript)} target="_blank" rel="noreferrer">
            Continue in Claude
          </a>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input
            id="tutor-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the tutor..."
            aria-label="Ask the tutor"
            className="h-12 min-w-0 flex-1 rounded-xl border-2 border-line bg-bg px-3"
          />
          <button className="btn btn-primary !px-4" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted">For learning, not financial advice.</p>
      </div>
    </div>
  );
}
