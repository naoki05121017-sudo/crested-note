import { createAdminClient } from "@/lib/supabase/admin";
import { retryOnJwtIssuedAtFuture } from "@/lib/supabase/clock-skew-fetch";
import { GALLERY_PAGE_SIZE, sanitizeAnimalSearch } from "@/lib/db/animal-search";
import { chunkIds } from "@/lib/db/supabase-page";
import { mergeAlbumPhotos, publicNickname, type AlbumPhoto } from "@/lib/community/album-comments";
import { SEXES, type Sex } from "@/lib/db/types";

export { GALLERY_PAGE_SIZE };

export type GalleryFilters = {
  q?: string;
  sex?: string;
  page?: number;
};

export type GalleryCard = {
  name: string;
  sex: Sex;
  morphLabel: string;
  nickname: string;
  weightG: number | null;
  photoUrl: string | null;
  href: string | null;
};

export type PublicParent = {
  name: string;
  href: string;
};

export const LIVING_STATUSES = ["active", "breeding"] as const;

function asSex(value: unknown): Sex {
  return SEXES.includes(value as Sex) ? (value as Sex) : "unknown";
}

export function toGalleryCard(input: {
  isPublic: boolean;
  name: string;
  sex: Sex;
  morphLabel: string;
  photoUrl: string;
  shareSlug: string;
  nickname: string;
  weightG: number | null;
}): GalleryCard {
  const listedPublic = input.isPublic && Boolean(input.shareSlug.trim());
  return {
    name: input.name,
    sex: input.sex,
    morphLabel: input.morphLabel,
    nickname: input.nickname,
    weightG: input.weightG,
    photoUrl: listedPublic && input.photoUrl.trim() ? input.photoUrl : null,
    href: listedPublic ? `/p/${input.shareSlug}` : null,
  };
}

export function parseGalleryFilters(params: Record<string, string | string[] | undefined>): GalleryFilters {
  const qRaw = params.q;
  const sexRaw = params.sex;
  const pageRaw = params.page;
  const q = sanitizeAnimalSearch(typeof qRaw === "string" ? qRaw : "");
  const sex = typeof sexRaw === "string" && SEXES.includes(sexRaw as Sex) ? sexRaw : "";
  const page = Math.max(1, Number(typeof pageRaw === "string" ? pageRaw : "1") || 1);
  return { q: q || undefined, sex: sex || undefined, page };
}

async function nicknamesByUserId(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const client = createAdminClient();
  const rows = (
    await Promise.all(
      chunkIds(userIds).map((part) =>
        retryOnJwtIssuedAtFuture(() =>
          client.from("profiles").select("id, display_name").in("id", part),
        ),
      ),
    )
  ).flatMap((result) => {
    if (result.error) throw new Error(`profiles を読めません: ${result.error.message}`);
    return result.data ?? [];
  });
  for (const row of rows) {
    map.set(String(row.id), publicNickname(String(row.display_name ?? "")));
  }
  return map;
}

async function latestWeightsByAnimal(animalIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (animalIds.length === 0) return map;
  const client = createAdminClient();
  const rows = (
    await Promise.all(
      chunkIds(animalIds).map((part) =>
        retryOnJwtIssuedAtFuture(() =>
          client
            .from("weight_logs")
            .select("animal_id, weight_g, weighed_on")
            .in("animal_id", part)
            .order("weighed_on", { ascending: false }),
        ),
      ),
    )
  ).flatMap((result) => {
    if (result.error) throw new Error(`weight_logs を読めません: ${result.error.message}`);
    return result.data ?? [];
  });
  for (const row of rows) {
    const id = String(row.animal_id);
    if (map.has(id)) continue;
    map.set(id, Number(row.weight_g));
  }
  return map;
}

