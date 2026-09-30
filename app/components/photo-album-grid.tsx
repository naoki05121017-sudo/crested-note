import Link from "next/link";
import { AnimalPhoto } from "@/app/components/animal-photo";

export type PhotoAlbumItem = {
  id: string;
  name: string;
  photoUrl: string;
};

export function PhotoAlbumGrid({
  animals,
  latestWeights,
  tone = "ink",
}: {
  animals: PhotoAlbumItem[];
  latestWeights?: Record<string, { weightG: number } | null | undefined>;
  tone?: "ink" | "light";
}) {
  const nameClass = tone === "light" ? "text-white/70" : "text-ink";
  const weightClass = tone === "light" ? "text-white/35" : "text-ink/50";
  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3">
      {animals.map((animal) => {
        const latest = latestWeights?.[animal.id];
        return (
          <li key={animal.id}>
            <Link href={`/animals/${animal.id}`} className="block active:opacity-80">
              <div className="aspect-square overflow-hidden rounded-2xl bg-[#f6f3f8]">
                {animal.photoUrl ? (
                  <AnimalPhoto
                    src={animal.photoUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <p className={`mt-1.5 truncate text-xs font-medium leading-4 sm:text-sm ${nameClass}`}>
                {animal.name}
              </p>
              {latest ? (
                <p className={`text-[11px] tabular-nums leading-4 ${weightClass}`}>{latest.weightG}g</p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
