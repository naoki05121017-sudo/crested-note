import type { SupabaseClient } from "@supabase/supabase-js";
import { postgresUuid, uuidOrNull } from "@/lib/db/pg-id";
import {
  CREST_LINK_EVENT_TYPES,
  CREST_LINK_STATUSES,
  CREST_LINK_TRANSFER_STATUSES,
  DEFAULT_SETTINGS,
  type CrestLinkRecord,
  type DatabaseFile,
  type SettingsRecord,
} from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";

function iso(value: unknown, fallback = ""): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

function timestampOrNow(value: string | undefined): string {
  const text = String(value ?? "").trim();
  return text || new Date().toISOString();
}

function timestampOrNull(value: string | undefined): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

async function must<T>(
  table: string,
  result: { data: T | null; error: { message: string } | null },
): Promise<T> {
  if (result.error) {
    throw new Error(`${table} を読めません: ${result.error.message}`);
  }
  return result.data as T;
}

async function upsert(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  if (rows.length === 0) return;
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from(table).upsert(rows, { onConflict }),
  );
  if (error) {
    throw new Error(`${table} を保存できません: ${error.message}`);
  }
}

async function deleteMissing(
  client: SupabaseClient,
  table: string,
  column: string,
  keep: string[],
) {
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from(table).select(column),
  );
  if (error) {
    throw new Error(`${table} を照合できません: ${error.message}`);
  }
  const keepSet = new Set(keep);
  const extra = (data ?? [])
    .map((row) => String((row as unknown as Record<string, unknown>)[column] ?? ""))
    .filter((id) => id && !keepSet.has(id));
  if (extra.length === 0) return;
  const { error: delError } = await retryOnJwtIssuedAtFuture(() =>
    client.from(table).delete().in(column, extra),
  );
  if (delError) {
    throw new Error(`${table} の削除分を保存できません: ${delError.message}`);
  }
}

async function keeperUserId(client: SupabaseClient): Promise<string> {
  const { data: animal, error: animalError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("user_id").limit(1).maybeSingle(),
  );
  if (animalError) {
    throw new Error(`個体の所有者を読めません: ${animalError.message}`);
  }
  if (animal?.user_id) return String(animal.user_id);

  const { data: profile, error: profileError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("profiles").select("id").limit(1).maybeSingle(),
  );
  if (profileError) {
    throw new Error(`プロフィールを読めません: ${profileError.message}`);
  }
  if (profile?.id) return String(profile.id);
  throw new Error("Supabase に取り込み用の所有者がありません。先に npm run db:import を実行してください。");
}

