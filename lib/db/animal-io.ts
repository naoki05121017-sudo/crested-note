import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { persistStatsMorphKey } from "@/lib/stats/compare";
import { postgresUuid, uuidOrNull } from "@/lib/db/pg-id";
import {
  ANIMAL_CODE_SEQ_TABLE,
  animalCodeSeqValueForUser,
  animalCodeSeqWriteRow,
} from "@/lib/db/animal-code-seq";
import { formatAnimalCode } from "@/lib/db/animal-code";
import { replaceGenes } from "@/lib/db/genes";
import {
  DEFAULT_SETTINGS,
  EGG_RESULTS,
  type AnimalGeneRecord,
  type AnimalRecord,
  type Breeding,
  type EggResult,
  type SettingsRecord,
  type WeightLogRecord,
} from "@/lib/db/types";
import type { GeneStatus, Genotype } from "@/lib/genetics";
import { ANIMAL_LIST_PAGE_SIZE, sanitizeAnimalSearch } from "@/lib/db/animal-search";
import {
  chunkIds,
  selectPagedAll,
} from "@/lib/db/supabase-page";

export { ANIMAL_LIST_PAGE_SIZE };

function timestampOrNow(value: string | undefined): string {
  const text = String(value ?? "").trim();
  return text || new Date().toISOString();
}

export function asAnimalRecord(row: Record<string, unknown>): AnimalRecord {
  const n = typeof row.check_every_days === "number"
    ? row.check_every_days
    : Number(row.check_every_days);
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
    checkEveryDays:
      Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function animalWritePayload(
  row: AnimalRecord,
  ownerUserId: string,
  genes: AnimalGeneRecord[],
): Record<string, unknown> {
  return {
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
    stats_morph_key: persistStatsMorphKey(row, genes),
    check_every_days: row.checkEveryDays ?? null,
    created_at: timestampOrNow(row.createdAt),
    updated_at: timestampOrNow(row.updatedAt),
  };
}

export async function issueNextAnimalCode(userId: string): Promise<string> {
  const client = createAdminClient();
  const { data: seqRows, error: seqReadError } = await retryOnJwtIssuedAtFuture(() =>
    client.from(ANIMAL_CODE_SEQ_TABLE).select("user_id, value").eq("user_id", userId),
  );
  if (seqReadError) {
    throw new Error(`個体ID連番を読めません: ${seqReadError.message}`);
  }
  let seq = animalCodeSeqValueForUser(seqRows, userId);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    seq += 1;
    const code = formatAnimalCode(seq);
    const { data, error } = await retryOnJwtIssuedAtFuture(() =>
      client
        .from("animals")
        .select("id")
        .eq("user_id", userId)
        .eq("code", code)
        .maybeSingle(),
    );
    if (error) {
      throw new Error(`animals を照合できません: ${error.message}`);
    }
    if (data) continue;
    const { error: seqError } = await retryOnJwtIssuedAtFuture(() =>
      client.from(ANIMAL_CODE_SEQ_TABLE).upsert(
        animalCodeSeqWriteRow(userId, seq, seq),
        { onConflict: "user_id" },
      ),
    );
    if (seqError) {
      throw new Error(`個体ID連番を保存できません: ${seqError.message}`);
    }
    return code;
  }
  throw new Error("個体IDを発行できません。");
}

export async function insertOwnedAnimal(
  userId: string,
  record: AnimalRecord,
  genes: AnimalGeneRecord[],
): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").insert(animalWritePayload(record, userId, genes)),
  );
  if (error) {
    throw new Error(`animals を保存できません: ${error.message}`);
  }
  const genotype: Genotype = {};
  for (const row of genes) {
    if (row.animalId !== record.id) continue;
    if (row.status === "wild") continue;
    genotype[row.locusId] = row.status;
  }
  await replaceOwnedAnimalGenes(record.id, genotype);
}