export async function listPublicGalleryPage(filters: GalleryFilters): Promise<{
  cards: GalleryCard[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = filters.page ?? 1;
  const from = (page - 1) * GALLERY_PAGE_SIZE;
  const to = from + GALLERY_PAGE_SIZE - 1;
  const client = createAdminClient();
  let query = client
    .from("animals")
    .select("id, user_id, name, sex, morph_label, photo_url, share_slug, is_public", { count: "exact" })
    .in("status", [...LIVING_STATUSES])
    .order("updated_at", { ascending: false });
  if (filters.sex) query = query.eq("sex", filters.sex);
  if (filters.q) {
    const needle = `%${filters.q}%`;
    query = query.or(`name.ilike.${needle},morph_label.ilike.${needle}`);
  }
  const { data, error, count } = await retryOnJwtIssuedAtFuture(() => query.range(from, to));
  if (error) throw new Error(`個体を読めません: ${error.message}`);
  const rows = data ?? [];
  const ids = rows.map((row) => String(row.id));
  const userIds = [...new Set(rows.map((row) => String(row.user_id)))];
  const [nicks, weights] = await Promise.all([
    nicknamesByUserId(userIds),
    latestWeightsByAnimal(ids),
  ]);
  return {
    cards: rows.map((row) =>
      toGalleryCard({
        isPublic: Boolean(row.is_public),
        name: String(row.name ?? ""),
        sex: asSex(row.sex),
        morphLabel: String(row.morph_label ?? ""),
        photoUrl: String(row.photo_url ?? ""),
        shareSlug: String(row.share_slug ?? ""),
        nickname: nicks.get(String(row.user_id)) ?? publicNickname(""),
        weightG: weights.get(String(row.id)) ?? null,
      }),
    ),
    total: count ?? rows.length,
    page,
    pageSize: GALLERY_PAGE_SIZE,
  };
}

export async function listAlbumPhotosForAnimal(
  animalId: string,
  coverUrl: string,
): Promise<AlbumPhoto[]> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animal_photos")
      .select("id, url, sort_order")
      .eq("animal_id", animalId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  );
  if (error) {
    if (/animal_photos|schema cache/i.test(error.message)) {
      return mergeAlbumPhotos(coverUrl, []);
    }
    throw new Error(`アルバムを読めません: ${error.message}`);
  }
  return mergeAlbumPhotos(
    coverUrl,
    (data ?? []).map((row) => ({
      id: String(row.id),
      url: String(row.url ?? ""),
      sortOrder: Number(row.sort_order) || 0,
    })),
  );
}

export async function publicNicknameForUser(userId: string): Promise<string> {
  const nicks = await nicknamesByUserId([userId]);
  return nicks.get(userId) ?? publicNickname("");
}

export async function getPublicAnimalOwnerId(animalId: string): Promise<string | null> {
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client.from("animals").select("user_id, is_public").eq("id", animalId).maybeSingle(),
  );
  if (error) throw new Error(`animals を読めません: ${error.message}`);
  if (!data?.is_public) return null;
  return String(data.user_id);
}

export async function listPublicParents(
  sireId: string,
  damId: string,
): Promise<{ sire: PublicParent | null; dam: PublicParent | null }> {
  const ids = [sireId, damId].filter(Boolean);
  if (ids.length === 0) return { sire: null, dam: null };
  const client = createAdminClient();
  const { data, error } = await retryOnJwtIssuedAtFuture(() =>
    client
      .from("animals")
      .select("id, name, is_public, share_slug")
      .in("id", ids)
      .eq("is_public", true)
      .neq("share_slug", ""),
  );
  if (error) throw new Error(`血統を読めません: ${error.message}`);
  const byId = new Map((data ?? []).map((row) => [String(row.id), row]));
  function asParent(id: string): PublicParent | null {
    const row = byId.get(id);
    if (!row) return null;
    return { name: String(row.name ?? ""), href: `/p/${row.share_slug}` };
  }
  return { sire: asParent(sireId), dam: asParent(damId) };
}
