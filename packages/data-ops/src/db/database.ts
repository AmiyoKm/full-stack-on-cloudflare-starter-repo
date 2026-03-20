import { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";

let db: ReturnType<typeof drizzle>;

export function initDatabase(bindingDb: D1Database) {
  if (db) return;
  db = drizzle(bindingDb);
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
