import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { chunkIds, selectPagedAll } from "@/lib/db/supabase-page";
import { postgresUuid } from "@/lib/db/pg-id";
import { asAnimalRecord, getOwnedAnimal, listRecentWeightsForAnimals } from "@/lib/db/animal-io";
import { PHOTO_ALBUM_PAGE_SIZE } from "@/lib/db/animal-search";
import { nicknameError, storedDisplayName } from "@/lib/community/album-comments";
import {
  EGG_RESULTS,
  type Breeding,
  type EggResult,
  type FeedbackRecord,
  type PredictionRecord,
  type ProjectRecord,
  type ProjectRole,
  type ProjectStatus,
  type SettingsRecord,
} from "@/lib/db/types";

function timestampOrNow(value: string | undefined): string {
  const text = String(value ?? "").trim();
  return text || new Date().toISOString();
}

function asEggResult(value: unknown): EggResult {
  return EGG_RESULTS.includes(value as EggResult) ? (value as EggResult) : "incubating";
}

export function mapBreedingRow(
  breeding: Record<string, unknown>,
  clutches: Record<string, unknown>[],
  eggs: Record<string, unknown>[],
): Breeding {
  const clutchRows = clutches.filter((row) => String(row.breeding_id) === String(breeding.id));
  return {
    id: String(breeding.id),
    maleId: String(breeding.male_id),
    femaleId: String(breeding.female_id),
    startedOn: String(breeding.started_on ?? ""),
    endedOn: String(breeding.ended_on ?? ""),
    status: breeding.status === "closed" ? "closed" : "active",
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
            result: asEggResult(egg.result),
            hatchAnimalId: String(egg.hatch_animal_id ?? ""),
            notes: String(egg.notes ?? ""),
          })),
      }))
      .sort((a, b) => b.laidOn.localeCompare(a.laidOn)),
  };
}

async function clutchesAndEggsForBreedings(breedingIds: string[]) {
  const client = createAdminClient();
  if (breedingIds.length === 0) return { clutches: [] as Record<string, unknown>[], eggs: [] as Record<string, unknown>[] };
  const clutches = (
    await Promise.all(
      chunkIds(breedingIds).map((part) =>
        selectPagedAll((from, to) =>
          retryOnJwtIssuedAtFuture(() =>
            client.from("clutches").select("*").in("breeding_id", part).range(from, to),
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
  return { clutches, eggs };
}

export async function listOwnedBreedings(userId: string): Promise<Breeding[]> {
  const client = createAdminClient();
  const breedings = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("breedings").select("*").eq("user_id", userId).range(from, to),
    ),
  );
  const { clutches, eggs } = await clutchesAndEggsForBreedings(breedings.map((row) => String(row.id)));
  return breedings
    .map((row) => mapBreedingRow(row, clutches, eggs))
    .sort((a, b) => b.startedOn.localeCompare(a.startedOn));
}

export async function getOwnedBreeding(userId: string, id: string): Promise<Breeding | undefined> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("breedings").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
  );
  if (error) throw new Error(`breedings を読めません: ${error.message}`);
  if (!data) return undefined;
  const { clutches, eggs } = await clutchesAndEggsForBreedings([id]);
  return mapBreedingRow(data as Record<string, unknown>, clutches, eggs);
}

export async function insertOwnedBreeding(
  userId: string,
  row: {
    id: string;
    maleId: string;
    femaleId: string;
    startedOn: string;
    notes: string;
    predictionId: string;
    projectId: string;
    createdAt: string;
  },
): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("breedings").insert({
      id: row.id,
      user_id: userId,
      male_id: row.maleId,
      female_id: row.femaleId,
      started_on: row.startedOn,
      ended_on: "",
      status: "active",
      notes: row.notes,
      prediction_id: row.predictionId,
      project_id: row.projectId,
      created_at: row.createdAt,
    }),
  );
  if (error) throw new Error(`breedings を保存できません: ${error.message}`);
}

