import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("app tab loading and prefetch", () => {
  it("exposes PageSkeleton via app/(app)/loading.tsx", () => {
    const loading = readFileSync("app/(app)/loading.tsx", "utf8");
    expect(loading).toContain("PageSkeleton");
    expect(loading).toContain("export default function AppLoading");
  });

  it("prefetches only home, animals, and checks bottom tabs", () => {
    const nav = readFileSync("app/components/mobile-app-nav.tsx", "utf8");
    expect(nav).toMatch(/href=\{tab\.href\}[\s\S]{0,80}prefetch/);
    expect(nav).toContain("prefetch={false}");
    expect(nav.match(/prefetch=\{false\}/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("streams Japan stats and breeding off the home primary path", () => {
    const home = readFileSync("app/(app)/page.tsx", "utf8");
    const primary = home.slice(
      home.indexOf("async function loadHomePrimary"),
      home.indexOf("async function HomeJapanSection"),
    );
    expect(primary).not.toContain("fetchJapanCrestStats");
    expect(primary).not.toContain("dashboardCounts");
    expect(primary).not.toContain("fetchCompareCohort");
    expect(home).toContain("fetchJapanCrestStats()");
    expect(home).toContain("dashboardCounts(user.id)");
    expect(home).toContain("<Suspense");
  });
});
