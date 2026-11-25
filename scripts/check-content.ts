// Validates every lesson file against the format the app imports. Run before committing lessons.
import { readdirSync, readFileSync } from "fs";
import { fileSchema } from "../src/lib/import";

let bad = 0;
const urls = new Set<string>();
for (const name of readdirSync("content/lessons").filter((n) => n.endsWith(".json"))) {
  const parsed = fileSchema.safeParse(JSON.parse(readFileSync(`content/lessons/${name}`, "utf8")));
  if (!parsed.success) {
    bad++;
    for (const i of parsed.error.issues) console.error(`${name}: ${i.path.join(".")} ${i.message}`);
    continue;
  }
  for (const l of parsed.data.lessons) {
    if (urls.has(l.itemUrl)) {
      bad++;
      console.error(`${name}: duplicate itemUrl ${l.itemUrl}`);
    }
    urls.add(l.itemUrl);
  }
  console.log(`${name}: ${parsed.data.lessons.length} lessons ok`);
}
process.exit(bad ? 1 : 0);
