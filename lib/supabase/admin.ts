import { createClient } from "@supabase/supabase-js";
import { fetchWithJwtClockSkewRetry } from "@/lib/supabase/clock-skew-fetch";
import {
  loadLocalEnv,
  supabaseSecretKeyFromEnv,
  supabaseUrlFromEnv,
} from "@/lib/supabase/load-local-env";

export function createAdminClient() {
  loadLocalEnv();
  // sb_secret_ is an API key, not a JWT. The fetch wrapper sends it only as `apikey`.
  return createClient(supabaseUrlFromEnv(), supabaseSecretKeyFromEnv(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithJwtClockSkewRetry },
  });
}
