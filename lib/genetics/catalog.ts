import {
  allelicSeriesLocus,
  incompleteDominantLocus,
  recessiveLocus,
} from "./locus-builders";
import type {
  ComboNameRule,
  LocusDefinition,
  LocusGenotypeDefinition,
  LocusStateDefinition,
} from "./types";

/**
 * Calculable loci, aligned with https://crested-gecko-calc.pages.dev/.
 *
 * `phenotypeOrder` only controls the order of tokens in a combined phenotype
 * name; it never affects probabilities.
 */
export const LOCI: readonly LocusDefinition[] = [
  recessiveLocus({
    id: "albino",
    nameJa: "アルビノ",
    nameEn: "Albino",
    phenotypeOrder: 10,
    confidence: "UNCERTAIN",
    notesJa:
      "クレステッドゲッコーでの遺伝機序は研究中です。確率は劣性遺伝を仮定した理論値です。",
    beginnerDescription:
      "劣性として計算します。両親から1つずつ受け取ると見た目に出ます。遺伝機序は研究中です。",
  }),
  recessiveLocus({
    id: "chocho",
    nameJa: "チョチョ",
    nameEn: "Chocho",
    phenotypeOrder: 11,
    confidence: "PARTIALLY_ESTABLISHED",
    beginnerDescription:
      "劣性です。孵化時は明るく、成長とともに暗くなる（ターニング）と報告されています。",
  }),
  incompleteDominantLocus({
    id: "emptyBack",
    nameJa: "エンプティバック",
    nameEn: "Empty Back",
    alleleSymbol: "EB",
    visualNameJa: "エンプティバック",
    visualNameEn: "Empty Back",
    superNameJa: "スーパーエンプティバック",
    superNameEn: "Super Empty Back",
    phenotypeOrder: 20,
    confidence: "PARTIALLY_ESTABLISHED",
    beginnerDescription:
      "不完全優性です。1コピーで背面パターンが抜け、2コピーでスーパーエンプティバックになります。",
  }),
  recessiveLocus({
    id: "superStripe",
    nameJa: "スーパーストライプ",
    nameEn: "Super Stripe",
    visualNameJa: "スーパーストライプ",
    visualNameEn: "Super Stripe",
    phenotypeOrder: 21,
    confidence: "UNCERTAIN",
    notesJa: "遺伝機序は研究中です。確率は劣性遺伝を仮定した参考値です。",
    beginnerDescription:
      "劣性として計算します。遺伝機序は研究中のため、確率は参考値です。",
  }),
  recessiveLocus({
    id: "axanthicTug",
    nameJa: "アザンティック (TUG)",
    nameEn: "Axanthic (TUG)",
    phenotypeOrder: 40,
    confidence: "ESTABLISHED",
    notesJa: "アザンティックは系統ごとに別locusとして扱います。",
    beginnerDescription:
      "劣性です。TUG・Melanistic・ARV・Lava は別の遺伝子として計算します。",
  }),
  recessiveLocus({
    id: "axanthicMelanistic",
    nameJa: "アザンティック (Melanistic)",
    nameEn: "Axanthic (Melanistic)",
    phenotypeOrder: 41,
    confidence: "ESTABLISHED",
    beginnerDescription:
      "アザンティックの Melanistic 系統。TUG などとは別遺伝子です。",
  }),
  recessiveLocus({
    id: "axanthicArv",
    nameJa: "アザンティック (ARV)",
    nameEn: "Axanthic (ARV)",
    phenotypeOrder: 42,
    confidence: "ESTABLISHED",
    beginnerDescription: "アザンティックの ARV 系統。他系統とは別遺伝子です。",
  }),
  recessiveLocus({
    id: "axanthicLava",
    nameJa: "アザンティック (Lava)",
    nameEn: "Axanthic (Lava)",
    phenotypeOrder: 43,
    confidence: "ESTABLISHED",
    beginnerDescription: "アザンティックの Lava 系統。他系統とは別遺伝子です。",
  }),
  recessiveLocus({
    id: "phantom",
    nameJa: "ファントム",
    nameEn: "Phantom",
    phenotypeOrder: 50,
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性です。両親から1つずつ受け取ると見た目に出ます。1つだけなら隠れて持ちます。",
  }),
  recessiveLocus({
    id: "redBase",
    nameJa: "レッドベース",
    nameEn: "Red Base",
    phenotypeOrder: 55,
    confidence: "UNCERTAIN",
    notesJa:
      "レッドベースの扱いは地域で割れています。ここでは劣性を仮定した理論値です。",
    beginnerDescription:
      "劣性として計算します。多因子とする考え方もあり、確率は参考値です。",
  }),
  recessiveLocus({
    id: "patternless",
    nameJa: "パターンレス",
    nameEn: "Patternless",
    phenotypeOrder: 60,
    confidence: "ESTABLISHED",
    beginnerDescription: "劣性です。両親から1つずつ受け取ると見た目に出ます。",
  }),
  recessiveLocus({
    id: "charcoal",
    nameJa: "チャコール",
    nameEn: "Charcoal",
    phenotypeOrder: 61,
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性として計算します。カラーラインの「チャコール系」とは別に記録します。",
  }),
  allelicSeriesLocus({
    id: "cappuccino",
    nameJa: "カプチーノ / セーブル / ハイウェイ",
    nameEn: "Cappuccino / Sable / Highway",
    phenotypeOrder: 80,
    confidence: "ESTABLISHED",
    notesJa:
      "この3つは同一遺伝子座の別アレルです（Foundation Genetics）。1コピーで見た目に出るため、ヘテロ表示はしません。",
    beginnerDescription:
      "カプチーノ・セーブル・ハイウェイは同じ遺伝子の席を取り合う3つのアレルです。1つ持つだけで見た目に出ます。",
    alleles: [
      {
        id: "Capp",
        nameJa: "カプチーノ",
        nameEn: "Cappuccino",
        singleId: "cappuccino",
        superId: "superCappuccino",
        superNameJa: "スーパーカプチーノ",
        superNameEn: "Super Cappuccino",
        shortNoteJa: "セーブル・ハイウェイと同じ遺伝子座のアレルです",
        superRisk: {
          id: "superCappuccino",
          severity: "danger",
          messageJa:
            "スーパーカプチーノが出る可能性があります。鼻孔縮小などの深刻な健康問題リスクがあり、MorphMarket では販売禁止です。",
        },
      },
      {
        id: "Sable",
        nameJa: "セーブル",
        nameEn: "Sable",
        singleId: "sable",
        superId: "superSable",
        superNameJa: "スーパーセーブル",
        superNameEn: "Super Sable",
        shortNoteJa: "カプチーノ・ハイウェイと同じ遺伝子座のアレルです",
        superRisk: {
          id: "superSable",
          severity: "caution",
          messageJa:
            "スーパーセーブルが出る可能性があります。他のスーパー型より健康問題は少ないとされますが、報告例はあります。",
        },
      },
      {
        id: "Highway",
        nameJa: "ハイウェイ",
        nameEn: "Highway",
        singleId: "highway",
        superId: "superHighway",
        superNameJa: "スーパーハイウェイ",
        superNameEn: "Super Highway",
        shortNoteJa: "カプチーノ・セーブルと同じ遺伝子座のアレルです",
        superRisk: {
          id: "superHighway",
          severity: "danger",
          messageJa:
            "スーパーハイウェイが出る可能性があります。スーパーカプチーノと同様の鼻孔縮小リスクがあります。",
        },
      },
    ],
    compounds: [
      {
        id: "luwak",
        pair: ["Capp", "Sable"],
        nameJa: "ルアク",
        nameEn: "Luwak",
        risk: {
          id: "luwak",
          severity: "danger",
          messageJa:
            "ルアク（カプチーノ＋セーブル）が出る可能性があります。鼻孔縮小などの健康問題リスクがあります。",
        },
      },
      {
        id: "cappHighway",
        pair: ["Capp", "Highway"],
        nameJa: "カプチーノ / ハイウェイ",
        nameEn: "Capp/Highway",
        risk: {
          id: "cappHighway",
          severity: "danger",
          messageJa:
            "カプチーノ／ハイウェイのアレリックスーパーが出る可能性があります。健康問題リスクが疑われます。",
        },
      },
      {
        id: "sableHighway",
        pair: ["Sable", "Highway"],
        nameJa: "セーブル / ハイウェイ",
        nameEn: "Sable/Highway",
      },
    ],
  }),
  incompleteDominantLocus({
    id: "lillyWhite",
    nameJa: "リリーホワイト",
    nameEn: "Lilly White",
    alleleSymbol: "LW",
    visualNameJa: "リリーホワイト",
    visualNameEn: "Lilly White",
    superNameJa: "スーパーリリーホワイト",
    superNameEn: "Super Lilly White",
    phenotypeOrder: 90,
    confidence: "CONFIRMED",
    notesJa: "不完全優性。1コピーでリリーホワイト、2コピーでスーパーです。",
    beginnerDescription:
      "1つでも見た目に出る不完全優性です。2つ揃うとスーパーリリーホワイトになります。",
    superRisk: {
      id: "superLillyWhite",
      severity: "caution",
      messageJa:
        "スーパーリリーホワイトが出る可能性があります。孵化不全・早期死亡のリスクが報告されています。",
    },
  }),
];

