import { ANIMAL_CODE_SEQ_TABLE, animalCodeSeqWriteRow } from "@/lib/db/animal-code-seq";
import { postgresUuid, uuidOrNull } from "@/lib/db/pg-id";
import { fetchWithJwtClockSkewRetry } from "@/lib/supabase/clock-skew-fetch";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readLocalJsonFile } from "@/lib/db/read-json-file";
import type { DatabaseFile } from "@/lib/db/types";

export type ImportSummary = {
  ownerUserId: string;
  animals: number;
  weights: number;
  genes: number;
  crestLinks: number;
  crestLinkTransfers: number;
  breedings: number;
  crestLinkSeq: number;
  animalCodeSeq: number;
};

function timestampOrNull(value: string | undefined): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function timestampOrNow(value: string | undefined): string {
  return timestampOrNull(value) ?? new Date().toISOString();
}

async function upsert(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  if (rows.length === 0) return;
  const { error } = await client.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(`${table} の取り込みに失敗しました: ${error.message}`);
  }
}

async function ensureImportOwner(
  client: SupabaseClient,
  db: DatabaseFile,
): Promise<string> {
  const email =
    process.env.SUPABASE_IMPORT_OWNER_EMAIL?.trim() ||
    "legacy-import@crested-note.local";

  const { data: listed, error: listError } = await client.auth.admin.listUsers();
  if (listError) {
    throw new Error(`取り込み用ユーザーを探せません: ${listError.message}`);
  }
  let userId = listed.users.find((user) => user.email === email)?.id;
  if (!userId) {
    const { data: created, error: createError } =
      await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { source: "json-import" },
      });
    userId = created.user?.id;
    if (!userId) {
      throw new Error(
        `取り込み用ユーザーを用意できません: ${createError?.message ?? "不明なエラー"}`,
      );
    }
  }

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: userId,
      display_name: db.settings.displayName ?? "",
      collection_name: db.settings.collectionName || "クレスノート",
      prefecture: db.settings.prefecture ?? "",
      public_by_default: Boolean(db.settings.publicByDefault),
    },
    { onConflict: "id" },
  );
  if (profileError) {
    throw new Error(`profiles の取り込みに失敗しました: ${profileError.message}`);
  }
  return userId;
}

async function syncCrestLinkSeq(client: SupabaseClient, jsonSeq: number) {
  const { data, error } = await client
    .from("crest_link_seq")
    .select("value")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    throw new Error(`crest_link_seq を読めません: ${error.message}`);
  }
  const current = Number(data?.value) || 0;
  const next = Math.max(current, jsonSeq);
  const { error: writeError } = await client
    .from("crest_link_seq")
    .upsert({ id: 1, value: next }, { onConflict: "id" });
  if (writeError) {
    throw new Error(`crest_link_seq を更新できません: ${writeError.message}`);
  }
  return next;
}

async function syncAnimalCodeSeq(
  client: SupabaseClient,
  userId: string,
  jsonSeq: number,
) {
  const { data, error } = await client
    .from(ANIMAL_CODE_SEQ_TABLE)
    .select("value")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`animal_code_seq を読めません: ${error.message}`);
  }
  const row = animalCodeSeqWriteRow(userId, Number(data?.value) || 0, jsonSeq);
  const { error: writeError } = await client
    .from(ANIMAL_CODE_SEQ_TABLE)
    .upsert(row, { onConflict: "user_id" });
  if (writeError) {
    throw new Error(`animal_code_seq を更新できません: ${writeError.message}`);
  }
  return row.value;
}

