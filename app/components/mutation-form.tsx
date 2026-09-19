"use client";

import { unstable_rethrow } from "next/navigation";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
