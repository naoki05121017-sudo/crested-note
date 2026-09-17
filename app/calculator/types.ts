import type { Genotype } from "@/lib/genetics";
import type { Sex } from "@/lib/db/types";

export type CalculatorAnimal = {
  id: string;
  name: string;
  code: string;
  sex: Sex;
  genotype: Genotype;
  traits: string[];
};
