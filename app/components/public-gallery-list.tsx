import Link from "next/link";
import { AnimalPhoto } from "@/app/components/animal-photo";
import type { GalleryCard } from "@/lib/db/public-gallery";
import { SEX_LABEL } from "@/lib/db/labels";

function GalleryCardBody({ card }: { card: GalleryCard }) {
  return (
    <>
      <div className="overflow-hidden rounded-[1.25rem] bg-[#efeaf0]">
        <div className="h-[min(42dvh,22rem)] min-h-[12rem] bg-[#efeaf0]">
          {card.photoUrl ? (
            <AnimalPhoto
              src={card.photoUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </div>
      <div className="px-0.5 pt-4">
        <p className="truncate text-[1.35rem] font-semibold tracking-tight text-white">{card.name}</p>
        <p className="mt-1.5 truncate text-sm text-white/45">
          {SEX_LABEL[card.sex]}
          {card.morphLabel ? ` / ${card.morphLabel}` : ""}
        </p>
        {card.weightG != null ? (
          <p className="mt-3 text-[1.7rem] font-semibold tabular-nums leading-none nc-tone-mint">
            {card.weightG}g
          </p>
        ) : null}
        <p className="mt-3 truncate text-[11px] text-white/38">ニックネーム：{card.nickname}</p>
      </div>
    </>
  );
}

export function PublicGalleryList({ cards }: { cards: GalleryCard[] }) {
  if (cards.length === 0) {
    return <p className="text-sm leading-6 text-white/40">まだ表示できる個体はありません。</p>;
  }
  return (
    <ul className="flex min-w-0 flex-col gap-8">
      {cards.map((card, index) => (
        <li key={`${card.href ?? "private"}-${card.name}-${index}`} className="min-w-0">
          {card.href ? (
            <Link href={card.href} className="block min-w-0 active:opacity-90">
              <GalleryCardBody card={card} />
            </Link>
          ) : (
            <div className="min-w-0">
              <GalleryCardBody card={card} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
