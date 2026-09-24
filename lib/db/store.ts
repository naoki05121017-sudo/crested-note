import { cache } from "react";
import { requireSessionUser } from "@/lib/auth/session";
import { syncCrestLinks } from "@/lib/crest-link/core";
import { syncAnimalCodes } from "@/lib/db/animal-code";
import type { DatabaseFile } from "@/lib/db/types";
import { loadDatabaseFromSupabase, saveDatabaseToSupabase } from "@/lib/db/supabase-io";

export const loadDb = cache(async function loadDb(): Promise<DatabaseFile> {
  const user = await requireSessionUser();
  return loadDatabaseFromSupabase(user.id);
});

export async function mutateDb<T>(fn: (db: DatabaseFile) => T): Promise<T> {
  const user = await requireSessionUser();
  const db = await loadDatabaseFromSupabase(user.id);
  syncAnimalCodes(db);
  const result = fn(db);
  syncCrestLinks(db);
  await saveDatabaseToSupabase(db, user.id);
  return result;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newSlug(): string {
  return Math.random().toString(36).slice(2, 10);
}
