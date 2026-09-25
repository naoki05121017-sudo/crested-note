import { describe, expect, it } from "vitest";
import {
  CHECK_CADENCE_PRESETS,
  cadenceIdFromDays,
  calendarDateInTimeZone,
  checkReminder,
  parseCheckEveryDays,
} from "./check-cadence";

describe("check cadence", () => {
  it("maps presets without a product-fixed interval", () => {
    expect(CHECK_CADENCE_PRESETS.map((row) => row.id)).toEqual([
      "weekly",
      "fortnight",
      "monthly",
    ]);
    expect(cadenceIdFromDays(undefined)).toBe("unset");
    expect(cadenceIdFromDays(CHECK_CADENCE_PRESETS[0].days)).toBe("weekly");
    expect(cadenceIdFromDays(CHECK_CADENCE_PRESETS[1].days)).toBe("fortnight");
    expect(cadenceIdFromDays(CHECK_CADENCE_PRESETS[2].days)).toBe("monthly");
    expect(cadenceIdFromDays(11)).toBe("custom");
  });

  it("parses per-animal form values", () => {
    const weekly = new FormData();
    weekly.set("checkCadence", "weekly");
    expect(parseCheckEveryDays(weekly)).toEqual({
      error: null,
      days: CHECK_CADENCE_PRESETS[0].days,
    });

    const custom = new FormData();
    custom.set("checkCadence", "custom");
    custom.set("checkEveryDays", "10");
    expect(parseCheckEveryDays(custom)).toEqual({ error: null, days: 10 });

    const unset = new FormData();
    unset.set("checkCadence", "unset");
    expect(parseCheckEveryDays(unset, 10)).toEqual({
      error: null,
      days: undefined,
    });

    const missing = new FormData();
    expect(parseCheckEveryDays(missing, 10)).toEqual({ error: null, days: 10 });
  });

  it("builds next-check copy from the last record", () => {
    const due = checkReminder({
      checkEveryDays: CHECK_CADENCE_PRESETS[0].days,
      lastWeighedOn: "2026-09-01",
      asOf: "2026-09-10",
    });
    expect(due?.due).toBe(true);
    expect(due?.headline).toBe("前回の記録から9日経ちました");
    expect(due?.body).toContain("そろそろ体重を記録");

    const waiting = checkReminder({
      checkEveryDays: CHECK_CADENCE_PRESETS[2].days,
      lastWeighedOn: "2026-09-20",
      asOf: "2026-09-24",
    });
    expect(waiting?.due).toBe(false);
    expect(waiting?.headline).toBe("次の記録まであと26日");
  });

  it("formats the calendar date in Japan time", () => {
    expect(calendarDateInTimeZone(new Date("2026-09-24T22:30:00Z"))).toBe(
      "2026-09-25",
    );
  });
});
