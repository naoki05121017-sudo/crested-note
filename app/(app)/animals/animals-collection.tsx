"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import {
  ANIMALS_VIEW_KEY,
  parseHomeAnimalView,
  type HomeAnimalView,
} from "@/lib/ui/home-animal-view";
import type { Animal } from "@/lib/db/types";

function morphText(animal: Animal) {
  return animal.morphLabel.trim() || formatGenotypeLabel(animal.genotype) || "モルフ未設定";
}

function AnimalListRow({
  animal,
  latest,
}: {
  animal: Animal;
  latest: { weightG: number } | undefined;
}) {
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="flex min-h-[4.75rem] min-w-0 items-center gap-3.5 py-2.5"
    >
      <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[1.1rem] bg-[#efeaf0]">
        {animal.photoUrl ? (
          <AnimalPhoto src={animal.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.05rem] font-semibold tracking-tight text-white">{animal.name}</p>
        <p className="mt-0.5 truncate text-[13px] text-white/45">
          {SEX_LABEL[animal.sex]}
          {" / "}
          {morphText(animal)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {latest ? (
          <p className="text-lg font-semibold tabular-nums leading-none nc-tone-mint">{latest.weightG}g</p>
        ) : (
          <p className="text-xs text-white/35">体重未記録</p>
        )}
      </div>
    </Link>
  );
}

function AnimalCard({
  animal,
  latest,
}: {
  animal: Animal;
  latest: { weightG: number } | undefined;
}) {
  return (
    <Link href={`/animals/${animal.id}`} className="nc-panel block overflow-hidden text-ink active:scale-[0.99]">
      <div className="aspect-[4/5] bg-[#efeaf0] sm:aspect-[4/3]">
        {animal.photoUrl ? (
          <AnimalPhoto src={animal.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="p-4">
        <p className="truncate text-lg font-semibold tracking-tight">{animal.name}</p>
        <p className="mt-1 truncate text-sm text-ink/60">
          {SEX_LABEL[animal.sex]}
          {" / "}
          {morphText(animal)}
        </p>
        {latest ? (
          <p className="mt-3 text-2xl font-semibold tabular-nums nc-num-mint">{latest.weightG}g</p>
        ) : (
          <p className="mt-3 text-sm text-muted">体重未記録</p>
        )}
      </div>
    </Link>
  );
}

export function AnimalsCollection({
  animals,
  latestById,
}: {
  animals: Animal[];
  latestById: Record<string, { weightG: number } | undefined>;
}) {
  const [view, setView] = useState<HomeAnimalView>("list");

  useEffect(() => {
    try {
      setView(parseHomeAnimalView(window.localStorage.getItem(ANIMALS_VIEW_KEY)));
    } catch {
      setView("list");
    }
  }, []);

  function choose(next: HomeAnimalView) {
    setView(next);
    try {
      window.localStorage.setItem(ANIMALS_VIEW_KEY, next);
    } catch {
      /* private mode */
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex justify-end">
        <div
          className="flex rounded-full border border-white/10 p-0.5"
          role="group"
          aria-label="個体一覧の表示"
        >
          <button
            type="button"
            aria-pressed={view === "card"}
            onClick={() => choose("card")}
            className={`inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] ${
              view === "card" ? "bg-[#f4d5e2] text-[#17141c]" : "text-white/45"
            }`}
          >
            カード
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => choose("list")}
            className={`inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] ${
              view === "list" ? "bg-[#f4d5e2] text-[#17141c]" : "text-white/45"
            }`}
          >
            リスト
          </button>
        </div>
      </div>
      {view === "card" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => (
            <li key={animal.id}>
              <AnimalCard animal={animal} latest={latestById[animal.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-white/8">
          {animals.map((animal) => (
            <li key={animal.id}>
              <AnimalListRow animal={animal} latest={latestById[animal.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
