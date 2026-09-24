import { headers } from "next/headers";
import { resolveAppOrigin } from "@/lib/auth/app-origin";

export async function appOriginFromRequest(): Promise<string> {
  const h = await headers();
  return resolveAppOrigin({
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestHost: h.get("x-forwarded-host") ?? h.get("host") ?? "",
    requestProto: h.get("x-forwarded-proto") ?? "",
  });
}
