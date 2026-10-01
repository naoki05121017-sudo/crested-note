import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicAppPath } from "@/lib/auth/paths";
import { hasSupabaseAuthCookie } from "@/lib/auth/supabase-auth-cookie";
import {
  markVerifiedUserHeaders,
  stripVerifiedUserHeaders,
} from "@/lib/auth/verified-request-user";

function continueWithHeaders(
  request: NextRequest,
  cookieResponse: NextResponse,
  user: { id: string; email?: string | null } | null | undefined,
) {
  const requestHeaders = stripVerifiedUserHeaders(new Headers(request.headers));
  if (user !== undefined) {
    markVerifiedUserHeaders(requestHeaders, user);
  }
  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });
  for (const cookie of cookieResponse.cookies.getAll()) {
    next.cookies.set(cookie);
  }
  return next;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url || !publishable) {
    return continueWithHeaders(request, response, undefined);
  }

  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    if (isPublicAppPath(pathname)) {
      return continueWithHeaders(request, response, undefined);
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const supabase = createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !isPublicAppPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return continueWithHeaders(request, response, user);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico)$).*)",
  ],
};
