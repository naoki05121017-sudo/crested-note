import type { CheckReminder } from "@/lib/care/check-cadence";

export type CrestCheckItem = {
  id: string;
  name: string;
  due: boolean;
  overdue: boolean;
  daysUntilNext: number | null;
  daysSince: number | null;
  headline: string;
  body: string;
};

export function crestCheckItemFromReminder(
  animal: { id: string; name: string },
  reminder: CheckReminder,
): CrestCheckItem {
  const overdue =
    reminder.due &&
    reminder.daysSince != null &&
    reminder.daysSince > reminder.cadenceDays;
  return {
    id: animal.id,
    name: animal.name,
    due: reminder.due,
    overdue,
    daysUntilNext: reminder.due
      ? 0
      : reminder.daysSince == null
        ? null
        : reminder.cadenceDays - reminder.daysSince,
    daysSince: reminder.daysSince,
    headline: reminder.headline,
    body: reminder.body,
  };
}

function urgencyRank(item: CrestCheckItem) {
  if (item.overdue) return 0;
  if (item.due) return 1;
  return 2;
}

export function sortCrestCheckItems(items: CrestCheckItem[]): CrestCheckItem[] {
  return items.slice().sort((a, b) => {
    const rank = urgencyRank(a) - urgencyRank(b);
    if (rank !== 0) return rank;
    if (a.overdue && b.overdue) {
      return (b.daysSince ?? 0) - (a.daysSince ?? 0);
    }
    if (!a.due && !b.due) {
      return (a.daysUntilNext ?? 999) - (b.daysUntilNext ?? 999);
    }
    return a.name.localeCompare(b.name, "ja");
  });
}

export function crestCheckStatusLabel(item: CrestCheckItem): string {
  if (item.overdue) return "期限超過";
  if (item.due) return "今日チェック";
  if (item.daysUntilNext != null) return `あと${item.daysUntilNext}日`;
  return item.headline;
}
