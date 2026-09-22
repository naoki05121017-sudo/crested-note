/**
 * Named combos from https://crested-gecko-calc.pages.dev/ (comboKey map `z`).
 * Keys are sorted visual-token ids joined with "+".
 */
export const VISUAL_TOKEN_JA: Record<string, string> = {
  lw: "リリーホワイト",
  superLw: "スーパーリリーホワイト",
  capp: "カプチーノ",
  sable: "セーブル",
  highway: "ハイウェイ",
  superCapp: "スーパーカプチーノ",
  superSable: "スーパーセーブル",
  superHighway: "スーパーハイウェイ",
  luwak: "ルアク",
  cappHighway: "カプチーノ/ハイウェイ",
  sableHighway: "セーブル/ハイウェイ",
  axanthic: "アザンティック",
  axanthicTug: "アザンティック (TUG)",
  axanthicMelanistic: "アザンティック (Melanistic)",
  axanthicArv: "アザンティック (ARV)",
  axanthicLava: "アザンティック (Lava)",
  phantom: "ファントム",
  albino: "アルビノ",
  chocho: "チョチョ",
  red: "レッドベース",
  emptyBack: "エンプティバック",
  superEB: "スーパーエンプティバック",
  superStripe: "スーパーストライプ",
  patternless: "パターンレス",
  charcoal: "チャコール",
};

export const HET_TOKEN_JA: Record<string, string> = {
  axanthic: "ヘテロ アザンティック",
  axanthicTug: "ヘテロ アザンティック (TUG)",
  axanthicMelanistic: "ヘテロ アザンティック (Melanistic)",
  axanthicArv: "ヘテロ アザンティック (ARV)",
  axanthicLava: "ヘテロ アザンティック (Lava)",
  phantom: "ヘテロ ファントム",
  albino: "ヘテロ アルビノ",
  chocho: "ヘテロ チョチョ",
  red: "ヘテロ レッドベース",
  superStripe: "ヘテロ スーパーストライプ",
  patternless: "ヘテロ パターンレス",
  charcoal: "ヘテロ チャコール",
};

export const NAMED_COMBOS_JA: Record<string, string> = {
  "capp+lw": "フラペチーノ",
  "lw+sable": "リリーセーブル",
  "highway+lw": "ハイウェイ・リリーホワイト",
  "lw+phantom": "ファントム・リリーホワイト",
  "axanthic+lw": "アザンティック・リリーホワイト",
  "axanthic+phantom": "アザンティック・ファントム",
  "axanthic+capp": "アザンティック・カプチーノ",
  "axanthic+sable": "アザンティック・セーブル",
  "axanthic+highway": "アザンティック・ハイウェイ",
  "capp+phantom": "ファントム・カプチーノ",
  "phantom+sable": "ファントム・セーブル",
  "highway+phantom": "ファントム・ハイウェイ",
  "albino+lw": "アルビノ・リリーホワイト",
  "albino+axanthic": "アルビノ・アザンティック",
  "albino+phantom": "アルビノ・ファントム",
  "albino+capp": "アルビノ・カプチーノ",
  "chocho+lw": "チョチョ・リリーホワイト",
  "axanthic+chocho": "チョチョ・アザンティック",
  "chocho+phantom": "チョチョ・ファントム",
  "capp+chocho": "チョチョ・カプチーノ",
  "capp+lw+phantom": "ファントム・フラペチーノ",
  "axanthic+capp+lw": "フラペチーノ・アザンティック",
  "axanthic+lw+phantom": "アザンティック・ファントム・LW",
  "axanthic+capp+phantom": "アザンティック・ファントム・カプチーノ",
  "lw+phantom+sable": "ファントム・セーブル・LW",
  "highway+lw+phantom": "ファントム・ハイウェイ・LW",
  "axanthic+lw+sable": "アザンティック・セーブル・LW",
  "axanthic+highway+lw": "アザンティック・ハイウェイ・LW",
  "albino+lw+phantom": "アルビノ・ファントム・LW",
  "albino+axanthic+lw": "アルビノ・アザンティック・LW",
  "chocho+lw+phantom": "チョチョ・ファントム・LW",
  "axanthic+chocho+lw": "チョチョ・アザンティック・LW",
  "axanthic+capp+lw+phantom": "アザンティック・ファントム・フラペチーノ",
  "albino+axanthic+phantom": "アルビノ・アザンティック・ファントム",
  "lw+superCapp": "ソラク",
  "emptyBack+lw": "エンプティバック・リリーホワイト",
  "emptyBack+phantom": "エンプティバック・ファントム",
  "axanthic+emptyBack": "エンプティバック・アザンティック",
  "emptyBack+lw+phantom": "エンプティバック・ファントム・LW",
  "lw+superEB": "スーパーエンプティバック・リリーホワイト",
  "lw+superStripe": "スーパーストライプ・リリーホワイト",
  "phantom+superStripe": "スーパーストライプ・ファントム",
  "axanthic+superStripe": "スーパーストライプ・アザンティック",
  "lw+phantom+superStripe": "スーパーストライプ・ファントム・LW",
};

export function comboKeyFor(visualKeys: string[]): string {
  return [...visualKeys].sort().join("+");
}

export function phenotypeFromKeys(visualKeys: string[], hetKeys: string[]): string {
  const comboKey = comboKeyFor(visualKeys);
  const visualName =
    visualKeys.length === 0
      ? "ノーマル"
      : (NAMED_COMBOS_JA[comboKey] ??
        visualKeys.map((key) => VISUAL_TOKEN_JA[key] ?? key).join(" / "));
  if (hetKeys.length === 0) {
    return visualKeys.length === 0 ? "ノーマル" : visualName;
  }
  const hetName = hetKeys
    .map((key) => HET_TOKEN_JA[key] ?? `ヘテロ ${key}`)
    .join(" / ");
  if (visualKeys.length === 0) return hetName;
  return `${visualName}（${hetName}）`;
}
