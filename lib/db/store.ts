import { cache } from "react";
import { syncCrestLinks } from "@/lib/crest-link/core";
import type { DatabaseFile } from "@/lib/db/types";
import { loadDatabaseFromSupabase, saveDatabaseToSupabase } from "@/lib/db/supabase-io";

export const loadDb = cache(async function loadDb(): Promise<DatabaseFile> {
  return loadDatabaseFromSupabase();
});

export async function mutateDb<T>(fn: (db: DatabaseFile) => T): Promise<T> {
  const db = await loadDatabaseFromSupabase();
  const result = fn(db);
  syncCrestLinks(db);
  await saveDatabaseToSupabase(db);
  return result;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}
