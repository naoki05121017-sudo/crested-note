import { notFound } from "next/navigation";
import { AnimalPhoto } from "@/app/components/animal-photo";
import { GrowthChart } from "@/app/components/growth-chart";
import { AnimalCodeBlock } from "@/app/components/animal-code-block";
import { Badge, Card } from "@/app/components/ui";
import { getAnimalBySlug, listPublicWeights } from "@/lib/db/queries";
import { SEX_LABEL } from "@/lib/db/labels";
import { formatGenotypeLabel } from "@/lib/genetics";
import { growthPoints } from "@/lib/stats/compare";

export const dynamic = "force-dynamic";

export default async function PublicAnimalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const animal = await getAnimalBySlug(slug);
  if (!animal) notFound();
  const weights = await listPublicWeights(animal.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] tracking-[0.22em] text-accent-strong uppercase">
          PUBLIC ANIMAL
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{animal.name}</h1>
        <div className="mt-4">
          <AnimalCodeBlock code={animal.code} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={animal.sex === "female" ? "blush" : "mist"}>
            {SEX_LABEL[animal.sex]}
          </Badge>
          {animal.hatchDate ? <Badge>{animal.hatchDate}</Badge> : null}
        </div>
      </div>
      {animal.photoUrl ? (
        <AnimalPhoto
          src={animal.photoUrl}
          alt=""
          className="max-h-80 rounded-[1.5rem] object-cover"
        />
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">モルフ</h2>
        <p className="mt-2 text-lg">{animal.morphLabel || formatGenotypeLabel(animal.genotype)}</p>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">成長</h2>
        <GrowthChart mine={growthPoints(animal, weights)} average={[]} />
      </Card>
    </div>
  );
}
