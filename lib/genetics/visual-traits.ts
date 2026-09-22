import type { TraitConfidence } from "./types";

export type VisualTraitCategory = "reference" | "pattern" | "feature";

export type VisualTraitDefinition = {
  id: string;
  nameJa: string;
  nameEn: string;
  category: VisualTraitCategory;
  confidence: TraitConfidence;
  beginnerDescription: string;
  expertDescription?: string;
  graded?: boolean;
  gradeLabels?: readonly string[];
  /** Short picker/list badge, e.g. モルフ */
  badge?: string;
  /** One-line note shown in the calculator row (details stay on ?). */
  shortNote?: string;
};

export const TRAIT_CATEGORY_LABEL: Record<VisualTraitCategory, string> = {
  reference: "参考計算・研究中",
  pattern: "見た目・ライン",
  feature: "特徴",
};

/**
 * Polygenic and line traits only. Anything with a known inheritance mode lives
 * in the locus catalog instead, so nothing here reaches the Punnett maths.
 */
export const VISUAL_TRAITS: readonly VisualTraitDefinition[] = [
  {
    id: "pied",
    nameJa: "ピエド",
    nameEn: "Pied",
    category: "reference",
    confidence: "UNCERTAIN",
    beginnerDescription: "出現が少なく、遺伝形式は研究中の参考項目です。",
  },
  {
    id: "hypo",
    nameJa: "ハイポ",
    nameEn: "Hypo",
    category: "reference",
    confidence: "POLYGENIC",
    beginnerDescription: "色素が薄く見える傾向です。単一遺伝子としては計算しません。",
  },
  {
    id: "pinstripe",
    nameJa: "ピンストライプ",
    nameEn: "Pinstripe",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "背中のラインです。いくつもの遺伝が関係します。",
    graded: true,
    gradeLabels: ["少ない", "ふつう", "フルピンストライプ"],
  },
  {
    id: "dalmatian",
    nameJa: "ダルメシアン",
    nameEn: "Dalmatian",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "斑点の量です。いくつもの遺伝が関係します。",
    graded: true,
    gradeLabels: ["少ない", "ふつう", "多い", "スーパーダルメシアン"],
  },
  {
    id: "flame",
    nameJa: "フレイム",
    nameEn: "Flame",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "背中の炎状の模様です。",
    graded: true,
    gradeLabels: ["少ない", "ふつう", "多い"],
  },
  {
    id: "harlequin",
    nameJa: "ハーレクイン",
    nameEn: "Harlequin",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "体側の模様の入り方です。",
    graded: true,
    gradeLabels: ["少ない", "ふつう", "多い"],
  },
  {
    id: "tiger",
    nameJa: "タイガー / バンデッド",
    nameEn: "Tiger / Banded",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "横しま・バンド状の模様です。",
  },
  {
    id: "brindle",
    nameJa: "ブリンドル",
    nameEn: "Brindle",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "細かい乱れ模様です。",
  },
  {
    id: "tricolor",
    nameJa: "トライカラー",
    nameEn: "Tricolor",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "3色が乗る見た目の呼び方です。",
  },
  {
    id: "bicolor",
    nameJa: "バイカラー",
    nameEn: "Bicolor",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "2色が乗る見た目の呼び方です。",
  },
  {
    id: "quadstripe",
    nameJa: "クアッドストライプ",
    nameEn: "Quadstripe",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "ラインが4本に見える系統の呼び方です。",
  },
  {
    id: "drippy",
    nameJa: "ドリッピー",
    nameEn: "Drippy",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "模様が垂れたように見える系統です。",
  },
  {
    id: "patternAmount",
    nameJa: "パターン量",
    nameEn: "Pattern amount",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "模様全体の多さです。",
    graded: true,
    gradeLabels: ["少ない", "ふつう", "多い"],
  },
  {
    id: "snowflake",
    nameJa: "スノーフレーク",
    nameEn: "Snowflake",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "白い細かい斑点の呼び方です。",
  },
  {
    id: "whitePattern",
    nameJa: "ホワイトパターン",
    nameEn: "White pattern",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "白い模様の入り方です。",
  },
  {
    id: "fire",
    nameJa: "ファイア",
    nameEn: "Fire",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "赤〜オレンジが強いフレイム系の呼び方です。",
  },
  {
    id: "redLine",
    nameJa: "レッド系",
    nameEn: "Red line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "赤みの強いカラーラインです。",
  },
  {
    id: "orangeLine",
    nameJa: "オレンジ系",
    nameEn: "Orange line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "オレンジみのカラーラインです。",
  },
  {
    id: "tangerine",
    nameJa: "タンジェリン",
    nameEn: "Tangerine",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "オレンジ〜赤のカラーラインです。",
  },
  {
    id: "yellowLine",
    nameJa: "イエロー系",
    nameEn: "Yellow line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "黄みのカラーラインです。",
  },
  {
    id: "creamLine",
    nameJa: "クリーム系",
    nameEn: "Cream line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "クリーム寄りのカラーラインです。",
  },
  {
    id: "blackLine",
    nameJa: "ブラック系",
    nameEn: "Black line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "黒みの強いカラーラインです。",
  },
  {
    id: "whiteLine",
    nameJa: "ホワイト系",
    nameEn: "White line",
    category: "pattern",
    confidence: "POLYGENIC",
    beginnerDescription: "白みの強いカラーラインです。",
  },
  {
    id: "whiteWall",
    nameJa: "ホワイトウォール",
    nameEn: "White Wall",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "体側の白い帯です。",
  },
  {
    id: "softScale",
    nameJa: "ソフトスケール",
    nameEn: "Soft Scale",
    category: "feature",
    confidence: "UNCERTAIN",
    beginnerDescription:
      "鱗が柔らかく見える特徴です。遺伝形式が確定していないため計算しません。",
  },
  {
    id: "porthole",
    nameJa: "ポートホール",
    nameEn: "Porthole",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "体側の白い円い模様です。",
  },
  {
    id: "creamOnCream",
    nameJa: "クリームオンクリーム",
    nameEn: "Cream on cream",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "クリームの地にクリームの模様が乗る呼び方です。",
  },
  {
    id: "chevron",
    nameJa: "シェブロン",
    nameEn: "Chevron",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "背中の山型模様です。",
  },
  {
    id: "darkBase",
    nameJa: "ダークベース",
    nameEn: "Dark base",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "地色が暗い個体の呼び方です。",
  },
  {
    id: "reversePinstripe",
    nameJa: "リバースピンストライプ",
    nameEn: "Reverse pinstripe",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "ピンストライプが内側に入る呼び方です。",
  },
  {
    id: "moonlight",
    nameJa: "ムーンライト",
    nameEn: "Moonlight",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "淡い光沢のあるカラーラインです。",
  },
  {
    id: "lavender",
    nameJa: "ラベンダー",
    nameEn: "Lavender",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "紫みのあるカラーラインです。",
  },
  {
    id: "phantomPinstripe",
    nameJa: "ファントムピンストライプ",
    nameEn: "Phantom pinstripe",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription:
      "ピンストライプの鱗に色が乗らない見た目です。劣性のファントムとは別物です。",
  },
  {
    id: "marbling",
    nameJa: "マーブリング",
    nameEn: "Marbling",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "大理石のように混ざる模様の呼び方です。",
  },
  {
    id: "whiteColor",
    nameJa: "ホワイトカラー",
    nameEn: "White color",
    category: "feature",
    confidence: "POLYGENIC",
    beginnerDescription: "白い発色が目立つ特徴です。",
  },
] as const;

export const POLYGENIC_TRAITS = VISUAL_TRAITS;

export const VISUAL_TRAIT_BY_ID: Readonly<
  Record<string, VisualTraitDefinition>
> = Object.fromEntries(VISUAL_TRAITS.map((trait) => [trait.id, trait]));

export function getVisualTrait(id: string): VisualTraitDefinition | undefined {
  return VISUAL_TRAIT_BY_ID[id];
}

export function visualTraitName(id: string, level?: number): string {
  const trait = getVisualTrait(id);
  if (!trait) return id;
  if (
    trait.graded &&
    trait.gradeLabels &&
    level != null &&
    level >= 1 &&
    level <= trait.gradeLabels.length
  ) {
    return `${trait.nameJa}（${trait.gradeLabels[level - 1]}）`;
  }
  return trait.nameJa;
}

export function listVisualTraitsByCategory(category: VisualTraitCategory) {
  return VISUAL_TRAITS.filter((trait) => trait.category === category);
}
