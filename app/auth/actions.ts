"use server";

import { redirect } from "next/navigation";
import { actionError, actionOk } from "@/app/components/action-result";
import { textField } from "@/lib/db/form";
import { ensureProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function nextPath(formData: FormData) {
  const next = textField(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(formData: FormData) {
  const email = textField(formData, "email");
  const password = textField(formData, "password");
  if (!email || !password) {
    return actionError("メールアドレスとパスワードを入力してください。");
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return actionError(error?.message ?? "ログインできませんでした。");
  }
  await ensureProfile({ id: data.user.id, email: data.user.email ?? "" });
  redirect(nextPath(formData));
}

export async function signUp(formData: FormData) {
  const email = textField(formData, "email");
  const password = textField(formData, "password");
  const displayName = textField(formData, "displayName");
  if (!email || !password) {
    return actionError("メールアドレスとパスワードを入力してください。");
  }
  if (password.length < 8) {
    return actionError("パスワードは8文字以上にしてください。");
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return actionError(error.message);
  }
  if (!data.session || !data.user) {
    return actionOk("/login?check=1");
  }
  await ensureProfile(
    { id: data.user.id, email: data.user.email ?? "" },
    displayName,
  );
  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
