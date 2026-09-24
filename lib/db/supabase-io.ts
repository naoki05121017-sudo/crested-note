import type { SupabaseClient } from "@supabase/supabase-js";
import { postgresUuid, uuidOrNull } from "@/lib/db/pg-id";
import {
  ANIMAL_CODE_SEQ_TABLE,
  animalCodeSeqValueForUser,
  animalCodeSeqWriteRow,
} from "@/lib/db/animal-code-seq";
import { crestLinkSeqValue, crestLinkSeqWriteRow } from "@/lib/db/crest-link-seq";
import {
  CREST_LINK_EVENT_TYPES,
  CREST_LINK_STATUSES,
  CREST_LINK_TRANSFER_STATUSES,
  DEFAULT_SETTINGS,
  type AnimalRecord,
  type CrestLinkRecord,
  type DatabaseFile,
  type SettingsRecord,
} from "@/lib/db/types";
import { idsToDelete } from "@/lib/auth/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";

function optionalPositiveInt(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

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

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  const text = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
  return (
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    text.includes("42p01") ||
    text.includes("pgrst205")
  );
}

async function upsert(
  client: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  if (rows.length === 0) return;
  const first = await retryOnJwtIssuedAtFuture(() =>
    client.from(table).upsert(rows, { onConflict }),
  );
  let error = first.error;
  if (
    error &&
    table === "animals" &&
    /check_every_days/i.test(error.message)
  ) {
    const stripped = rows.map((row) => {
      const { check_every_days: _omit, ...rest } = row;
      return rest;
    });
    const retry = await retryOnJwtIssuedAtFuture(() =>
      client.from(table).upsert(stripped, { onConflict }),
    );
    error = retry.error;
  }
  if (error) {
    throw new Error(`${table} を保存できません: ${error.message}`);
  }
}

async function deleteMissing(
  client: SupabaseClient,
  table: string,
  column: string,
  keep: string[],
  scope: { column: string; value: string } | { column: string; values: string[] },
) {
  const values = "value" in scope ? [scope.value] : scope.values;
  if (values.length === 0) return;
  let query = client.from(table).select(column);
  query =
    "value" in scope
      ? query.eq(scope.column, scope.value)
      : query.in(scope.column, scope.values);
  const { data, error } = await retryOnJwtIssuedAtFuture(() => query);
  if (error) {
    throw new Error(`${table} を照合できません: ${error.message}`);
  }
  const extra = idsToDelete(
    (data ?? []).map((row) => String((row as unknown as Record<string, unknown>)[column] ?? "")),
    keep,
  );
  if (extra.length === 0) return;
  const { error: delError } = await retryOnJwtIssuedAtFuture(() =>
    client.from(table).delete().in(column, extra),
  );
  if (delError) {
    throw new Error(`${table} の削除分を保存できません: ${delError.message}`);
  }
}

async function selectIn(
  client: SupabaseClient,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) return [];
  return must(
    table,
    await retryOnJwtIssuedAtFuture(() => client.from(table).select("*").in(column, ids)),
  );
}

