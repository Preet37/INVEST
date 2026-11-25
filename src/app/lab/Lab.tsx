"use client";

import { useCallback, useEffect, useState } from "react";
import PriceChart from "@/components/PriceChart";
import type { Bar, Fact } from "@/lib/patterns";

type Reveal = { symbol: string; from: string; to: string; cutoff: string; bars: Bar[]; change: number; outcome: string; correct: boolean; facts: Fact[]; explanation: string };
type Current = { symbol: string; bars: Bar[]; facts: Fact[] };

const CHOICES = [
  { id: "up", label: "It climbs", hint: "more than 4% higher" },
  { id: "flat", label: "It goes sideways", hint: "within 4% either way" },
  { id: "down", label: "It drops", hint: "more than 4% lower" },
];
const NOTE = "For learning, not financial advice.";
const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });

export default function Lab({ current, missing }: { current: Current[]; missing: string[] }) {
  const [round, setRound] = useState<{ token: string; bars: Bar[] } | null>(null);
  const [empty, setEmpty] = useState(false);
  const [guess, setGuess] = useState("");
  const [why, setWhy] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState({ right: 0, total: 0 });

  const load = useCallback(async () => {
    setReveal(null);
    setGuess("");
    setWhy("");
    setError("");
    setRound(null);
    try {
      const r = await fetch("/api/lab/round").then((x) => x.json());
      if (r.empty) setEmpty(true);
      else setRound(r);
    } catch {
      setError("Couldn't load a chart. Check your connection.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!round || !guess) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/lab/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: round.token, guess, why }) });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      setReveal(r);
      setScore((s) => ({ right: s.right + (r.correct ? 1 : 0), total: s.total + 1 }));
    } catch (e) {
      setError((e as Error).message || "Couldn't check that. Try again.");
    }
    setBusy(false);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Pattern Lab</h1>
          {score.total > 0 && (
            <span className="text-sm font-semibold text-muted">
              {score.right} of {score.total} right
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{NOTE}</p>

        {empty ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-muted">No price data yet. Charts appear here after the first daily data pull.</p>
        ) : !round ? (
          <p className="mt-6 text-muted">{error || "Loading a chart..."}</p>
        ) : !reveal ? (
          <section className="mt-5">
            <p className="text-sm font-semibold text-accent">A real stock or fund. Name and dates hidden.</p>
            <div className="mt-2 rounded-2xl border border-line bg-surface p-2">
              <PriceChart bars={round.bars} hideDates />
            </div>
            <p className="mt-2 text-sm text-muted">
              Each bar is one trading day: green closed higher, red closed lower. The bars along the bottom show volume, meaning how many shares changed hands. This is about 6 months.
            </p>
            <h2 className="mt-5 text-xl font-bold">What do you notice? What happens over the next 30 trading days (about 6 weeks)?</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {CHOICES.map((c) => (
                <button key={c.id} className="choice" aria-pressed={guess === c.id} onClick={() => setGuess(c.id)}>
                  <b>{c.label}</b> <span className="text-sm text-muted">({c.hint})</span>
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-semibold" htmlFor="why">
              Why? (optional)
            </label>
            <textarea id="why" value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder="What on the chart makes you think so?" className="mt-1 w-full rounded-xl border-2 border-line bg-surface p-3" />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button className="btn btn-primary mt-3 w-full" disabled={!guess || busy} onClick={submit}>
              {busy ? "Checking..." : "Show me what happened"}
            </button>
          </section>
        ) : (
          <section className="rise mt-5">
            <p className="text-sm font-semibold text-accent">
              {reveal.symbol} · {fmt(reveal.from)} to {fmt(reveal.to)}
            </p>
            <div className="mt-2 rounded-2xl border border-line bg-surface p-2">
              <PriceChart bars={reveal.bars} cutoff={reveal.cutoff} />
            </div>
            <h2 className="mt-4 text-2xl font-bold">
              {reveal.correct ? "You called it." : "Not this time."}{" "}
              <span className={reveal.change >= 0 ? "text-green-600" : "text-red-600"}>
                {reveal.change >= 0 ? "+" : ""}
                {(reveal.change * 100).toFixed(1)}%
              </span>
            </h2>
            <p className="mt-2">{reveal.explanation}</p>
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">What the chart was showing before</h3>
            <Facts facts={reveal.facts} />
            <button className="btn btn-primary mt-5 w-full" onClick={load}>
              Next chart
            </button>
          </section>
        )}

        <h2 className="mt-10 text-2xl font-bold tracking-tight">Current market</h2>
        <p className="mt-1 text-sm text-muted">Prices are end of day, not live. {NOTE}</p>
        {current.length === 0 && <p className="mt-3 text-muted">Nothing to show yet. Add tickers to your watchlist in Profile. Their charts appear after the next daily data pull.</p>}
        {current.map((c) => (
          <CurrentCard key={c.symbol} c={c} />
        ))}
        {missing.length > 0 && current.length > 0 && <p className="mt-3 text-sm text-muted">Still waiting on data for: {missing.join(", ")}.</p>}
      </div>
    </div>
  );
}

function CurrentCard({ c }: { c: Current }) {
  const [open, setOpen] = useState(false);
  const last = c.bars[c.bars.length - 1];
  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-baseline justify-between px-1">
        <b className="text-lg">{c.symbol}</b>
        <span className="text-sm text-muted">
          {last.close.toFixed(2)} at close on {new Date(last.day + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
        </span>
      </div>
      <PriceChart bars={c.bars} height={240} />
      <p className="mt-2 px-1 font-semibold">Do you notice any patterns?</p>
      {open ? (
        <Facts facts={c.facts} />
      ) : (
        <button className="btn btn-quiet mt-2 w-full" onClick={() => setOpen(true)}>
          Compare with what the app sees
        </button>
      )}
    </section>
  );
}

function Facts({ facts }: { facts: Fact[] }) {
  if (!facts.length) return <p className="mt-2 text-muted">Not enough history to read this one yet.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {facts.map((f) => (
        <li key={f.name} className="rise rounded-xl bg-bg p-3 text-[16px]">
          <b>{f.name}.</b> {f.text}
        </li>
      ))}
    </ul>
  );
}
