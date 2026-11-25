import { Shell } from "@/lib/shell";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Shell>
      <div className="mx-auto max-w-xl px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <h1 className="text-3xl font-bold tracking-tight">Pattern Lab</h1>
        <p className="mt-4 text-muted">
          Not built yet. This is where you'll look at a real stock chart with the ending hidden, guess what happens next, then see what actually happened and why.
        </p>
        <p className="mt-6 text-sm text-muted">For learning, not financial advice.</p>
      </div>
    </Shell>
  );
}
