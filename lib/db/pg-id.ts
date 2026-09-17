import { createHash } from "node:crypto";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidOrNull(value: string | undefined): string | null {
  const text = String(value ?? "").trim();
  return UUID_RE.test(text) ? text : null;
}

/** Same JSON id (e.g. w1) always maps to the same UUID. Does not change JSON. */
export function postgresUuid(raw: string, namespace: string): string {
  const text = String(raw ?? "").trim();
  if (UUID_RE.test(text)) return text;
  const hex = createHash("sha1")
    .update(`n-crest:${namespace}:${text}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
