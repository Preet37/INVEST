import { NextResponse, type NextRequest } from "next/server";
import { roundBars } from "@/lib/market";
import { explainOutcome, readChart } from "@/lib/patterns";
import { verify } from "@/lib/session";
import { askTutor } from "@/lib/tutor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, guess, why } = await req.json().catch(() => ({}));
  const t = await verify<{ s: string; e: string; k: string }>(token);
  if (!t || t.k !== "lab") return NextResponse.json({ error: "That chart expired. Load a new one." }, { status: 400 });
  const { shown, after } = await roundBars(t.s, t.e);
  if (!after.length) return NextResponse.json({ error: "No data after that chart yet." }, { status: 400 });

  const facts = readChart(shown);
  const { change, outcome, summary } = explainOutcome(shown, after);
  let explanation = summary;

  // If the tutor is connected, let it tie the facts together in plain words. It only gets computed facts to work from.
  if (process.env.TUTOR_MODEL || process.env.GEMINI_API_KEY) {
    try {
      explanation = await askTutor(
        `You explain stock charts to a beginner inside a learning app. Use ONLY the facts given. Do not add numbers, news, company details or predictions that are not in the facts. Plain words, explain any term in the same sentence, no em dashes, under 110 words. Never give buy or sell advice. End with one sentence on what to watch for next time.`,
        [
          {
            role: "user",
            content:
              `Chart: ${t.s}, ${shown[0].day} to ${shown[shown.length - 1].day}.\nWhat the chart showed before the cut-off:\n${facts.map((f) => `- ${f.name}: ${f.text}`).join("\n")}\n` +
              `What happened next: ${summary}\nThe learner guessed: ${String(guess).slice(0, 20)}.` +
              (typeof why === "string" && why.trim() ? ` Their reasoning: "${why.slice(0, 300)}". Say briefly what was good or missing in it.` : ""),
          },
        ],
      );
    } catch {}
  }

  return NextResponse.json({
    symbol: t.s,
    from: shown[0].day,
    to: after[after.length - 1].day,
    cutoff: after[0].day,
    bars: [...shown, ...after],
    change,
    outcome,
    correct: guess === outcome,
    facts,
    explanation,
  });
}
