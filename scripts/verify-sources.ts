// Fetches every candidate feed and reports which ones really return feed content.
// Paste the "ok" entries into content/sources.json. Nothing is written automatically.
import { readFileSync } from "fs";

type S = { id: string; type: string; topic: string; title: string; url: string };
const { candidates } = JSON.parse(readFileSync("content/sources.candidates.json", "utf8")) as { candidates: S[] };

const ok: S[] = [];
for (const s of candidates) {
  try {
    const r = await fetch(s.url, { headers: { "User-Agent": "invest-feed-check" }, signal: AbortSignal.timeout(15000) });
    const text = await r.text();
    const items = (text.match(/<(item|entry)[\s>]/g) ?? []).length;
    if (r.ok && items > 0) {
      ok.push(s);
      console.log(`ok    ${s.id} (${items} items)`);
    } else console.log(`FAIL  ${s.id}: HTTP ${r.status}, ${items} items`);
  } catch (e) {
    console.log(`FAIL  ${s.id}: ${(e as Error).message}`);
  }
}
console.log(`\n${ok.length} of ${candidates.length} work. Entries to add to content/sources.json:\n`);
console.log(JSON.stringify(ok, null, 2));
