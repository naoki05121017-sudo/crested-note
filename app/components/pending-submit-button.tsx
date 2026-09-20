"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

export function PendingSubmitButton({
  children,
  pendingLabel = "処理中…",
  className = "nc-btn",
  onPointerDown,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [pressed, setPressed] = useState(false);
  const busy = pending || Boolean(props.disabled);
  const showPending = busy || pressed;

  useEffect(() => {
    if (!pending) setPressed(false);
  }, [pending]);

  return (
    <button
      {...props}
      type="submit"
      disabled={busy}
      aria-busy={showPending}
      className={className}
      onPointerDown={(event) => {
        if (!busy) setPressed(true);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) setPressed(false);
        onClick?.(event);
      }}
    >
      {showPending ? pendingLabel : children}
    </button>
  );
}