export async function updateOwnedAnimal(
  userId: string,
  record: AnimalRecord,
  genes: AnimalGeneRecord[],
): Promise<void> {
  const client = createAdminClient();
  const { error, data } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .update(animalWritePayload(record, userId, genes))
      .eq("id", record.id)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) {
    throw new Error(`animals を保存できません: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("個体が見つかりません。");
  }
}

export async function patchOwnedAnimalCrestLinkId(
  userId: string,
  animalId: string,
  crestLinkId: string,
): Promise<void> {
  const client = createAdminClient();
  const { error, data } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .update({ crest_link_id: crestLinkId })
      .eq("id", animalId)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) {
    throw new Error(`Crest Link を保存できません: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("個体が見つかりません。");
  }
}

export async function deleteOwnedAnimal(
  userId: string,
  animalId: string,
): Promise<void> {
  const client = createAdminClient();
  const { error, data } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .delete()
      .eq("id", animalId)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) {
    throw new Error(`animals を削除できません: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("個体が見つかりません。");
  }
}

export async function getOwnedAnimal(
  userId: string,
  animalId: string,
): Promise<AnimalRecord | undefined> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .select("*")
      .eq("user_id", userId)
      .eq("id", animalId)
      .maybeSingle(),
  );
  if (error) {
    throw new Error(`animals を読めません: ${error.message}`);
  }
  return data ? asAnimalRecord(data as Record<string, unknown>) : undefined;
}

export async function getOwnedAnimalsByIds(
  userId: string,
  ids: string[],
): Promise<AnimalRecord[]> {
  const wanted = ids.filter(Boolean);
  if (wanted.length === 0) return [];
  const client = createAdminClient();
  const rows: AnimalRecord[] = [];
  for (const chunk of chunkIds(wanted)) {
    const page = await selectPagedAll((from, to) =>
      retryOnJwtIssuedAtFuture(() =>
        client
          .from("animals")
          .select("*")
          .eq("user_id", userId)
          .in("id", chunk)
          .range(from, to),
      ),
    );
    rows.push(...page.map(asAnimalRecord));
  }
  return rows;
}

export async function countOwnedAnimals(
  userId: string,
  options: { excludeDeceased?: boolean } = {},
): Promise<number> {
  const client = createAdminClient();
  let query = client
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (options.excludeDeceased) {
    query = query.neq("status", "deceased");
  }
  const { count, error } = await retryOnJwtIssuedAtFuture(() => query);
  if (error) {
    throw new Error(`animals を数えられません: ${error.message}`);
  }
  return count ?? 0;
}

export async function animalIsReferenced(
  userId: string,
  animalId: string,
): Promise<boolean> {
  const client = createAdminClient();
  const asParent = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .select("id")
      .eq("user_id", userId)
      .or(`sire_id.eq.${animalId},dam_id.eq.${animalId}`)
      .limit(1)
      .maybeSingle(),
  );
  if (asParent.error) {
    throw new Error(`animals を照合できません: ${asParent.error.message}`);
  }
  if (asParent.data) return true;
  const inBreeding = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("breedings")
      .select("id")
      .eq("user_id", userId)
      .or(`male_id.eq.${animalId},female_id.eq.${animalId}`)
      .limit(1)
      .maybeSingle(),
  );
  if (inBreeding.error) {
    throw new Error(`breedings を照合できません: ${inBreeding.error.message}`);
  }
  return Boolean(inBreeding.data);
}

export async function listGenesForAnimals(
  animalIds: string[],
): Promise<AnimalGeneRecord[]> {
  if (animalIds.length === 0) return [];
  const client = createAdminClient();
  const rows: AnimalGeneRecord[] = [];
  for (const chunk of chunkIds(animalIds)) {
    const page = await selectPagedAll((from, to) =>
      retryOnJwtIssuedAtFuture(() =>
        client
          .from("animal_genes")
          .select("*")
          .in("animal_id", chunk)
          .range(from, to),
      ),
    );
    rows.push(
      ...page.map((row) => ({
        animalId: String(row.animal_id),
        locusId: String(row.locus_id),
        status: row.status as GeneStatus,
      })),
    );
  }
  return rows;
}

export async function replaceOwnedAnimalGenes(
  animalId: string,
  genotype: Genotype,
): Promise<AnimalGeneRecord[]> {
  const client = createAdminClient();
  const next = replaceGenes([], animalId, genotype);
  const { error: delError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animal_genes").delete().eq("animal_id", animalId),
  );
  if (delError) {
    throw new Error(`genes を更新できません: ${delError.message}`);
  }
  if (next.length > 0) {
    const { error } = await retryOnJwtIssuedAtFuture(() =>
      client.from("animal_genes").insert(
        next.map((row) => ({
          animal_id: row.animalId,
          locus_id: row.locusId,
          status: row.status,
        })),
      ),
    );
    if (error) {
      throw new Error(`genes を更新できません: ${error.message}`);
    }
  }
  return next;
}

function asWeightLogRecord(row: Record<string, unknown>): WeightLogRecord {
  return {
    id: String(row.id),
    animalId: String(row.animal_id),
    weighedOn: String(row.weighed_on ?? ""),
    weightG: Number(row.weight_g),
    notes: String(row.notes ?? ""),
  };
}

const LATEST_WEIGHT_BATCH = 24;

export async function listWeightsForAnimals(animalIds: string[]) {
  if (animalIds.length === 0) return [];
  const client = createAdminClient();
  const rows: WeightLogRecord[] = [];
  for (const chunk of chunkIds(animalIds)) {
    const page = await selectPagedAll((from, to) =>
      retryOnJwtIssuedAtFuture(() =>
        client
          .from("weight_logs")
          .select("id, animal_id, weighed_on, weight_g, notes")
          .in("animal_id", chunk)
          .range(from, to),
      ),
    );
    rows.push(...page.map(asWeightLogRecord));
  }
  return rows.sort(
    (a, b) =>
      a.animalId.localeCompare(b.animalId) ||
      a.weighedOn.localeCompare(b.weighedOn),
  );
}

export async function listLatestWeightsForAnimals(animalIds: string[]) {
  const wanted = [...new Set(animalIds.filter(Boolean))];
  if (wanted.length === 0) return [];
  const client = createAdminClient();
  const rows: WeightLogRecord[] = [];
  for (let i = 0; i < wanted.length; i += LATEST_WEIGHT_BATCH) {
    const batch = wanted.slice(i, i + LATEST_WEIGHT_BATCH);
    const found = await Promise.all(
      batch.map(async (animalId) => {
        const { data, error } = await retryOnJwtIssuedAtFuture(() =>
          client
            .from("weight_logs")
            .select("id, animal_id, weighed_on, weight_g, notes")
            .eq("animal_id", animalId)
            .order("weighed_on", { ascending: false })
            .limit(1),
        );
        if (error) throw new Error(`weight_logs を読めません: ${error.message}`);
        const row = data?.[0] as Record<string, unknown> | undefined;
        return row ? asWeightLogRecord(row) : null;
      }),
    );
    rows.push(...found.filter((row): row is WeightLogRecord => row !== null));
  }
  return rows;
}

export async function listRecentWeightsForAnimals(animalIds: string[], limit: number) {
  const wanted = [...new Set(animalIds.filter(Boolean))];
  const cap = Math.max(0, limit);
  if (wanted.length === 0 || cap === 0) return [];
  const client = createAdminClient();
  const batches = await Promise.all(
    chunkIds(wanted).map(async (part) => {
      const { data, error } = await retryOnJwtIssuedAtFuture(() =>
        client
          .from("weight_logs")
          .select("id, animal_id, weighed_on, weight_g, notes")
          .in("animal_id", part)
          .order("weighed_on", { ascending: false })
          .limit(cap),
      );
      if (error) throw new Error(`weight_logs を読めません: ${error.message}`);
      return ((data ?? []) as Record<string, unknown>[]).map(asWeightLogRecord);
    }),
  );
  return batches
    .flat()
    .sort((a, b) => b.weighedOn.localeCompare(a.weighedOn))
    .slice(0, cap);
}

type AnimalFilterQuery = {
  eq: (column: string, value: string) => AnimalFilterQuery;
  or: (filters: string) => AnimalFilterQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
      count: number | null;
    }>;
  };
};

function applyAnimalFilters(
  query: AnimalFilterQuery,
  userId: string,
  params: { q?: string; sex?: string; status?: string },
) {
  let next = query.eq("user_id", userId);
  if (params.sex) next = next.eq("sex", params.sex);
  if (params.status) next = next.eq("status", params.status);
  const q = sanitizeAnimalSearch(params.q ?? "");
  if (q) {
    const term = `%${q}%`;
    next = next.or(
      `name.ilike.${term},code.ilike.${term},morph_label.ilike.${term},crest_link_id.ilike.${term},notes.ilike.${term}`,
    );
  }
  return next;
}

export async function listOwnedAnimalsPage(
  userId: string,
  params: { q?: string; sex?: string; status?: string; page?: number; pageSize?: number },
): Promise<{ records: AnimalRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? ANIMAL_LIST_PAGE_SIZE, 100));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const client = createAdminClient();
  const filtered = applyAnimalFilters(
    client.from("animals").select("*", { count: "exact" }) as unknown as AnimalFilterQuery,
    userId,
    params,
  );
  const result = (await retryOnJwtIssuedAtFuture(() =>
    filtered.order("updated_at", { ascending: false }).range(from, to),
  )) as { data: unknown[] | null; error: { message: string } | null; count: number | null };
  const { data, error, count } = result;
  if (error) {
    throw new Error(`animals を読めません: ${error.message}`);
  }
  return {
    records: (data ?? []).map((row) => asAnimalRecord(row as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listOwnedAnimalsAll(userId: string): Promise<AnimalRecord[]> {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("animals")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
  );
  return rows.map(asAnimalRecord);
}

export async function listOwnedParentOptions(userId: string): Promise<AnimalRecord[]> {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("animals")
        .select("id, name, code, sex, sire_id, dam_id, crest_link_id, hatch_date, status, morph_label, traits, trait_levels, notes, photo_url, is_public, share_slug, prefecture, check_every_days, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
  );
  return rows.map(asAnimalRecord);
}

export async function listOwnedChildren(
  userId: string,
  animalId: string,
): Promise<AnimalRecord[]> {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("animals")
        .select("*")
        .eq("user_id", userId)
        .or(`sire_id.eq.${animalId},dam_id.eq.${animalId}`)
        .range(from, to),
    ),
  );
  return rows.map(asAnimalRecord);
}

export async function getOwnedSettings(userId: string): Promise<SettingsRecord> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("profiles")
      .select("display_name, collection_name, prefecture, public_by_default")
      .eq("id", userId)
      .maybeSingle(),
  );
  if (error) {
    throw new Error(`profiles を読めません: ${error.message}`);
  }
  return {
    displayName: String(data?.display_name ?? DEFAULT_SETTINGS.displayName),
    collectionName: String(data?.collection_name ?? DEFAULT_SETTINGS.collectionName),
    prefecture: String(data?.prefecture ?? DEFAULT_SETTINGS.prefecture),
    publicByDefault: Boolean(data?.public_by_default ?? DEFAULT_SETTINGS.publicByDefault),
  };
}

export async function patchOwnedAnimalCadence(
  userId: string,
  animalId: string,
  checkEveryDays: number | undefined,
): Promise<void> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .update({
        check_every_days: checkEveryDays ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", animalId)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) {
    throw new Error(`animals を保存できません: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("個体が見つかりません。");
  }
}

