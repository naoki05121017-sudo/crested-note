"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  issueAnimalTransfer,
  revokeAnimalTransfer,
} from "@/app/animals/crest-link-actions";
import { navigateAfterMutation } from "@/app/components/navigate-after-mutation";

function TransferActionButton({
  animalId,
  pendingLabel,
  idleLabel,
  className,
  run,
}: {
  animalId: string;
  pendingLabel: string;
  idleLabel: string;
  className: string;
  run: typeof issueAnimalTransfer;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const busy = pending || leaving;

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await run(animalId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setLeaving(true);
            navigateAfterMutation(
              router,
              result.redirectTo ?? `/animals/${animalId}`,
            );
          });
        }}
      >
        {busy ? pendingLabel : idleLabel}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function IssueTransferButton({ animalId }: { animalId: string }) {
  return (
    <TransferActionButton
      animalId={animalId}
      pendingLabel="発行しています…"
      idleLabel="引き継ぎコードを発行"
      className="nc-btn"
      run={issueAnimalTransfer}
    />
  );
}

export function RevokeTransferButton({ animalId }: { animalId: string }) {
  return (
    <TransferActionButton
      animalId={animalId}
      pendingLabel="無効にしています…"
      idleLabel="コードを無効にする"
      className="nc-btn-ghost"
      run={revokeAnimalTransfer}
    />
  );
}
