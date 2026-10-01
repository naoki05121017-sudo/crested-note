export const VERIFIED_AUTH_HEADER = "x-crest-auth-verified";
export const VERIFIED_USER_ID_HEADER = "x-crest-verified-user-id";
export const VERIFIED_USER_EMAIL_HEADER = "x-crest-verified-user-email";

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function stripVerifiedUserHeaders(headers: Headers): Headers {
  headers.delete(VERIFIED_AUTH_HEADER);
  headers.delete(VERIFIED_USER_ID_HEADER);
  headers.delete(VERIFIED_USER_EMAIL_HEADER);
  return headers;
}

export function markVerifiedUserHeaders(
  headers: Headers,
  user: { id: string; email?: string | null } | null,
): Headers {
  stripVerifiedUserHeaders(headers);
  headers.set(VERIFIED_AUTH_HEADER, "1");
  if (user?.id && USER_ID_RE.test(user.id)) {
    headers.set(VERIFIED_USER_ID_HEADER, user.id);
    headers.set(VERIFIED_USER_EMAIL_HEADER, (user.email ?? "").slice(0, 320));
  }
  return headers;
}

export function readVerifiedSessionUser(headers: {
  get(name: string): string | null;
}): { id: string; email: string } | null | undefined {
  if (headers.get(VERIFIED_AUTH_HEADER) !== "1") return undefined;
  const id = headers.get(VERIFIED_USER_ID_HEADER)?.trim() ?? "";
  if (!USER_ID_RE.test(id)) return null;
  return { id, email: headers.get(VERIFIED_USER_EMAIL_HEADER) ?? "" };
}
