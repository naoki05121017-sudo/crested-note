"use client";

import { unstable_rethrow } from "next/navigation";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ActionResult } from "@/app/components/action-result";
import { MutationBusyContext } from "@/app/components/mutation-busy";
import { navigateAfterMutation } from "@/app/components/navigate-after-mutation";

export function MutationForm({
  action,
  className,
  children,
}: {
  action: (
    formData: FormData,
  ) => void | Promise<void> | Promise<ActionResult>;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  return (
    <MutationBusyContext.Provider value={busy || leaving}>
      <form
        className={className}
        action={async (formData) => {
          if (running.current || leaving) return;
          running.current = true;
          setBusy(true);
          setError(null);
          setNotice(null);
          try {
            const result = await action(formData);
            if (result && typeof result === "object" && "error" in result) {
              if (result.error) {
                setError(result.error);
                running.current = false;
                setBusy(false);
                return;
              }
              if (result.notice) {
                setNotice(result.notice);
                running.current = false;
                setBusy(false);
                return;
              }
              if (result.redirectTo) {
                setLeaving(true);
                navigateAfterMutation(router, result.redirectTo);
                return;
              }
            }
            router.refresh();
            running.current = false;
            setBusy(false);
          } catch (caught) {
            unstable_rethrow(caught);
            running.current = false;
            setBusy(false);
            const message =
              caught instanceof Error ? caught.message.trim() : "";
            setError(
              message && !message.includes("Minified React error")
                ? message
                : "保存できませんでした。",
            );
          }
        }}
      >
        <fieldset disabled={leaving} className="min-w-0 border-0 p-0">
          {children}
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm leading-6">
            {notice}
          </p>
        ) : null}
      </form>
    </MutationBusyContext.Provider>
  );
}
