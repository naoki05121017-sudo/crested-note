export function formatProbability(probability: number): string {
  if (probability >= 1 - 1e-9) return "100%";
  if (probability <= 0) return "0%";
  const percent = probability * 100;
  if (percent < 0.01) return "<0.01%";
  if (percent >= 10) return `${percent.toFixed(1)}%`;
  return `${percent.toFixed(2)}%`;
}
