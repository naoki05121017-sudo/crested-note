export const ANIMAL_PHOTO_BUCKET = "animal-photos";
export const MAX_ANIMAL_PHOTO_BYTES = 8 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heic",
};

const EXT_BY_NAME: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
  heic: "heic",
  heif: "heic",
};

/** Lets iPhone offer 写真を撮る / フォトライブラリ / ファイル. */
export const ANIMAL_PHOTO_ACCEPT = "image/*";

export const ANIMAL_PHOTO_MIME_TYPES = Object.keys(EXT_BY_TYPE);

export type PhotoFormIntent = {
  file: File | null;
  remove: boolean;
  error: string | null;
};

export function photoExtensionForType(mime: string): string | undefined {
  return EXT_BY_TYPE[mime.trim().toLowerCase()];
}

export function photoExtensionForFile(file: File): string | undefined {
  const fromType = photoExtensionForType(file.type);
  if (fromType) return fromType;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_BY_NAME[ext];
}

export function validatePhotoFile(file: File): string | null {
  if (!file.size) return "写真ファイルが空です。";
  if (file.size > MAX_ANIMAL_PHOTO_BYTES) {
    return "写真は 8MB 以下にしてください。";
  }
  if (!photoExtensionForFile(file)) {
    return "写真ファイルを選んでください。";
  }
  return null;
}

export function parsePhotoForm(formData: FormData): PhotoFormIntent {
  const remove = formData.get("removePhoto") === "on";
  const raw = formData.get("photo");
  if (!(raw instanceof File) || raw.size === 0) {
    return { file: null, remove, error: null };
  }
  const error = validatePhotoFile(raw);
  if (error) return { file: null, remove, error };
  return { file: raw, remove, error: null };
}

export function nextPhotoUrl(
  existing: string,
  uploaded: string | null,
  remove: boolean,
  pastedUrl = "",
): string {
  if (uploaded) return uploaded;
  if (remove) return "";
  const pasted = pastedUrl.trim();
  if (pasted) return pasted;
  return existing;
}

export function animalPhotoObjectPath(animalId: string, file: File, fileId: string): string {
  const ext = photoExtensionForFile(file) ?? "jpg";
  return `${animalId}/${fileId}.${ext}`;
}

export function isManagedAnimalPhotoUrl(url: string): boolean {
  return animalPhotoObjectKey(url) !== null;
}

export function animalPhotoObjectKey(url: string): string | null {
  const text = url.trim();
  if (!text) return null;
  const marker = `/storage/v1/object/public/${ANIMAL_PHOTO_BUCKET}/`;
  const index = text.indexOf(marker);
  if (index === -1) return null;
  const key = decodeURIComponent(text.slice(index + marker.length).split("?")[0] ?? "");
  return key && !key.includes("..") ? key : null;
}

export function animalPhotoPrefix(animalId: string): string {
  return `${animalId}/`;
}