export async function importLocalJsonToSupabase(client: SupabaseClient) {
  const db = readLocalJsonFile();
  const ownerUserId = await ensureImportOwner(client, db);
  const crestLinkSeq = await syncCrestLinkSeq(client, db.crestLinkSeq);
  const animalCodeSeq = await syncAnimalCodeSeq(
    client,
    ownerUserId,
    db.animalCodeSeq,
  );

  await upsert(
    client,
    "crest_links",
    db.crestLinks.map((row) => ({
      id: row.id,
      animal_id: uuidOrNull(row.animalId),
      status: row.status === "retired" ? "retired" : "active",
      created_at: timestampOrNow(row.createdAt),
      current_owner_label: row.currentOwnerLabel ?? "",
      current_owner_user_id: ownerUserId,
      owner_history: row.ownerHistory ?? [],
      sire_crest_link_id: row.sireCrestLinkId ?? "",
      dam_crest_link_id: row.damCrestLinkId ?? "",
      origin_kind: row.originKind === "ncrested" ? "ncrested" : "local",
      payload_version: 1,
      events: row.events ?? [],
    })),
    "id",
  );

  await upsert(
    client,
    "animals",
    db.animals.map((row) => ({
      id: row.id,
      user_id: ownerUserId,
      crest_link_id: row.crestLinkId ?? "",
      code: row.code ?? "",
      name: row.name ?? "",
      sex: row.sex === "male" || row.sex === "female" ? row.sex : "unknown",
      hatch_date: row.hatchDate ?? "",
      status: row.status ?? "active",
      sire_id: uuidOrNull(row.sireId),
      dam_id: uuidOrNull(row.damId),
      morph_label: row.morphLabel ?? "",
      traits: row.traits ?? [],
      trait_levels: row.traitLevels ?? {},
      notes: row.notes ?? "",
      photo_url: row.photoUrl ?? "",
      is_public: Boolean(row.isPublic),
      share_slug: row.shareSlug ?? "",
      prefecture: row.prefecture ?? "",
      created_at: timestampOrNow(row.createdAt),
      updated_at: timestampOrNow(row.updatedAt),
    })),
    "id",
  );

  await upsert(
    client,
    "animal_genes",
    db.genes.map((row) => ({
      animal_id: row.animalId,
      locus_id: row.locusId,
      status: row.status,
    })),
    "animal_id,locus_id",
  );

  await upsert(
    client,
    "weight_logs",
    db.weights.map((row) => ({
      id: postgresUuid(row.id, "weight_logs"),
      animal_id: row.animalId,
      weighed_on: row.weighedOn,
      weight_g: row.weightG,
      notes: row.notes ?? "",
    })),
    "id",
  );

  await upsert(
    client,
    "projects",
    db.projects.map((row) => ({
      id: row.id,
      user_id: ownerUserId,
      name: row.name ?? "",
      goal: row.goal ?? "",
      notes: row.notes ?? "",
      status: row.status ?? "active",
      created_at: timestampOrNow(row.createdAt),
    })),
    "id",
  );

  await upsert(
    client,
    "breedings",
    db.breedings.map((row) => ({
      id: row.id,
      user_id: ownerUserId,
      male_id: row.maleId,
      female_id: row.femaleId,
      started_on: row.startedOn ?? "",
      ended_on: row.endedOn ?? "",
      status: row.status ?? "active",
      notes: row.notes ?? "",
      prediction_id: row.predictionId ?? "",
      project_id: row.projectId ?? "",
      created_at: timestampOrNow(row.createdAt),
    })),
    "id",
  );

  await upsert(
    client,
    "clutches",
    db.clutches.map((row) => ({
      id: row.id,
      breeding_id: row.breedingId,
      laid_on: row.laidOn ?? "",
      notes: row.notes ?? "",
    })),
    "id",
  );

  await upsert(
    client,
    "eggs",
    db.eggs.map((row) => ({
      id: row.id,
      clutch_id: row.clutchId,
      expected_hatch_on: row.expectedHatchOn ?? "",
      result: row.result ?? "incubating",
      hatch_animal_id: row.hatchAnimalId ?? "",
      notes: row.notes ?? "",
    })),
    "id",
  );

  await upsert(
    client,
    "project_members",
    db.projectMembers.map((row) => ({
      project_id: row.projectId,
      animal_id: row.animalId,
      role: row.role,
    })),
    "project_id,animal_id,role",
  );

  await upsert(
    client,
    "predictions",
    db.predictions.map((row) => ({
      id: row.id,
      user_id: ownerUserId,
      name: row.name ?? "",
      male_id: row.maleId ?? "",
      female_id: row.femaleId ?? "",
      parent_a: row.parentA ?? {},
      parent_b: row.parentB ?? {},
      pairing: row.pairing ?? {},
      breeding_id: row.breedingId ?? "",
      project_id: row.projectId ?? "",
      created_at: timestampOrNow(row.createdAt),
    })),
    "id",
  );

  await upsert(
    client,
    "feedback",
    db.feedback.map((row) => ({
      id: row.id,
      user_id: ownerUserId,
      category: row.category,
      status: row.status ?? "open",
      body: row.body ?? "",
      name: row.name ?? "",
      created_at: timestampOrNow(row.createdAt),
      updated_at: timestampOrNow(row.updatedAt),
      admin_note: row.adminNote ?? "",
    })),
    "id",
  );

  await upsert(
    client,
    "crest_link_transfers",
    db.crestLinkTransfers.map((row) => ({
      id: row.id,
      code: row.code,
      crest_link_id: row.crestLinkId,
      animal_id: row.animalId,
      created_at: timestampOrNow(row.createdAt),
      expires_at: timestampOrNow(row.expiresAt),
      redeemed_at: timestampOrNull(row.redeemedAt),
      status: row.status,
      payload_version: 1,
    })),
    "id",
  );

  const summary: ImportSummary = {
    ownerUserId,
    animals: db.animals.length,
    weights: db.weights.length,
    genes: db.genes.length,
    crestLinks: db.crestLinks.length,
    crestLinkTransfers: db.crestLinkTransfers.length,
    breedings: db.breedings.length,
    crestLinkSeq,
    animalCodeSeq,
  };
  return summary;
}

export function createImportClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithJwtClockSkewRetry },
  });
}
