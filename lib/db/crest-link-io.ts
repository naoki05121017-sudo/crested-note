import {
  formatCrestLinkId,
  ownerLabelFromSettings,
  parseCrestLinkSeq,
} from "@/lib/crest-link/core";
import {
  CREST_LINK_SEQ_ID,
  crestLinkSeqValue,
  crestLinkSeqWriteRow,
} from "@/lib/db/crest-link-seq";
import { asAnimalRecord, getOwnedAnimal, getOwnedSettings } from "@/lib/db/animal-io";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import type { AnimalRecord, CrestLinkEvent, CrestLinkRecord } from "@/lib/db/types";

function isoNow() {
  return new Date().toISOString();
}

function makeTransferCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let raw = "";
  for (const byte of bytes) {
    raw += alphabet[byte % alphabet.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function normalizeTransferCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function asEvents(value: unknown): CrestLinkEvent[] {
  return Array.isArray(value) ? (value as CrestLinkEvent[]) : [];
}

async function crestIdsForAnimals(animalIds: string[]): Promise<Map<string, string>> {
  const wanted = animalIds.filter(Boolean);
  const map = new Map<string, string>();
  if (wanted.length === 0) return map;
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("id, crest_link_id").in("id", wanted),
  );
  if (error) {
    throw new Error(`animals を読めません: ${error.message}`);
  }
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.crest_link_id ?? ""));
  }
  return map;
}

export async function syncOwnedCrestLinkParents(
  animal: Pick<AnimalRecord, "id" | "crestLinkId" | "sireId" | "damId">,
): Promise<void> {
  if (!animal.crestLinkId) return;
  const parentIds = await crestIdsForAnimals([animal.sireId, animal.damId]);
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_links")
      .update({
        sire_crest_link_id: parentIds.get(animal.sireId) ?? "",
        dam_crest_link_id: parentIds.get(animal.damId) ?? "",
      })
      .eq("id", animal.crestLinkId),
  );
  if (error) {
    throw new Error(`Crest Link を保存できません: ${error.message}`);
  }
}

export async function issueOwnedCrestLink(
  userId: string,
  animal: AnimalRecord,
): Promise<CrestLinkRecord> {
  const client = createAdminClient();
  const settings = await getOwnedSettings(userId);
  const ownerLabel = ownerLabelFromSettings(settings);
  const stamp = isoNow();

  if (animal.crestLinkId) {
    const { data, error } = await retryOnJwtIssuedAtFuture(() =>
      client.from("crest_links").select("*").eq("id", animal.crestLinkId).maybeSingle(),
    );
    if (error) {
      throw new Error(`Crest Link を読めません: ${error.message}`);
    }
    if (data) {
      await syncOwnedCrestLinkParents(animal);
      return {
        id: String(data.id),
        animalId: String(data.animal_id ?? animal.id),
        status: data.status === "retired" ? "retired" : "active",
        createdAt: String(data.created_at ?? stamp),
        currentOwnerLabel: String(data.current_owner_label ?? ownerLabel),
        ownerHistory: Array.isArray(data.owner_history) ? data.owner_history : [],
        sireCrestLinkId: String(data.sire_crest_link_id ?? ""),
        damCrestLinkId: String(data.dam_crest_link_id ?? ""),
        originKind: data.origin_kind === "ncrested" ? "ncrested" : "local",
        payloadVersion: 1,
        events: asEvents(data.events),
      };
    }
  }

  const { data: active, error: activeError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_links")
      .select("*")
      .eq("animal_id", animal.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  );
  if (activeError) {
    throw new Error(`Crest Link を読めません: ${activeError.message}`);
  }
  if (active) {
    const id = String(active.id);
    await retryOnJwtIssuedAtFuture(() =>
      client.from("animals").update({ crest_link_id: id }).eq("id", animal.id).eq("user_id", userId),
    );
    animal.crestLinkId = id;
    await syncOwnedCrestLinkParents(animal);
    return {
      id,
      animalId: animal.id,
      status: "active",
      createdAt: String(active.created_at ?? stamp),
      currentOwnerLabel: String(active.current_owner_label ?? ownerLabel),
      ownerHistory: Array.isArray(active.owner_history) ? active.owner_history : [],
      sireCrestLinkId: String(active.sire_crest_link_id ?? ""),
      damCrestLinkId: String(active.dam_crest_link_id ?? ""),
      originKind: active.origin_kind === "ncrested" ? "ncrested" : "local",
      payloadVersion: 1,
      events: asEvents(active.events),
    };
  }

  const seqRows = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_seq").select("id, value").eq("id", CREST_LINK_SEQ_ID),
  );
  if (seqRows.error) {
    throw new Error(`crest_link_seq を読めません: ${seqRows.error.message}`);
  }
  let seq = crestLinkSeqValue(seqRows.data);
  let created: CrestLinkRecord | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    seq += 1;
    const id = formatCrestLinkId(seq);
    const record: CrestLinkRecord = {
      id,
      animalId: animal.id,
      status: "active",
      createdAt: stamp,
      currentOwnerLabel: ownerLabel,
      ownerHistory: [{ at: stamp, ownerLabel }],
      sireCrestLinkId: "",
      damCrestLinkId: "",
      originKind: "local",
      payloadVersion: 1,
      events: [{ at: stamp, type: "issued" }],
    };
    const { error } = await retryOnJwtIssuedAtFuture(() =>
      client.from("crest_links").insert({
        id: record.id,
        animal_id: record.animalId,
        status: "active",
        created_at: record.createdAt,
        current_owner_label: record.currentOwnerLabel,
        current_owner_user_id: userId,
        owner_history: record.ownerHistory,
        sire_crest_link_id: "",
        dam_crest_link_id: "",
        origin_kind: "local",
        payload_version: 1,
        events: record.events,
      }),
    );
    if (!error) {
      created = record;
      break;
    }
    if (!/duplicate|unique/i.test(error.message)) {
      throw new Error(`Crest Link を保存できません: ${error.message}`);
    }
    seq = Math.max(seq, parseCrestLinkSeq(id));
  }
  if (!created) {
    throw new Error("Crest Link を発行できません。");
  }
  const { error: seqError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_seq").upsert(crestLinkSeqWriteRow(seq, seq), { onConflict: "id" }),
  );
  if (seqError) {
    throw new Error(`crest_link_seq を保存できません: ${seqError.message}`);
  }
  const { error: animalError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .update({ crest_link_id: created.id })
      .eq("id", animal.id)
      .eq("user_id", userId),
  );
  if (animalError) {
    throw new Error(`Crest Link を保存できません: ${animalError.message}`);
  }
  animal.crestLinkId = created.id;
  await syncOwnedCrestLinkParents(animal);
  return created;
}

