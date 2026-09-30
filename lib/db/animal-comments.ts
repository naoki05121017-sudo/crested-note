import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { getPublicAnimalOwnerId } from "@/lib/db/public-gallery";
import {
  parseCommentBody,
  parseCommentReportReason,
  publicNickname,
} from "@/lib/community/album-comments";
import { newId } from "@/lib/db/store";

export type PublicComment = {
  id: string;
  parentId: string | null;
  nickname: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  isMine: boolean;
  canDelete: boolean;
};

function missingTable(message: string): boolean {
  return /animal_comments|animal_comment_reports|schema cache/i.test(message);
}

export async function listPublicComments(
  animalId: string,
  viewerId: string | null,
): Promise<PublicComment[]> {
  const ownerId = await getPublicAnimalOwnerId(animalId);
  if (!ownerId) return [];
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animal_comments")
      .select("id, parent_id, user_id, body, author_nickname, deleted_at, created_at")
      .eq("animal_id", animalId)
      .order("created_at", { ascending: true }),
  );
  if (error) {
    if (missingTable(error.message)) return [];
    throw new Error(`コメントを読めません: ${error.message}`);
  }
  return (data ?? []).map((row) => {
    const deleted = Boolean(row.deleted_at);
    const authorId = String(row.user_id);
    return {
      id: String(row.id),
      parentId: row.parent_id ? String(row.parent_id) : null,
      nickname: publicNickname(String(row.author_nickname ?? "")),
      body: deleted ? "" : String(row.body ?? ""),
      createdAt: String(row.created_at ?? ""),
      deleted,
      isMine: Boolean(viewerId && viewerId === authorId),
      canDelete: Boolean(viewerId && (viewerId === authorId || viewerId === ownerId)),
    };
  });
}

export async function insertPublicComment(options: {
  animalId: string;
  userId: string;
  displayName: string;
  body: string;
  parentId?: string;
}): Promise<void> {
  const body = parseCommentBody(options.body);
  if (!body) throw new Error("1〜500字で入力してください。");
  const ownerId = await getPublicAnimalOwnerId(options.animalId);
  if (!ownerId) throw new Error("この個体にはコメントできません。");
  const client = createAdminClient();
  let parentId: string | null = options.parentId?.trim() || null;
  if (parentId) {
    const { data: parent, error: parentError } = await retryOnJwtIssuedAtFuture(() =>
      client
        .from("animal_comments")
        .select("id, animal_id, parent_id")
        .eq("id", parentId)
        .maybeSingle(),
    );
    if (parentError) throw new Error(`コメントを保存できません: ${parentError.message}`);
    if (!parent || String(parent.animal_id) !== options.animalId || parent.parent_id) {
      throw new Error("このコメントには返信できません。");
    }
  }
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animal_comments").insert({
      id: newId(),
      animal_id: options.animalId,
      user_id: options.userId,
      parent_id: parentId,
      body,
      author_nickname: publicNickname(options.displayName),
    }),
  );
  if (error) {
    if (missingTable(error.message)) {
      throw new Error("コメント機能の準備中です。");
    }
    throw new Error(`コメントを保存できません: ${error.message}`);
  }
}

export async function softDeletePublicComment(options: {
  commentId: string;
  userId: string;
}): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animal_comments")
      .select("id, animal_id, user_id, deleted_at")
      .eq("id", options.commentId)
      .maybeSingle(),
  );
  if (error) throw new Error(`コメントを削除できません: ${error.message}`);
  if (!data || data.deleted_at) throw new Error("コメントが見つかりません。");
  const ownerId = await getPublicAnimalOwnerId(String(data.animal_id));
  if (options.userId !== String(data.user_id) && options.userId !== ownerId) {
    throw new Error("このコメントは削除できません。");
  }
  const { error: updateError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animal_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", options.commentId),
  );
  if (updateError) throw new Error(`コメントを削除できません: ${updateError.message}`);
  const { data: animal } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("share_slug").eq("id", data.animal_id).maybeSingle(),
  );
  return String(animal?.share_slug ?? "");
}

export async function reportPublicComment(options: {
  commentId: string;
  reporterId: string;
  reason: string;
}): Promise<string> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animal_comments")
      .select("id, animal_id")
      .eq("id", options.commentId)
      .maybeSingle(),
  );
  if (error) throw new Error(`通報できません: ${error.message}`);
  if (!data) throw new Error("コメントが見つかりません。");
  const ownerId = await getPublicAnimalOwnerId(String(data.animal_id));
  if (!ownerId) throw new Error("このコメントは通報できません。");
  const { error: insertError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animal_comment_reports").insert({
      comment_id: options.commentId,
      reporter_id: options.reporterId,
      reason: parseCommentReportReason(options.reason),
    }),
  );
  if (insertError) {
    if (insertError.message.includes("duplicate") || insertError.code === "23505") {
      const { data: animal } = await retryOnJwtIssuedAtFuture(() =>
        client.from("animals").select("share_slug").eq("id", data.animal_id).maybeSingle(),
      );
      return String(animal?.share_slug ?? "");
    }
    if (missingTable(insertError.message)) throw new Error("通報機能の準備中です。");
    throw new Error(`通報できません: ${insertError.message}`);
  }
  const { data: animal } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("share_slug").eq("id", data.animal_id).maybeSingle(),
  );
  return String(animal?.share_slug ?? "");
}
