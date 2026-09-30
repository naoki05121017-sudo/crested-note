"use client";

import { useSearchParams } from "next/navigation";

export function LoginNextField() {
  const next = useSearchParams().get("next") || "/";
  return <input type="hidden" name="next" value={next} />;
}

export function LoginCheckNotice() {
  if (useSearchParams().get("check") !== "1") return null;
  return (
    <p className="mb-4 text-sm text-white/55">
      確認メールのリンクを開いてからログインしてください。届いていない場合は迷惑メールフォルダも確認してください。
    </p>
  );
}
