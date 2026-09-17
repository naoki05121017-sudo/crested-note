export function formatProbability(probability: number): string {
  if (probability >= 1 - 1e-9) return "100%";
  if (probability <= 0) return "0%";
  const percent = probability * 100;
  if (percent < 0.01) return "<0.01%";
  if (percent >= 10) return `${percent.toFixed(1)}%`;
  return `${percent.toFixed(2)}%`;
}

export function geneStatusLabelJa(
  status: string,
  inheritance: "recessive" | "incomplete_dominant",
  nameJa?: string,
): string {
  const morphName = displayMorphName(nameJa);

  switch (status) {
    case "wild":
      return "なし";
    case "het":
      if (inheritance === "incomplete_dominant") {
        return `${morphName || "リリーホワイト"}（見た目に出る）`;
      }
      return "ヘテロ（隠れて持つ）";
    case "visual":
      if (inheritance === "incomplete_dominant") {
        return "スーパーリリー ⚠️";
      }
      return morphName ? `${morphName}（見た目に出る）` : "見た目に出る";
    case "possible_50":
      return "50%ヘテロ";
    case "possible_66":
      return "66%ヘテロ";
    case "unknown":
      return "不明（なし扱い）";
    default:
      return status;
  }
}

function displayMorphName(nameJa?: string): string {
  if (!nameJa) return "";
  if (nameJa.startsWith("アザンティック")) return "アザンティック";
  return nameJa;
}
