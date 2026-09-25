import webpush from "web-push";
import { PRODUCTION_APP_ORIGIN } from "@/lib/auth/app-origin";
import { calendarDateInTimeZone } from "@/lib/care/check-cadence";
import { dueCheckPushes } from "@/lib/push/due";
import { vapidPrivateKey, vapidPublicKey, vapidReady, vapidSubject } from "@/lib/push/vapid";
import { createAdminClient } from "@/lib/supabase/admin";

type SubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

function origin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    PRODUCTION_APP_ORIGIN
  );
}

async function alreadySent(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
  animalId: string,
  notifiedOn: string,
): Promise<boolean> {
  const { data } = await client
    .from("push_notice_log")
    .select("animal_id")
    .eq("user_id", userId)
    .eq("animal_id", animalId)
    .eq("notified_on", notifiedOn)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
  animalId: string,
  notifiedOn: string,
) {
  await client.from("push_notice_log").upsert(
    { user_id: userId, animal_id: animalId, notified_on: notifiedOn },
    { onConflict: "user_id,animal_id,notified_on" },
  );
}

async function deleteSubscription(
  client: ReturnType<typeof createAdminClient>,
  endpoint: string,
) {
  await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function sendDueCheckPushes(now = new Date()): Promise<{
  due: number;
  sent: number;
  skipped: number;
}> {
  if (!vapidReady()) {
    throw new Error("VAPID キーが未設定です。");
  }

  webpush.setVapidDetails(vapidSubject(), vapidPublicKey(), vapidPrivateKey());

  const asOf = calendarDateInTimeZone(now);
  const client = createAdminClient();
  const { data: subs, error: subError } = await client
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id");
  if (subError) {
    throw new Error(`購読を読めません: ${subError.message}`);
  }
  const subscriptions = (subs ?? []) as SubRow[];
  if (subscriptions.length === 0) {
    return { due: 0, sent: 0, skipped: 0 };
  }

  const userIds = [...new Set(subscriptions.map((row) => row.user_id))];
  const { data: animals, error: animalError } = await client
    .from("animals")
    .select("id, user_id, name, status, check_every_days")
    .in("user_id", userIds);
  if (animalError) {
    throw new Error(`個体を読めません: ${animalError.message}`);
  }

  const animalRows = animals ?? [];
  const animalIds = animalRows.map((row) => String(row.id));
  const weightsByAnimal = new Map<
    string,
    { id: string; animalId: string; weighedOn: string; weightG: number; notes: string }[]
  >();
  if (animalIds.length > 0) {
    const { data: weights, error: weightError } = await client
      .from("weight_logs")
      .select("id, animal_id, weighed_on, weight_g")
      .in("animal_id", animalIds);
    if (weightError) {
      throw new Error(`体重を読めません: ${weightError.message}`);
    }
    for (const row of weights ?? []) {
      const animalId = String(row.animal_id);
      const list = weightsByAnimal.get(animalId) ?? [];
      list.push({
        id: String(row.id),
        animalId,
        weighedOn: String(row.weighed_on ?? ""),
        weightG: Number(row.weight_g),
        notes: "",
      });
      weightsByAnimal.set(animalId, list);
    }
  }

  const due = dueCheckPushes(
    animalRows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      status: (row.status as "active" | "breeding" | "sold" | "deceased") ?? "active",
      checkEveryDays: optionalDays(row.check_every_days),
      userId: String(row.user_id),
    })),
    weightsByAnimal,
    asOf,
  );

  const byUser = new Map<string, SubRow[]>();
  for (const sub of subscriptions) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  let sent = 0;
  let skipped = 0;
  for (const item of due) {
    if (await alreadySent(client, item.userId, item.animalId, asOf)) {
      skipped += 1;
      continue;
    }
    const targets = byUser.get(item.userId) ?? [];
    if (targets.length === 0) {
      skipped += 1;
      continue;
    }
    const payload = JSON.stringify({
      title: item.title,
      body: item.body,
      url: `${origin()}${item.path}`,
    });
    let delivered = false;
    for (const target of targets) {
      try {
        await webpush.sendNotification(
          {
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          },
          payload,
        );
        delivered = true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deleteSubscription(client, target.endpoint);
        }
      }
    }
    if (delivered) {
      await markSent(client, item.userId, item.animalId, asOf);
      sent += 1;
    }
  }

  return { due: due.length, sent, skipped };
}

function optionalDays(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}
