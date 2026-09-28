export function friendlyAuthError(message: string, fallback: string): string {
  const text = message.trim().toLowerCase();
  if (!text) return fallback;
  if (text.includes("email not confirmed") || text.includes("email_not_confirmed")) {
    return "確認メールのリンクを開いてからログインしてください。届いていない場合は迷惑メールフォルダも確認してください。";
  }
  if (
    text.includes("user already registered") ||
    text.includes("already been registered") ||
    text.includes("already registered")
  ) {
    return "このメールアドレスは登録済みです。ログインするか、確認メールのリンクを開いてください。";
  }
  if (text.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }
  if (text.includes("password") && (text.includes("at least") || text.includes("6 character"))) {
    return "パスワードは8文字以上にしてください。";
  }
  if (text.includes("rate limit") || text.includes("only request this after") || text.includes("too many")) {
    return "短時間に何度も試されています。しばらく待ってからやり直してください。";
  }
  if (text.includes("invalid") && text.includes("email")) {
    return "メールアドレスの形式を確認してください。";
  }
  if (text.includes("signup is disabled")) {
    return "現在、新規登録を受け付けていません。";
  }
  return message.trim() || fallback;
}

export function isAlreadyRegisteredAuthError(message: string): boolean {
  const text = message.trim().toLowerCase();
  return (
    text.includes("user already registered") ||
    text.includes("already been registered") ||
    text.includes("already registered")
  );
}

export function isEmailNotConfirmedAuthError(message: string): boolean {
  const text = message.trim().toLowerCase();
  return text.includes("email not confirmed") || text.includes("email_not_confirmed");
}

export function isUnconfirmedSignupUser(user: {
  identities?: { identity_id?: string }[] | null;
} | null): boolean {
  return Boolean(user && (user.identities?.length ?? 0) > 0);
}

export const SIGNUP_CONFIRM_NOTICE =
  "登録を受け付けました。確認メールのリンクを開くとログインできます。届いていない場合は迷惑メールフォルダも確認してください。";
