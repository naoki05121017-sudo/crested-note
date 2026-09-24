export function idsToDelete(existing: string[], keep: string[]): string[] {
  const keepSet = new Set(keep.filter(Boolean));
  return existing.filter((id) => Boolean(id) && !keepSet.has(id));
}

const PUBLIC_PREFIXES = ["/login", "/signup", "/p/", "/auth/"];

export function isPublicAppPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/signup") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}