export async function insertOwnedWeight(
  userId: string,
  row: WeightLogRecord,
): Promise<void> {
  const owned = await getOwnedAnimal(userId, row.animalId);
  if (!owned) {
    throw new Error("個体が見つかりません。");
  }
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("weight_logs").insert({
      id: postgresUuid(row.id, "weight_logs"),
      animal_id: row.animalId,
      weighed_on: row.weighedOn,
      weight_g: row.weightG,
      notes: row.notes ?? "",
    }),
  );
  if (error) {
    throw new Error(`weight_logs を保存できません: ${error.message}`);
  }
}

export async function deleteOwnedWeight(
  userId: string,
  animalId: string,
  weightId: string,
): Promise<void> {
  const owned = await getOwnedAnimal(userId, animalId);
  if (!owned) {
    throw new Error("個体が見つかりません。");
  }
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("weight_logs")
      .delete()
      .eq("id", postgresUuid(weightId, "weight_logs"))
      .eq("animal_id", animalId)
      .select("id"),
  );
  if (error) {
    throw new Error(`weight_logs を削除できません: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("記録が見つかりません。");
  }
}

export async function listOwnedBreedingsForAnimal(
  userId: string,
  animalId: string,
): Promise<Breeding[]> {
  const client = createAdminClient();
  const breedings = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("breedings")
        .select("*")
        .eq("user_id", userId)
        .or(`male_id.eq.${animalId},female_id.eq.${animalId}`)
        .range(from, to),
    ),
  );
  const breedingIds = breedings.map((row) => String(row.id));
  const clutches =
    breedingIds.length === 0
      ? []
      : (
          await Promise.all(
            chunkIds(breedingIds).map((part) =>
              selectPagedAll((from, to) =>
                retryOnJwtIssuedAtFuture(() =>
                  client
                    .from("clutches")
                    .select("*")
                    .in("breeding_id", part)
                    .range(from, to),
                ),
              ),
            ),
          )
        ).flat();
  const clutchIds = clutches.map((row) => String(row.id));
  const eggs =
    clutchIds.length === 0
      ? []
      : (
          await Promise.all(
            chunkIds(clutchIds).map((part) =>
              selectPagedAll((from, to) =>
                retryOnJwtIssuedAtFuture(() =>
                  client.from("eggs").select("*").in("clutch_id", part).range(from, to),
                ),
              ),
            ),
          )
        ).flat();
  return breedings.map((breeding) => {
    const clutchRows = clutches.filter((row) => String(row.breeding_id) === String(breeding.id));
    return {
      id: String(breeding.id),
      maleId: String(breeding.male_id),
      femaleId: String(breeding.female_id),
      startedOn: String(breeding.started_on ?? ""),
      endedOn: String(breeding.ended_on ?? ""),
      status: (breeding.status as "active" | "closed") ?? "active",
      notes: String(breeding.notes ?? ""),
      predictionId: String(breeding.prediction_id ?? ""),
      projectId: String(breeding.project_id ?? ""),
      createdAt: String(breeding.created_at ?? ""),
      clutches: clutchRows
        .map((clutch) => ({
          id: String(clutch.id),
          breedingId: String(clutch.breeding_id),
          laidOn: String(clutch.laid_on ?? ""),
          notes: String(clutch.notes ?? ""),
          eggs: eggs
            .filter((egg) => String(egg.clutch_id) === String(clutch.id))
            .map((egg) => ({
              id: String(egg.id),
              clutchId: String(egg.clutch_id),
              expectedHatchOn: String(egg.expected_hatch_on ?? ""),
              result: EGG_RESULTS.includes(egg.result as EggResult)
                ? (egg.result as EggResult)
                : "incubating",
              hatchAnimalId: String(egg.hatch_animal_id ?? ""),
              notes: String(egg.notes ?? ""),
            })),
        }))
        .sort((a, b) => b.laidOn.localeCompare(a.laidOn)),
    };
  });
}
