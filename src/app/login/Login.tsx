"use client";

import { useState } from "react";
import { loginWithPasskey } from "@/lib/passkey-client";

export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      await loginWithPasskey();
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="grid h-dvh place-items-center p-6 text-center">
      <div className="w-full max-w-xs">
        <div className="text-4xl font-bold tracking-tight">Invest</div>
        <p className="mt-2 text-muted">This is a private app.</p>
        <button className="btn btn-primary mt-8 w-full" onClick={go} disabled={busy}>
          {busy ? "Checking..." : "Unlock with Face ID"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
