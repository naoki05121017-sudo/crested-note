import { describe, expect, it } from "vitest";
import {
  chunkIds,
  countsMatchForDelete,
  POSTGREST_PAGE_SIZE,
} from "./supabase-page";
import { sanitizeAnimalSearch } from "./animal-search";

describe("postgrest paging helpers", () => {
  it("chunks id lists below PostgREST URL limits", () => {
    expect(chunkIds(["a", "b", "c"], 2)).toEqual([["a", "b"], ["c"]]);
    expect(POSTGREST_PAGE_SIZE).toBeLessThan(1000);
  });

  it("refuses delete when the fetched set is incomplete", () => {
    expect(countsMatchForDelete(10, 10)).toBe(true);
    expect(countsMatchForDelete(11, 10)).toBe(false);
    expect(countsMatchForDelete(null, 10)).toBe(false);
  });
});

describe("animal search sanitizing", () => {
  it("strips PostgREST or-filter metacharacters", () => {
    expect(sanitizeAnimalSearch("NC-0001")).toBe("NC-0001");
    expect(sanitizeAnimalSearch("foo%bar_baz,(x)")).toBe("foo bar baz x");
  });
});
