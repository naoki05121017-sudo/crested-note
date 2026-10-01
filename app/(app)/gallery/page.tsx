import { PageHeader } from "@/app/components/ui";
import { PublicGalleryList } from "@/app/components/public-gallery-list";
import { listPublicGalleryPage, parseGalleryFilters } from "@/lib/db/public-gallery";
import { getSessionUser } from "@/lib/auth/session";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "みんなのクレス" };

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseGalleryFilters(params);
  const listed = await listPublicGalleryPage(filters);
  const viewer = await getSessionUser();
  const pageCount = Math.max(1, Math.ceil(listed.total / listed.pageSize));

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-8">
      <PageHeader
        kicker="GALLERY"
        title="みんなのクレス"
        description="公開されているクレスです。記録・成長の実例を見られます。"
      />
      {viewer ? null : (
        <Link href="/signup" className="nc-btn inline-flex min-h-12 w-full sm:w-auto">
          無料ではじめる
        </Link>
      )}
      <PublicGalleryList cards={listed.cards} />
      {pageCount > 1 ? (
        <nav className="flex items-center justify-between text-sm text-white/45" aria-label="ページ">
          {listed.page > 1 ? (
            <Link href={`/gallery?page=${listed.page - 1}`} className="underline-offset-2 hover:underline">
              前へ
            </Link>
          ) : (
            <span />
          )}
          <span>
            {listed.page} / {pageCount}
          </span>
          {listed.page < pageCount ? (
            <Link href={`/gallery?page=${listed.page + 1}`} className="underline-offset-2 hover:underline">
              次へ
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
