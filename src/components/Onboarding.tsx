"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { GOALS, TOPICS } from "@/lib/topics";
import { registerPasskey } from "@/lib/passkey-client";

type Draft = {
  at?: string;
  goals?: string[];
  topics?: string[];
  subtopics?: Record<string, string[]>;
  levels?: Record<string, number>;
};
type Props = {
  mode: "setup" | "onboarding" | "edit";
  initial: { draft: Draft; dailyGoal: number; nudgeTime: string | null };
};

const LEVELS = [
  { v: 1, name: "New to this" },
  { v: 2, name: "Know the basics" },
  { v: 3, name: "Pretty deep" },
];

const toggle = (list: string[] = [], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export default function Onboarding({ mode, initial }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [nudge, setNudge] = useState<string | null>(initial.nudgeTime);
  const [nudgeChosen, setNudgeChosen] = useState(mode === "edit");
  const [env, setEnv] = useState({ iosSafari: false, desk: false, ios: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad/.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    setEnv({
      ios,
      iosSafari: ios && !standalone,
      desk: window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches,
    });
  }, []);

  const steps = useMemo(() => {
    const s = mode === "setup" ? ["welcome", "passkey"] : mode === "edit" ? [] : ["welcome"];
    if (mode !== "setup") {
      s.push("goals", "topics", "narrow", "level", "daily", "nudge");
      if (mode !== "edit" && (env.iosSafari || env.desk)) s.push("install");
    }
    return s;
  }, [mode, env]);

  const [at, setAt] = useState(() => (mode === "edit" ? "goals" : mode === "setup" ? "welcome" : initial.draft.at ?? "welcome"));
  const index = Math.max(0, steps.indexOf(at));
  const step = steps[index] ?? steps[0];
  const topics = draft.topics ?? [];

  // Progress is out of 10: the 9 setup screens plus the first lesson.
  const POSITION: Record<string, number> = { welcome: 1, passkey: 2, goals: 3, topics: 4, narrow: 5, level: 6, daily: 7, nudge: 8, install: 9 };
  const total = mode === "edit" ? steps.length : 10;
  const shown = mode === "edit" ? index + 1 : POSITION[step] ?? 1;

  const save = async (next: string, finish = false, d: Draft = draft) => {
    const r = await fetch("/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: Math.max(0, steps.indexOf(next)),
        draft: { ...d, at: next },
        dailyGoal,
        nudgeTime: nudge,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        finish,
      }),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Couldn't save. Check your connection and try again.");
  };

  const canContinue =
    step === "topics" ? topics.length > 0 : step === "nudge" ? nudgeChosen : step === "passkey" ? code.trim().length > 0 : true;

  const next = async () => {
    setError("");
    setBusy(true);
    try {
      if (step === "passkey") {
        await registerPasskey(code);
        await save("goals");
        router.replace("/onboarding");
        return;
      }
      const last = index === steps.length - 1;
      if (mode === "setup") {
        setAt(steps[index + 1]);
      } else if (last) {
        await save(step, true);
        router.replace("/");
        router.refresh();
        return;
      } else {
        await save(steps[index + 1]);
        setAt(steps[index + 1]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError("");
    if (index > 0) setAt(steps[index - 1]);
    else if (mode === "edit") router.push("/profile");
  };

  const label =
    step === "welcome" ? "Get started" : step === "passkey" ? (busy ? "Waiting for Face ID..." : env.ios ? "Set up Face ID" : "Set up my passkey")
    : index === steps.length - 1 ? (mode === "edit" ? "Save changes" : "Show me my first lesson") : "Continue";

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="flex h-11 items-center gap-3">
        {(index > 0 || mode === "edit") && (
          <button onClick={back} aria-label="Back" className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-2xl">
            ‹
          </button>
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={shown} aria-valuemax={total}>
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(shown / total) * 100}%` }} />
        </div>
      </div>

      <div key={step} className="rise no-scrollbar flex-1 overflow-y-auto py-6">
        {step === "welcome" && (
          <div className="flex h-full flex-col justify-center">
            <div className="text-lg font-bold text-accent">Invest</div>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">Swap endless scrolling for 5 minutes that make you sharper.</h1>
            <p className="mt-4 text-muted">Short lessons you swipe through, picked for you. A few a day, then it tells you you're done.</p>
          </div>
        )}

        {step === "passkey" && (
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{env.ios ? "Lock it with Face ID" : "Lock it with Touch ID or your passkey"}</h1>
            <p className="mt-3 text-muted">So only you can open it. No password to remember.</p>
            <label className="mt-8 block text-sm font-semibold" htmlFor="code">
              Setup code
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              className="mt-2 h-13 w-full rounded-xl border-2 border-line bg-surface px-4 py-3"
              placeholder="The code you chose when deploying"
            />
            <p className="mt-2 text-sm text-muted">This is the SETUP_CODE value from your Vercel settings. You only need it once.</p>
            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {error} If it keeps failing, check that Face ID and a screen passcode are turned on for this device, then reload this page.
              </p>
            )}
          </div>
        )}

        {step === "goals" && (
          <Screen title="Why are you here?" hint="Pick any that fit. This shapes which lessons come first.">
            {GOALS.map((g) => (
              <Choice key={g.id} on={(draft.goals ?? []).includes(g.id)} onClick={() => setDraft({ ...draft, goals: toggle(draft.goals, g.id) })}>
                {g.name}
              </Choice>
            ))}
          </Screen>
        )}

        {step === "topics" && (
          <Screen title="Pick your topics" hint="Choose at least one. You can change these later.">
            {TOPICS.filter((t) => !t.more || showMore || topics.includes(t.id)).map((t) => (
              <Choice key={t.id} on={topics.includes(t.id)} onClick={() => setDraft({ ...draft, topics: toggle(topics, t.id) })}>
                {t.name}
              </Choice>
            ))}
            {!showMore && (
              <button className="min-h-11 text-left font-medium text-accent" onClick={() => setShowMore(true)}>
                More topics
              </button>
            )}
            {topics.length === 0 && <p className="text-sm text-muted">Pick at least one topic to continue.</p>}
          </Screen>
        )}

        {step === "narrow" && (
          <Screen title="Narrow it down" hint="Tap what interests you most. Skip any you don't care about.">
            {TOPICS.filter((t) => topics.includes(t.id)).map((t) => (
              <section key={t.id} className="mb-2">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t.name}</h2>
                <div className="flex flex-col gap-2">
                  {t.subtopics.map((s) => {
                    const list = draft.subtopics?.[t.id] ?? [];
                    return (
                      <Choice key={s.id} on={list.includes(s.id)} onClick={() => setDraft({ ...draft, subtopics: { ...draft.subtopics, [t.id]: toggle(list, s.id) } })}>
                        {s.name}
                      </Choice>
                    );
                  })}
                </div>
              </section>
            ))}
          </Screen>
        )}

        {step === "level" && (
          <Screen title="Your level" hint="So lessons start at the right difficulty.">
            {TOPICS.filter((t) => topics.includes(t.id)).map((t) => (
              <section key={t.id} className="mb-2">
                <h2 className="mb-2 font-semibold">{t.name}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.v}
                      aria-pressed={(draft.levels?.[t.id] ?? 1) === l.v}
                      className="choice !px-2 text-center text-[15px]"
                      onClick={() => setDraft({ ...draft, levels: { ...draft.levels, [t.id]: l.v } })}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </Screen>
        )}

        {step === "daily" && (
          <Screen title="Your daily stopping point" hint="When you hit this, the app tells you you're done. That's on purpose.">
            {[3, 5, 10].map((n) => (
              <Choice key={n} on={dailyGoal === n} onClick={() => setDailyGoal(n)}>
                <b>{n} lessons a day</b>
                <span className="block text-sm text-muted">About {n === 3 ? "3" : n === 5 ? "5" : "10"} minutes</span>
              </Choice>
            ))}
          </Screen>
        )}

        {step === "nudge" && (
          <Screen title="Daily nudge" hint="One reminder a day, at a time you pick. Never more.">
            <Choice on={nudgeChosen && nudge !== null} onClick={() => { setNudge(nudge ?? "19:00"); setNudgeChosen(true); }}>
              <span className="flex items-center justify-between gap-3">
                <b>Remind me at</b>
                <input
                  type="time"
                  aria-label="Reminder time"
                  value={nudge ?? "19:00"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { setNudge(e.target.value || "19:00"); setNudgeChosen(true); }}
                  className="h-11 rounded-lg border border-line bg-bg px-2"
                />
              </span>
            </Choice>
            <Choice on={nudgeChosen && nudge === null} onClick={() => { setNudge(null); setNudgeChosen(true); }}>
              No nudges
            </Choice>
            <p className="text-sm text-muted">Reminders aren't switched on yet. Your time is saved and will be used once they are.</p>
          </Screen>
        )}

        {step === "install" && (env.desk ? <QrStep /> : <InstallSteps />)}

        {error && step !== "passkey" && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <button className="btn btn-primary w-full" disabled={!canContinue || busy} onClick={next}>
        {label}
      </button>
      {step === "install" && (
        <button className="mt-1 min-h-11 text-sm text-muted" onClick={next} disabled={busy}>
          Skip for now
        </button>
      )}
    </div>
  );
}

function Screen({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{hint}</p>
      <div className="mt-6 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="choice" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function InstallSteps() {
  return (
    <Screen title="Put it on your home screen" hint="Then it opens full screen with one tap, like any other app.">
      {["Tap the Share button at the bottom of Safari (the square with an arrow).", "Scroll down and tap Add to Home Screen.", "Tap Add in the top corner."].map((s, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-ink">{i + 1}</div>
          <div>{s}</div>
        </div>
      ))}
    </Screen>
  );
}

export function QrStep() {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(window.location.origin, { margin: 1, width: 220 }).then(setSrc).catch(() => {});
  }, []);
  return (
    <Screen title="Open this on your phone" hint="Point your phone's camera at this code. Then add it to your home screen from Safari.">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR code that opens Invest on your phone" width={220} height={220} className="mx-auto rounded-2xl bg-white p-3" />
      )}
    </Screen>
  );
}
