"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { actionError, actionNotice, actionOk } from "@/app/components/action-result";
import { textField } from "@/lib/db/form";
import { appOriginFromRequest } from "@/lib/auth/request-origin";
import { authEmailRedirectTo } from "@/lib/auth/app-origin";
import {
  SIGNUP_CONFIRM_NOTICE,
  friendlyAuthError,
  isAlreadyRegisteredAuthError,
  isEmailNotConfirmedAuthError,
  isUnconfirmedSignupUser,
} from "@/lib/auth/auth-messages";
import { ensureProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

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
  if (error || !data.user || !data.session) {
    return actionError(
      friendlyAuthError(error?.message ?? "", "ログインできませんでした。"),
    );
  }
  const user = { id: data.user.id, email: data.user.email ?? "" };
  after(async () => {
    try {
      await ensureProfile(user);
    } catch {
      // Signup/callback still create the row. Login must not wait on it.
    }
  });
  return actionOk(nextPath(formData));
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authEmailRedirectTo(await appOriginFromRequest()),
    },
  });

  async function enterSession(user: User) {
    await ensureProfile({ id: user.id, email: user.email ?? "" }, displayName);
    revalidatePath("/", "layout");
    redirect("/");
  }

  async function signInAfterSignup() {
    return supabase.auth.signInWithPassword({ email, password });
  }

  if (error) {
    if (isAlreadyRegisteredAuthError(error.message)) {
      const signedIn = await signInAfterSignup();
      if (signedIn.data.user && signedIn.data.session) {
        await enterSession(signedIn.data.user);
      }
      if (isEmailNotConfirmedAuthError(signedIn.error?.message ?? "")) {
        return actionNotice(SIGNUP_CONFIRM_NOTICE);
      }
    }
    return actionError(friendlyAuthError(error.message, "登録できませんでした。"));
  }

  if (data.session && data.user) {
    await enterSession(data.user);
  }

  const signedIn = await signInAfterSignup();
  if (signedIn.data.user && signedIn.data.session) {
    await enterSession(signedIn.data.user);
  }

  if (!isUnconfirmedSignupUser(data.user) && signedIn.error) {
    return actionError(
      friendlyAuthError(
        signedIn.error.message,
        "このメールアドレスは登録済みです。ログインしてください。",
      ),
    );
  }

  return actionNotice(SIGNUP_CONFIRM_NOTICE);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
