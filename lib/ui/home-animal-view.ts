export const HOME_ANIMAL_VIEW_KEY = "crested-note.home-animal-view";

export type HomeAnimalView = "card" | "list";

export function parseHomeAnimalView(value: string | null | undefined): HomeAnimalView {
  return value === "list" ? "list" : "card";
}
