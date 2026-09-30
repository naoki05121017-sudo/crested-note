import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import {
  addPublicComment,
  deletePublicComment,
  reportPublicCommentAction,
} from "@/app/(public)/p/comment-actions";
import {
  COMMENT_REPORT_LABEL,
  COMMENT_REPORT_REASONS,
} from "@/lib/community/album-comments";
import type { PublicComment } from "@/lib/db/animal-comments";
import Link from "next/link";

function CommentThread({
  comment,
  replies,
  slug,
  animalId,
  signedIn,
}: {
  comment: PublicComment;
  replies: PublicComment[];
  slug: string;
  animalId: string;
  signedIn: boolean;
}) {
  return (
    <li className="border-b border-white/8 py-4 last:border-0">
      <p className="text-[13px] text-white/45">{comment.nickname}</p>
      {comment.deleted ? (
        <p className="mt-1 text-sm text-white/32">削除されました</p>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-white/80">{comment.body}</p>
      )}
      {!comment.deleted && signedIn ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-3">
          {comment.canDelete ? (
            <MutationForm action={deletePublicComment}>
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="slug" value={slug} />
              <PendingSubmitButton pendingLabel="削除中…" className="text-xs text-white/35 underline-offset-2 hover:underline">
                削除
              </PendingSubmitButton>
            </MutationForm>
          ) : null}
          {!comment.isMine ? (
            <MutationForm action={reportPublicCommentAction} className="flex min-w-0 items-center gap-2">
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="slug" value={slug} />
              <label className="sr-only" htmlFor={`reason-${comment.id}`}>
                通報理由
              </label>
              <select
                id={`reason-${comment.id}`}
                name="reason"
                className="max-w-[7.5rem] rounded-md border border-white/10 bg-transparent px-1 py-1 text-xs text-white/55"
              >
                {COMMENT_REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {COMMENT_REPORT_LABEL[reason]}
                  </option>
                ))}
              </select>
              <PendingSubmitButton pendingLabel="送信中…" className="text-xs text-white/35 underline-offset-2 hover:underline">
                通報
              </PendingSubmitButton>
            </MutationForm>
          ) : null}
        </div>
      ) : null}
      {replies.length > 0 ? (
        <ul className="mt-3 border-l border-white/10 pl-4">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              replies={[]}
              slug={slug}
              animalId={animalId}
              signedIn={signedIn}
            />
          ))}
        </ul>
      ) : null}
      {signedIn && !comment.parentId && !comment.deleted ? (
        <MutationForm action={addPublicComment} className="mt-3">
          <input type="hidden" name="animalId" value={animalId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="parentId" value={comment.id} />
          <label className="grid gap-1 text-xs text-white/40">
            返信
            <input
              name="body"
              maxLength={500}
              required
              className="nc-input h-10 min-h-10 text-sm"
              placeholder="返信する"
            />
          </label>
          <PendingSubmitButton pendingLabel="送信中…" className="nc-btn-ghost mt-2 h-9 min-h-9 px-3 text-xs">
            返信する
          </PendingSubmitButton>
        </MutationForm>
      ) : null}
    </li>
  );
}

export function PublicCommentList({
  animalId,
  slug,
  comments,
  signedIn,
}: {
  animalId: string;
  slug: string;
  comments: PublicComment[];
  signedIn: boolean;
}) {
  const roots = comments.filter((row) => !row.parentId);
  const byParent = new Map<string, PublicComment[]>();
  for (const row of comments) {
    if (!row.parentId) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  return (
    <section id="comments" className="min-w-0">
      <p className="nc-section-kicker nc-tone-blush">COMMENTS</p>
      <h2 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">コメント</h2>
      {roots.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-white/40">まだコメントはありません。</p>
      ) : (
        <ul className="mt-2">
          {roots.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={byParent.get(comment.id) ?? []}
              slug={slug}
              animalId={animalId}
              signedIn={signedIn}
            />
          ))}
        </ul>
      )}
      {signedIn ? (
        <MutationForm action={addPublicComment} className="mt-6">
          <input type="hidden" name="animalId" value={animalId} />
          <input type="hidden" name="slug" value={slug} />
          <label className="grid gap-1 text-sm text-white/70">
            コメント
            <textarea
              name="body"
              required
              maxLength={500}
              rows={3}
              className="nc-input min-h-[5.5rem] py-3"
              placeholder="この子についてひとこと"
            />
          </label>
          <PendingSubmitButton pendingLabel="送信中…" className="nc-btn mt-3">
            投稿する
          </PendingSubmitButton>
        </MutationForm>
      ) : (
        <p className="mt-6 text-sm text-white/40">
          <Link href="/login" className="underline-offset-2 hover:underline">
            ログイン
          </Link>
          するとコメントできます。
        </p>
      )}
    </section>
  );
}
