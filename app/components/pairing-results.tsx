import {
  formatCopiesAsGenotype,
  formatProbability,
  type PairingResult,
} from "@/lib/genetics";
import { Notice, SectionTitle } from "@/app/components/ui";

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
        <ul className="divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line bg-surface">
          {result.outcomes.map((outcome) => (
            <li
              key={outcome.phenotype}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <p className="text-base font-medium leading-6 sm:text-lg">
                {outcome.phenotype}
              </p>
              <p className="shrink-0 text-3xl font-semibold tabular-nums sm:text-4xl">
                {formatProbability(outcome.probability)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <details className="rounded-[1.5rem] border border-line bg-surface p-5 sm:p-6">
        <summary className="cursor-pointer text-lg font-semibold tracking-tight">
          詳しい遺伝情報
          <span className="ml-2 text-sm font-normal text-muted">詳細を見る</span>
        </summary>
        <div className="mt-5 flex flex-col gap-6">
          <div className="nc-table-wrap">
            <table className="nc-table min-w-[32rem]">
              <thead>
                <tr>
                  <th>見た目（表現型）</th>
                  <th>遺伝情報（遺伝子型）</th>
                  <th>確率</th>
                </tr>
              </thead>
              <tbody>
                {result.outcomes.map((outcome) => (
                  <tr key={outcome.phenotype}>
                    <td className="font-medium">{outcome.phenotype}</td>
                    <td className="text-muted">
                      {formatCopiesAsGenotype(outcome.copies)}
                    </td>
                    <td className="text-2xl font-semibold tabular-nums">
                      {formatProbability(outcome.probability)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeLoci.length > 0 ? (
            <div>
              <SectionTitle>遺伝形質ごとの内訳</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {activeLoci.map((locus) => (
                  <div
                    key={locus.locusId}
                    className="rounded-[1.5rem] border border-line bg-sand/60 p-4 text-sm"
                  >
                    <h3 className="mb-3 font-medium">{locus.nameJa}</h3>
                    <ul className="flex flex-col gap-2">
                      {locus.outcomes.map((outcome) => (
                        <li
                          key={outcome.copies}
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
