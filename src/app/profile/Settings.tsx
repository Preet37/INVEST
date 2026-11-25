"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { registerPasskey } from "@/lib/passkey-client";

type S = { dailyGoal: number; nudgeTime: string | null; lockMinutes: number; voice: boolean };

export default function Settings({ initial, devices, topics, bypass }: { initial: S; devices: string[]; topics: string[]; bypass: boolean }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const [desk, setDesk] = useState(false);

  useEffect(() => {
    const d = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
    setDesk(d);
    if (d) QRCode.toDataURL(window.location.origin, { margin: 1, width: 180 }).then(setQr).catch(() => {});
  }, []);

  const set = async (patch: Partial<S>) => {
    setS({ ...s, ...patch });
    const r = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(r.ok ? "Saved" : "Couldn't save. Try again.");
    setTimeout(() => setMsg(""), 1500);
  };

  const addDevice = async () => {
    try {
      await registerPasskey();
      setMsg("This device is added.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const row = "flex min-h-14 items-center justify-between gap-4 border-b border-line py-3";
  const field = "h-11 rounded-lg border border-line bg-surface px-2";
  return (
    <div className="mx-auto h-full max-w-xl overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+20px)] pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <span className="text-sm text-accent" role="status">{msg}</span>
      </div>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Learning</h2>
      <div className={row}>
        <div>
          <div className="font-semibold">Topics</div>
          <div className="text-sm text-muted">{topics.join(", ") || "None yet"}</div>
        </div>
        <Link href="/onboarding?edit=1" className="btn btn-quiet shrink-0">
          Change
        </Link>
      </div>
      <label className={row}>
        <span className="font-semibold">Daily stopping point</span>
        <select className={field} value={s.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })}>
          {[3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} lessons
            </option>
          ))}
        </select>
      </label>
      <label className={row}>
        <span>
          <span className="font-semibold">Daily nudge</span>
          <span className="block text-sm text-muted">Reminders aren't switched on yet. The time is saved for when they are.</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <input type="time" className={field} value={s.nudgeTime ?? ""} onChange={(e) => set({ nudgeTime: e.target.value || null })} />
          {s.nudgeTime && (
            <button className="min-h-11 text-sm text-muted underline" onClick={() => set({ nudgeTime: null })}>
              Off
            </button>
          )}
        </span>
      </label>

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Privacy</h2>
      <label className={row}>
        <span>
          <span className="font-semibold">Lock after</span>
          <span className="block text-sm text-muted">Asks for Face ID when you come back after this long.</span>
        </span>
        <select className={field} value={s.lockMinutes} onChange={(e) => set({ lockMinutes: Number(e.target.value) })}>
          {[1, 5, 15, 60, 240].map((n) => (
            <option key={n} value={n}>
              {n < 60 ? `${n} min` : `${n / 60} hr`}
            </option>
          ))}
        </select>
      </label>
      <div className={row}>
        <div>
          <div className="font-semibold">Devices</div>
          <div className="text-sm text-muted">{devices.join(", ") || (bypass ? "Test mode: login is switched off" : "None")}</div>
        </div>
        <button className="btn btn-quiet shrink-0" onClick={addDevice}>
          Add this device
        </button>
      </div>

      {desk && qr && (
        <>
          <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Open this on your phone</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code that opens Invest on your phone" width={180} height={180} className="mt-3 rounded-2xl bg-white p-3" />
        </>
      )}

      <button
        className="btn btn-quiet mt-8 w-full"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
      >
        Log out
      </button>
    </div>
  );
}
