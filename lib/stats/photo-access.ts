export function canReadAnimalPhoto(options: {
  isPublic: boolean;
  ownerUserId: string;
  viewerUserId: string | null;
  isLiving?: boolean;
  isGalleryCover?: boolean;
}): boolean {
  if (options.isPublic) return true;
  if (options.viewerUserId && options.viewerUserId === options.ownerUserId) return true;
  return Boolean(options.isGalleryCover && options.isLiving);
}

const ANIMAL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_RE = /^[A-Za-z0-9._-]+$/;

export function parseAnimalPhotoObjectKey(
  animalId: string,
  file: string,
): string | null {
  if (!ANIMAL_ID_RE.test(animalId) || !FILE_RE.test(file)) return null;
  return `${animalId}/${file}`;
}