export async function retireOwnedCrestLink(
  userId: string,
  animal: Pick<AnimalRecord, "id" | "crestLinkId">,
): Promise<void> {
  const client = createAdminClient();
  const stamp = isoNow();
  let query = client.from("crest_links").select("*");
  query = animal.crestLinkId
    ? query.or(`animal_id.eq.${animal.id},id.eq.${animal.crestLinkId}`)
    : query.eq("animal_id", animal.id);
  const { data, error } = await retryOnJwtIssuedAtFuture(() => query.limit(5));
  if (error) {
    throw new Error(`Crest Link を読めません: ${error.message}`);
  }
  for (const row of data ?? []) {
    const events = [...asEvents(row.events), { at: stamp, type: "retired" as const }];
    const { error: updateError } = await retryOnJwtIssuedAtFuture(() =>
      client
        .from("crest_links")
        .update({
          status: "retired",
          animal_id: "",
          events,
        })
        .eq("id", row.id),
    );
    if (updateError) {
      throw new Error(`Crest Link を保存できません: ${updateError.message}`);
    }
    await retryOnJwtIssuedAtFuture(() =>
      client
        .from("crest_link_transfers")
        .update({ status: "revoked" })
        .eq("crest_link_id", row.id)
        .eq("status", "pending"),
    );
  }
  void userId;
}

export async function deleteProjectMembersForAnimal(animalId: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").delete().eq("animal_id", animalId),
  );
  if (error) {
    throw new Error(`project_members を更新できません: ${error.message}`);
  }
}

