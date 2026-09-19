"use client";

import { useActionState } from "react";
import { deleteAnimalForm } from "@/app/animals/actions";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";

export function DeleteAnimalForm({ animalId }: { animalId: string }) {
  const [state, action] = useActionState(deleteAnimalForm, { error: null });

  return (
    <form action={action}>
      <input type="hidden" name="animalId" value={animalId} />
      <PendingSubmitButton
        pendingLabel="削除しています…"
        className="nc-btn-danger"
      >
        この個体を削除
      </PendingSubmitButton>
      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
