export const PRODUCTION_APP_ORIGIN = "https://crested-note-vercel.vercel.app";

export type AppOriginInput = {
  vercelEnv?: string;
  vercelUrl?: string;
  vercelProductionUrl?: string;
  siteUrl?: string;
  requestHost?: string;
  requestProto?: string;
};

function stripSlash(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function hostOnly(value: string): string {
  return stripSlash(value).replace(/^https?:\/\//i, "");
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const url = origin.includes("://") ? new URL(origin) : new URL(`http://${origin}`);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Production always uses the live app origin, even if Site URL / env still points at localhost. */
export function resolveAppOrigin(input: AppOriginInput): string {
  const site = stripSlash(input.siteUrl ?? "");
  const vercelEnv = input.vercelEnv ?? "";

  if (vercelEnv === "production") {
    if (site && !isLocalOrigin(site)) return site;
    const prodHost = hostOnly(input.vercelProductionUrl ?? "");
    if (prodHost) return `https://${prodHost}`;
    return PRODUCTION_APP_ORIGIN;
  }

  const host = (input.requestHost ?? "").split(",")[0]?.trim() ?? "";
  if (host) {
    const proto =
      stripSlash(input.requestProto ?? "") ||
      (isLocalOrigin(`http://${host}`) ? "http" : "https");
    return `${proto}://${host}`;
  }

  if (vercelEnv === "preview") {
    const preview = hostOnly(input.vercelUrl ?? "");
    if (preview) return `https://${preview}`;
  }

  if (site) return site;
  return "http://127.0.0.1:3000";
}

export function authEmailRedirectTo(origin: string): string {
  return `${stripSlash(origin)}/auth/callback`;
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}
