import type { WeightLogRecord } from "@/lib/db/types";
import { calendarDaysBetween } from "./check-cadence";

export function sortWeightLogs(logs: WeightLogRecord[]): WeightLogRecord[] {
  return logs
    .slice()
    .sort(
      (a, b) =>
        a.weighedOn.localeCompare(b.weighedOn) || a.id.localeCompare(b.id),
    );
}

export function formatGrams(value: number): string {
  return `${value.toFixed(1)}g`;
}

export function formatDeltaGrams(delta: number): string {
  const rounded = Number(delta.toFixed(1));
  if (Object.is(rounded, -0) || rounded === 0) return "±0g";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}g`;
}

export type WeightChange = {
  previous: WeightLogRecord;
  current: WeightLogRecord;
  deltaG: number;
  daysBetween: number | null;
};

export function latestWeightChange(logs: WeightLogRecord[]): WeightChange | null {
  const sorted = sortWeightLogs(logs);
  if (sorted.length < 2) return null;
  const previous = sorted[sorted.length - 2];
  const current = sorted[sorted.length - 1];
  return {
    previous,
    current,
    deltaG: current.weightG - previous.weightG,
    daysBetween: calendarDaysBetween(previous.weighedOn, current.weighedOn),
  };
}

export type GrowthAlbumStep = {
  log: WeightLogRecord;
  deltaG: number | null;
  daysSincePrev: number | null;
};

export function growthAlbumSteps(logs: WeightLogRecord[]): GrowthAlbumStep[] {
  const sorted = sortWeightLogs(logs);
  return sorted.map((log, index) => {
    const prev = sorted[index - 1];
    return {
      log,
      deltaG: prev ? log.weightG - prev.weightG : null,
      daysSincePrev: prev
        ? calendarDaysBetween(prev.weighedOn, log.weighedOn)
        : null,
    };
  });
}

export type MonthlyGrowthReport = {
  yearMonth: string;
  label: string;
  startG: number;
  endG: number;
  deltaG: number;
  count: number;
  startOn: string;
  endOn: string;
};

function monthLabel(yearMonth: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;
  return `${year}年${month}月の成長`;
}

export function monthlyGrowthReport(
  logs: WeightLogRecord[],
  yearMonth: string,
): MonthlyGrowthReport | null {
  const label = monthLabel(yearMonth);
  if (!label) return null;
  const inMonth = sortWeightLogs(
    logs.filter((log) => log.weighedOn.startsWith(yearMonth)),
  );
  if (inMonth.length < 2) return null;
  const start = inMonth[0];
  const end = inMonth[inMonth.length - 1];
  return {
    yearMonth,
    label,
    startG: start.weightG,
    endG: end.weightG,
    deltaG: end.weightG - start.weightG,
    count: inMonth.length,
    startOn: start.weighedOn,
    endOn: end.weighedOn,
  };
}

export function latestMonthlyReport(
  logs: WeightLogRecord[],
  asOf: string,
): MonthlyGrowthReport | null {
  const months = [
    ...new Set(
      sortWeightLogs(logs)
        .map((log) => log.weighedOn.slice(0, 7))
        .filter(Boolean),
    ),
  ].sort((a, b) => b.localeCompare(a));
  const current = asOf.slice(0, 7);
  const ordered = current
    ? [current, ...months.filter((month) => month !== current)]
    : months;
  for (const month of ordered) {
    const report = monthlyGrowthReport(logs, month);
    if (report) return report;
  }
  return null;
}