export async function loadDatabaseFromSupabase(): Promise<DatabaseFile> {
  const client = createAdminClient();
  const [
    animalsRes,
    genesRes,
    weightsRes,
    breedingsRes,
    clutchesRes,
    eggsRes,
    projectsRes,
    projectMembersRes,
    predictionsRes,
    profilesRes,
    feedbackRes,
    seqRes,
    crestLinksRes,
    transfersRes,
  ] = await Promise.all([
    retryOnJwtIssuedAtFuture(() => client.from("animals").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("animal_genes").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("weight_logs").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("breedings").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("clutches").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("eggs").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("projects").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("project_members").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("predictions").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("profiles").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("feedback").select("*")),
    retryOnJwtIssuedAtFuture(() =>
      client.from("crest_link_seq").select("value").eq("id", 1).maybeSingle(),
    ),
    retryOnJwtIssuedAtFuture(() => client.from("crest_links").select("*")),
    retryOnJwtIssuedAtFuture(() => client.from("crest_link_transfers").select("*")),
  ]);
  const animals = await must("animals", animalsRes);
  const genes = await must("animal_genes", genesRes);
  const weights = await must("weight_logs", weightsRes);
  const breedings = await must("breedings", breedingsRes);
  const clutches = await must("clutches", clutchesRes);
  const eggs = await must("eggs", eggsRes);
  const projects = await must("projects", projectsRes);
  const projectMembers = await must("project_members", projectMembersRes);
  const predictions = await must("predictions", predictionsRes);
  const profiles = await must("profiles", profilesRes);
  const feedback = await must("feedback", feedbackRes);
  const seqRow = await must("crest_link_seq", seqRes);
  const crestLinks = await must("crest_links", crestLinksRes);
  const transfers = await must("crest_link_transfers", transfersRes);

  const profile = (profiles ?? [])[0] as
    | {
        display_name?: string;
        collection_name?: string;
        prefecture?: string;
        public_by_default?: boolean;
      }
    | undefined;
  const settings: SettingsRecord = {
    displayName: String(profile?.display_name ?? DEFAULT_SETTINGS.displayName),
    collectionName: String(profile?.collection_name ?? DEFAULT_SETTINGS.collectionName),
    prefecture: String(profile?.prefecture ?? DEFAULT_SETTINGS.prefecture),
    publicByDefault: Boolean(profile?.public_by_default ?? DEFAULT_SETTINGS.publicByDefault),
  };

  return {
    animals: (animals ?? []).map((row) => ({
      id: String(row.id),
      crestLinkId: String(row.crest_link_id ?? ""),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      sex: row.sex === "male" || row.sex === "female" ? row.sex : "unknown",
      hatchDate: String(row.hatch_date ?? ""),
      status: row.status ?? "active",
      sireId: String(row.sire_id ?? ""),
      damId: String(row.dam_id ?? ""),
      morphLabel: String(row.morph_label ?? ""),
      traits: Array.isArray(row.traits) ? row.traits.map(String) : [],
      traitLevels:
        row.trait_levels && typeof row.trait_levels === "object" ? row.trait_levels : {},
      notes: String(row.notes ?? ""),
      photoUrl: String(row.photo_url ?? ""),
      isPublic: Boolean(row.is_public),
      shareSlug: String(row.share_slug ?? ""),
      prefecture: String(row.prefecture ?? ""),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    })),
    genes: (genes ?? []).map((row) => ({
      animalId: String(row.animal_id),
      locusId: String(row.locus_id),
      status: row.status,
    })),
    weights: (weights ?? []).map((row) => ({
      id: String(row.id),
      animalId: String(row.animal_id),
      weighedOn: String(row.weighed_on ?? ""),
      weightG: Number(row.weight_g),
      notes: String(row.notes ?? ""),
    })),
    breedings: (breedings ?? []).map((row) => ({
      id: String(row.id),
      maleId: String(row.male_id),
      femaleId: String(row.female_id),
      startedOn: String(row.started_on ?? ""),
      endedOn: String(row.ended_on ?? ""),
      status: row.status ?? "active",
      notes: String(row.notes ?? ""),
      predictionId: String(row.prediction_id ?? ""),
      projectId: String(row.project_id ?? ""),
      createdAt: iso(row.created_at),
    })),
    clutches: (clutches ?? []).map((row) => ({
      id: String(row.id),
      breedingId: String(row.breeding_id),
      laidOn: String(row.laid_on ?? ""),
      notes: String(row.notes ?? ""),
    })),
    eggs: (eggs ?? []).map((row) => ({
      id: String(row.id),
      clutchId: String(row.clutch_id),
      expectedHatchOn: String(row.expected_hatch_on ?? ""),
      result: row.result ?? "incubating",
      hatchAnimalId: String(row.hatch_animal_id ?? ""),
      notes: String(row.notes ?? ""),
    })),
    projects: (projects ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      goal: String(row.goal ?? ""),
      notes: String(row.notes ?? ""),
      status: row.status ?? "active",
      createdAt: iso(row.created_at),
    })),
    projectMembers: (projectMembers ?? []).map((row) => ({
      projectId: String(row.project_id),
      animalId: String(row.animal_id),
      role: row.role,
    })),
    predictions: (predictions ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      maleId: String(row.male_id ?? ""),
      femaleId: String(row.female_id ?? ""),
      parentA: row.parent_a ?? {},
      parentB: row.parent_b ?? {},
      pairing: row.pairing ?? {},
      breedingId: String(row.breeding_id ?? ""),
      projectId: String(row.project_id ?? ""),
      createdAt: iso(row.created_at),
    })),
    settings,
    feedback: (feedback ?? []).map((row) => ({
      id: String(row.id),
      category: row.category,
      status: row.status ?? "open",
      body: String(row.body ?? ""),
      name: String(row.name ?? ""),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
      adminNote: String(row.admin_note ?? ""),
    })),
    crestLinkSeq: Number((seqRow as { value?: number } | null)?.value) || 0,
    crestLinks: (crestLinks ?? []).flatMap((row) => {
      const id = String(row.id ?? "");
      if (!id) return [];
      const status = CREST_LINK_STATUSES.includes(row.status) ? row.status : "active";
      const events = Array.isArray(row.events)
        ? row.events.flatMap((event: { at?: string; type?: string }) => {
            if (!CREST_LINK_EVENT_TYPES.includes(event.type as CrestLinkRecord["events"][number]["type"])) {
              return [];
            }
            return [{ at: String(event.at ?? ""), type: event.type }];
          })
        : [];
      const ownerHistory = Array.isArray(row.owner_history)
        ? row.owner_history
            .map((entry: { at?: string; ownerLabel?: string }) => ({
              at: String(entry.at ?? ""),
              ownerLabel: String(entry.ownerLabel ?? ""),
            }))
            .filter((entry: { ownerLabel: string }) => entry.ownerLabel)
        : [];
      return [
        {
          id,
          animalId: String(row.animal_id ?? ""),
          status,
          createdAt: iso(row.created_at),
          currentOwnerLabel: String(row.current_owner_label ?? ""),
          ownerHistory,
          sireCrestLinkId: String(row.sire_crest_link_id ?? ""),
          damCrestLinkId: String(row.dam_crest_link_id ?? ""),
          originKind: row.origin_kind === "ncrested" ? "ncrested" : "local",
          payloadVersion: 1 as const,
          events,
        } satisfies CrestLinkRecord,
      ];
    }),
    crestLinkTransfers: (transfers ?? []).flatMap((row) => {
      const id = String(row.id ?? "");
      const code = String(row.code ?? "");
      if (!id || !code) return [];
      const status = CREST_LINK_TRANSFER_STATUSES.includes(row.status)
        ? row.status
        : "pending";
      return [
        {
          id,
          code,
          crestLinkId: String(row.crest_link_id ?? ""),
          animalId: String(row.animal_id ?? ""),
          createdAt: iso(row.created_at),
          expiresAt: iso(row.expires_at),
          redeemedAt: iso(row.redeemed_at),
          status,
          payloadVersion: 1 as const,
        },
      ];
    }),
  };
}

