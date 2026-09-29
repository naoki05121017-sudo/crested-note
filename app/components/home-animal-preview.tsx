"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { displayAnimalId } from "@/lib/db/animal-code";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import {
  HOME_ANIMAL_VIEW_KEY,
  parseHomeAnimalView,
  type HomeAnimalView,
} from "@/lib/ui/home-animal-view";
import type { Animal } from "@/lib/db/types";

const SEX_MARK: Record<Animal["sex"], string> = {
  male: "♂",
  female: "♀",
  unknown: "—",
};

function morphText(animal: Animal) {
  return animal.morphLabel.trim() || formatGenotypeLabel(animal.genotype) || "モルフ未設定";
}

function AnimalHomeCard({
  animal,
  latest,
  hero = false,
}: {
  animal: Animal;
  latest: { weightG: number; weighedOn: string } | null;
  hero?: boolean;
}) {
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="nc-lift block overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] text-ink"
    >
      <div
        className={
          hero ? "aspect-[4/5] bg-[#f6f3f8] sm:aspect-[5/4]" : "aspect-[4/5] bg-[#f6f3f8] sm:aspect-[4/3]"
        }
      >
        {animal.photoUrl ? (
          <AnimalPhoto src={animal.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className={hero ? "p-5 sm:p-6" : "p-4 sm:p-5"}>
        <p className={hero ? "text-2xl font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>
          {animal.name}
        </p>
        <p className="mt-1 text-sm text-muted">{displayAnimalId(animal)}</p>
        <p className="mt-1 text-sm text-ink/60">
          {SEX_LABEL[animal.sex]}
          {" / "}
          {morphText(animal)}
        </p>
        <p className={`mt-3 font-semibold tabular-nums ${hero ? "text-[2.1rem] sm:text-5xl" : "text-3xl"}`}>
          {latest ? `${latest.weightG}g` : "体重未記録"}
        </p>
        <p className="mt-1 text-sm text-muted">{latest ? latest.weighedOn : "タップして記録する"}</p>
      </div>
    </Link>
  );
}

function AnimalHomeRow({
  animal,
  latest,
}: {
  animal: Animal;
  latest: { weightG: number; weighedOn: string } | null;
}) {
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="nc-lift flex min-h-16 items-center gap-3 rounded-[1.5rem] bg-gradient-to-br from-[#fff8fb] to-[#eef6fb] px-3 py-2.5 text-ink"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#f6f3f8]">
        {animal.photoUrl ? (
          <AnimalPhoto src={animal.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight">{animal.name}</p>
        <p className="mt-0.5 truncate text-sm text-ink/60">
          {displayAnimalId(animal)}
          {"　"}
          {SEX_MARK[animal.sex]} {morphText(animal)}
          {"　"}
          {latest ? `${latest.weightG}g` : "—"}
        </p>
      </div>
    </Link>
  );
}

export function HomeAnimalPreview({
  animals,
  latestWeights,
}: {
  animals: Animal[];
  latestWeights: Record<string, { weightG: number; weighedOn: string } | null>;
}) {
  const [view, setView] = useState<HomeAnimalView>("card");
  const star = animals[0];
  const rest = animals.slice(1, 6);

  useEffect(() => {
    try {
      setView(parseHomeAnimalView(window.localStorage.getItem(HOME_ANIMAL_VIEW_KEY)));
    } catch {
      setView("card");
    }
  }, []);

  function choose(next: HomeAnimalView) {
    setView(next);
    try {
      window.localStorage.setItem(HOME_ANIMAL_VIEW_KEY, next);
    } catch {
      /* private mode */
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          マイ個体
        </h2>
        <div className="flex items-center gap-2">
          {star ? (
            <div
              className="flex rounded-full border border-white/15 bg-white/8 p-1"
              role="group"
              aria-label="個体一覧の表示"
            >
              <button
                type="button"
                aria-pressed={view === "card"}
                onClick={() => choose("card")}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs tracking-wide ${
                  view === "card" ? "bg-white text-[#17141c]" : "text-white/70"
                }`}
              >
                ▦ カード
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                onClick={() => choose("list")}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs tracking-wide ${
                  view === "list" ? "bg-white text-[#17141c]" : "text-white/70"
                }`}
              >
                ☷ リスト
              </button>
            </div>
          ) : null}
          <Link href="/animals" className="text-sm text-white/50 underline-offset-2 hover:underline">
            すべて見る
          </Link>
        </div>
      </div>
      {!star ? (
        <section className="nc-lift rounded-[2rem] border-transparent bg-gradient-to-br from-[#fff8fb] via-[#f7f2f8] to-[#eef6fb] p-5 text-ink sm:p-6">
          <p className="text-base leading-7 text-muted">
            まだ個体がありません。登録すると、写真・体重・成長を残せます。
          </p>
          <Link href="/animals/new" className="nc-btn mt-4 w-full sm:w-auto">
            個体を登録
          </Link>
        </section>
      ) : view === "list" ? (
        <ul className="flex flex-col gap-2">
          {[star, ...rest].map((animal) => (
            <li key={animal.id}>
              <AnimalHomeRow animal={animal} latest={latestWeights[animal.id]} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-5">
          <AnimalHomeCard animal={star} latest={latestWeights[star.id]} hero />
          {rest.length > 0 && (
            <ul className="grid gap-5 sm:grid-cols-2">
              {rest.map((animal) => (
                <li key={animal.id}>
                  <AnimalHomeCard animal={animal} latest={latestWeights[animal.id]} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
