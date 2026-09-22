import type { Sex } from "@/lib/db/types";

export type ParentRole = "sire" | "dam";

export type ParentSexAnimal = {
  id: string;
  sex: Sex;
};

export function requiredSexForParentRole(role: ParentRole): Sex {
  return role === "sire" ? "male" : "female";
}

export function isEligibleParent(
  animal: ParentSexAnimal,
  role: ParentRole,
  currentId = "",
): boolean {
  if (currentId && animal.id === currentId) return true;
  return animal.sex === requiredSexForParentRole(role);
}

export function parentOptionsForRole<T extends ParentSexAnimal>(
  animals: T[],
  role: ParentRole,
  currentId = "",
): T[] {
  return animals.filter((animal) => isEligibleParent(animal, role, currentId));
}

export function parentSexAssignmentError(
  animals: ParentSexAnimal[],
  sireId: string,
  damId: string,
  preserve: { sireId?: string; damId?: string } = {},
): string | null {
  if (sireId) {
    const sire = animals.find((animal) => animal.id === sireId);
    if (!sire) return "父の個体が見つかりません。";
    if (sire.id !== preserve.sireId && sire.sex !== "male") {
      return "父にはオスだけを登録できます。性別が不明な個体は選べません。";
    }
  }
  if (damId) {
    const dam = animals.find((animal) => animal.id === damId);
    if (!dam) return "母の個体が見つかりません。";
    if (dam.id !== preserve.damId && dam.sex !== "female") {
      return "母にはメスだけを登録できます。性別が不明な個体は選べません。";
    }
  }
  return null;
}
