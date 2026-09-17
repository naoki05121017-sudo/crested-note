import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { JSON_BACKUP_DIR, JSON_DATA_PATH } from "@/lib/db/json-paths";

/** Copy-only. Never writes to data/n-crest.json. */
export function backupLocalJson(): string {
  if (!existsSync(JSON_DATA_PATH)) {
    throw new Error("data/n-crest.json が見つかりません。控えを作れません。");
  }
  mkdirSync(JSON_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const dest = join(JSON_BACKUP_DIR, `n-crest-${stamp}.json`);
  copyFileSync(JSON_DATA_PATH, dest);
  return dest;
}
