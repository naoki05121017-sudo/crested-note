import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const client = createAdminClient();
  const crest = await client.from("crest_link_seq").select("id, value");
  if (crest.error) {
    console.error("crest_link_seq read failed:", crest.error.message);
  } else {
    const ids = (crest.data ?? []).map((row) => Number(row.id));
    console.log("crest_link_seq ids:", ids.join(",") || "(none)");
    console.log("crest_link_seq row count:", ids.length);
  }

  const codes = await client.from("animal_code_seq").select("user_id, value");
  if (codes.error) {
    console.log("animal_code_seq present: no");
    console.log("animal_code_seq error:", codes.error.message);
  } else {
    console.log("animal_code_seq present: yes");
    console.log("animal_code_seq row count:", (codes.data ?? []).length);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(message);
  process.exit(1);
});
