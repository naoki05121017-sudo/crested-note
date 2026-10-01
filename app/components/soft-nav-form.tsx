"use client";

import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

export function SoftNavForm({
  action,
  className,
  children,
}: {
  action: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    const query = params.toString();
    router.push(query ? `${action}?${query}` : action);
  }

  return (
    <form action={action} className={className} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
