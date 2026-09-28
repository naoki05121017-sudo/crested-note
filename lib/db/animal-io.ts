import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { persistStatsMorphKey } from "@/lib/stats/compare";
import { uuidOrNull } from "@/lib/db/pg-id";
import {
  ANIMAL_CODE_SEQ_TABLE,
  animalCodeSeqValueForUser,
  animalCodeSeqWriteRow,
} from "@/lib/db/animal-code-seq";
import { formatAnimalCode, issueAnimalCode, parseAnimalCodeSeq } from "@/lib/db/animal-code";
import { replaceGenes } from "@/lib/db/genes";
import type { AnimalGeneRecord, AnimalRecord } from "@/lib/db/types";
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
  const seqRows = await selectPagedAll(
    (from, to) =>
      retryOnJwtIssuedAtFuture(() =>
        client
          .from(ANIMAL_CODE_SEQ_TABLE)
          .select("user_id, value")
          .eq("user_id", userId)
          .range(from, to),
      ),
  );
  const codeRows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("animals").select("code").eq("user_id", userId).range(from, to),
    ),
  );
  const stub = {
    animalCodeSeq: animalCodeSeqValueForUser(seqRows, userId),
    animals: codeRows.map((row) => ({
      code: String(row.code ?? ""),
    })) as AnimalRecord[],
  };
  const code = issueAnimalCode(stub);
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from(ANIMAL_CODE_SEQ_TABLE).upsert(
      animalCodeSeqWriteRow(
        userId,
        stub.animalCodeSeq,
        parseAnimalCodeSeq(code) || stub.animalCodeSeq,
      ),
      { onConflict: "user_id" },
    ),
  );
  if (error) {
    throw new Error(`個体ID連番を保存できません: ${error.message}`);
  }
  return formatAnimalCode(parseAnimalCodeSeq(code) || stub.animalCodeSeq);
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

export async function listWeightsForAnimals(animalIds: string[]) {
  if (animalIds.length === 0) return [];
  const client = createAdminClient();
  const rows: {
    id: string;
    animalId: string;
    weighedOn: string;
    weightG: number;
    notes: string;
  }[] = [];
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
    rows.push(
      ...page.map((row) => ({
        id: String(row.id),
        animalId: String(row.animal_id),
        weighedOn: String(row.weighed_on ?? ""),
        weightG: Number(row.weight_g),
        notes: String(row.notes ?? ""),
      })),
    );
  }
  return rows.sort(
    (a, b) =>
      a.animalId.localeCompare(b.animalId) ||
      a.weighedOn.localeCompare(b.weighedOn),
  );
}

function applyAnimalFilters(
  query: any,
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
  params: { q?: string; sex?: string; status?: string; page?: number },
): Promise<{ records: AnimalRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = ANIMAL_LIST_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const client = createAdminClient();
  const filtered = applyAnimalFilters(
    client.from("animals").select("*", { count: "exact" }),
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
