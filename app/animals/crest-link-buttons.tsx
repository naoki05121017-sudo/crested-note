"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  issueAnimalTransfer,
  revokeAnimalTransfer,
} from "@/app/animals/crest-link-actions";

export function IssueTransferButton({ animalId }: { animalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="nc-btn"
      onClick={() => {
        start(async () => {
          await issueAnimalTransfer(animalId);
          router.refresh();
        });
      }}
    >
      {pending ? "発行しています…" : "引き継ぎコードを発行"}
    </button>
  );
}

export function RevokeTransferButton({ animalId }: { animalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="nc-btn-ghost"
      onClick={() => {
        start(async () => {
          await revokeAnimalTransfer(animalId);
          router.refresh();
        });
      }}
    >
      {pending ? "無効にしています…" : "コードを無効にする"}
    </button>
  );
}
