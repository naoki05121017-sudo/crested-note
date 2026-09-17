import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimalForm } from "@/app/animals/animal-form";
import { PageHeader } from "@/app/components/ui";
import { getAnimal, listAnimals } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体を編集" };

export default async function EditAnimalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animal = await getAnimal(id);
  if (!animal) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="COLLECTION"
        title="個体を編集"
        actions={
          <Link href={`/animals/${animal.id}`} className="nc-btn-ghost">
            詳細へ
          </Link>
        }
      />
      <AnimalForm animal={animal} parents={await listAnimals()} />
    </div>
  );
}
