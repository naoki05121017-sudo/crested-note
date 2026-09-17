import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addProjectMember,
  deleteProject,
  removeProjectMember,
  updateProject,
} from "@/app/projects/actions";
import { Card, PageHeader, SectionTitle } from "@/app/components/ui";
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
        <form action={update} className="grid gap-3 md:grid-cols-2">
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
          <button type="submit" className="nc-btn w-full sm:w-fit">
            保存
          </button>
        </form>
      </Card>

      <Card>
        <SectionTitle>個体</SectionTitle>
        <form action={addMember} className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
          <button type="submit" className="nc-btn w-full sm:w-auto">
            追加
          </button>
        </form>
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
                <form action={remove}>
                  <button type="submit" className="nc-btn-ghost px-3 text-sm">
                    外す
                  </button>
                </form>
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
            シミュや遺伝計算から、このプロジェクトを選んで保存できます。
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

      <form action={removeProject}>
        <button type="submit" className="nc-btn-danger">
          プロジェクトを削除
        </button>
      </form>
    </div>
  );
}
