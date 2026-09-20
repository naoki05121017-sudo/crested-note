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
  const [leaving, setLeaving] = useState(false);
  const running = useRef(false);

  return (
    <MutationBusyContext.Provider value={leaving}>
      <form
        className={className}
        action={async (formData) => {
          if (running.current || leaving) return;
          running.current = true;
          setError(null);
          try {
            const result = await action(formData);
            if (result && typeof result === "object" && "error" in result) {
              if (result.error) {
                setError(result.error);
                running.current = false;
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
          } catch (caught) {
            unstable_rethrow(caught);
            running.current = false;
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
        <fieldset disabled={leaving} className="contents">
          {children}
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </MutationBusyContext.Provider>
  );
}
