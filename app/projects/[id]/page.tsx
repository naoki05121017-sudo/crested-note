import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addProjectMember,
  deleteProject,
  removeProjectMember,
  updateProject,
} from "@/app/projects/actions";
import { Card, PageHeader, SectionTitle } from "@/app/components/ui";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import {
  getProject,
  listAnimals,
  listPredictions,
  projectMembers,
} from "@/lib/db/queries";
import {
  PROJECT_ROLE_LABEL,
  PROJECT_STATUS_LABEL,
  animalTitle,
} from "@/lib/db/labels";
import { PROJECT_ROLES, PROJECT_STATUSES } from "@/lib/db/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "プロジェクト詳細" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const members = await projectMembers(id);
  const animals = await listAnimals();
  const predictions = (await listPredictions()).filter((row) => row.projectId === id);
  const update = updateProject.bind(null, id);
  const addMember = addProjectMember.bind(null, id);
  const removeProject = deleteProject.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader kicker="PROJECT" title={project.name} description={project.goal} />

      <Card>
        <MutationForm action={update} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span>名前</span>
            <input name="name" defaultValue={project.name} className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm">
            <span>状態</span>
            <select name="status" defaultValue={project.status} className="nc-input">
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span>目標</span>
            <input name="goal" defaultValue={project.goal} className="nc-input" />
          </label>
          <label className="grid gap-1 text-sm md:col-span-2">
            <span>メモ</span>
            <textarea name="notes" rows={3} defaultValue={project.notes} className="nc-input" />
          </label>
          <PendingSubmitButton pendingLabel="保存しています…" className="nc-btn w-full sm:w-fit">
            保存
          </PendingSubmitButton>
        </MutationForm>
      </Card>

      <Card>
        <SectionTitle>個体</SectionTitle>
        <MutationForm action={addMember} className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select name="animalId" className="nc-input sm:max-w-xs">
            {animals.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animalTitle(animal)}
              </option>
            ))}
          </select>
          <select name="role" className="nc-input sm:max-w-40">
            {PROJECT_ROLES.map((role) => (
              <option key={role} value={role}>
                {PROJECT_ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          <PendingSubmitButton pendingLabel="追加しています…" className="nc-btn w-full sm:w-auto">
            追加
          </PendingSubmitButton>
        </MutationForm>
        {members.length === 0 ? (
          <p className="text-sm text-muted">まだ個体がありません。</p>
        ) : (
        <ul className="text-sm">
          {members.map((member) => {
            const remove = removeProjectMember.bind(null, id, member.animal.id);
            return (
              <li key={member.animal.id} className="flex min-h-11 items-center justify-between gap-3 border-t border-line py-2">
                <Link href={`/animals/${member.animal.id}`} className="hover:underline">
                  {animalTitle(member.animal)} / {PROJECT_ROLE_LABEL[member.role]}
                </Link>
                <MutationForm action={remove}>
                  <PendingSubmitButton pendingLabel="外しています…" className="nc-btn-ghost px-3 text-sm">
                    外す
                  </PendingSubmitButton>
                </MutationForm>
              </li>
            );
          })}
        </ul>
        )}
      </Card>

      <Card>
        <SectionTitle>保存した計算</SectionTitle>
        {predictions.length === 0 ? (
          <p className="text-sm leading-6 text-muted">
            シミュレーションや遺伝計算から、このプロジェクトを選んで保存できます。
          </p>
        ) : (
          <ul className="text-sm">
            {predictions.map((row) => (
              <li key={row.id}>
                <Link href={`/predictions/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="rounded-[1.75rem] border border-red-100 bg-[#fdf6f6] px-5 py-5 text-ink sm:px-6">
        <p className="text-sm text-ink/70">プロジェクトを削除</p>
        <p className="mt-1 text-xs leading-5 text-muted">削除すると元に戻せません。</p>
        <div className="mt-3">
      <MutationForm action={removeProject}>
        <PendingSubmitButton pendingLabel="削除しています…" className="nc-btn-danger px-0 text-sm text-red-700/80">
          プロジェクトを削除
        </PendingSubmitButton>
      </MutationForm>
        </div>
      </section>
    </div>
  );
}
