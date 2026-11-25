import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const g = globalThis as unknown as { __db?: PostgresJsDatabase<typeof schema> };

export function db() {
  if (!g.__db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__db = drizzle(postgres(url, { max: 5, prepare: false }), { schema });
  }
  return g.__db;
}

export * from "./schema";