export async function issueOwnedTransfer(userId: string, animalId: string): Promise<void> {
  const animal = await getOwnedAnimal(userId, animalId);
  if (!animal?.crestLinkId) {
    throw new Error("この個体の Crest Link が見つかりません。");
  }
  const client = createAdminClient();
  const { data: link, error: linkError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_links").select("*").eq("id", animal.crestLinkId).eq("status", "active").maybeSingle(),
  );
  if (linkError || !link) {
    throw new Error("この個体の Crest Link が見つかりません。");
  }
  await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_link_transfers")
      .update({ status: "revoked" })
      .eq("animal_id", animalId)
      .eq("status", "pending"),
  );
  const stamp = isoNow();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_transfers").insert({
      id: crypto.randomUUID(),
      code: makeTransferCode(),
      crest_link_id: animal.crestLinkId,
      animal_id: animalId,
      created_at: stamp,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      redeemed_at: null,
      status: "pending",
      payload_version: 1,
    }),
  );
  if (error) throw new Error(`引き継ぎコードを保存できません: ${error.message}`);
  const events = [...asEvents(link.events), { at: stamp, type: "transfer_issued" as const }];
  await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_links").update({ events }).eq("id", animal.crestLinkId),
  );
}

export async function revokeOwnedTransfer(userId: string, animalId: string): Promise<void> {
  if (!(await getOwnedAnimal(userId, animalId))) {
    throw new Error("個体が見つかりません。");
  }
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_link_transfers")
      .update({ status: "revoked" })
      .eq("animal_id", animalId)
      .eq("status", "pending"),
  );
  if (error) throw new Error(`引き継ぎコードを更新できません: ${error.message}`);
}

export async function redeemOwnedTransfer(
  userId: string,
  code: string,
  ownerLabel: string,
): Promise<{ animalId: string; crestLinkId: string }> {
  const owner = ownerLabel.trim();
  if (!owner) throw new Error("新しい所有者名を入力してください。");
  const normalized = normalizeTransferCode(code);
  if (!normalized) throw new Error("引き継ぎコードを入力してください。");
  const client = createAdminClient();
  const { data: listed, error: listError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_transfers").select("*").eq("code", code),
  );
  if (listError) throw new Error(`引き継ぎコードを読めません: ${listError.message}`);
  const transfer = (listed ?? []).find(
    (row) => normalizeTransferCode(String(row.code ?? "")) === normalized,
  );
  if (!transfer) throw new Error("引き継ぎコードが見つかりません。");
  if (transfer.status === "redeemed") throw new Error("このコードはすでに使用されています。");
  if (transfer.status === "revoked") throw new Error("このコードは無効です。");
  const stamp = isoNow();
  if (transfer.status === "pending" && String(transfer.expires_at ?? "") < stamp) {
    await retryOnJwtIssuedAtFuture(() =>
      client.from("crest_link_transfers").update({ status: "expired" }).eq("id", transfer.id),
    );
    throw new Error("このコードは使えません。");
  }
  if (transfer.status !== "pending") throw new Error("このコードは使えません。");
  const animal = await getOwnedAnimal(userId, String(transfer.animal_id));
  if (!animal) throw new Error("対象の個体が見つかりません。");
  const { data: link, error: linkError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_links").select("*").eq("id", transfer.crest_link_id).maybeSingle(),
  );
  if (linkError || !link || link.status !== "active") {
    throw new Error("対象の個体が見つかりません。");
  }
  if (animal.crestLinkId !== String(link.id)) {
    throw new Error("個体IDと Crest Link ID の対応が壊れているため引き継げません。");
  }
  const history = Array.isArray(link.owner_history) ? [...link.owner_history] : [];
  const last = history.at(-1) as { ownerLabel?: string } | undefined;
  if (!last || last.ownerLabel !== owner) {
    history.push({ at: stamp, ownerLabel: owner });
  }
  const events = [...asEvents(link.events), { at: stamp, type: "transferred" as const }];
  const { error: transferError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_link_transfers")
      .update({ status: "redeemed", redeemed_at: stamp })
      .eq("id", transfer.id),
  );
  if (transferError) throw new Error(`引き継ぎコードを更新できません: ${transferError.message}`);
  const { error: linkWriteError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_links")
      .update({
        current_owner_label: owner,
        owner_history: history,
        events,
      })
      .eq("id", link.id),
  );
  if (linkWriteError) throw new Error(`Crest Link を保存できません: ${linkWriteError.message}`);
  await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").update({ updated_at: stamp }).eq("id", animal.id).eq("user_id", userId),
  );
  return { animalId: animal.id, crestLinkId: String(link.id) };
}

export async function getAnimalByOwnedCrestLinkId(crestLinkId: string) {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("*").eq("crest_link_id", crestLinkId).maybeSingle(),
  );
  if (error) throw new Error(`animals を読めません: ${error.message}`);
  return data ? asAnimalRecord(data as Record<string, unknown>) : undefined;
}
