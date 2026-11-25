import { generateText } from "ai";

export const TUTOR_LIMIT = () => Number(process.env.TUTOR_DAILY_LIMIT ?? 40) || 40;

export const TUTOR_SYSTEM = `You are the tutor inside Invest, a personal learning app. The learner is smart but wants plain language.
Rules:
- Answer in under 120 words unless the learner asks for more.
- Plain words. If you must use a technical term, explain it in the same sentence. Start with an everyday example.
- Never use em dashes.
- Stay tied to the lesson text you are given. If you are not sure of a fact, say so. Never invent statistics or quotes.
- Never give personal buy or sell advice. If asked "should I buy X?" or similar, politely decline and instead explain how to think about the decision (what to look at, what questions to ask).`;

type Msg = { role: "user" | "assistant"; content: string };

// Vercel AI Gateway first (signs in with the project's OIDC token on Vercel), Gemini's free tier as the backup.
export async function askTutor(system: string, messages: Msg[]): Promise<string> {
  const model = process.env.TUTOR_MODEL;
  if (model) {
    try {
      const { text } = await generateText({ model, system, messages, maxOutputTokens: 400 });
      if (text.trim()) return clean(text);
    } catch (e) {
      console.error("Gateway tutor failed", e);
    }
  }
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 400 },
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (text.trim()) return clean(text);
    } else console.error("Gemini tutor failed", r.status);
  }
  throw new Error("tutor-unavailable");
}

const clean = (s: string) => s.replace(/\s*\u2014\s*/g, ", ").trim();
