import {
  formatCopiesAsGenotype,
  formatProbability,
  type PairingResult,
} from "@/lib/genetics";
import { Notice, SectionTitle } from "@/app/components/ui";

const tints = [
  "bg-[#fde8ef]",
  "bg-[#e7f3fb]",
  "bg-[#eef6f1]",
  "bg-[#f3eef8]",
];

export function PairingResults({ result }: { result: PairingResult }) {
  const activeLoci = result.loci.filter((locus) => {
    const onlyWild =
      locus.outcomes.length === 1 && locus.outcomes[0]?.copies === 0;
    return !onlyWild;
  });

  return (
    <div className="flex flex-col gap-6">
      {result.warnings.length > 0 ? (
        <div className="flex flex-col gap-2">
          {result.warnings.map((warning) => (
            <Notice
              key={warning.id}
              tone={warning.severity === "danger" ? "danger" : "warn"}
            >
              <span className="text-lg font-semibold tabular-nums">
                {formatProbability(warning.probability)}
              </span>
              {warning.severity === "danger" ? " ⚠️ " : " — "}
              {warning.messageJa}
            </Notice>
          ))}
        </div>
      ) : null}

      <div>
        <SectionTitle hint="確率の高い順">予想される子</SectionTitle>
        <ul className="grid gap-3">
          {result.outcomes.map((outcome, index) => (
            <li
              key={outcome.phenotype}
              className={`rounded-[1.75rem] px-5 py-5 ${tints[index % tints.length]}`}
            >
              <p className="text-base font-medium leading-6 sm:text-lg">
                {outcome.phenotype}
              </p>
              <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
                {formatProbability(outcome.probability)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-ink/75"
                  style={{
                    width: `${Math.min(100, Math.max(0, outcome.probability * 100))}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <details className="rounded-[1.75rem] border border-line bg-white p-5 shadow-[0_10px_28px_rgba(23,20,28,0.05)] sm:p-6">
        <summary className="cursor-pointer text-lg font-semibold tracking-tight">
          詳しい遺伝情報
          <span className="ml-2 text-sm font-normal text-muted">詳細を見る</span>
        </summary>
        <div className="mt-5 flex flex-col gap-6">
          <ul className="grid gap-3">
            {result.outcomes.map((outcome) => (
              <li
                key={outcome.phenotype}
                className="rounded-[1.35rem] border border-line bg-[#fbfafc] px-4 py-4"
              >
                <p className="font-medium">{outcome.phenotype}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {formatCopiesAsGenotype(
                    outcome.copies,
                    result.cappuccinoMorph,
                    outcome.csh,
                  )}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatProbability(outcome.probability)}
                </p>
              </li>
            ))}
          </ul>

          {activeLoci.length > 0 ? (
            <div>
              <SectionTitle>遺伝形質ごとの内訳</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {activeLoci.map((locus) => (
                  <div
                    key={locus.locusId}
                    className="rounded-[1.5rem] border border-line bg-[#f7f4f2] p-4 text-sm"
                  >
                    <h3 className="mb-3 font-medium">{locus.nameJa}</h3>
                    <ul className="flex flex-col gap-2">
                      {locus.outcomes.map((outcome) => (
                        <li
                          key={outcome.diplotype ?? `${outcome.copies}-${outcome.label}`}
                          className="flex justify-between gap-4"
                        >
                          <span>{outcome.label}</span>
                          <span className="font-semibold tabular-nums">
                            {formatProbability(outcome.probability)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
