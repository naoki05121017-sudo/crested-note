"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteAnimalForm } from "@/app/animals/actions";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";

export function DeleteAnimalForm({ animalId }: { animalId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(deleteAnimalForm, {
    error: null,
    deleted: false,
  });
  const leaving = state.deleted && !state.error;
  const busy = pending || leaving;

  useEffect(() => {
    if (!leaving) return;
    router.replace("/animals");
    router.refresh();
    const fallback = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/animals/") && window.location.pathname !== "/animals") {
        window.location.assign("/animals");
      }
    }, 800);
    return () => window.clearTimeout(fallback);
  }, [leaving, router]);

  return (
    <form action={action}>
      <input type="hidden" name="animalId" value={animalId} />
      <fieldset disabled={busy} className="contents">
        <PendingSubmitButton
          pendingLabel={leaving ? "一覧へ移動しています…" : "削除しています…"}
          className="nc-btn-danger"
          disabled={busy}
        >
          この個体を削除
        </PendingSubmitButton>
      </fieldset>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
