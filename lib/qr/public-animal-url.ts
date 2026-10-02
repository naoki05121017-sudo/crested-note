export function publicAnimalPagePath(shareSlug: string): string | null {
  const slug = shareSlug.trim();
  if (!slug) return null;
  if (slug.includes("/") || slug.includes("\\") || slug.includes("..") || slug.includes("?")) {
    return null;
  }
  return `/p/${encodeURIComponent(slug)}`;
}

export function publicAnimalPageUrl(
  origin: string,
  input: { isPublic: boolean; shareSlug: string },
): string | null {
  if (!input.isPublic) return null;
  const path = publicAnimalPagePath(input.shareSlug);
  if (!path) return null;
  const base = origin.trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}${path}`;
}
