import { LOCI } from "./catalog";
import type { CappuccinoMorphDisplay } from "./allelic-visual";
import type {
  AlleleCopies,
  GeneStatus,
  Genotype,
  LocusDefinition,
  ZygosityKind,
} from "./types";

export function describeCopies(
  locus: LocusDefinition,
  copies: AlleleCopies,
): { kind: ZygosityKind; token: string | null } {
  if (copies === 0) {
    return { kind: "wild", token: null };
  }

  if (locus.inheritance === "recessive") {
    if (copies === 1) {
      return { kind: "het", token: `het ${locus.nameJa}` };
    }
    return { kind: "visual", token: locus.visualNameJa };
  }

  if (copies === 1) {
    return { kind: "visual", token: locus.visualNameJa };
  }

  return {
    kind: "super",
    token: locus.superNameJa ?? `スーパー${locus.nameJa}`,
  };
}

export function locusOutcomeLabel(
  locus: LocusDefinition,
  copies: AlleleCopies,
): string {
  const described = describeCopies(locus, copies);
  return described.token ?? "ノーマル";
}

export function combinePhenotype(
  parts: { locus: LocusDefinition; copies: AlleleCopies }[],
  cappuccinoMorph: CappuccinoMorphDisplay = "cappuccino",
): string {
  const copiesById: Record<string, AlleleCopies> = {};
  for (const part of parts) copiesById[part.locus.id] = part.copies;

  const visualTokens: string[] = [];
  const hetTokens: string[] = [];

  for (const part of parts) {
    const described = describeCopies(part.locus, part.copies);
    if ((described.kind === "visual" || described.kind === "super") && described.token) {
      visualTokens.push(described.token);
    }
  }

  for (const part of parts) {
    const described = describeCopies(part.locus, part.copies);
    if (described.kind === "het" && described.token) {
      hetTokens.push(described.token);
    }
  }

  applyNamedCombos(
    { copies: copiesById, morph: cappuccinoMorph, parts },
    visualTokens,
    hetTokens,
  );

  const tokens = [...visualTokens, ...hetTokens];
  return tokens.length > 0 ? tokens.join(" ") : "ノーマル";
}

type ComboContext = {
  copies: Record<string, AlleleCopies>;
  morph: CappuccinoMorphDisplay;
  parts: { locus: LocusDefinition; copies: AlleleCopies }[];
};

/**
 * Display names for already-computed copy combinations.
 * Does not change Punnett math or add loci.
 */
function applyNamedCombos(
  ctx: ComboContext,
  visualTokens: string[],
  hetTokens: string[],
) {
  const cap = ctx.copies.cappuccino ?? 0;
  const lw = ctx.copies.lillyWhite ?? 0;

  if (ctx.morph === "sable" || ctx.morph === "highway") {
    const morphJa = ctx.morph === "sable" ? "セーブル" : "ハイウェイ";
    const capIdx = visualTokens.indexOf("カプチーノ");
    if (capIdx >= 0) visualTokens[capIdx] = morphJa;
    const hetIdx = hetTokens.indexOf("het カプチーノ");
    if (hetIdx >= 0) hetTokens[hetIdx] = `het ${morphJa}`;

    if (ctx.morph === "sable" && cap >= 1 && lw >= 1) {
      replaceTokens(visualTokens, hetTokens, {
        dropVisual: (token) =>
          token.includes("リリーホワイト") || token === "セーブル",
        dropHet: (token) => token === "het セーブル",
        name:
          lw === 2
            ? "リリーセーブル（スーパーリリーホワイト）"
            : "リリーセーブル",
      });
    }
  } else {
    if (cap === 2) {
      const idx = visualTokens.indexOf("カプチーノ");
      if (idx >= 0) visualTokens[idx] = "ルワック（スーパーカプチーノ）";
    }
    if (cap === 2 && lw >= 1) {
      replaceTokens(visualTokens, hetTokens, {
        dropVisual: (token) =>
          token.includes("リリーホワイト") || token.startsWith("ルワック"),
        dropHet: () => false,
        name:
          lw === 2
            ? "フラプチーノ（スーパーリリーホワイト＋ルワック）"
            : "フラプチーノ（リリーホワイト＋ルワック）",
      });
    }
  }

  const axVisual = ctx.parts.find(
    (part) => part.locus.id.startsWith("axanthic") && part.copies === 2,
  );
  if (axVisual && (ctx.copies.phantom ?? 0) === 2) {
    const line =
      axVisual.locus.nameEn.match(/\(([^)]+)\)/)?.[1] ?? axVisual.locus.nameJa;
    replaceTokens(visualTokens, hetTokens, {
      dropVisual: (token) =>
        token === axVisual.locus.visualNameJa || token === "ファントム",
      dropHet: () => false,
      name: `アザンティックファントム（${line}）`,
    });
  }
}

function replaceTokens(
  visualTokens: string[],
  hetTokens: string[],
  rule: {
    dropVisual: (token: string) => boolean;
    dropHet: (token: string) => boolean;
    name: string;
  },
) {
  const nextVisual = visualTokens.filter((token) => !rule.dropVisual(token));
  const nextHet = hetTokens.filter((token) => !rule.dropHet(token));
  nextVisual.unshift(rule.name);
  visualTokens.length = 0;
  visualTokens.push(...nextVisual);
  hetTokens.length = 0;
  hetTokens.push(...nextHet);
}

export function copiesToStatus(copies: AlleleCopies): GeneStatus {
  if (copies === 0) return "wild";
  if (copies === 1) return "het";
  return "visual";
}

export function genotypeFromCopies(
  copies: Record<string, AlleleCopies>,
): Genotype {
  const genotype: Genotype = {};
  for (const [locusId, value] of Object.entries(copies)) {
    const status = copiesToStatus(value);
    if (status !== "wild") genotype[locusId] = status;
  }
  return genotype;
}

export function formatGenotypeLabel(genotype: Genotype): string {
  const tokens: string[] = [];

  for (const locus of LOCI) {
    const status = genotype[locus.id] ?? "wild";
    if (status === "wild" || status === "unknown") continue;

    if (status === "possible_50") {
      tokens.push(`50%ヘテロ ${locus.nameJa}`);
      continue;
    }
    if (status === "possible_66") {
      tokens.push(`66%ヘテロ ${locus.nameJa}`);
      continue;
    }

    const copies: AlleleCopies = status === "visual" ? 2 : 1;
    const described = describeCopies(locus, copies);
    if (described.token) tokens.push(described.token);
  }

  return tokens.length > 0 ? tokens.join(" ") : "ノーマル";
}
