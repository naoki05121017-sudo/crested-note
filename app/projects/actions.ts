"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  nowIso,
  parseProjectRole,
  parseProjectStatus,
  textField,
} from "@/lib/db/form";
import { mutateDb, newId } from "@/lib/db/store";

export async function createProject(formData: FormData) {
  const name = textField(formData, "name");
  if (!name) throw new Error("プロジェクト名は必須です。");
  const id = newId();
  await mutateDb((db) => {
    db.projects.push({
      id,
      name,
      goal: textField(formData, "goal"),
      notes: textField(formData, "notes"),
      status: "active",
      createdAt: nowIso(),
    });
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function updateProject(id: string, formData: FormData) {
  await mutateDb((db) => {
    const project = db.projects.find((row) => row.id === id);
    if (!project) return;
    const name = textField(formData, "name");
    if (name) project.name = name;
    project.goal = textField(formData, "goal");
    project.notes = textField(formData, "notes");
    project.status = parseProjectStatus(textField(formData, "status"));
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function addProjectMember(projectId: string, formData: FormData) {
  const animalId = textField(formData, "animalId");
  if (!animalId) throw new Error("個体を選んでください。");
  const role = parseProjectRole(textField(formData, "role"));
  await mutateDb((db) => {
    db.projectMembers = db.projectMembers.filter(
      (row) => !(row.projectId === projectId && row.animalId === animalId),
    );
    db.projectMembers.push({ projectId, animalId, role });
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, animalId: string) {
  await mutateDb((db) => {
    db.projectMembers = db.projectMembers.filter(
      (row) => !(row.projectId === projectId && row.animalId === animalId),
    );
  });
  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(id: string) {
  await mutateDb((db) => {
    db.projects = db.projects.filter((row) => row.id !== id);
    db.projectMembers = db.projectMembers.filter((row) => row.projectId !== id);
  });
  revalidatePath("/", "layout");
  redirect("/projects");
}
