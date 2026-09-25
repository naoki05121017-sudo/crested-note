import { checkReminder } from "@/lib/care/check-cadence";
import { latestWeight } from "@/lib/stats/compare";
import type { AnimalRecord, WeightLogRecord } from "@/lib/db/types";

export type DueCheckPush = {
  animalId: string;
  userId: string;
  name: string;
  title: string;
  body: string;
  path: string;
};

export function dueCheckPushes(
  animals: Array<
    Pick<AnimalRecord, "id" | "name" | "status" | "checkEveryDays"> & {
      userId?: string;
    }
  >,
  weightsByAnimal: Map<string, WeightLogRecord[]>,
  asOf: string,
): DueCheckPush[] {
  const due: DueCheckPush[] = [];
  for (const animal of animals) {
    if (animal.status === "sold" || animal.status === "deceased") continue;
    const last = latestWeight(weightsByAnimal.get(animal.id) ?? []);
    if (!last) continue;
    const reminder = checkReminder({
      checkEveryDays: animal.checkEveryDays,
      lastWeighedOn: last.weighedOn,
      asOf,
    });
    if (!reminder?.due) continue;
    due.push({
      animalId: animal.id,
      userId: animal.userId ?? "",
      name: animal.name,
      title: `${animal.name}のクレスチェックの時間です🦎`,
      body: reminder.headline,
      path: `/animals/${animal.id}`,
    });
  }
  return due;
}
