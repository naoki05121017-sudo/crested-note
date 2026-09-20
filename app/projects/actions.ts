"use server";

import { actionError, actionOk, revalidateApp } from "@/app/components/action-result";
import {
  nowIso,
  parseProjectRole,
  parseProjectStatus,
  textField,
} from "@/lib/db/form";
import { mutateDb, newId } from "@/lib/db/store";

export async function createProject(formData: FormData) {
  const name = textField(formData, "name");
  if (!name) return actionError("プロジェクト名は必須です。");
  const id = newId();
  try {
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
  } catch (error) {
    return actionError(error, "作成できませんでした。");
  }
  revalidateApp("/projects", `/projects/${id}`);
  return actionOk(`/projects/${id}`);
}

export async function updateProject(id: string, formData: FormData) {
  try {
    await mutateDb((db) => {
      const project = db.projects.find((row) => row.id === id);
      if (!project) throw new Error("プロジェクトが見つかりません。");
      const name = textField(formData, "name");
      if (name) project.name = name;
      project.goal = textField(formData, "goal");
      project.notes = textField(formData, "notes");
      project.status = parseProjectStatus(textField(formData, "status"));
    });
  } catch (error) {
    return actionError(error, "保存できませんでした。");
  }
  revalidateApp("/projects", `/projects/${id}`);
  return actionOk(`/projects/${id}`);
}

export async function addProjectMember(projectId: string, formData: FormData) {
  const animalId = textField(formData, "animalId");
  if (!animalId) return actionError("個体を選んでください。");
  const role = parseProjectRole(textField(formData, "role"));
  try {
    await mutateDb((db) => {
      db.projectMembers = db.projectMembers.filter(
        (row) => !(row.projectId === projectId && row.animalId === animalId),
      );
      db.projectMembers.push({ projectId, animalId, role });
    });
  } catch (error) {
    return actionError(error, "追加できませんでした。");
  }
  revalidateApp(`/projects/${projectId}`);
  return actionOk(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, animalId: string) {
  try {
    await mutateDb((db) => {
      db.projectMembers = db.projectMembers.filter(
        (row) => !(row.projectId === projectId && row.animalId === animalId),
      );
    });
  } catch (error) {
    return actionError(error, "外せませんでした。");
  }
  revalidateApp(`/projects/${projectId}`);
  return actionOk(`/projects/${projectId}`);
}

export async function deleteProject(id: string) {
  try {
    await mutateDb((db) => {
      db.projects = db.projects.filter((row) => row.id !== id);
      db.projectMembers = db.projectMembers.filter((row) => row.projectId !== id);
    });
  } catch (error) {
    return actionError(error, "削除できませんでした。");
  }
  revalidateApp("/projects");
  return actionOk("/projects");
}
