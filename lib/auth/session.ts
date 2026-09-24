import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
};

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function ensureProfile(user: SessionUser, displayName = "") {
  const client = createAdminClient();
  const { data: existing } = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing?.id) return;
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      collection_name: "クレスノート",
      prefecture: "",
      public_by_default: false,
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`プロフィールを作れません: ${error.message}`);
  }
}
