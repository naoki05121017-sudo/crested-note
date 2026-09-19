"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function isNextNavigationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String(error.digest ?? "") : "";
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest === "NEXT_HTTP_ERROR_FALLBACK;404"
  );
}

export function MutationForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  return (
    <form
      className={className}
      action={async (formData) => {
        if (running.current) return;
        running.current = true;
        setError(null);
        try {
          await action(formData);
          router.refresh();
          running.current = false;
        } catch (caught) {
          if (isNextNavigationError(caught)) {
            throw caught;
          }
          running.current = false;
          setError(
            caught instanceof Error ? caught.message : "保存できませんでした。",
          );
        }
      }}
    >
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
