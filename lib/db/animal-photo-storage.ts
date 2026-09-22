import { createAdminClient } from "@/lib/supabase/admin";
import {
  ANIMAL_PHOTO_BUCKET,
  MAX_ANIMAL_PHOTO_BYTES,
  animalPhotoObjectKey,
  animalPhotoObjectPath,
  animalPhotoPrefix,
  photoExtensionForType,
} from "@/lib/db/animal-photo";
import { newId } from "@/lib/db/store";

let bucketReady: Promise<void> | null = null;

async function storage() {
  return createAdminClient().storage;
}

async function ensurePhotoBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const client = await storage();
      const listed = await client.listBuckets();
      if (listed.error) {
        throw new Error(`写真の保存先を確認できません: ${listed.error.message}`);
      }
      if (listed.data?.some((bucket) => bucket.name === ANIMAL_PHOTO_BUCKET)) {
        return;
      }
      const created = await client.createBucket(ANIMAL_PHOTO_BUCKET, {
        public: true,
        fileSizeLimit: MAX_ANIMAL_PHOTO_BYTES,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      });
      if (created.error && !/already exists/i.test(created.error.message)) {
        throw new Error(`写真の保存先を作れません: ${created.error.message}`);
      }
    })().catch((error: unknown) => {
      bucketReady = null;
      throw error;
    });
  }
  await bucketReady;
}

export async function uploadAnimalPhoto(animalId: string, file: File): Promise<string> {
  await ensurePhotoBucket();
  const path = animalPhotoObjectPath(animalId, file, newId());
  const type = file.type;
  if (!photoExtensionForType(type)) {
    throw new Error("写真は JPEG / PNG / WebP / GIF で選んでください。");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const client = await storage();
  const uploaded = await client.from(ANIMAL_PHOTO_BUCKET).upload(path, bytes, {
    contentType: type,
    upsert: false,
  });
  if (uploaded.error) {
    throw new Error(`写真を保存できません: ${uploaded.error.message}`);
  }
  const { data } = client.from(ANIMAL_PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeManagedAnimalPhoto(url: string): Promise<void> {
  const key = animalPhotoObjectKey(url);
  if (!key) return;
  const client = await storage();
  const removed = await client.from(ANIMAL_PHOTO_BUCKET).remove([key]);
  if (removed.error) {
    throw new Error(`写真を削除できません: ${removed.error.message}`);
  }
}

export async function removeAnimalPhotoFolder(animalId: string): Promise<void> {
  if (!animalId) return;
  await ensurePhotoBucket();
  const client = await storage();
  const listed = await client.from(ANIMAL_PHOTO_BUCKET).list(animalId, { limit: 100 });
  if (listed.error) {
    throw new Error(`写真を削除できません: ${listed.error.message}`);
  }
  const keys = (listed.data ?? [])
    .map((row) => row.name)
    .filter(Boolean)
    .map((name) => `${animalPhotoPrefix(animalId)}${name}`);
  if (keys.length === 0) return;
  const removed = await client.from(ANIMAL_PHOTO_BUCKET).remove(keys);
  if (removed.error) {
    throw new Error(`写真を削除できません: ${removed.error.message}`);
  }
}

export async function discardPreviousAnimalPhoto(
  previousUrl: string,
  nextUrl: string,
  animalId: string,
): Promise<void> {
  if (previousUrl && previousUrl !== nextUrl) {
    await removeManagedAnimalPhoto(previousUrl);
  }
  if (!nextUrl) {
    await removeAnimalPhotoFolder(animalId);
  }
}
