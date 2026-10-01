import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { GrowthChart } from "@/app/components/growth-chart";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { PublicCommentList } from "@/app/components/public-comment-list";
import { getSessionUser } from "@/lib/auth/session";
import { listPublicComments } from "@/lib/db/animal-comments";
import { getAnimalBySlug, listPublicWeights } from "@/lib/db/queries";
import {
  getPublicAnimalOwnerId,
  listAlbumPhotosForAnimal,
  listPublicParents,
  publicNicknameForUser,
} from "@/lib/db/public-gallery";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import { growthPoints, latestWeight } from "@/lib/stats/compare";

export const dynamic = "force-dynamic";

export default async function PublicAnimalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const animal = await getAnimalBySlug(slug);
  if (!animal) notFound();
  const viewer = await getSessionUser();
  const [weights, album, parents, ownerId] = await Promise.all([
    listPublicWeights(animal.id),
    listAlbumPhotosForAnimal(animal.id, animal.photoUrl),
    listPublicParents(animal.sireId, animal.damId),
    getPublicAnimalOwnerId(animal.id),
  ]);
  const nickname = ownerId ? await publicNicknameForUser(ownerId) : "ユーザー";
  const comments = await listPublicComments(animal.id, viewer?.id ?? null);
  const latest = latestWeight(weights);
  const extras = album.filter((photo) => photo.source === "extra");
  const hero = album[0];

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-8">
      <p className="text-sm text-white/35">
        <Link href="/gallery" className="underline-offset-2 hover:underline">
          みんなのクレス
        </Link>
      </p>
      {hero ? (
        <div className="overflow-hidden rounded-[1.25rem] bg-[#efeaf0]">
          <div className="h-[min(52dvh,28rem)] min-h-[16rem]">
            <AnimalPhoto src={hero.url} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
      <div className="min-w-0 px-0.5">
        <p className="text-[11px] tracking-[0.22em] text-white/40 uppercase">PUBLIC ANIMAL</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          {animal.name}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {SEX_LABEL[animal.sex]}
          {" / "}
          {animal.morphLabel || formatGenotypeLabel(animal.genotype) || "モルフ未設定"}
        </p>
        {latest ? (
          <p className="mt-4 text-[2.1rem] font-semibold tabular-nums leading-none nc-tone-mint">
            {latest.weightG}g
          </p>
        ) : null}
        <p className="mt-4 text-[13px] text-white/40">ニックネーム：{nickname}</p>
        <div className="mt-5 max-w-md">
          <AnimalCodeBlock code={animal.code} />
        </div>
      </div>

      {extras.length > 0 ? (
        <section className="min-w-0">
          <p className="nc-section-kicker nc-tone-mist">ALBUM</p>
          <h2 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">アルバム</h2>
          <ul className="mt-4 grid grid-cols-3 gap-2">
            {album.map((photo) => (
              <li key={photo.id} className="overflow-hidden rounded-2xl bg-[#efeaf0]">
                <div className="aspect-square">
                  <AnimalPhoto src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="min-w-0">
        <p className="nc-section-kicker nc-tone-lilac">GROWTH</p>
        <h2 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">成長</h2>
        <div className="mt-4 rounded-[1.25rem] bg-[#f7f3f6] p-4 text-ink">
          <GrowthChart mine={growthPoints(animal, weights)} average={[]} />
        </div>
      </section>

      {parents.sire || parents.dam ? (
        <section className="min-w-0">
          <p className="nc-section-kicker nc-tone-care">LINEAGE</p>
          <h2 className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">血統</h2>
          <ul className="mt-3 text-sm text-white/70">
            {parents.sire ? (
              <li>
                父：
                <Link href={parents.sire.href} className="underline-offset-2 hover:underline">
                  {parents.sire.name}
                </Link>
              </li>
            ) : null}
            {parents.dam ? (
              <li className="mt-2">
                母：
                <Link href={parents.dam.href} className="underline-offset-2 hover:underline">
                  {parents.dam.name}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <PublicCommentList
        animalId={animal.id}
        slug={animal.shareSlug}
        comments={comments}
        signedIn={Boolean(viewer)}
      />
      {viewer ? null : (
        <section className="min-w-0">
          <p className="text-sm leading-6 text-white/45">
            クレスの飼育・成長・繁殖をまとめて管理
          </p>
          <Link href="/signup" className="nc-btn mt-4 inline-flex min-h-12 w-full sm:w-auto">
            無料ではじめる
          </Link>
        </section>
      )}
    </div>
  );
}
