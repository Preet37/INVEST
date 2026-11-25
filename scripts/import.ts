// Imports content/ into the database. Same code the daily cron runs.
import { importContent } from "../src/lib/import";

importContent().then((r) => {
  console.log(r);
  process.exit(r.errors.length ? 1 : 0);
});
