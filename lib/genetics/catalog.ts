import type { ComboWarningRule, LocusDefinition } from "./types";

/**
 * Mendelian loci used in v1. Append a row here to add a morph;
 * pairing math does not need other code changes.
 */
export const LOCI: readonly LocusDefinition[] = [
  {
    id: "lillyWhite",
    nameJa: "リリーホワイト",
    nameEn: "Lilly White",
    inheritance: "incomplete_dominant",
    visualNameJa: "リリーホワイト",
    superNameJa: "スーパーリリーホワイト",
    notesJa: "不完全優性。2コピーはスーパーリリーホワイト。",
    confidence: "CONFIRMED",
    beginnerDescription:
      "1つでも見た目に出る不完全優性です。2つ揃うとスーパーリリーホワイトになります。",
  },
  {
    id: "phantom",
    nameJa: "ファントム",
    nameEn: "Phantom",
    inheritance: "recessive",
    visualNameJa: "ファントム",
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性です。両親から1つずつ受け取ると見た目に出ます。1つだけなら隠れて持ちます。",
  },
  {
    id: "patternless",
    nameJa: "パターンレス",
    nameEn: "Patternless",
    inheritance: "recessive",
    visualNameJa: "パターンレス",
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性です。両親から1つずつ受け取ると見た目に出ます。",
  },
  {
    id: "cappuccino",
    nameJa: "カプチーノ",
    nameEn: "Cappuccino",
    inheritance: "incomplete_dominant",
    visualNameJa: "カプチーノ",
    superNameJa: "スーパーカプチーノ",
    notesJa: "セーブル・ハイウェイと同一座位のアレルです。1コピーで見た目に出ます。",
    confidence: "ESTABLISHED",
    alleleGroup: "cappuccino",
    beginnerDescription:
      "セーブル・ハイウェイと同じ遺伝子の場所にある不完全優性です。1つでカプチーノ、2つでスーパーカプチーノ（ルアクとは別）になります。",
  },
  {
    id: "axanthicTug",
    nameJa: "アザンティック (TUG)",
    nameEn: "Axanthic (TUG)",
    inheritance: "recessive",
    visualNameJa: "アザンティック (TUG)",
    notesJa: "アザンティックは系統ごとに別locusとして扱います。",
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性です。TUG・Melanistic・ARV・Lavaは別の遺伝子として計算します。",
  },
  {
    id: "axanthicMelanistic",
    nameJa: "アザンティック (Melanistic)",
    nameEn: "Axanthic (Melanistic)",
    inheritance: "recessive",
    visualNameJa: "アザンティック (Melanistic)",
    confidence: "ESTABLISHED",
    beginnerDescription: "アザンティックの Melanistic 系統。TUG などとは別遺伝子です。",
  },
  {
    id: "axanthicArv",
    nameJa: "アザンティック (ARV)",
    nameEn: "Axanthic (ARV)",
    inheritance: "recessive",
    visualNameJa: "アザンティック (ARV)",
    confidence: "ESTABLISHED",
    beginnerDescription: "アザンティックの ARV 系統。他系統とは別遺伝子です。",
  },
  {
    id: "axanthicLava",
    nameJa: "アザンティック (Lava)",
    nameEn: "Axanthic (Lava)",
    inheritance: "recessive",
    visualNameJa: "アザンティック (Lava)",
    confidence: "ESTABLISHED",
    beginnerDescription: "アザンティックの Lava 系統。他系統とは別遺伝子です。",
  },
  {
    id: "charcoal",
    nameJa: "チャコール",
    nameEn: "Charcoal",
    inheritance: "recessive",
    visualNameJa: "チャコール",
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性として計算します。カラーラインの「チャコール系」とは別に記録します。",
  },
  {
    id: "chocho",
    nameJa: "チョチョ",
    nameEn: "Chocho",
    inheritance: "recessive",
    visualNameJa: "チョチョ",
    confidence: "ESTABLISHED",
    beginnerDescription:
      "劣性です。両親から1つずつ受け取ると見た目に出ます。1つだけなら隠れて持ちます。",
  },
  {
    id: "albino",
    nameJa: "アルビノ",
    nameEn: "Albino",
    inheritance: "recessive",
    visualNameJa: "アルビノ",
    confidence: "UNCERTAIN",
    notesJa: "研究中。確率は参考値です。",
    beginnerDescription:
      "劣性として参考計算します。クレステッドゲッコーでの遺伝機序は研究中です。",
  },
  {
    id: "emptyBack",
    nameJa: "エンプティバック",
    nameEn: "Empty Back",
    inheritance: "incomplete_dominant",
    visualNameJa: "エンプティバック",
    superNameJa: "スーパーエンプティバック",
    confidence: "PARTIALLY_ESTABLISHED",
    beginnerDescription:
      "不完全優性です。1つでエンプティバック、2つでスーパーエンプティバックです。",
  },
  {
    id: "redBase",
    nameJa: "レッドベース",
    nameEn: "Red Base",
    inheritance: "recessive",
    visualNameJa: "レッドベース",
    confidence: "UNCERTAIN",
    notesJa: "研究中。確率は参考値です。",
    beginnerDescription:
      "劣性として参考計算します。遺伝機序は研究中です。",
  },
  {
    id: "superStripe",
    nameJa: "スーパーストライプ",
    nameEn: "Super Stripe",
    inheritance: "recessive",
    visualNameJa: "スーパーストライプ",
    confidence: "UNCERTAIN",
    notesJa: "研究中。確率は参考値です。",
    beginnerDescription:
      "劣性として参考計算します。遺伝機序は研究中です。",
  },
] as const;

export const LOCUS_BY_ID: Readonly<Record<string, LocusDefinition>> =
  Object.fromEntries(LOCI.map((locus) => [locus.id, locus]));

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

export const COMBO_WARNINGS: readonly ComboWarningRule[] = [
  {
    id: "superCappuccino",
    severity: "danger",
    messageJa:
      "健康リスクの可能性があります。この組み合わせは注意が必要です。スーパーカプチーノやルアクなどが出る可能性があります。",
    match: (copies) => copies.cappuccino === 2,
  },
  {
    id: "lillyWhiteCappuccino",
    severity: "danger",
    messageJa:
      "健康リスクの可能性があります。この組み合わせは注意が必要です。リリーホワイトとカプチーノ座位が重なる組み合わせ（ソラクなど）が出る可能性があります。",
    match: (copies) =>
      (copies.lillyWhite ?? 0) >= 1 && copies.cappuccino === 2,
  },
  {
    id: "superLillyWhite",
    severity: "caution",
    messageJa:
      "スーパーリリーホワイトが出る可能性があります。個体差は大きいですが、サイズや活力に注意が必要とされることがあります。",
    match: (copies) => copies.lillyWhite === 2,
  },
];

export function getLocus(id: string): LocusDefinition | undefined {
  return LOCUS_BY_ID[id];
}

export function listLoci(): readonly LocusDefinition[] {
  return LOCI;
}