export async function closeOwnedBreeding(userId: string, id: string): Promise<void> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("breedings")
      .update({
        status: "closed",
        ended_on: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) throw new Error(`breedings を保存できません: ${error.message}`);
  if (!data?.length) throw new Error("ペアが見つかりません。");
}

export async function markAnimalsBreeding(userId: string, ids: string[]): Promise<void> {
  const wanted = ids.filter(Boolean);
  if (wanted.length === 0) return;
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .update({ status: "breeding", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active")
      .in("id", wanted),
  );
  if (error) throw new Error(`animals を保存できません: ${error.message}`);
}

export async function insertOwnedClutchWithEggs(
  userId: string,
  breedingId: string,
  clutch: { id: string; laidOn: string; notes: string },
  eggs: { id: string; expectedHatchOn: string }[],
): Promise<void> {
  const breeding = await getOwnedBreeding(userId, breedingId);
  if (!breeding) throw new Error("ペアが見つかりません。");
  const client = createAdminClient();
  const { error: clutchError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("clutches").insert({
      id: clutch.id,
      breeding_id: breedingId,
      laid_on: clutch.laidOn,
      notes: clutch.notes,
    }),
  );
  if (clutchError) throw new Error(`clutches を保存できません: ${clutchError.message}`);
  if (eggs.length === 0) return;
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("eggs").insert(
      eggs.map((egg) => ({
        id: egg.id,
        clutch_id: clutch.id,
        expected_hatch_on: egg.expectedHatchOn,
        result: "incubating",
        hatch_animal_id: "",
        notes: "",
      })),
    ),
  );
  if (error) throw new Error(`eggs を保存できません: ${error.message}`);
}

export async function updateOwnedEgg(
  userId: string,
  eggId: string,
  patch: { result: EggResult; expectedHatchOn: string; notes: string },
): Promise<string> {
  const client = createAdminClient();
  const { data: egg, error: readError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("eggs").select("*").eq("id", eggId).maybeSingle(),
  );
  if (readError) throw new Error(`eggs を読めません: ${readError.message}`);
  if (!egg) throw new Error("卵が見つかりません。");
  const { data: clutch, error: clutchError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("clutches").select("breeding_id").eq("id", egg.clutch_id).maybeSingle(),
  );
  if (clutchError) throw new Error(`clutches を読めません: ${clutchError.message}`);
  const breedingId = String(clutch?.breeding_id ?? "");
  const breeding = breedingId ? await getOwnedBreeding(userId, breedingId) : undefined;
  if (!breeding) throw new Error("ペアが見つかりません。");
  if (egg.result === "hatched" && egg.hatch_animal_id) return breedingId;
  const nextResult = patch.result === "hatched" ? asEggResult(egg.result) : patch.result;
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("eggs")
      .update({
        result: nextResult,
        expected_hatch_on: patch.expectedHatchOn || egg.expected_hatch_on,
        notes: patch.notes,
      })
      .eq("id", eggId),
  );
  if (error) throw new Error(`eggs を保存できません: ${error.message}`);
  return breedingId;
}

export async function markEggHatched(
  userId: string,
  eggId: string,
  animalId: string,
): Promise<{ breedingId: string; maleId: string; femaleId: string }> {
  const client = createAdminClient();
  const { data: egg, error: readError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("eggs").select("*").eq("id", eggId).maybeSingle(),
  );
  if (readError) throw new Error(`eggs を読めません: ${readError.message}`);
  if (!egg) throw new Error("卵が見つかりません。");
  if (egg.hatch_animal_id) throw new Error("すでに孵化登録済みです。");
  const { data: clutch, error: clutchError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("clutches").select("breeding_id").eq("id", egg.clutch_id).maybeSingle(),
  );
  if (clutchError || !clutch) throw new Error("クラッチが見つかりません。");
  const breeding = await getOwnedBreeding(userId, String(clutch.breeding_id));
  if (!breeding) throw new Error("ペアが見つかりません。");
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("eggs")
      .update({ result: "hatched", hatch_animal_id: animalId })
      .eq("id", eggId),
  );
  if (error) throw new Error(`eggs を保存できません: ${error.message}`);
  return { breedingId: breeding.id, maleId: breeding.maleId, femaleId: breeding.femaleId };
}

