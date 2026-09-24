import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/auth/session";
import { resolveAppOrigin, safeNextPath } from "@/lib/auth/app-origin";
import {
  loadLocalEnv,
  supabasePublishableKeyFromEnv,
  supabaseUrlFromEnv,
} from "@/lib/supabase/load-local-env";

function callbackOrigin(request: NextRequest): string {
  return resolveAppOrigin({
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestHost: request.headers.get("x-forwarded-host") ?? request.nextUrl.host,
    requestProto: request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", ""),
  });
}

export async function GET(request: NextRequest) {
  loadLocalEnv();
  const origin = callbackOrigin(request);
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const login = NextResponse.redirect(new URL("/login?check=1", origin));

  const redirectTo = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient(supabaseUrlFromEnv(), supabasePublishableKeyFromEnv(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          redirectTo.cookies.set(name, value, options);
        }
      },
    },
  });

  let errorMessage = "";
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? "";
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    errorMessage = error?.message ?? "";
  } else {
    return login;
  }

  if (errorMessage) {
    return login;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureProfile({ id: user.id, email: user.email ?? "" });
  }

  return redirectTo;
}
