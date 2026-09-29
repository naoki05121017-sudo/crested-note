import { describe, expect, it } from "vitest";
import {
  sortCrestCheckItems,
  type CrestCheckItem,
} from "./crest-check-list";

function item(partial: Partial<CrestCheckItem> & Pick<CrestCheckItem, "id" | "name">): CrestCheckItem {
  return {
    due: false,
    overdue: false,
    daysUntilNext: null,
    daysSince: null,
    headline: "",
    body: "",
    ...partial,
  };
}

describe("sortCrestCheckItems", () => {
  it("puts overdue and due today before upcoming days", () => {
    const sorted = sortCrestCheckItems([
      item({ id: "later", name: "後", daysUntilNext: 5 }),
      item({ id: "soon", name: "近", daysUntilNext: 1 }),
      item({ id: "today", name: "今日", due: true }),
      item({ id: "late", name: "超過", due: true, overdue: true, daysSince: 20 }),
    ]);
    expect(sorted.map((row) => row.id)).toEqual(["late", "today", "soon", "later"]);
  });
});
