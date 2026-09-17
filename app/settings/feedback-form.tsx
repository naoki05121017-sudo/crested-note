import { submitFeedback } from "@/app/settings/actions";
import { FEEDBACK_CATEGORY_LABEL } from "@/lib/db/labels";
import { FEEDBACK_USER_CATEGORIES } from "@/lib/db/types";

export function FeedbackForm() {
  return (
    <form action={submitFeedback} className="flex max-w-xl flex-col gap-4">
      <p className="text-sm leading-6 text-muted">
        わかりにくいところ、追加してほしいモルフ、計算の気になる点、不具合など、運営へのご意見をお送りください。他の人には表示されません。
      </p>
      <label className="grid gap-1 text-sm">
        <span>内容の種類</span>
        <select name="category" defaultValue="improvement" className="nc-input">
          {FEEDBACK_USER_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {FEEDBACK_CATEGORY_LABEL[category]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>コメント</span>
        <textarea
          required
          name="body"
          rows={5}
          placeholder="例: この画面が分かりにくい / このモルフを追加してほしい"
          className="nc-input"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>名前（任意）</span>
        <input
          name="name"
          placeholder="記入しなくても送れます"
          className="nc-input"
          autoComplete="name"
        />
      </label>
      <button type="submit" className="nc-btn w-full sm:w-fit">
        送信する
      </button>
    </form>
  );
}
