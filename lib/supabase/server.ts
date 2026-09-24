import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  loadLocalEnv,
  supabasePublishableKeyFromEnv,
  supabaseUrlFromEnv,
} from "@/lib/supabase/load-local-env";

export async function createSupabaseServerClient() {
  loadLocalEnv();
  const cookieStore = await cookies();
  return createServerClient(supabaseUrlFromEnv(), supabasePublishableKeyFromEnv(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component; proxy refreshes the session cookie.
        }
      },
    },
  });
}
