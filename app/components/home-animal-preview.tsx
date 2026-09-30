import Link from "next/link";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { HomeStarEntrance } from "@/app/components/home-star-entrance";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import type { Animal } from "@/lib/db/types";

function morphText(animal: Animal) {
  return animal.morphLabel.trim() || formatGenotypeLabel(animal.genotype) || "モルフ未設定";
}

function RestRow({
  animal,
  latest,
}: {
  animal: Animal;
  latest: { weightG: number; weighedOn: string } | null;
}) {
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="flex min-h-14 min-w-0 items-center gap-3 py-2.5 active:opacity-70"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[0.95rem] bg-[#efeaf0]">
        {animal.photoUrl ? (
          <AnimalPhoto src={animal.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight text-white">{animal.name}</p>
        <p className="mt-0.5 truncate text-[12px] text-white/40">
          {SEX_LABEL[animal.sex]} / {morphText(animal)}
        </p>
      </div>
      {latest ? (
        <p className="shrink-0 text-base font-semibold tabular-nums nc-tone-mint">{latest.weightG}g</p>
      ) : (
        <p className="shrink-0 text-[11px] text-white/32">体重未記録</p>
      )}
    </Link>
  );
}

export function HomeAnimalPreview({
  animals,
  latestWeights,
}: {
  animals: Animal[];
  latestWeights: Record<string, { weightG: number; weighedOn: string } | null>;
  animalCount?: number;
}) {
  const star = animals[0];
  const rest = animals.slice(1, 4);
  if (!star) {
    return (
      <section className="nc-panel p-5 text-ink sm:p-6">
        <p className="text-base leading-7 text-muted">
          まだ個体がありません。登録すると、写真・体重・成長を残せます。
        </p>
        <Link href="/animals/new" className="nc-btn mt-4 w-full sm:w-auto">
          個体を登録
        </Link>
      </section>
    );
  }

  const latest = latestWeights[star.id];
  const meta = `${SEX_LABEL[star.sex]} / ${morphText(star)}`;

  return (
    <section className="min-w-0">
      <HomeStarEntrance>
      <Link
        href={`/animals/${star.id}`}
        className="block min-w-0 active:opacity-90"
      >
        <div className="nc-hero-photo overflow-hidden rounded-[1.25rem] bg-[#efeaf0]">
          <div className="h-[min(52dvh,28rem)] min-h-[16rem] bg-[#efeaf0]">
            {star.photoUrl ? (
              <AnimalPhoto src={star.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <p className="p-5 text-sm text-ink/40">写真はまだありません</p>
            )}
          </div>
        </div>
        <div className="px-0.5 pt-5">
          <p className="nc-home-enter-name text-[1.65rem] font-semibold leading-tight tracking-tight text-white">
            {star.name}
          </p>
          <p className="mt-1.5 text-sm text-white/45">{meta}</p>
          {latest ? (
            <p className="nc-home-enter-weight mt-3 text-[2.1rem] font-semibold leading-none tracking-tight tabular-nums nc-tone-mint">
              {latest.weightG}g
            </p>
          ) : (
            <p className="nc-home-enter-weight mt-4 text-sm text-white/38">体重未記録</p>
          )}
        </div>
      </Link>
      </HomeStarEntrance>
      {rest.length > 0 ? (
        <ul className="mt-3 divide-y divide-white/8">
          {rest.map((animal) => (
            <li key={animal.id}>
              <RestRow animal={animal} latest={latestWeights[animal.id]} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