export async function listOwnedProjects(userId: string): Promise<ProjectRecord[]> {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("projects").select("*").eq("user_id", userId).range(from, to),
    ),
  );
  return rows
    .map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      goal: String(row.goal ?? ""),
      notes: String(row.notes ?? ""),
      status: (row.status as ProjectStatus) ?? "active",
      createdAt: String(row.created_at ?? ""),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOwnedProject(userId: string, id: string): Promise<ProjectRecord | undefined> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("projects").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
  );
  if (error) throw new Error(`projects を読めません: ${error.message}`);
  if (!data) return undefined;
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    goal: String(data.goal ?? ""),
    notes: String(data.notes ?? ""),
    status: (data.status as ProjectStatus) ?? "active",
    createdAt: String(data.created_at ?? ""),
  };
}

export async function insertOwnedProject(userId: string, row: ProjectRecord): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("projects").insert({
      id: row.id,
      user_id: userId,
      name: row.name,
      goal: row.goal ?? "",
      notes: row.notes ?? "",
      status: row.status ?? "active",
      created_at: timestampOrNow(row.createdAt),
    }),
  );
  if (error) throw new Error(`projects を保存できません: ${error.message}`);
}

export async function updateOwnedProject(
  userId: string,
  id: string,
  patch: { name: string; goal: string; notes: string; status: ProjectStatus },
): Promise<void> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("projects")
      .update({
        name: patch.name,
        goal: patch.goal,
        notes: patch.notes,
        status: patch.status,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id"),
  );
  if (error) throw new Error(`projects を保存できません: ${error.message}`);
  if (!data?.length) throw new Error("プロジェクトが見つかりません。");
}

export async function deleteOwnedProject(userId: string, id: string): Promise<void> {
  const client = createAdminClient();
  await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").delete().eq("project_id", id),
  );
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("projects").delete().eq("id", id).eq("user_id", userId).select("id"),
  );
  if (error) throw new Error(`projects を削除できません: ${error.message}`);
  if (!data?.length) throw new Error("プロジェクトが見つかりません。");
}

export async function upsertOwnedProjectMember(
  userId: string,
  projectId: string,
  animalId: string,
  role: ProjectRole,
): Promise<void> {
  if (!(await getOwnedProject(userId, projectId))) throw new Error("プロジェクトが見つかりません。");
  if (!(await getOwnedAnimal(userId, animalId))) throw new Error("個体が見つかりません。");
  const client = createAdminClient();
  await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").delete().eq("project_id", projectId).eq("animal_id", animalId),
  );
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").insert({
      project_id: projectId,
      animal_id: animalId,
      role,
    }),
  );
  if (error) throw new Error(`project_members を保存できません: ${error.message}`);
}

export async function deleteOwnedProjectMember(
  userId: string,
  projectId: string,
  animalId: string,
): Promise<void> {
  if (!(await getOwnedProject(userId, projectId))) throw new Error("プロジェクトが見つかりません。");
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("project_members").delete().eq("project_id", projectId).eq("animal_id", animalId),
  );
  if (error) throw new Error(`project_members を更新できません: ${error.message}`);
}

export async function listOwnedProjectMembers(userId: string, projectId: string) {
  if (!(await getOwnedProject(userId, projectId))) return [];
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("project_members").select("*").eq("project_id", projectId).range(from, to),
    ),
  );
  return rows.map((row) => ({
    projectId: String(row.project_id),
    animalId: String(row.animal_id),
    role: row.role as ProjectRole,
  }));
}

