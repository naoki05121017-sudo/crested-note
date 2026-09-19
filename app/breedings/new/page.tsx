import Link from "next/link";
import { createBreeding } from "@/app/breedings/actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { Card, EmptyState, PageHeader } from "@/app/components/ui";
import { listAnimals, listProjects } from "@/lib/db/queries";
import { animalTitle } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "ペアを作成" };

export default async function NewBreedingPage() {
  const animals = (await listAnimals()).filter(
    (animal) => animal.status === "active" || animal.status === "breeding",
  );
  const males = animals.filter((animal) => animal.sex !== "female");
  const females = animals.filter((animal) => animal.sex !== "male");
  const projects = await listProjects();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="BREEDING"
        title="ペアを作成"
        actions={
          <Link href="/breedings" className="nc-btn-ghost">
            一覧へ
          </Link>
        }
      />
      {males.length === 0 || females.length === 0 ? (
        <EmptyState
          title="オスとメスが必要です"
          body="先に個体を登録してから、ペアを作成できます。"
          action={
            <Link href="/animals/new" className="nc-btn">
              個体を登録
            </Link>
          }
        />
      ) : (
        <MutationForm action={createBreeding} className="flex max-w-lg flex-col gap-4">
          <Card className="flex flex-col gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">オス</span>
            <select required name="maleId" className="nc-input">
              <option value="">選択</option>
              {males.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animalTitle(animal)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">メス</span>
            <select required name="femaleId" className="nc-input">
              <option value="">選択</option>
              {females.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animalTitle(animal)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">開始日</span>
            <input
              type="date"
              name="startedOn"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="nc-input"
            />
          </label>
          {projects.length > 0 ? (
            <label className="grid gap-1 text-sm">
              <span className="font-medium">プロジェクト</span>
              <select name="projectId" className="nc-input">
                <option value="">なし</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm">
            <span className="font-medium">メモ</span>
            <textarea name="notes" rows={3} className="nc-input" />
          </label>
          <PendingSubmitButton pendingLabel="作成しています…" className="nc-btn w-full sm:w-fit">
            作成する
          </PendingSubmitButton>
          </Card>
        </MutationForm>
      )}
    </div>
  );
}
