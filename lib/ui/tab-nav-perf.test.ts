import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("app tab loading and prefetch", () => {
  it("keeps previous tab content instead of a full-page skeleton", () => {
    const layout = readFileSync("app/(app)/layout.tsx", "utf8");
    expect(layout).toContain("PageSkeleton");
    expect(layout).toContain("sessionPending");
    expect(layout).not.toContain("<Suspense fallback={<BootMain />}>{children}</Suspense>");
  });

  it("prefetches only home, animals, and checks bottom tabs", () => {
    const nav = readFileSync("app/components/mobile-app-nav.tsx", "utf8");
    expect(nav).toMatch(/href=\{tab\.href\}[\s\S]{0,80}prefetch/);
    expect(nav).toContain("prefetch={false}");
    expect(nav.match(/prefetch=\{false\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(nav).toContain("pendingHref");
    expect(nav).toContain("router.prefetch(item.href)");
    expect(nav).toContain("[...morePrimary, ...moreBreed]");
  });

  it("streams Japan stats and breeding off the home primary path", () => {
    const home = readFileSync("app/(app)/page.tsx", "utf8");
    const primary = home.slice(
      home.indexOf("async function loadHomeHero"),
      home.indexOf("async function HomeCareAlbumSection"),
    );
    expect(primary).not.toContain("fetchJapanCrestStats");
    expect(primary).not.toContain("dashboardCounts");
    expect(primary).not.toContain("fetchCompareCohort");
    expect(primary).not.toContain("listOwnedCheckAnimals");
    expect(primary).not.toContain("listOwnedPhotoAnimals");
    expect(home).toContain("fetchJapanCrestStats()");
    expect(home).toContain("dashboardCounts(user.id)");
    expect(home).toContain("<Suspense");
    expect(home).not.toContain("getSettings");
    expect(home).not.toContain("listWeightsForAnimals");
    expect(home).toContain("listLatestWeightsForAnimals");
    expect(home).not.toContain("listRecentOwnedWeights");
  });

  it("loads tab lists with latest weights instead of full weight histories", () => {
    const animals = readFileSync("app/(app)/animals/page.tsx", "utf8");
    const checks = readFileSync("app/(app)/checks/page.tsx", "utf8");
    const owned = readFileSync("lib/db/owned-tables.ts", "utf8");
    const io = readFileSync("lib/db/animal-io.ts", "utf8");
    expect(animals).toContain("listLatestWeightsForAnimals");
    expect(animals).toContain("Promise.all");
    expect(animals).toContain("<Suspense");
    expect(animals).not.toContain("weightsByAnimal");
    expect(animals).not.toContain("listWeightsForAnimals");
    expect(checks).toContain("listLatestWeightsForAnimals");
    expect(checks).not.toContain("listWeightsForAnimals");
    expect(io).toContain("listLatestWeightsForAnimals");
    expect(io).toContain("listRecentWeightsForAnimals");
    expect(io).toContain('.order("weighed_on", { ascending: false })');
    expect(owned).toContain("listRecentWeightsForAnimals(");
  });

  it("streams animal detail history after the hero", () => {
    const detail = readFileSync("app/(app)/animals/[id]/page.tsx", "utf8");
    const loading = readFileSync("app/(app)/animals/[id]/loading.tsx", "utf8");
    expect(detail).toContain("listLatestWeightsForAnimals");
    expect(detail).toContain("AnimalGrowthChart");
    expect(detail).toContain("listWeights(animal.id)");
    expect(detail).toContain("<Suspense");
    expect(loading).toContain("AnimalDetailLoading");
  });
});
