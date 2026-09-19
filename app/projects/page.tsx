import Link from "next/link";
import { createProject } from "@/app/projects/actions";
import { MutationForm } from "@/app/components/mutation-form";
import { PendingSubmitButton } from "@/app/components/pending-submit-button";
import { EmptyState, PageHeader, Badge } from "@/app/components/ui";
import { listProjects } from "@/lib/db/queries";
import { PROJECT_STATUS_LABEL } from "@/lib/db/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "プロジェクト" };

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        kicker="PROJECT"
        title="ブリード目標・プロジェクト"
        description="今季の狙いモルフや使いたい個体をまとめます。"
      />
      <MutationForm action={createProject} className="grid gap-3 rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)] md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>名前</span>
          <input required name="name" className="nc-input" placeholder="例: 2026 ファントム計画" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>目標</span>
          <input name="goal" className="nc-input" placeholder="例: リリーホワイト ファントム" />
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          <span>メモ</span>
          <textarea name="notes" rows={2} className="nc-input" />
        </label>
        <PendingSubmitButton pendingLabel="作成しています…" className="nc-btn w-full sm:w-fit">
          作成する
        </PendingSubmitButton>
      </MutationForm>
      {projects.length === 0 ? (
        <EmptyState title="プロジェクトはまだありません" body="目標を書いて、候補個体を紐付けできます。" />
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_32px_rgba(28,25,23,0.04)]"
              >
                <Badge tone={project.status === "active" ? "sage" : "sand"}>
                  {PROJECT_STATUS_LABEL[project.status]}
                </Badge>
                <h2 className="mt-1 text-lg font-semibold">{project.name}</h2>
                {project.goal ? <p className="mt-1 text-sm text-muted">{project.goal}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
