import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type EnvKeyKind = "url" | "sb_secret" | "sb_publishable" | "legacy_jwt" | "other";

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function classifyEnvValue(value: string): EnvKeyKind {
  if (/^https:\/\//i.test(value)) return "url";
  if (value.startsWith("sb_secret_")) return "sb_secret";
  if (value.startsWith("sb_publishable_")) return "sb_publishable";
  if (value.startsWith("eyJ") && value.split(".").length === 3) return "legacy_jwt";
  return "other";
}

function parseEnvFile(path: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!existsSync(path)) return parsed;
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    parsed[key] = stripQuotes(trimmed.slice(eq + 1).trim());
  }
  return parsed;
}

/** `.env.local` wins over process.env so an old shell value is not used. */
export function loadLocalEnv() {
  const fromDotEnv = parseEnvFile(join(process.cwd(), ".env"));
  const fromLocal = parseEnvFile(join(process.cwd(), ".env.local"));
  for (const [key, value] of Object.entries(fromDotEnv)) {
    process.env[key] = value;
  }
  for (const [key, value] of Object.entries(fromLocal)) {
    process.env[key] = value;
  }
}

export function describeImportEnv(): {
  envLocalExists: boolean;
  urlName: string;
  secretName: string;
  secretKind: EnvKeyKind;
  secretLength: number;
  sameAsPublishable: boolean;
} {
  const localPath = join(process.cwd(), ".env.local");
  const secret =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  return {
    envLocalExists: existsSync(localPath),
    urlName: "NEXT_PUBLIC_SUPABASE_URL",
    secretName: process.env.SUPABASE_SECRET_KEY?.trim()
      ? "SUPABASE_SECRET_KEY"
      : process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ? "SUPABASE_SERVICE_ROLE_KEY"
        : "(none)",
    secretKind: classifyEnvValue(secret),
    secretLength: secret.length,
    sameAsPublishable: Boolean(secret) && Boolean(publishable) && secret === publishable,
  };
}

export function supabaseUrlFromEnv(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL が .env.local にありません。");
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL は https://（プロジェクト）.supabase.co の形にしてください。",
    );
  }
  return url.replace(/\/$/, "");
}

function looksLikeSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_") && key.length >= 40) return true;
  if (key.startsWith("eyJ") && key.split(".").length === 3 && key.length >= 100) {
    return true;
  }
  return false;
}

export function supabaseSecretKeyFromEnv(): string {
  const key = (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY が .env.local にありません。");
  }
  if (publishable && key === publishable) {
    throw new Error(
      "createClient に渡す SUPABASE_SECRET_KEY が NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY と同じです。Secret 用の変数に公開用キーが入っています。",
    );
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY の値が Publishable 形式です。createClient には Secret が必要です。",
    );
  }
  if (!looksLikeSecretKey(key)) {
    throw new Error(
      "SUPABASE_SECRET_KEY の値が Secret / service_role の形式ではありません。",
    );
  }
  return key;
}

export function supabasePublishableKeyFromEnv(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が .env.local にありません。");
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY に Secret が入っています。");
  }
  const looksPublishable =
    key.startsWith("sb_publishable_") ||
    (key.startsWith("eyJ") && key.split(".").length === 3);
  if (!looksPublishable) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY の形式が正しくありません。");
  }
  return key;
}