function mapPrediction(row: Record<string, unknown>): PredictionRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    maleId: String(row.male_id ?? ""),
    femaleId: String(row.female_id ?? ""),
    parentA: (row.parent_a as PredictionRecord["parentA"]) ?? {},
    parentB: (row.parent_b as PredictionRecord["parentB"]) ?? {},
    pairing: (row.pairing as PredictionRecord["pairing"]) ?? {},
    breedingId: String(row.breeding_id ?? ""),
    projectId: String(row.project_id ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listOwnedPredictions(userId: string): Promise<PredictionRecord[]> {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("predictions").select("*").eq("user_id", userId).range(from, to),
    ),
  );
  return rows.map(mapPrediction).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOwnedPrediction(userId: string, id: string): Promise<PredictionRecord | undefined> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("predictions").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
  );
  if (error) throw new Error(`predictions を読めません: ${error.message}`);
  return data ? mapPrediction(data as Record<string, unknown>) : undefined;
}

export async function getOwnedPredictionForBreeding(
  userId: string,
  breedingId: string,
): Promise<PredictionRecord | undefined> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("breeding_id", breedingId)
      .maybeSingle(),
  );
  if (error) throw new Error(`predictions を読めません: ${error.message}`);
  return data ? mapPrediction(data as Record<string, unknown>) : undefined;
}

export async function insertOwnedPrediction(userId: string, row: PredictionRecord): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("predictions").insert({
      id: row.id,
      user_id: userId,
      name: row.name ?? "",
      male_id: row.maleId ?? "",
      female_id: row.femaleId ?? "",
      parent_a: row.parentA ?? {},
      parent_b: row.parentB ?? {},
      pairing: row.pairing ?? {},
      breeding_id: row.breedingId ?? "",
      project_id: row.projectId ?? "",
      created_at: timestampOrNow(row.createdAt),
    }),
  );
  if (error) throw new Error(`predictions を保存できません: ${error.message}`);
}

export async function updateOwnedSettings(userId: string, settings: SettingsRecord): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("profiles").upsert(
      {
        id: userId,
        display_name: storedDisplayName(settings.displayName),
        collection_name: settings.collectionName || "クレスノート",
        prefecture: settings.prefecture ?? "",
        public_by_default: Boolean(settings.publicByDefault),
      },
      { onConflict: "id" },
    ),
  );
  if (error) throw new Error(`profiles を保存できません: ${error.message}`);
}

export async function updateOwnedDisplayName(userId: string, displayName: string): Promise<string> {
  const name = storedDisplayName(displayName);
  if (!name) {
    throw new Error(nicknameError(displayName) || "ニックネームを入力してください。");
  }
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("profiles").update({ display_name: name }).eq("id", userId).select("id").maybeSingle(),
  );
  if (error) throw new Error(`profiles を保存できません: ${error.message}`);
  if (!data?.id) {
    const { error: insertError } = await retryOnJwtIssuedAtFuture(() =>
      client.from("profiles").upsert(
        {
          id: userId,
          display_name: name,
          collection_name: "クレスノート",
          prefecture: "",
          public_by_default: false,
        },
        { onConflict: "id" },
      ),
    );
    if (insertError) throw new Error(`profiles を保存できません: ${insertError.message}`);
  }
  return name;
}

export async function insertOwnedFeedback(userId: string, row: FeedbackRecord): Promise<void> {
  const client = createAdminClient();
  const { error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("feedback").insert({
      id: postgresUuid(row.id, "feedback"),
      user_id: userId,
      category: row.category,
      status: row.status ?? "open",
      body: row.body ?? "",
      name: row.name ?? "",
      created_at: timestampOrNow(row.createdAt),
      updated_at: timestampOrNow(row.updatedAt),
      admin_note: row.adminNote ?? "",
    }),
  );
  if (error) throw new Error(`feedback を保存できません: ${error.message}`);
}