export async function loadDatabaseFromSupabase(userId: string): Promise<DatabaseFile> {
  const client = createAdminClient();
  const [
    animalsRes,
    breedingsRes,
    projectsRes,
    predictionsRes,
    profilesRes,
    feedbackRes,
    seqRes,
    animalCodeSeqRes,
    crestLinksRes,
    transfersRes,
  ] = await Promise.all([
    retryOnJwtIssuedAtFuture(() =>
      client.from("animals").select("*").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("breedings").select("*").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("projects").select("*").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("predictions").select("*").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("profiles").select("*").eq("id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("feedback").select("*").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("crest_link_seq").select("id, value"),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from(ANIMAL_CODE_SEQ_TABLE).select("user_id, value").eq("user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("crest_links").select("*").eq("current_owner_user_id", userId),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client.from("crest_link_transfers").select("*"),
    ),
  ]);
  const animals = await must("animals", animalsRes);
  const breedings = await must("breedings", breedingsRes);
  const projects = await must("projects", projectsRes);
  const animalIds = (animals ?? []).map((row) => String(row.id));
  const breedingIds = (breedings ?? []).map((row) => String(row.id));
  const projectIds = (projects ?? []).map((row) => String(row.id));
  const genes = await selectIn(client, "animal_genes", "animal_id", animalIds);
  const weights = await selectIn(client, "weight_logs", "animal_id", animalIds);
  const clutches = await selectIn(client, "clutches", "breeding_id", breedingIds);
  const clutchIds = (clutches ?? []).map((row) => String(row.id));
  const eggs = await selectIn(client, "eggs", "clutch_id", clutchIds);
  const projectMembers = await selectIn(client, "project_members", "project_id", projectIds);
  const predictions = await must("predictions", predictionsRes);
  const profiles = await must("profiles", profilesRes);
  const feedback = await must("feedback", feedbackRes);
  const seqRows = (await must("crest_link_seq", seqRes)) as
    | { id?: unknown; value?: unknown }[]
    | null;
  const animalCodeSeqRows = isMissingTableError(animalCodeSeqRes.error)
    ? []
    : ((await must("animal_code_seq", animalCodeSeqRes)) as
        | { user_id?: unknown; value?: unknown }[]
        | null);
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
      checkEveryDays: optionalPositiveInt(row.check_every_days),
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
    crestLinkSeq: crestLinkSeqValue(seqRows),
    animalCodeSeq: animalCodeSeqValueForUser(animalCodeSeqRows, userId),
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
      const animalId = String(row.animal_id ?? "");
      if (!id || !code || !animalIds.includes(animalId)) return [];
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

export async function saveDatabaseToSupabase(db: DatabaseFile, userId: string) {
  const client = createAdminClient();
  const ownerUserId = userId;

  const { data: seqRows, error: seqError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("crest_link_seq").select("id, value"),
  );
  if (seqError) {
    throw new Error(`crest_link_seq を読めません: ${seqError.message}`);
  }
  const { error: seqWriteError } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("crest_link_seq")
      .upsert(crestLinkSeqWriteRow(crestLinkSeqValue(seqRows), db.crestLinkSeq), {
        onConflict: "id",
      }),
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

  const { data: animalCodeSeqRows, error: animalCodeSeqReadError } =
    await retryOnJwtIssuedAtFuture(() =>
      client.from(ANIMAL_CODE_SEQ_TABLE).select("user_id, value"),
    );
  if (animalCodeSeqReadError) {
    throw new Error(
      `animal_code_seq を読めません: ${animalCodeSeqReadError.message}`,
    );
  }
  const { error: animalCodeSeqWriteError } = await retryOnJwtIssuedAtFuture(() =>
    client.from(ANIMAL_CODE_SEQ_TABLE).upsert(
      animalCodeSeqWriteRow(
        ownerUserId,
        animalCodeSeqValueForUser(animalCodeSeqRows, ownerUserId),
        db.animalCodeSeq,
      ),
      { onConflict: "user_id" },
    ),
  );
  if (animalCodeSeqWriteError) {
    throw new Error(
      `animal_code_seq を保存できません: ${animalCodeSeqWriteError.message}`,
    );
  }

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
      check_every_days: row.checkEveryDays ?? null,
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
    { column: "user_id", value: ownerUserId },
  );

  const ownedAnimalIds = (
    await must(
      "animals",
      await retryOnJwtIssuedAtFuture(() =>
        client.from("animals").select("id").eq("user_id", ownerUserId),
      ),
    )
  ).map((row) => String(row.id));
  if (ownedAnimalIds.length > 0) {
    const { error: geneClearError } = await retryOnJwtIssuedAtFuture(() =>
      client.from("animal_genes").delete().in("animal_id", ownedAnimalIds),
    );
    if (geneClearError) {
      throw new Error(`genes を更新できません: ${geneClearError.message}`);
    }
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
    { column: "animal_id", values: ownedAnimalIds },
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
    { column: "user_id", value: ownerUserId },
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
    { column: "user_id", value: ownerUserId },
  );

  const ownedBreedingIds = (
    await must(
      "breedings",
      await retryOnJwtIssuedAtFuture(() =>
        client.from("breedings").select("id").eq("user_id", ownerUserId),
      ),
    )
  ).map((row) => String(row.id));

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
    { column: "breeding_id", values: ownedBreedingIds },
  );

  const ownedClutchIds = (
    await selectIn(client, "clutches", "breeding_id", ownedBreedingIds)
  ).map((row) => String((row as { id?: unknown }).id));

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
    { column: "clutch_id", values: ownedClutchIds },
  );

  const ownedProjectIds = (
    await must(
      "projects",
      await retryOnJwtIssuedAtFuture(() =>
        client.from("projects").select("id").eq("user_id", ownerUserId),
      ),
    )
  ).map((row) => String(row.id));
  if (ownedProjectIds.length > 0) {
    const { error: memberClearError } = await retryOnJwtIssuedAtFuture(() =>
      client.from("project_members").delete().in("project_id", ownedProjectIds),
    );
    if (memberClearError) {
      throw new Error(`project_members を更新できません: ${memberClearError.message}`);
    }
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
    { column: "user_id", value: ownerUserId },
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
    { column: "user_id", value: ownerUserId },
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

function asAnimalRecord(row: Record<string, unknown>): AnimalRecord {
  return {
    id: String(row.id),
    crestLinkId: String(row.crest_link_id ?? ""),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    sex: row.sex === "male" || row.sex === "female" ? row.sex : "unknown",
    hatchDate: String(row.hatch_date ?? ""),
    status: (row.status as AnimalRecord["status"]) ?? "active",
    sireId: String(row.sire_id ?? ""),
    damId: String(row.dam_id ?? ""),
    morphLabel: String(row.morph_label ?? ""),
    traits: Array.isArray(row.traits) ? row.traits.map(String) : [],
    traitLevels:
      row.trait_levels && typeof row.trait_levels === "object"
        ? (row.trait_levels as Record<string, number>)
        : {},
    notes: String(row.notes ?? ""),
    photoUrl: String(row.photo_url ?? ""),
    isPublic: Boolean(row.is_public),
    shareSlug: String(row.share_slug ?? ""),
    prefecture: String(row.prefecture ?? ""),
    checkEveryDays: optionalPositiveInt(row.check_every_days),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export async function loadPublicAnimals(slug?: string): Promise<{
  animals: AnimalRecord[];
  genes: DatabaseFile["genes"];
  weights: DatabaseFile["weights"];
}> {
  const client = createAdminClient();
  let query = client.from("animals").select("*").eq("is_public", true);
  if (slug) query = query.eq("share_slug", slug);
  const animals = await must(
    "animals",
    await retryOnJwtIssuedAtFuture(() => query),
  );
  const records = (animals ?? []).map((row) =>
    asAnimalRecord(row as Record<string, unknown>),
  );
  const ids = records.map((row) => row.id);
  const genes = await selectIn(client, "animal_genes", "animal_id", ids);
  const weights = await selectIn(client, "weight_logs", "animal_id", ids);
  return {
    animals: records,
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
  };
}
