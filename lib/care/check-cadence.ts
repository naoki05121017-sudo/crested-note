export const WEEK_DAYS = 7;

export const CHECK_CADENCE_PRESETS = [
  { id: "weekly", label: "毎週", days: WEEK_DAYS },
  { id: "fortnight", label: "2週間ごと", days: WEEK_DAYS * 2 },
  { id: "monthly", label: "1ヶ月ごと", days: 30 },
] as const;

export type CheckCadenceId =
  | (typeof CHECK_CADENCE_PRESETS)[number]["id"]
  | "custom"
  | "unset";

const CUSTOM_MIN_DAYS = 1;
const CUSTOM_MAX_DAYS = 365;

export function cadenceIdFromDays(days?: number): CheckCadenceId {
  if (days == null || !Number.isFinite(days) || days <= 0) return "unset";
  const rounded = Math.floor(days);
  const preset = CHECK_CADENCE_PRESETS.find((row) => row.days === rounded);
  return preset?.id ?? "custom";
}

export function cadenceLabel(days?: number): string | null {
  if (days == null || days <= 0) return null;
  const preset = CHECK_CADENCE_PRESETS.find((row) => row.days === days);
  if (preset) return preset.label;
  return `${Math.floor(days)}日ごと`;
}

export function parseCheckEveryDays(
  formData: FormData,
  existingDays?: number,
): { error: string } | { error: null; days: number | undefined } {
  if (!formData.has("checkCadence")) {
    return { error: null, days: existingDays };
  }
  const cadence = String(formData.get("checkCadence") ?? "unset").trim();
  if (cadence === "unset" || cadence === "") {
    return { error: null, days: undefined };
  }
  const preset = CHECK_CADENCE_PRESETS.find((row) => row.id === cadence);
  if (preset) {
    return { error: null, days: preset.days };
  }
  if (cadence !== "custom") {
    return { error: "記録の間隔を選び直してください。" };
  }
  const raw = Number(String(formData.get("checkEveryDays") ?? "").trim());
  if (!Number.isFinite(raw)) {
    return { error: "カスタムの日数を入力してください。" };
  }
  const days = Math.floor(raw);
  if (days < CUSTOM_MIN_DAYS || days > CUSTOM_MAX_DAYS) {
    return {
      error: `間隔は${CUSTOM_MIN_DAYS}〜${CUSTOM_MAX_DAYS}日で入力してください。`,
    };
  }
  return { error: null, days };
}

export function calendarDaysBetween(fromIso: string, toIso: string): number | null {
  if (!fromIso || !toIso) return null;
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export type CheckReminder = {
  due: boolean;
  daysSince: number | null;
  cadenceDays: number;
  cadenceLabel: string;
  headline: string;
  body: string;
};

export function checkReminder(options: {
  checkEveryDays?: number;
  lastWeighedOn?: string;
  asOf: string;
}): CheckReminder | null {
  const cadenceDays = options.checkEveryDays;
  if (cadenceDays == null || cadenceDays <= 0) return null;
  const label = cadenceLabel(cadenceDays) ?? `${cadenceDays}日ごと`;

  if (!options.lastWeighedOn) {
    return {
      due: true,
      daysSince: null,
      cadenceDays,
      cadenceLabel: label,
      headline: "まだ体重の記録がありません",
      body: "測ったら、クレスノートに残してみませんか？🦎",
    };
  }

  const daysSince = calendarDaysBetween(options.lastWeighedOn, options.asOf);
  if (daysSince == null) return null;

  if (daysSince >= cadenceDays) {
    return {
      due: true,
      daysSince,
      cadenceDays,
      cadenceLabel: label,
      headline: `前回の記録から${daysSince}日経ちました`,
      body: "そろそろ体重を記録してみませんか？🦎",
    };
  }

  const remaining = cadenceDays - daysSince;
  return {
    due: false,
    daysSince,
    cadenceDays,
    cadenceLabel: label,
    headline: `次の記録まであと${remaining}日`,
    body: `この子の目安は${label}です。`,
  };
}
