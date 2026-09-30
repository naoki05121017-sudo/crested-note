export function hasSupabaseAuthCookie(
  cookies: readonly { name: string }[],
): boolean {
  return cookies.some((cookie) => cookie.name.includes("-auth-token"));
}
