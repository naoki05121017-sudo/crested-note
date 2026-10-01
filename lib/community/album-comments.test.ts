import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  mergeAlbumPhotos,
  parseCommentBody,
  parseCommentReportReason,
  livePublicNickname,
  nicknameError,
  publicNickname,
  storedDisplayName,
} from "./album-comments";

describe("public album merge", () => {
  it("keeps photo_url first and appends extra rows without duplicating", () => {
    expect(mergeAlbumPhotos("https://a/cover.jpg", [])).toEqual([
      { id: "cover", url: "https://a/cover.jpg", source: "cover" },
    ]);
    expect(
      mergeAlbumPhotos("https://a/cover.jpg", [
        { id: "2", url: "https://a/two.jpg", sortOrder: 2 },
        { id: "1", url: "https://a/cover.jpg", sortOrder: 1 },
        { id: "0", url: "https://a/one.jpg", sortOrder: 0 },
      ]),
    ).toEqual([
      { id: "cover", url: "https://a/cover.jpg", source: "cover" },
      { id: "0", url: "https://a/one.jpg", source: "extra" },
      { id: "2", url: "https://a/two.jpg", source: "extra" },
    ]);
  });
});

describe("comment copy", () => {
  it("uses a nickname fallback that is not an email", () => {
    expect(publicNickname(" レオ  ")).toBe("レオ");
    expect(publicNickname("")).toBe("ユーザー");
    expect(publicNickname(null)).toBe("ユーザー");
  });

  it("does not persist or show email or the default collection name as a live nickname", () => {
    expect(storedDisplayName(" レオ  ")).toBe("レオ");
    expect(storedDisplayName("user@example.com")).toBe("");
    expect(storedDisplayName("クレスノート")).toBe("");
    expect(storedDisplayName("ユーザー")).toBe("");
    expect(nicknameError("")).toBe("ニックネームを入力してください。");
    expect(nicknameError("クレスノート")).toBe("コレクション名は使えません。");
    expect(livePublicNickname("user@example.com")).toBe("ユーザー");
    expect(livePublicNickname("クレスノート")).toBe("ユーザー");
    expect(livePublicNickname("レオ")).toBe("レオ");
    expect(publicNickname("クレスノート")).toBe("クレスノート");
  });

  it("rejects empty or overlong comment bodies", () => {
    expect(parseCommentBody("  綺麗  ")).toBe("綺麗");
    expect(parseCommentBody("")).toBeNull();
    expect(parseCommentBody("x".repeat(501))).toBeNull();
  });

  it("parses report reasons", () => {
    expect(parseCommentReportReason("spam")).toBe("spam");
    expect(parseCommentReportReason("nope")).toBe("other");
  });
});

describe("community migration", () => {
  it("adds extra photos and comments without comments_blocked_until", () => {
    const sql = readFileSync(
      "supabase/migrations/20260930_community_gallery_comments.sql",
      "utf8",
    );
    expect(sql).toContain("create table if not exists public.animal_photos");
    expect(sql).toContain("author_nickname");
    expect(sql).toContain("animal_comment_reports");
    expect(sql).not.toMatch(/comments_blocked_until/);
    expect(sql).toContain("animals.photo_url");
  });

  it("lets comment updates change deleted_at only", () => {
    const sql = readFileSync(
      "supabase/migrations/20260930_community_gallery_comments.sql",
      "utf8",
    );
    const updatePolicy = sql.slice(sql.indexOf("animal_comments_update_soft_delete"));
    expect(sql).toContain("animal_comment_is_soft_delete_only");
    expect(sql).toContain("stored.body = proposed.body");
    expect(sql).toContain("stored.author_nickname = proposed.author_nickname");
    expect(sql).toContain("stored.animal_id = proposed.animal_id");
    expect(sql).toContain("stored.user_id = proposed.user_id");
    expect(sql).toContain("stored.parent_id is not distinct from proposed.parent_id");
    expect(sql).toContain("stored.created_at is not distinct from proposed.created_at");
    expect(sql).not.toMatch(/stored\.deleted_at\s*=/);
    expect(updatePolicy).toContain("public.animal_comment_is_soft_delete_only(animal_comments)");
  });

  it("keeps signup nickname optional and does not rewrite comment snapshots from settings", () => {
    const signup = readFileSync("app/(public)/signup/page.tsx", "utf8");
    const settings = readFileSync("app/(app)/settings/actions.ts", "utf8");
    const comments = readFileSync("lib/db/animal-comments.ts", "utf8");
    expect(signup).toContain("表示名（任意）");
    expect(signup).not.toMatch(/name="displayName"[^>]*required/);
    expect(settings).not.toContain("animal_comments");
    expect(comments).toContain("const nickname = storedDisplayName(options.displayName)");
    expect(comments).toContain("author_nickname: nickname");
    expect(comments).not.toMatch(/\.update\([\s\S]*author_nickname/);
  });
});
