export function ageInMonths(hatchDate: string, onDate: string): number | null {
  if (!hatchDate || !onDate) return null;
  const hatch = new Date(`${hatchDate}T00:00:00`);
  const on = new Date(`${onDate}T00:00:00`);
  if (Number.isNaN(hatch.getTime()) || Number.isNaN(on.getTime())) return null;
  const months =
    (on.getFullYear() - hatch.getFullYear()) * 12 +
    (on.getMonth() - hatch.getMonth());
  return Math.max(0, months);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightTone(diff: number, average: number): string {
  if (!Number.isFinite(average) || average <= 0) return "比較できません";
  const ratio = diff / average;
  if (Math.abs(diff) < 0.8 || Math.abs(ratio) < 0.04) return "平均的";
  if (ratio >= 0.15) return "重め";
  if (ratio > 0) return "やや重め";
  if (ratio <= -0.15) return "軽め";
  return "やや軽め";
}

export const AGE_BUCKETS = [
  { id: "0-3", label: "0〜3ヶ月", min: 0, max: 3 },
  { id: "3-6", label: "3〜6ヶ月", min: 3, max: 6 },
  { id: "6-12", label: "6〜12ヶ月", min: 6, max: 12 },
  { id: "12-24", label: "1〜2年", min: 12, max: 24 },
  { id: "24+", label: "2年以上", min: 24, max: 1000 },
] as const;
