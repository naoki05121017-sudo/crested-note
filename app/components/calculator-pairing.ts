import {
  calculatePairing,
  getVisualTrait,
  resolveParentGenotype,
  type Genotype,
  type PairingResult,
} from "@/lib/genetics";
import {
  AXANTHIC_TRAIT_ID,
  axanthicFromGenotype,
  calculatorTraitOptions,
  clearTraitFromGenotype,
  rowIdForOption,
  setAxanthicGenotype,
  visibleTraitsFromParent,
  type CalculatorTraitOption,
} from "@/app/components/calculator-traits";

export type CalculatorParentState = {
  /** locus id → state id. The only input the Punnett maths reads. */
  genotype: Genotype;
  /** Polygenic tags. Displayed, never calculated. */
  traits: string[];
  /** Rows currently shown: locus ids, `axanthic`, or polygenic trait ids. */
  addedTraits: string[];
};

function optionById(id: string): CalculatorTraitOption | undefined {
  return calculatorTraitOptions().find((row) => row.id === id);
}

function optionForRow(rowId: string): CalculatorTraitOption | undefined {
  return calculatorTraitOptions().find((row) => rowIdForOption(row) === rowId);
}

export function emptyParentState(): CalculatorParentState {
  return { genotype: {}, traits: [], addedTraits: [] };
}

/**
 * Make the parent state self-consistent before it is used.
 * Legacy keys and trait tags are folded onto their locus, and every displayed
 * genetic row is guaranteed a state, so a shown セーブル cannot vanish.
 */
export function hydrateParentForPairing(
  state: CalculatorParentState,
): CalculatorParentState {
  const genotype: Genotype = resolveParentGenotype(state.genotype, state.traits);
  const traits = state.traits.filter((tag) => Boolean(getVisualTrait(tag)));

  for (const rowId of state.addedTraits) {
    if (rowId === AXANTHIC_TRAIT_ID) {
      const axanthic = axanthicFromGenotype(genotype);
      if (!axanthic.stateId || axanthic.stateId === "wild") {
        genotype[axanthic.locusId] = "het";
      }
      continue;
    }
    const option = optionForRow(rowId);
    if (option?.kind === "locus" && option.locus) {
      if (!genotype[option.locus.id]) {
        genotype[option.locus.id] = option.defaultStateId ?? "het";
      }
      continue;
    }
    if (getVisualTrait(rowId) && !traits.includes(rowId)) traits.push(rowId);
  }

  const addedTraits = [...state.addedTraits];
  for (const rowId of visibleTraitsFromParent(genotype, traits)) {
    if (!addedTraits.includes(rowId)) addedTraits.push(rowId);
  }

  return { genotype, traits, addedTraits };
}

export function addCalculatorTrait(
  state: CalculatorParentState,
  option: CalculatorTraitOption,
): CalculatorParentState {
  const rowId = rowIdForOption(option);
  const addedTraits = state.addedTraits.includes(rowId)
    ? state.addedTraits
    : [...state.addedTraits, rowId];
  let genotype = { ...state.genotype };
  const traits = [...state.traits];

  if (option.kind === "locus" && option.locus) {
    genotype[option.locus.id] = option.defaultStateId ?? "het";
  } else if (option.kind === "axanthic") {
    const axanthic = axanthicFromGenotype(genotype);
    genotype = setAxanthicGenotype(
      genotype,
      axanthic.locusId,
      axanthic.locusId,
      "het",
    );
  } else if (!traits.includes(option.id)) {
    traits.push(option.id);
  }

  return hydrateParentForPairing({ genotype, traits, addedTraits });
}

export function removeCalculatorTrait(
  state: CalculatorParentState,
  _option: CalculatorTraitOption | undefined,
  rowId: string,
): CalculatorParentState {
  const addedTraits = state.addedTraits.filter((row) => row !== rowId);
  const genotype = clearTraitFromGenotype(state.genotype, rowId);
  const traits = state.traits.filter((tag) => tag !== rowId);
  return hydrateParentForPairing({ genotype, traits, addedTraits });
}

export function setLocusState(
  state: CalculatorParentState,
  locusId: string,
  stateId: string,
): CalculatorParentState {
  const genotype = { ...state.genotype };
  if (stateId === "wild") delete genotype[locusId];
  else genotype[locusId] = stateId;
  return { ...state, genotype };
}

/** Polygenic tags carried by a parent. Kept for display and saved predictions. */
export function collectTraitsForPairing(
  parent: CalculatorParentState,
): string[] {
  return hydrateParentForPairing(parent).traits;
}

export function runCalculatorPairing(
  parentA: CalculatorParentState,
  parentB: CalculatorParentState,
): PairingResult {
  const a = hydrateParentForPairing(parentA);
  const b = hydrateParentForPairing(parentB);
  return calculatePairing(a.genotype, b.genotype, {
    traitsA: a.traits,
    traitsB: b.traits,
  });
}

export function optionForId(id: string): CalculatorTraitOption | undefined {
  return optionById(id);
}
