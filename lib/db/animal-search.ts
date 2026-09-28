export function sanitizeAnimalSearch(raw: string): string {
  return raw
    .replace(/[%_(),.*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const ANIMAL_LIST_PAGE_SIZE = 24;
export const HOME_ANIMAL_PREVIEW = 6;
