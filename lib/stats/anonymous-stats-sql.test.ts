import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("anonymous stats SQL", () => {
  const sql = readFileSync(
    "supabase/migrations/20260928_anonymous_stats_and_private_photos.sql",
    "utf8",
  );

  it("returns aggregates through security definer RPCs and does not select identity columns", () => {
    const rpc = sql.slice(
      sql.indexOf("create or replace function public.japan_crest_stats"),
      sql.indexOf("update storage.buckets"),
    );
    expect(sql).toContain("security definer");
    expect(sql).toContain("japan_crest_stats");
    expect(sql).toContain("compare_cohort_stats");
    expect(rpc).not.toContain("photo_url");
    expect(rpc).not.toContain("share_slug");
    expect(rpc).not.toMatch(/\ba\.name\b/);
    expect(rpc).not.toMatch(/\ba\.notes\b/);
    expect(sql).toContain("grant execute on function public.japan_crest_stats() to authenticated");
    expect(sql).toContain("set public = false");
    expect(sql).toContain("animal_photos_select_if_animal_public");
  });

  it("counts every animal nationwide and turns row security off", () => {
    const allAnimals = readFileSync(
      "supabase/migrations/20260928_japan_crest_stats_all_animals.sql",
      "utf8",
    );
    const fn = allAnimals.slice(
      allAnimals.indexOf("create or replace function public.japan_crest_stats"),
    );
    expect(fn).toContain("security definer");
    expect(fn).toContain("set row_security = off");
    expect(fn).not.toContain("is_public");
    expect(fn).not.toContain("auth.uid()");
    expect(fn).not.toMatch(/user_id\s*=/);
    expect(fn).toContain("grant execute on function public.japan_crest_stats() to service_role");
    expect(fn).toContain("select count(*)::integer into v_registered from public.animals;");
  });

  it("adds a month-level growth guide RPC without identity fields", () => {
    const sql = readFileSync(
      "supabase/migrations/20260928_growth_guide_month_stats.sql",
      "utf8",
    );
    expect(sql).toContain("growth_guide_month_stats");
    expect(sql).toContain("security definer");
    expect(sql).toContain("stats_is_japan_prefecture");
    expect(sql).toContain("sampleSize");
    expect(sql).toContain("averageWeight");
    expect(sql).not.toContain("photo_url");
    expect(sql).not.toContain("user_id");
    expect(sql).not.toMatch(/\ba\.name\b/);
    expect(sql).not.toMatch(/\ba\.notes\b/);
    expect(sql).toContain(
      "grant execute on function public.growth_guide_month_stats() to authenticated",
    );
  });
});
