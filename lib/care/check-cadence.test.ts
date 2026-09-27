import { describe, expect, it } from "vitest";
import {
  CHECK_CADENCE_PRESETS,
  cadenceIdFromDays,
  cadenceLabel,
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
    expect(cadenceLabel(CHECK_CADENCE_PRESETS[0].days)).toBe("毎週");
    expect(cadenceLabel(CHECK_CADENCE_PRESETS[1].days)).toBe("2週間ごと");
    expect(cadenceLabel(CHECK_CADENCE_PRESETS[2].days)).toBe("1ヶ月ごと");
    expect(cadenceLabel(10)).toBe("10日ごと");
    expect(cadenceLabel(undefined)).toBe(null);
  });

  it("parses per-animal form values", () => {
    const weekly = new FormData();
    weekly.set("checkCadence", "weekly");
    expect(parseCheckEveryDays(weekly)).toEqual({
      error: null,
      days: CHECK_CADENCE_PRESETS[0].days,
    });

    const weeklyEmptyCustom = new FormData();
    weeklyEmptyCustom.set("checkCadence", "weekly");
    weeklyEmptyCustom.set("checkEveryDays", "");
    expect(parseCheckEveryDays(weeklyEmptyCustom)).toEqual({
      error: null,
      days: CHECK_CADENCE_PRESETS[0].days,
    });

    const fortnight = new FormData();
    fortnight.set("checkCadence", "fortnight");
    expect(parseCheckEveryDays(fortnight)).toEqual({
      error: null,
      days: CHECK_CADENCE_PRESETS[1].days,
    });

    const monthly = new FormData();
    monthly.set("checkCadence", "monthly");
    expect(parseCheckEveryDays(monthly)).toEqual({
      error: null,
      days: CHECK_CADENCE_PRESETS[2].days,
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

  it("round-trips saved days back to the profile labels", () => {
    const cases = [
      ["weekly", "毎週"],
      ["fortnight", "2週間ごと"],
      ["monthly", "1ヶ月ごと"],
    ] as const;
    for (const [id, label] of cases) {
      const form = new FormData();
      form.set("checkCadence", id);
      const parsed = parseCheckEveryDays(form);
      expect(parsed.error).toBeNull();
      if (parsed.error !== null) continue;
      expect(cadenceLabel(parsed.days)).toBe(label);
      expect(cadenceIdFromDays(parsed.days)).toBe(id);
    }

    const custom = new FormData();
    custom.set("checkCadence", "custom");
    custom.set("checkEveryDays", "10");
    const parsedCustom = parseCheckEveryDays(custom);
    expect(parsedCustom.error).toBeNull();
    if (parsedCustom.error !== null) return;
    expect(cadenceLabel(parsedCustom.days)).toBe("10日ごと");
    expect(cadenceIdFromDays(parsedCustom.days)).toBe("custom");
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