export async function saveDatabaseToSupabase(db: DatabaseFile) {
  const client = createAdminClient();
  const ownerUserId = await keeperUserId(client);

  const { data: seqRow, error: seqError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_seq").select("value").eq("id", 1).maybeSingle(),
  );
  if (seqError) {
    throw new Error(`crest_link_seq を読めません: ${seqError.message}`);
  }
  const nextSeq = Math.max(Number(seqRow?.value) || 0, db.crestLinkSeq);
  const { error: seqWriteError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_seq").upsert({ id: 1, value: nextSeq }, { onConflict: "id" }),
  );
  if (seqWriteError) {
    throw new Error(`crest_link_seq を保存できません: ${seqWriteError.message}`);
  }

  await upsert(
    client,
    "profiles",
    [
      {
        id: ownerUserId,
        display_name: db.settings.displayName ?? "",
        collection_name: db.settings.collectionName || "クレスノート",
        prefecture: db.settings.prefecture ?? "",
        public_by_default: Boolean(db.settings.publicByDefault),
      },
    ],
    "id",
  );

  // Never delete Crest Link rows. IDs are lifetime and must not be reused.
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
  await deleteMissing(
    client,
    "animals",
    "id",
    db.animals.map((row) => row.id),
  );

  const { error: geneClearError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animal_genes").delete().neq("locus_id", "__none__"),
  );
  if (geneClearError) {
    throw new Error(`genes を更新できません: ${geneClearError.message}`);
  }
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
  await deleteMissing(
    client,
    "weight_logs",
    "id",
    db.weights.map((row) => postgresUuid(row.id, "weight_logs")),
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
  await deleteMissing(
    client,
    "projects",
    "id",
    db.projects.map((row) => row.id),
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
  await deleteMissing(
    client,
    "breedings",
    "id",
    db.breedings.map((row) => row.id),
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
  await deleteMissing(
    client,
    "clutches",
    "id",
    db.clutches.map((row) => row.id),
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
  await deleteMissing(
    client,
    "eggs",
    "id",
    db.eggs.map((row) => row.id),
  );

  const { error: memberClearError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").delete().neq("role", "__none__"),
  );
  if (memberClearError) {
    throw new Error(`project_members を更新できません: ${memberClearError.message}`);
  }
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
  await deleteMissing(
    client,
    "predictions",
    "id",
    db.predictions.map((row) => row.id),
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
  await deleteMissing(
    client,
    "feedback",
    "id",
    db.feedback.map((row) => row.id),
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
}
