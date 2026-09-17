import Link from "next/link";
import { AnimalForm } from "@/app/animals/animal-form";
import { PageHeader } from "@/app/components/ui";
import { listAnimals, getSettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "個体を登録" };

export default async function NewAnimalPage() {
  const parents = await listAnimals();
  const settings = await getSettings();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="COLLECTION"
        title="個体を登録"
        description="名前・遺伝子型・血統を残します。"
        actions={
          <Link href="/animals" className="nc-btn-ghost">
            一覧へ
          </Link>
        }
      />
      <AnimalForm parents={parents} publicByDefault={settings.publicByDefault} />
    </div>
  );
}
