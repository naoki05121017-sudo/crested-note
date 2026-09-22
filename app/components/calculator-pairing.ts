import {
  getLocus,
  getVisualTrait,
  type GeneStatus,
  type Genotype,
  calculatePairing,
  type PairingResult,
} from "@/lib/genetics";
import { inferCshDiplotype } from "@/lib/genetics/csh";
import {
  axanthicFromGenotype,
  calculatorTraitOptions,
  clearTraitFromGenotype,
  setAxanthicGenotype,
  type CalculatorTraitOption,
} from "@/app/components/calculator-traits";

export type CalculatorParentState = {
  genotype: Genotype;
  visualTags: string[];
  addedTraits: string[];
};

function parentHasCshTrait(addedTraits: string[], visualTags: string[]): boolean {
  return [...addedTraits, ...visualTags].some(
    (id) => id === "sable" || id === "highway" || id === "cappuccino",
  );
}

function defaultStatus(): GeneStatus {
  return "het";
}

function optionById(id: string): CalculatorTraitOption | undefined {
  return calculatorTraitOptions().find((row) => row.id === id);
}

function isVisualTraitId(id: string, option?: CalculatorTraitOption): boolean {
  return (
    option?.kind === "visual" ||
    Boolean(getVisualTrait(id)) ||
    id === "sable" ||
    id === "highway"
  );
}

function alleleSeat(id: string, option?: CalculatorTraitOption): string | undefined {
  return getVisualTrait(id)?.alleleOf ?? option?.alleleOf ?? (id === "sable" || id === "highway" ? "cappuccino" : undefined);
}

/**
 * Rebuild pairing input from what the calculator actually displays.
 * Displayed addedTraits are the source of truth so a shown セーブル cannot
 * vanish before Punnett.
 */
export function hydrateParentForPairing(
  state: CalculatorParentState,
): CalculatorParentState {
  let genotype: Genotype = { ...state.genotype };
  const visualTags = new Set<string>(state.visualTags);

  for (const id of state.addedTraits) {
    const option = optionById(id);
    if (isVisualTraitId(id, option)) {
      visualTags.add(id);
      delete genotype[id];
      const seat = alleleSeat(id, option);
      if (seat && getLocus(seat)) {
        if (!genotype[seat] || genotype[seat] === "wild") {
          genotype[seat] = defaultStatus();
        }
      }
      continue;
    }
    if (option?.kind === "axanthic" || id === "axanthic") {
      const ax = axanthicFromGenotype(genotype);
      if (!ax.status || ax.status === "wild") {
        genotype = setAxanthicGenotype(
          genotype,
          ax.locusId,
          ax.locusId,
          defaultStatus(),
        );
      }
      continue;
    }
    if (getLocus(id) && (!genotype[id] || genotype[id] === "wild")) {
      genotype[id] = defaultStatus();
    }
  }

  if (!parentHasCshTrait(state.addedTraits, [...visualTags])) {
    delete genotype.cappuccino;
    delete genotype.csh;
    delete genotype.sable;
    delete genotype.highway;
  }

  const tags = [...visualTags];
  const csh = inferCshDiplotype(genotype, tags);
  if (csh !== "NN") genotype.csh = csh;
  else delete genotype.csh;

  return {
    genotype,
    visualTags: [...visualTags],
    addedTraits: state.addedTraits,
  };
}

export function collectVisualTagsForPairing(parent: CalculatorParentState): string[] {
  const hydrated = hydrateParentForPairing(parent);
  const tags = new Set<string>(hydrated.visualTags);
  for (const id of hydrated.addedTraits) {
    if (isVisualTraitId(id, optionById(id))) tags.add(id);
  }
  for (const [id, status] of Object.entries(hydrated.genotype)) {
    if (!status || status === "wild") continue;
    if (isVisualTraitId(id, optionById(id))) tags.add(id);
  }
  return [...tags];
}

export function addCalculatorTrait(
  state: CalculatorParentState,
  option: CalculatorTraitOption,
): CalculatorParentState {
  const addedTraits = state.addedTraits.includes(option.id)
    ? state.addedTraits
    : [...state.addedTraits, option.id];
  return hydrateParentForPairing({
    ...state,
    addedTraits,
  });
}

export function removeCalculatorTrait(
  state: CalculatorParentState,
  option: CalculatorTraitOption | undefined,
  id: string,
): CalculatorParentState {
  const addedTraits = state.addedTraits.filter((row) => row !== id);
  const visual = getVisualTrait(id);
  if (visual || option?.kind === "visual" || isVisualTraitId(id, option)) {
    const visualTags = state.visualTags.filter((tag) => tag !== id);
    let genotype = { ...state.genotype };
    delete genotype[id];
    const seat = alleleSeat(id, option);
    if (
      seat &&
      !addedTraits.some((other) => alleleSeat(other, optionById(other)) === seat) &&
      !addedTraits.includes(seat)
    ) {
      genotype = clearTraitFromGenotype(genotype, seat);
    }
    return hydrateParentForPairing({ genotype, visualTags, addedTraits });
  }
  return hydrateParentForPairing({
    genotype: clearTraitFromGenotype(state.genotype, id),
    visualTags: state.visualTags,
    addedTraits,
  });
}

export function uiTagsForPairing(state: CalculatorParentState): string[] {
  const hydrated = hydrateParentForPairing(state);
  const tags = new Set<string>();
  for (const tag of hydrated.visualTags) {
    if (tag === "sable" || tag === "highway" || tag === "cappuccino") tags.add(tag);
    else if (getVisualTrait(tag)) tags.add(tag);
  }
  for (const id of hydrated.addedTraits) {
    if (id === "sable" || id === "highway" || id === "cappuccino") tags.add(id);
  }
  return [...tags];
}

export function runCalculatorPairing(
  parentA: CalculatorParentState,
  parentB: CalculatorParentState,
): PairingResult {
  const a = hydrateParentForPairing(parentA);
  const b = hydrateParentForPairing(parentB);
  return calculatePairing(a.genotype, b.genotype, {
    visualA: uiTagsForPairing(a),
    visualB: uiTagsForPairing(b),
  });
}