export async function listOwnedCheckAnimals(userId: string) {
  const client = createAdminClient();
  const rows = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("animals")
        .select("*")
        .eq("user_id", userId)
        .not("check_every_days", "is", null)
        .range(from, to),
    ),
  );
  return rows.map(asAnimalRecord);
}

export async function listOwnedPhotoAnimalsPage(
  userId: string,
  params: { page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? PHOTO_ALBUM_PAGE_SIZE, 100));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const client = createAdminClient();
  const { data, error, count } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .neq("photo_url", "")
      .order("updated_at", { ascending: false })
      .range(from, to),
  );
  if (error) throw new Error(`animals を読めません: ${error.message}`);
  return {
    records: (data ?? []).map((row) => asAnimalRecord(row as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function listOwnedPhotoAnimals(userId: string, limit: number) {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .select("*")
      .eq("user_id", userId)
      .neq("photo_url", "")
      .order("updated_at", { ascending: false })
      .limit(limit),
  );
  if (error) throw new Error(`animals を読めません: ${error.message}`);
  return (data ?? []).map((row) => asAnimalRecord(row as Record<string, unknown>));
}

export async function listRecentOwnedWeights(userId: string, limit: number) {
  const client = createAdminClient();
  const animals = await selectPagedAll((from, to) =>
    retryOnJwtIssuedAtFuture(() =>
      client.from("animals").select("id").eq("user_id", userId).range(from, to),
    ),
  );
  return listRecentWeightsForAnimals(
    animals.map((row) => String(row.id)),
    limit,
  );
}

export async function dashboardCounts(userId: string) {
  const client = createAdminClient();
  const [activeBreedings, projects, incubating] = await Promise.all([
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("breedings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active"),
    ),
    retryOnJwtIssuedAtFuture(() =>
      client
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active"),
    ),
    listOwnedBreedings(userId),
  ]);
  if (activeBreedings.error) throw new Error(`breedings を数えられません: ${activeBreedings.error.message}`);
  if (projects.error) throw new Error(`projects を数えられません: ${projects.error.message}`);
  const incubatingEggs = incubating.flatMap((breeding) =>
    breeding.clutches.flatMap((clutch) =>
      clutch.eggs.filter((egg) => egg.result === "incubating" || egg.result === "fertile"),
    ),
  );
  const today = new Date().toISOString().slice(0, 10);
  const upcomingHatches = incubating
    .flatMap((breeding) =>
      breeding.clutches.flatMap((clutch) =>
        clutch.eggs
          .filter(
            (egg) =>
              (egg.result === "incubating" || egg.result === "fertile") &&
              egg.expectedHatchOn &&
              egg.expectedHatchOn >= today,
          )
          .map((egg) => ({ egg, breedingId: breeding.id })),
      ),
    )
    .sort((a, b) => a.egg.expectedHatchOn.localeCompare(b.egg.expectedHatchOn))
    .slice(0, 8);
  return {
    activeBreedings: activeBreedings.count ?? 0,
    incubatingEggs: incubatingEggs.length,
    projectCount: projects.count ?? 0,
    upcomingHatches,
  };
}

export async function getEggContext(userId: string, eggId: string) {
  const client = createAdminClient();
  const { data: egg, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("eggs").select("*").eq("id", eggId).maybeSingle(),
  );
  if (error) throw new Error(`eggs を読めません: ${error.message}`);
  if (!egg) throw new Error("卵が見つかりません。");
  const { data: clutch, error: clutchError } = await retryOnJwtIssuedAtFuture(() =>
    client.from("clutches").select("*").eq("id", egg.clutch_id).maybeSingle(),
  );
  if (clutchError || !clutch) throw new Error("クラッチが見つかりません。");
  const breeding = await getOwnedBreeding(userId, String(clutch.breeding_id));
  if (!breeding) throw new Error("ペアが見つかりません。");
  return { egg, clutch, breeding };
}
