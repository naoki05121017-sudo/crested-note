export type AlbumPhoto = {
  id: string;
  url: string;
  source: "cover" | "extra";
};

export function mergeAlbumPhotos(
  coverUrl: string,
  extras: { id: string; url: string; sortOrder?: number }[],
): AlbumPhoto[] {
  const cover = coverUrl.trim();
  const seen = new Set<string>();
  const photos: AlbumPhoto[] = [];
  if (cover) {
    photos.push({ id: "cover", url: cover, source: "cover" });
    seen.add(cover);
  }
  const sorted = extras.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const extra of sorted) {
    const url = extra.url.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    photos.push({ id: extra.id, url, source: "extra" });
  }
  return photos;
}

export function publicNickname(displayName: string | null | undefined): string {
  const text = String(displayName ?? "").trim();
  return text || "ユーザー";
}

export const COMMENT_MAX_LEN = 500;

export function parseCommentBody(raw: string): string | null {
  const body = raw.trim();
  if (!body || body.length > COMMENT_MAX_LEN) return null;
  return body;
}

export const COMMENT_REPORT_REASONS = ["inappropriate", "spam", "other"] as const;
export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number];

export const COMMENT_REPORT_LABEL: Record<CommentReportReason, string> = {
  inappropriate: "不適切",
  spam: "荒らし",
  other: "その他",
};

export function parseCommentReportReason(raw: string): CommentReportReason {
  return COMMENT_REPORT_REASONS.includes(raw as CommentReportReason)
    ? (raw as CommentReportReason)
    : "other";
}