export const LOCUS_BY_ID: Readonly<Record<string, LocusDefinition>> =
  Object.fromEntries(LOCI.map((locus) => [locus.id, locus]));

const GENOTYPE_INDEX: Readonly<
  Record<string, Readonly<Record<string, LocusGenotypeDefinition>>>
> = Object.fromEntries(
  LOCI.map((locus) => [
    locus.id,
    Object.fromEntries(locus.genotypes.map((row) => [row.id, row])),
  ]),
);

const STATE_INDEX: Readonly<
  Record<string, Readonly<Record<string, LocusStateDefinition>>>
> = Object.fromEntries(
  LOCI.map((locus) => [
    locus.id,
    Object.fromEntries(locus.states.map((row) => [row.id, row])),
  ]),
);

/**
 * Community names for genotype combinations. The natural "・" join already
 * reproduces the reference names for combos such as セーブル・リリーホワイト,
 * so only genuinely renamed combos live here.
 */
export const COMBO_NAMES: readonly ComboNameRule[] = [
  {
    id: "frappuccino",
    match: { cappuccino: "cappuccino", lillyWhite: "het" },
    nameJa: "フラペチーノ",
  },
];

export function getLocus(id: string): LocusDefinition | undefined {
  return LOCUS_BY_ID[id];
}

export function listLoci(): readonly LocusDefinition[] {
  return LOCI;
}

export function getLocusGenotype(
  locusId: string,
  genotypeId: string,
): LocusGenotypeDefinition | undefined {
  return GENOTYPE_INDEX[locusId]?.[genotypeId];
}

export function getLocusState(
  locusId: string,
  stateId: string,
): LocusStateDefinition | undefined {
  return STATE_INDEX[locusId]?.[stateId];
}

export function wildGenotype(locus: LocusDefinition): LocusGenotypeDefinition {
  return locus.genotypes.find((row) => row.wild) ?? locus.genotypes[0];
}

/** States offered in UI selects, in catalog order. */
export function selectableStates(
  locus: LocusDefinition,
): readonly LocusStateDefinition[] {
  return locus.states.filter((state) => !state.hidden);
}

export {
  POLYGENIC_TRAITS,
  TRAIT_CATEGORY_LABEL,
  VISUAL_TRAITS,
  VISUAL_TRAIT_BY_ID,
  getVisualTrait,
  listVisualTraitsByCategory,
  visualTraitName,
} from "./visual-traits";
export type { VisualTraitCategory, VisualTraitDefinition } from "./visual-traits";
