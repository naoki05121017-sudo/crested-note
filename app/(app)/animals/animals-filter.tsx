"use client";

import { useState } from "react";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { SoftNavForm } from "@/app/components/soft-nav-form";
import { ANIMAL_STATUS_LABEL, SEX_LABEL } from "@/lib/db/labels";
import { ANIMAL_STATUSES, SEXES } from "@/lib/db/types";

export function AnimalsFilter({
  q,
  sex,
  status,
}: {
  q: string;
  sex: string;
  status: string;
}) {
  const active = Boolean(q || sex || status);
  const [open, setOpen] = useState(active);

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="inline-flex h-10 min-w-0 items-center justify-center rounded-full border border-white/14 bg-white/8 px-4 text-sm text-white/80"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "閉じる" : active ? "検索・絞り込み中" : "検索・絞り込み"}
      </button>
      {open ? (
        <SoftNavForm action="/animals" className="nc-panel mt-3 grid gap-3 p-4 text-ink">
          <input
            name="q"
            defaultValue={q}
            placeholder="名前・番号・モルフ"
            className="nc-input"
          />
          <div className="grid grid-cols-2 gap-3">
            <select name="sex" defaultValue={sex} className="nc-input min-w-0">
              <option value="">性別（すべて）</option>
              {SEXES.map((value) => (
                <option key={value} value={value}>
                  {SEX_LABEL[value]}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="nc-input min-w-0">
              <option value="">ステータス（すべて）</option>
              {ANIMAL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ANIMAL_STATUS_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          <PendingSubmitButton pendingLabel="絞り込み中…" className="nc-btn-ghost w-full sm:w-fit">
            絞り込み
          </PendingSubmitButton>
        </SoftNavForm>
      ) : null}
    </div>
  );
}
