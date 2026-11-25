"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loginWithPasskey } from "@/lib/passkey-client";

const TABS = [
  { href: "/", label: "Feed", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/lab", label: "Pattern Lab", icon: "M4 18l5-6 4 3 7-9" },
  { href: "/saved", label: "Saved", icon: "M6 4h12v16l-6-4-6 4z" },
  { href: "/profile", label: "Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c1.5-4 4.5-5 8-5s6.5 1 8 5" },
];

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export default function AppShell({ children, lockMinutes, bypass }: { children: React.ReactNode; lockMinutes: number; bypass: boolean }) {
  const path = usePathname();
  return (
    <div className="flex h-dvh flex-col desk:flex-row">
      <InstallBanner />
      <main className="order-2 min-h-0 min-w-0 flex-1">{children}</main>
      <nav
        aria-label="Main"
        className="order-3 z-30 flex shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] desk:order-1 desk:w-[210px] desk:flex-col desk:gap-1 desk:border-t-0 desk:border-r desk:p-4"
      >
        <div className="hidden px-3 pb-4 pt-2 text-xl font-bold tracking-tight desk:block">Invest</div>
        {TABS.map((t) => {
          const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`flex h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium desk:h-11 desk:flex-none desk:flex-row desk:justify-start desk:gap-3 desk:rounded-xl desk:px-3 desk:text-[15px] ${
                on ? "text-accent desk:bg-bg" : "text-muted"
              }`}
            >
              <Icon d={t.icon} />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <AppLock minutes={lockMinutes} bypass={bypass} />
    </div>
  );
}

// Locks the app after it has been in the background for a while. One tap, then Face ID.
function AppLock({ minutes, bypass }: { minutes: number; bypass: boolean }) {
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () => {
      if (localStorage.getItem("invest_locked") === "1") return setLocked(true);
      const at = Number(localStorage.getItem("invest_hidden_at") || 0);
      if (at && Date.now() - at > minutes * 60000) {
        localStorage.setItem("invest_locked", "1");
        setLocked(true);
      }
      localStorage.removeItem("invest_hidden_at");
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") localStorage.setItem("invest_hidden_at", String(Date.now()));
      else check();
    };
    check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onVis);
    };
  }, [minutes]);

  if (!locked) return null;
  const unlock = async () => {
    setBusy(true);
    setError("");
    try {
      if (!bypass) await loginWithPasskey();
      localStorage.removeItem("invest_locked");
      setLocked(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="dialog" aria-label="Locked" className="fixed inset-0 z-50 grid place-items-center bg-bg p-6 text-center">
      <div className="w-full max-w-xs">
        <div className="text-3xl font-bold">Invest</div>
        <p className="mt-2 text-muted">Locked while you were away.</p>
        <button className="btn btn-primary mt-8 w-full" onClick={unlock} disabled={busy}>
          {busy ? "Checking..." : "Unlock with Face ID"}
        </button>
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

// iPhone Safari, not installed yet: show the 3 steps once, dismissible.
function InstallBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (ios && !standalone && !localStorage.getItem("invest_install_dismissed")) setShow(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  if (!show) return null;
  return (
    <div className="order-1 flex shrink-0 items-center gap-2 border-b border-line bg-surface px-4 pb-1 pt-[calc(env(safe-area-inset-top)+4px)] text-[13px] leading-snug desk:hidden">
      <div className="flex-1">
        <b>Put Invest on your home screen:</b> tap Share, then Add to Home Screen, then Add.
      </div>
      <button
        aria-label="Dismiss"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl text-muted"
        onClick={() => {
          localStorage.setItem("invest_install_dismissed", "1");
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
