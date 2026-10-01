import Link from "next/link";
import { AnimalPhoto } from "@/app/components/animal-photo";
import type { LoginGalleryPreviewCard } from "@/lib/db/public-gallery";

export function LoginGalleryPreview({ cards }: { cards: LoginGalleryPreviewCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="mt-8 min-w-0 max-w-md">
      <Link href="/gallery" className="block min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-white">みんなのクレス</h2>
        <p className="mt-1 text-sm leading-6 text-white/42">
          クレスノートに登録されている個体を、少しだけ見てみる。
        </p>
      </Link>
      <ul className="mt-4 flex min-w-0 gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <li key={`${card.photoUrl}-${card.name}`} className="w-[7.5rem] shrink-0">
            <Link href="/gallery" className="block min-w-0">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-white/8">
                <AnimalPhoto
                  src={card.photoUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 truncate text-sm text-white/88">{card.name}</p>
              {card.morphLabel ? (
                <p className="truncate text-xs text-white/40">{card.morphLabel}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
