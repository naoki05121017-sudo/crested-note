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
}: {
  animals: PhotoAlbumItem[];
  latestWeights?: Record<string, { weightG: number } | null | undefined>;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3">
      {animals.map((animal) => {
        const latest = latestWeights?.[animal.id];
        return (
          <li key={animal.id}>
            <Link href={`/animals/${animal.id}`} className="block">
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
              <p className="mt-1.5 truncate text-xs font-medium leading-4 text-ink sm:text-sm">
                {animal.name}
              </p>
              {latest ? (
                <p className="text-[11px] tabular-nums leading-4 text-ink/50">{latest.weightG}g</p>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
